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

// (UP − DOWN) score for a set of votes
const scoreVotes = (votes: { vote: VoteValue }[]) =>
  votes.reduce((acc, v) => acc + (v.vote === VoteValue.UP ? 1 : -1), 0);

const countVotes = (votes: { vote: VoteValue }[]) => ({
  upvotes: votes.filter((v) => v.vote === VoteValue.UP).length,
  downvotes: votes.filter((v) => v.vote === VoteValue.DOWN).length,
});

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        login: true,
        email: true,
        campus: true,
        ftPfpUrl: true,
        ftId: true,
        passwordHash: true,
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
      login: user.login,
      email: user.email,
      campus: user.campus,
      ftPfpUrl: user.ftPfpUrl,
      has42: !!user.ftId,
      hasPassword: !!user.passwordHash,
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
      // Changing an existing password revokes every session: bump tokenVersion
      // (kills outstanding access tokens via the guard) and drop all refresh
      // tokens. Setting a first password (42-only account) keeps the session.
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

  async requestDeletion(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { deleteAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }, // 14Days
    });
    return { message: 'Account will be deleted in 14 days' };
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
      data: { deleteAt: null }, // Turning off deleteAt
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
  // hotlinking, so we refetch it here and stream the bytes back. 404 when the
  // user has no picture or the upstream fetch fails.
  async getAvatar(
    id: string,
    viewerId: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
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
    // Default-deny: a non-42 viewer must NOT see another user's real 42 photo —
    // the name is already anonymised to rdm*, the avatar has to be too, else the
    // picture de-anonymises the account. (Own avatar is always allowed.)
    if (!viewer?.ftId && id !== viewerId) throw new NotFoundException();
    if (!user?.ftPfpUrl) throw new NotFoundException();

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
