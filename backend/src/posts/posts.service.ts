import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { VoteDto } from './dto/vote.dto';
import { VoteValue } from 'generated/prisma/client';
import { assertFilesExist } from 'src/utils/files';
import { authorView } from 'src/utils/anonymize';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async sendPost(id: string, body: CreatePostDto, userId: string) {
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.ftId) throw new UnauthorizedException();

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

  async getPosts(id: string, userId: string) {
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const posts = await this.prisma.projectsPost.findMany({
      where: { projectId: id },
      orderBy: { postedAt: 'desc' },
      include: {
        _count: { select: { chats: true } },
        votes: true,
        user: {
          select: {
            name: true,
            ftId: true,
            ftPfpUrl: true,
            campus: true,
            rdmCampus: true,
            rdmName: true,
            rdmPfp: true,
          },
        },
      },
    });

    return posts.map(({ votes, ...post }) => {
      const upvotes = votes.filter((v) => v.vote === VoteValue.UP).length;
      const downvotes = votes.filter((v) => v.vote === VoteValue.DOWN).length;
      const myVote = votes.find((v) => v.userId === userId)?.vote ?? null;

      return {
        ...post,
        upvotes,
        downvotes,
        myVote,
        user: authorView(user, post.user),
      };
    });
  }

  ////COMMENT

  async sendComment(id: string, body: CreateCommentDto, userId: string) {
    const post = await this.prisma.projectsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.ftId) throw new UnauthorizedException();

    assertFilesExist(body.filesUrl);

    return this.prisma.projectsChat.create({
      data: {
        answeringPost: id,
        writer: userId,
        content: body.content,
        filesUrl: body.filesUrl,
      },
    });
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

  async getComments(id: string, userId: string) {
    const post = await this.prisma.projectsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const comments = await this.prisma.projectsChat.findMany({
      where: { answeringPost: id },
      orderBy: { postedAt: 'desc' },
      include: {
        _count: { select: { replies: true } },
        votes: true,
        user: {
          select: {
            name: true,
            ftId: true,
            ftPfpUrl: true,
            campus: true,
            rdmCampus: true,
            rdmName: true,
            rdmPfp: true,
          },
        },
      },
    });

    return comments.map(({ votes, ...comment }) => {
      const upvotes = votes.filter((v) => v.vote === VoteValue.UP).length;
      const downvotes = votes.filter((v) => v.vote === VoteValue.DOWN).length;
      const myVote = votes.find((v) => v.userId === userId)?.vote ?? null;

      return {
        ...comment,
        upvotes,
        downvotes,
        myVote,
        user: authorView(user, comment.user),
      };
    });
  }

  ///REPLIES
  async sendReply(id: string, body: CreateCommentDto, userId: string) {
    const comment = await this.prisma.projectsChat.findUnique({
      where: { id },
    });
    if (!comment) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.ftId) throw new UnauthorizedException();

    assertFilesExist(body.filesUrl);

    return this.prisma.projectsChat.create({
      data: {
        answeringChat: id,
        writer: userId,
        content: body.content,
        filesUrl: body.filesUrl,
      },
    });
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
      orderBy: { postedAt: 'desc' },
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

    return replies.map(({ votes, ...reply }) => {
      const upvotes = votes.filter((v) => v.vote === VoteValue.UP).length;
      const downvotes = votes.filter((v) => v.vote === VoteValue.DOWN).length;
      const myVote = votes.find((v) => v.userId === userId)?.vote ?? null;

      return {
        ...reply,
        upvotes,
        downvotes,
        myVote,
        user: authorView(user, reply.user),
      };
    });
  }

  //LIKES
  async votePost(id: string, body: VoteDto, userId: string) {
    const post = await this.prisma.projectsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.ftId) throw new UnauthorizedException();

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
    if (!user?.ftId) throw new UnauthorizedException();

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
}
