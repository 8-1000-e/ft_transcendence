import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GroupChatService } from './group-chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Body } from '@nestjs/common';
import { Param, Req } from '@nestjs/common';
import type { AuthedRequest } from 'src/auth/authed-request';

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

  @Get('groups/:groupId/messages')
  @UseGuards(JwtAuthGuard)
  getMessages(@Param('groupId') groupId: string, @Req() req: AuthedRequest) {
    return this.chatService.getMessages(groupId, req.user.sub);
  }
}
