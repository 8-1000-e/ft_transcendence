import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GroupChatService } from './group-chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import type { AuthedRequest } from 'src/auth/authed-request';
import type { Response } from 'express';
import { join } from 'path';

@Controller()
export class GroupChatController {
  constructor(private readonly chatService: GroupChatService) {}

  @Post('groups/:groupId/message')
  @UseGuards(JwtAuthGuard)
  postMessage(
    @Param('groupId') groupId: string,
    @Body() body: SendMessageDto,
    @Req() req: AuthedRequest,
  ) {
    return this.chatService.sendMessage(
      groupId,
      req.user.sub,
      body.content,
      body.filesUrl,
    );
  }

  @Post('groups/:groupId/message/:replyMessageId')
  @UseGuards(JwtAuthGuard)
  postReplyMessage(
    @Param('groupId') groupId: string,
    @Body() body: SendMessageDto,
    @Req() req: AuthedRequest,
    @Param('replyMessageId') replyMessageId?: string,
  ) {
    return this.chatService.sendMessage(
      groupId,
      req.user.sub,
      body.content,
      body.filesUrl,
      replyMessageId,
    );
  }

  @Get('groups/:groupId/messages')
  @UseGuards(JwtAuthGuard)
  getMessages(
    @Param('groupId') groupId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: AuthedRequest,
  ) {
    return this.chatService.getMessages(groupId, req.user.sub, from, to);
  }

  @Patch('groups/:groupId/messages/:messageId')
  @UseGuards(JwtAuthGuard)
  editMessage(
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() body: SendMessageDto,
    @Req() req: AuthedRequest,
  ) {
    return this.chatService.editMessage(
      groupId,
      messageId,
      req.user.sub,
      body.content,
      body.filesUrl,
    );
  }

  @Delete('groups/:groupId/messages/:messageId')
  @UseGuards(JwtAuthGuard)
  deleteMessage(
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.chatService.deleteMessage(groupId, messageId, req.user.sub);
  }

  @Get('files/:filename')
  @UseGuards(JwtAuthGuard)
  async getFile(
    @Param('filename') filename: string,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    const safe = await this.chatService.getFile(filename, req.user.sub);
    res.sendFile(join(process.cwd(), 'private-uploads', safe));
  }
}
