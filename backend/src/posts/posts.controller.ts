import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import type { AuthedRequest } from 'src/auth/authed-request';
import { VoteDto } from './dto/vote.dto';

@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post('project/:projectId/posts')
  @UseGuards(JwtAuthGuard)
  sendPost(
    @Param('projectId') id: string,
    @Body() body: CreatePostDto,
    @Req() req: AuthedRequest,
  ) {
    return this.postsService.sendPost(id, body, req.user.sub);
  }

  @Patch('project/:projectId/:postId')
  @UseGuards(JwtAuthGuard)
  editPost(
    @Param('projectId') id: string,
    @Param('postId') postId: string,
    @Body() body: CreatePostDto,
    @Req() req: AuthedRequest,
  ) {
    return this.postsService.editPost(id, postId, body, req.user.sub);
  }

  @Get('project/:projectId/posts')
  @UseGuards(JwtAuthGuard)
  getPosts(@Param('projectId') id: string, @Req() req: AuthedRequest) {
    return this.postsService.getPosts(id, req.user.sub);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  getFeed(@Req() req: AuthedRequest) {
    return this.postsService.getFeed(req.user.sub);
  }

  //COMMENT
  @Post('posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  sendComment(
    @Param('postId') id: string,
    @Body() body: CreateCommentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.postsService.sendComment(id, body, req.user.sub);
  }

  @Patch('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  editComment(
    @Param('commentId') id: string,
    @Body() body: CreateCommentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.postsService.editComment(id, body, req.user.sub);
  }

  @Get('posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  getComments(@Param('postId') id: string, @Req() req: AuthedRequest) {
    return this.postsService.getComments(id, req.user.sub);
  }

  //REPLIES

  @Post('comments/:commentId/replies')
  @UseGuards(JwtAuthGuard)
  sendReply(
    @Param('commentId') id: string,
    @Body() body: CreateCommentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.postsService.sendReply(id, body, req.user.sub);
  }

  @Patch('replies/:replyId')
  @UseGuards(JwtAuthGuard)
  editReply(
    @Param('replyId') id: string,
    @Body() body: CreateCommentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.postsService.editReply(id, body, req.user.sub);
  }

  @Get('comments/:commentId/replies')
  @UseGuards(JwtAuthGuard)
  getReplies(@Param('commentId') id: string, @Req() req: AuthedRequest) {
    return this.postsService.getReplies(id, req.user.sub);
  }

  //LIKES

  @Post('posts/:postId/vote')
  @UseGuards(JwtAuthGuard)
  votePost(
    @Param('postId') id: string,
    @Body() body: VoteDto,
    @Req() req: AuthedRequest,
  ) {
    return this.postsService.votePost(id, body, req.user.sub);
  }

  @Post('comments/:commentId/vote')
  @UseGuards(JwtAuthGuard)
  voteChat(
    @Param('commentId') id: string,
    @Body() body: VoteDto,
    @Req() req: AuthedRequest,
  ) {
    return this.postsService.voteChat(id, body, req.user.sub);
  }
}
