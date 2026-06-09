import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async sendPost(id: string, body: CreatePostDto, userId: string) {
    const project = await this.prisma.projects.findUnique({ where: { id } });
    if (!project) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.ftId) throw new UnauthorizedException();

    return this.prisma.projectsPost.create({
      data: {
        projectId: id,
        writer: userId,
        title: body.title,
        content: body.content,
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

    const editedPost = await this.prisma.projectsPost.update({
      where: { id: postId },
      data: { title: body.title, content: body.content, editedAt: new Date() },
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
        user: {
          select: { name: true, ftId: true, ftPfpUrl: true, campus: true },
        },
      },
    });

    return posts.map((post) => {
      if (user && !user.ftId) {
        const name = `ft_user${post.writer.slice(0, 6)}`;
        return {
          ...post,
          user: {
            name,
            ftPfpUrl: `https://api.dicebear.com/9.x/identicon/svg?seed=${post.writer}`,
          },
        };
      }
      return post;
    });
  }

  ////COMMENT

  async sendComment(id: string, body: CreateCommentDto, userId: string) {
    const post = await this.prisma.projectsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.ftId) throw new UnauthorizedException();

    return this.prisma.projectsChat.create({
      data: {
        answeringPost: id,
        writer: userId,
        content: body.content,
      },
    });
  }

  async editComment(commentId: string, body: CreateCommentDto, userId: string) {
    const comment = await this.prisma.projectsChat.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();
    if (comment.writer !== userId) throw new UnauthorizedException();

    return this.prisma.projectsChat.update({
      where: { id: commentId },
      data: { content: body.content, editedAt: new Date() },
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
        user: {
          select: { name: true, ftId: true, ftPfpUrl: true, campus: true },
        },
      },
    });

    return comments.map((reply) => {
      if (user && !user.ftId) {
        const name = `ft_user${reply.writer.slice(0, 6)}`;
        return {
          ...reply,
          user: {
            name,
            ftPfpUrl: `https://api.dicebear.com/9.x/identicon/svg?seed=${reply.writer}`,
          },
        };
      }
      return reply;
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

    return this.prisma.projectsChat.create({
      data: {
        answeringChat: id,
        writer: userId,
        content: body.content,
      },
    });
  }

  async editReply(commentId: string, body: CreateCommentDto, userId: string) {
    const comment = await this.prisma.projectsChat.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException();
    if (comment.writer !== userId) throw new UnauthorizedException();

    return this.prisma.projectsChat.update({
      where: { id: commentId },
      data: { content: body.content, editedAt: new Date() },
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
        user: {
          select: { name: true, ftId: true, ftPfpUrl: true, campus: true },
        },
      },
    });

    return replies.map((reply) => {
      if (user && !user.ftId) {
        const name = `ft_user${reply.writer.slice(0, 6)}`;
        return {
          ...reply,
          user: {
            name,
            ftPfpUrl: `https://api.dicebear.com/9.x/identicon/svg?seed=${reply.writer}`,
          },
        };
      }
      return reply;
    });
  }
}
