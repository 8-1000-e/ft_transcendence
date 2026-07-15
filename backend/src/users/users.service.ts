import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VoteValue } from 'generated/prisma/client';
import { authorView, isFtMember } from 'src/utils/anonymize';
import { MailService } from 'src/mail/mail.service';
import {
  generateBase32Secret,
  matchTotpStep,
  otpauthUri,
} from 'src/utils/totp';

// (UP − DOWN) score for a set of votes
const scoreVotes = (votes: { vote: VoteValue }[]) =>
  votes.reduce((acc, v) => acc + (v.vote === VoteValue.UP ? 1 : -1), 0);

const countVotes = (votes: { vote: VoteValue }[]) => ({
  upvotes: votes.filter((v) => v.vote === VoteValue.UP).length,
  downvotes: votes.filter((v) => v.vote === VoteValue.DOWN).length,
});

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        locale: true,
        login: true,
        email: true,
        campus: true,
        ftPfpUrl: true,
        ftId: true,
        passwordHash: true,
        totpEnabled: true,
        deleteAt: true,
        createdAt: true,
        projectPosts: { select: { votes: { select: { vote: true } } } },
        projectChat: { select: { votes: { select: { vote: true } } } },
      },
    });
    if (!user) throw new NotFoundException();

    const karma =
      user.projectPosts.reduce((sum, p) => sum + scoreVotes(p.votes), 0) +
      user.projectChat.reduce((sum, c) => sum + scoreVotes(c.votes), 0);

    return {
      id: user.id,
      name: user.name,
      locale: user.locale,
      login: user.login,
      email: user.email,
      campus: user.campus,
      ftPfpUrl: user.ftPfpUrl,
      has42: !!user.ftId,
      hasPassword: !!user.passwordHash,
      twoFactorEnabled: user.totpEnabled,
      pendingDeletion: !!user.deleteAt,
      createdAt: user.createdAt.toISOString(),
      karma,
    };
  }

  async getActivity(userId: string) {
    const [rawPosts, rawComments] = await Promise.all([
      this.prisma.projectsPost.findMany({
        where: { writer: userId },
        orderBy: { postedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          projectId: true,
          title: true,
          content: true,
          postedAt: true,
          votes: { select: { vote: true } },
          project: { select: { name: true } },
        },
      }),
      this.prisma.projectsChat.findMany({
        where: { writer: userId },
        orderBy: { postedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          answeringPost: true,
          content: true,
          postedAt: true,
          votes: { select: { vote: true } },
          // A comment answers a post directly; a reply answers another chat, so
          // walk up to find the root post (2 levels covers reply-of-reply).
          post: {
            select: {
              id: true,
              projectId: true,
              title: true,
              project: { select: { name: true } },
            },
          },
          chat: {
            select: {
              post: {
                select: {
                  id: true,
                  projectId: true,
                  title: true,
                  project: { select: { name: true } },
                },
              },
              chat: {
                select: {
                  post: {
                    select: {
                      id: true,
                      projectId: true,
                      title: true,
                      project: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const posts = rawPosts.map(({ votes, postedAt, project, ...post }) => ({
      ...post,
      projectName: project?.name ?? null,
      postedAt: postedAt.toISOString(),
      ...countVotes(votes),
    }));

    const comments = rawComments.map(
      ({ votes, postedAt, answeringPost, post, chat, ...comment }) => {
        const rootPost = post ?? chat?.post ?? chat?.chat?.post ?? null;
        return {
          ...comment,
          postId: rootPost?.id ?? answeringPost,
          postTitle: rootPost?.title ?? null,
          projectId: rootPost?.projectId ?? null,
          projectName: rootPost?.project?.name ?? null,
          postedAt: postedAt.toISOString(),
          ...countVotes(votes),
        };
      },
    );

    return { posts, comments };
  }

  // Heartbeat: mark the user as recently seen (drives friends' online status).
  async touchLastSeen(userId: string) {
    await this.prisma.user
      .update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
    return { ok: true };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, email: true, name: true },
    });
  }

  // Set a password (42-created accounts have none → enables email/pass login)
  // or change it (email accounts → the current password must match).
  async setPassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundException();

    if (user.passwordHash) {
      const ok =
        !!currentPassword &&
        (await bcrypt.compare(currentPassword, user.passwordHash));
      if (!ok) throw new BadRequestException('Current password is incorrect');
    }

    const isChange = !!user.passwordHash;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    if (isChange) {
      // Changing an existing password revokes every session (bump tokenVersion,
      // drop refresh tokens); setting a first password keeps the session.
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { passwordHash, tokenVersion: { increment: 1 } },
        }),
        this.prisma.refreshToken.deleteMany({ where: { userId } }),
      ]);
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
    }
    return { message: isChange ? 'Password changed' : 'Password set' };
  }

  // 2FA (TOTP). setup stores a pending secret; enable/disable verify a code.
  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, totpEnabled: true },
    });
    if (!user) throw new NotFoundException();
    if (user.totpEnabled)
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    const secret = generateBase32Secret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret },
    });
    return { secret, otpauthUri: otpauthUri(secret, user.email) };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true, totpLastUsedStep: true },
    });
    if (!user) throw new NotFoundException();
    if (user.totpEnabled)
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    if (!user.totpSecret)
      throw new BadRequestException('Start the 2FA setup first');
    const step = matchTotpStep(
      user.totpSecret,
      code,
      user.totpLastUsedStep ?? -1,
    );
    if (step === null) throw new BadRequestException('Invalid code');
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true, totpLastUsedStep: step },
    });
    return { message: 'Two-factor authentication enabled' };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpEnabled: true, totpLastUsedStep: true },
    });
    if (!user) throw new NotFoundException();
    if (!user.totpEnabled || !user.totpSecret)
      throw new BadRequestException('Two-factor authentication is not enabled');
    const step = matchTotpStep(
      user.totpSecret,
      code,
      user.totpLastUsedStep ?? -1,
    );
    if (step === null) throw new BadRequestException('Invalid code');
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null, totpLastUsedStep: null },
    });
    return { message: 'Two-factor authentication disabled' };
  }

  async requestDeletion(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { deleteAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }, // 14Days
      select: { email: true, deleteAt: true },
    });
    if (user.email) {
      void this.mail
        .sendNotice(
          user.email,
          'ft_hub — account deletion scheduled',
          `Your account is scheduled for deletion on ${user.deleteAt?.toDateString()}. ` +
            `Cancel it from Settings before then to keep your account.`,
        )
        .catch(() => {});
    }
    return { message: 'Account will be deleted in 14 days' };
  }

  // GDPR: a machine-readable dump of everything tied to this account.
  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        login: true,
        campus: true,
        ftId: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException();

    const [posts, comments, postVotes, chatVotes, friends, groupMessages] =
      await Promise.all([
        this.prisma.projectsPost.findMany({
          where: { writer: userId },
          select: {
            id: true,
            projectId: true,
            title: true,
            content: true,
            filesUrl: true,
            postedAt: true,
            editedAt: true,
          },
          orderBy: { postedAt: 'asc' },
        }),
        this.prisma.projectsChat.findMany({
          where: { writer: userId },
          select: {
            id: true,
            answeringPost: true,
            answeringChat: true,
            content: true,
            filesUrl: true,
            postedAt: true,
            editedAt: true,
          },
          orderBy: { postedAt: 'asc' },
        }),
        this.prisma.postVote.findMany({
          where: { userId },
          select: { postId: true, vote: true },
        }),
        this.prisma.chatVote.findMany({
          where: { userId },
          select: { chatId: true, vote: true },
        }),
        this.prisma.friendship.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: userId }, { addresseeId: userId }],
          },
          select: { requesterId: true, addresseeId: true, createdAt: true },
        }),
        this.prisma.groupChat.findMany({
          where: { sender: userId },
          select: {
            id: true,
            group: true,
            content: true,
            filesUrl: true,
            sendTime: true,
          },
          orderBy: { sendTime: 'asc' },
        }),
      ]);

    if (user.email) {
      void this.mail
        .sendNotice(
          user.email,
          'ft_hub — your data export',
          'A copy of your personal data was generated and downloaded from your account.',
        )
        .catch(() => {});
    }

    return {
      exportedAt: new Date().toISOString(),
      account: user,
      posts,
      comments,
      votes: { posts: postVotes, comments: chatVotes },
      friends,
      groupMessages,
    };
  }

  async cancelDelete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { deleteAt: true },
    });
    if (!user) throw new NotFoundException();

    if (user.deleteAt === null) {
      return { message: 'No deletion scheduled' };
    }

    await this.prisma.user.update({
      where: { id },
      data: { deleteAt: null },
    });
    return { message: 'Deletion cancelled' };
  }

  // Default-deny profile: a non-42 viewer (no ftId) only ever sees the
  // pre-generated anonymised `rdm*` identity; a 42 viewer sees the real one.
  async getUserProfile(id: string, viewerId: string) {
    const [viewer, user] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: viewerId },
        select: { ftId: true },
      }),
      this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          login: true,
          ftPfpUrl: true,
          campus: true,
          rdmName: true,
          rdmPfp: true,
          rdmCampus: true,
          createdAt: true,
          lastSeenAt: true,
          projectPosts: { select: { votes: { select: { vote: true } } } },
          projectChat: { select: { votes: { select: { vote: true } } } },
        },
      }),
    ]);
    if (!user) throw new NotFoundException();

    const karma =
      user.projectPosts.reduce((sum, p) => sum + scoreVotes(p.votes), 0) +
      user.projectChat.reduce((sum, c) => sum + scoreVotes(c.votes), 0);

    // Online status is a 42-circle signal → only shown to 42 viewers.
    const online =
      isFtMember(viewer) &&
      Date.now() - user.lastSeenAt.getTime() < 2 * 60 * 1000;

    return {
      id: user.id,
      ...authorView(viewer, user),
      // The 42 login is part of the real identity → only 42 viewers see it.
      login: isFtMember(viewer) ? user.login : null,
      karma,
      online,
      createdAt: user.createdAt.toISOString(),
    };
  }

  // Proxy a user's 42 profile picture server-side: the intra CDN blocks
  // hotlinking, so we refetch it here and stream the bytes back.
  async getAvatar(
    id: string,
    viewerId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const [viewer, user] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: viewerId },
        select: { ftId: true },
      }),
      this.prisma.user.findUnique({
        where: { id },
        select: { ftPfpUrl: true },
      }),
    ]);
    // Default-deny: a non-42 viewer must NOT see another user's real 42 photo
    // (de-anonymises an rdm* account). null → 204; own avatar always allowed.
    if (!viewer?.ftId && id !== viewerId) return null;
    if (!user?.ftPfpUrl) return null;

    return this.fetchImage(user.ftPfpUrl);
  }

  // Proxy a 42-intra CDN image (e.g. a suggested mentor's picture, which isn't
  // an app user so has no /avatar/:id). SSRF-guarded to the 42 CDN host only.
  async proxyFtImage(
    url: string,
    viewerId: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    // Non-42 accounts are anonymised and have no legitimate use for a 42-CDN
    // image proxy — gate it like /avatar/:id so it can't defeat anonymisation.
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { ftId: true },
    });
    if (!viewer?.ftId) throw new NotFoundException();

    let host = '';
    try {
      host = new URL(url).host;
    } catch {
      throw new NotFoundException();
    }
    if (!/(^|\.)intra\.42\.fr$/.test(host) && !/(^|\.)42\.fr$/.test(host)) {
      throw new NotFoundException();
    }
    return this.fetchImage(url);
  }

  private async fetchImage(
    url: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new NotFoundException();
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      return { buffer, contentType };
    } catch {
      throw new NotFoundException();
    }
  }
}
