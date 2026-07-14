import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VoteValue } from 'generated/prisma/client';
import { authorView } from 'src/utils/anonymize';

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
        email: true,
        campus: true,
        ftPfpUrl: true,
        ftId: true,
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
      email: user.email,
      campus: user.campus,
      ftPfpUrl: user.ftPfpUrl,
      has42: !!user.ftId,
      createdAt: user.createdAt.toISOString(),
      karma,
    };
  }

  async getActivity(userId: string) {
    const [rawPosts, rawComments] = await Promise.all([
      this.prisma.projectsPost.findMany({
        where: { writer: userId },
        orderBy: { postedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          projectId: true,
          title: true,
          content: true,
          postedAt: true,
          votes: { select: { vote: true } },
        },
      }),
      this.prisma.projectsChat.findMany({
        where: { writer: userId },
        orderBy: { postedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          answeringPost: true,
          content: true,
          postedAt: true,
          votes: { select: { vote: true } },
          post: { select: { projectId: true } },
        },
      }),
    ]);

    const posts = rawPosts.map(({ votes, postedAt, ...post }) => ({
      ...post,
      postedAt: postedAt.toISOString(),
      ...countVotes(votes),
    }));

    const comments = rawComments.map(
      ({ votes, postedAt, answeringPost, post, ...comment }) => ({
        ...comment,
        postId: answeringPost,
        projectId: post?.projectId ?? null,
        postedAt: postedAt.toISOString(),
        ...countVotes(votes),
      }),
    );

    return { posts, comments };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, email: true, name: true },
    });
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
          ftPfpUrl: true,
          campus: true,
          rdmName: true,
          rdmPfp: true,
          rdmCampus: true,
          createdAt: true,
        },
      }),
    ]);
    if (!user) throw new NotFoundException();

    return {
      id: user.id,
      ...authorView(viewer, user),
      createdAt: user.createdAt.toISOString(),
    };
  }

  // Proxy a user's 42 profile picture server-side: the intra CDN blocks
  // hotlinking, so we refetch it here and stream the bytes back. 404 when the
  // user has no picture or the upstream fetch fails.
  async getAvatar(
    id: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ftPfpUrl: true },
    });
    if (!user?.ftPfpUrl) throw new NotFoundException();

    try {
      const res = await fetch(user.ftPfpUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new NotFoundException();

      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      return { buffer, contentType };
    } catch {
      throw new NotFoundException();
    }
  }
}
