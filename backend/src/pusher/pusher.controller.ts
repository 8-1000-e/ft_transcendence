import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { AuthedRequest } from 'src/auth/authed-request';
import { PusherService } from './pusher.services';

@Controller()
export class PusherController {
  constructor(private readonly pusherService: PusherService) {}

  @Post('pusher/auth')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  authorize(
    @Body('socket_id') socketId: string,
    @Body('channel_name') channelName: string,
    @Req() req: AuthedRequest,
  ) {
    if (!socketId || !channelName) {
      throw new BadRequestException('Missing Pusher socket_id or channel_name');
    }

    return this.pusherService.authorize(socketId, channelName, req.user.sub);
  }
}
