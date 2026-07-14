import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { AuthedRequest } from 'src/auth/authed-request';
import { FriendsService } from './friends.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.friends.list(req.user.sub);
  }

  @Get('requests')
  requests(@Req() req: AuthedRequest) {
    return this.friends.incomingRequests(req.user.sub);
  }

  @Get('status/:id')
  status(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.friends.status(req.user.sub, id);
  }

  @Post(':id')
  request(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.friends.request(req.user.sub, id);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.friends.accept(req.user.sub, id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.friends.remove(req.user.sub, id);
  }
}
