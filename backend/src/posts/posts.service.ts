import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { VoteDto } from './dto/vote.dto';
import { VoteValue, NotifType } from 'generated/prisma/client';
import { assertFilesExist } from 'src/utils/files';
import { authorView } from 'src/utils/anonymize';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Forum list of synced 42 projects with category + post count; untagged junk rows (piscine/exams/admin/dupes) are excluded.
  async getProjects() {
    const projects = await this.prisma.projects.findMany({
      where: { category: { not: null } },
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      postCount: project._count.posts,
      category: project.category,
    }));
  }

  // Project meta so a non-member viewer (whose `groups` list omits it) still sees the real name.
  async getProject(id: string) {
    const project = await this.prisma.projects.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    });
    if (!project) throw new NotFoundException();
    return {
      id: project.id,
      name: project.name,
      category: project.category,
      postCount: project._count.posts,
    };
  }

  async sendPost(id: string, body: CreatePostDto, userId: string) {
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.ftId) throw new ForbiddenException();

    assertFilesExist(body.filesUrl);

    return this.prisma.projectsPost.create({
      data: {
        projectId: id,
        writer: userId,
        title: body.title,
        content: body.content,
        filesUrl: body.filesUrl,
      },
    });
  }

  async editPost(
    id: string,
    postId: string,
    body: CreatePostDto,
    userId: string,
  ) {
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.ftId) throw new UnauthorizedException();

    const post = await this.prisma.projectsPost.findUnique({
      where: { id: postId },
    });
    if (!post || post.writer !== userId) throw new UnauthorizedException();

    assertFilesExist(body.filesUrl);

    const editedPost = await this.prisma.projectsPost.update({
      where: { id: postId },
      data: {
        title: body.title,
        content: body.content,
        editedAt: new Date(),
        filesUrl: body.filesUrl,
      },
    });

    return editedPost;
  }

  private readonly AUTHOR_SELECT = {
    name: true,
    ftId: true,
    ftPfpUrl: true,
    campus: true,
    rdmCampus: true,
    rdmName: true,
    rdmPfp: true,
  } as const;

  // Clamp a client-supplied page size to a sane range.
  private pageLimit(limit?: string): number {
    const n = Number(limit);
    if (!Number.isFinite(n)) return 15;
    return Math.min(Math.max(Math.trunc(n), 1), 50);
  }

  private mapVoted<
    T extends {
      votes: { vote: VoteValue; userId: string }[];
      user: {
        name: string;
        ftId: string | null;
        ftPfpUrl: string | null;
        campus: string | null;
        rdmCampus: string | null;
        rdmName: string | null;
        rdmPfp: string | null;
      };
    },
  >(row: T, viewer: { ftId: string | null } | null, userId: string) {
    const { votes, user: author, ...rest } = row;
    return {
      ...rest,
      upvotes: votes.filter((v) => v.vote === VoteValue.UP).length,
      downvotes: votes.filter((v) => v.vote === VoteValue.DOWN).length,
      myVote: votes.find((v) => v.userId === userId)?.vote ?? null,
      user: authorView(viewer, author),
    };
  }

  async getPosts(id: string, userId: string, cursor?: string, limit?: string) {
    // Off-catalogue project (e.g. a group's 42 project) → empty feed, not 404.
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) return { items: [], nextCursor: null };

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const take = this.pageLimit(limit);

    const rows = await this.prisma.projectsPost.findMany({
      where: { projectId: id },
      orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        _count: { select: { chats: true } },
        votes: true,
        user: { select: this.AUTHOR_SELECT },
      },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const items = page.map((r) => this.mapVoted(r, user, userId));
    return {
      items,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  // Home feed: the latest posts across ALL catalogued projects (core + spec),
  // not just the viewer's group projects — so new threads anywhere surface.
  async getFeed(userId: string, cursor?: string, limit?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const take = this.pageLimit(limit);
    const rows = await this.prisma.projectsPost.findMany({
      where: { project: { category: { not: null } } },
      orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        _count: { select: { chats: true } },
        votes: true,
        user: { select: this.AUTHOR_SELECT },
        project: { select: { name: true } },
      },
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const items = page.map((r) => ({
      ...this.mapVoted(r, user, userId),
      community: r.project.name,
    }));
    return { items, nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  // A single post (the thread page) — avoids refetching a whole project feed.
  async getPost(postId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const row = await this.prisma.projectsPost.findUnique({
      where: { id: postId },
      include: {
        _count: { select: { chats: true } },
        votes: true,
        user: { select: this.AUTHOR_SELECT },
      },
    });
    if (!row) throw new NotFoundException();
    return this.mapVoted(row, user, userId);
  }

  // Per-project post-count leaderboard, never a global cross-user one; every identity goes through authorView.
  async getPosters(projectId: string, userId: string) {
    // A group's 42 project may be outside the forum catalogue → empty list, not 404.
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId },
    });
    if (!project) return [];

    const viewer = await this.prisma.user.findUnique({ where: { id: userId } });

    const grouped = await this.prisma.projectsPost.groupBy({
      by: ['writer'],
      where: { projectId },
      _count: { writer: true },
      orderBy: { _count: { writer: 'desc' } },
      take: 6,
    });
    if (!grouped.length) return [];

    const authors = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.writer) } },
      select: {
        id: true,
        name: true,
        ftId: true,
        ftPfpUrl: true,
        campus: true,
        rdmCampus: true,
        rdmName: true,
        rdmPfp: true,
      },
    });
    const byId = new Map(authors.map((a) => [a.id, a]));

    return grouped.flatMap((g) => {
      const author = byId.get(g.writer);
      if (!author) return [];
      return [
        {
          writer: g.writer,
          count: g._count.writer,
          user: authorView(viewer, author),
        },
      ];
    });
  }

  ////COMMENT

  async sendComment(id: string, body: CreateCommentDto, userId: string) {
    const post = await this.prisma.projectsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.ftId) throw new ForbiddenException();

    assertFilesExist(body.filesUrl);

    const comment = await this.prisma.projectsChat.create({
      data: {
        answeringPost: id,
        writer: userId,
        content: body.content,
        filesUrl: body.filesUrl,
      },
    });
    void this.notifications
      .notify({
        recipientId: post.writer,
        actorId: userId,
        type: NotifType.COMMENT,
        entityLabel: post.title ?? null,
        link: `/post/${post.id}?projectId=${post.projectId}`,
      })
      .catch(() => {});
    return comment;
  }

  async editComment(commentId: string, body: CreateCommentDto, userId: string) {
    const comment = await this.prisma.projectsChat.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();
    if (comment.writer !== userId) throw new UnauthorizedException();

    assertFilesExist(body.filesUrl);

    return this.prisma.projectsChat.update({
      where: { id: commentId },
      data: {
        content: body.content,
        editedAt: new Date(),
        filesUrl: body.filesUrl,
      },
    });
  }

  async getComments(
    id: string,
    userId: string,
    cursor?: string,
    limit?: string,
  ) {
    const post = await this.prisma.projectsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const take = this.pageLimit(limit);

    const rows = await this.prisma.projectsChat.findMany({
      where: { answeringPost: id },
      // Oldest-first (Reddit thread): read top→bottom; cursor paginates forward to newer comments.
      orderBy: [{ postedAt: 'asc' }, { id: 'asc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        _count: { select: { replies: true } },
        votes: true,
        user: { select: this.AUTHOR_SELECT },
      },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: page.map((r) => this.mapVoted(r, user, userId)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  ///REPLIES
  async sendReply(id: string, body: CreateCommentDto, userId: string) {
    const comment = await this.prisma.projectsChat.findUnique({
      where: { id },
    });
    if (!comment) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.ftId) throw new ForbiddenException();

    assertFilesExist(body.filesUrl);

    const reply = await this.prisma.projectsChat.create({
      data: {
        answeringChat: id,
        writer: userId,
        content: body.content,
        filesUrl: body.filesUrl,
      },
    });
    const root = await this.resolveRoot(comment);
    void this.notifications
      .notify({
        recipientId: comment.writer,
        actorId: userId,
        type: NotifType.REPLY,
        entityLabel: root?.postTitle ?? null,
        link: root ? `/post/${root.postId}?projectId=${root.projectId}` : null,
      })
      .catch(() => {});
    return reply;
  }

  async editReply(commentId: string, body: CreateCommentDto, userId: string) {
    const comment = await this.prisma.projectsChat.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();
    if (comment.writer !== userId) throw new UnauthorizedException();

    assertFilesExist(body.filesUrl);

    return this.prisma.projectsChat.update({
      where: { id: commentId },
      data: {
        content: body.content,
        editedAt: new Date(),
        filesUrl: body.filesUrl,
      },
    });
  }

  async getReplies(id: string, userId: string) {
    const comment = await this.prisma.projectsChat.findUnique({
      where: { id },
    });
    if (!comment) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const replies = await this.prisma.projectsChat.findMany({
      where: { answeringChat: id },
      orderBy: { postedAt: 'asc' }, // oldest-first, matching the comment thread
      include: {
        _count: { select: { replies: true } },
        votes: true,
        user: {
          select: {
            name: true,
            ftId: true,
            ftPfpUrl: true,
            campus: true,
            rdmName: true,
            rdmPfp: true,
            rdmCampus: true,
          },
        },
      },
    });

    return replies.map(({ votes, user: author, ...reply }) => {
      const upvotes = votes.filter((v) => v.vote === VoteValue.UP).length;
      const downvotes = votes.filter((v) => v.vote === VoteValue.DOWN).length;
      const myVote = votes.find((v) => v.userId === userId)?.vote ?? null;

      return {
        ...reply,
        upvotes,
        downvotes,
        myVote,
        user: authorView(user, author),
      };
    });
  }

  //LIKES
  async votePost(id: string, body: VoteDto, userId: string) {
    const post = await this.prisma.projectsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.ftId) throw new ForbiddenException();

    const existing = await this.prisma.postVote.findUnique({
      where: { userId_postId: { userId, postId: id } },
    });

    //remove on double click
    if (existing && existing.vote == body.vote) {
      return this.prisma.postVote.delete({
        where: { userId_postId: { userId, postId: id } },
      });
    }

    return this.prisma.postVote.upsert({
      where: { userId_postId: { userId, postId: id } },
      update: { vote: body.vote },
      create: { userId, postId: id, vote: body.vote },
    });
  }

  async voteChat(id: string, body: VoteDto, userId: string) {
    const post = await this.prisma.projectsChat.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.ftId) throw new ForbiddenException();

    const existing = await this.prisma.chatVote.findUnique({
      where: { userId_chatId: { userId, chatId: id } },
    });

    //remove on double click
    if (existing && existing.vote == body.vote) {
      return this.prisma.chatVote.delete({
        where: { userId_chatId: { userId, chatId: id } },
      });
    }

    return this.prisma.chatVote.upsert({
      where: { userId_chatId: { userId, chatId: id } },
      update: { vote: body.vote },
      create: { userId, chatId: id, vote: body.vote },
    });
  }

  //SEARCH

  // Search across project names, post titles/bodies and comment/reply content; anon authorView applied, comments resolve to their post.
  async search(q: string, userId: string) {
    const term = q.trim();
    if (term.length < 2) return { projects: [], posts: [], comments: [] };
    const viewer = await this.prisma.user.findUnique({ where: { id: userId } });
    const like = { contains: term, mode: 'insensitive' as const };

    const [projects, postRows, commentRows] = await Promise.all([
      this.prisma.projects.findMany({
        where: { category: { not: null }, name: like },
        orderBy: { name: 'asc' },
        take: 20,
        include: { _count: { select: { posts: true } } },
      }),
      this.prisma.projectsPost.findMany({
        where: { OR: [{ title: like }, { content: like }] },
        orderBy: { postedAt: 'desc' },
        take: 20,
        include: {
          _count: { select: { chats: true } },
          votes: true,
          user: { select: this.AUTHOR_SELECT },
        },
      }),
      this.prisma.projectsChat.findMany({
        where: { content: like },
        orderBy: { postedAt: 'desc' },
        take: 20,
        include: { votes: true, user: { select: this.AUTHOR_SELECT } },
      }),
    ]);

    const comments = (
      await Promise.all(
        commentRows.map(async (c) => {
          const root = await this.resolveRoot(c);
          return root ? { ...this.mapVoted(c, viewer, userId), ...root } : null;
        }),
      )
    ).filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        postCount: p._count.posts,
      })),
      posts: postRows.map((r) => this.mapVoted(r, viewer, userId)),
      comments,
    };
  }

  // Resolve a comment/reply to its post (walk up the reply chain) so a search hit can link to the thread.
  private async resolveRoot(chat: {
    answeringPost: string | null;
    answeringChat: string | null;
  }): Promise<{
    postId: string;
    projectId: string;
    postTitle: string | null;
  } | null> {
    let postId = chat.answeringPost;
    let current = chat.answeringChat;
    for (let i = 0; i < 12 && !postId && current; i++) {
      const parent = await this.prisma.projectsChat.findUnique({
        where: { id: current },
        select: { answeringPost: true, answeringChat: true },
      });
      if (!parent) return null;
      postId = parent.answeringPost;
      current = parent.answeringChat;
    }
    if (!postId) return null;
    const post = await this.prisma.projectsPost.findUnique({
      where: { id: postId },
      select: { id: true, projectId: true, title: true },
    });
    if (!post) return null;
    return {
      postId: post.id,
      projectId: post.projectId,
      postTitle: post.title,
    };
  }
}
