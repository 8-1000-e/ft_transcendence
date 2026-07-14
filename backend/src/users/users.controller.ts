import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Patch,
  Body,
  Delete,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthedRequest } from 'src/auth/authed-request';
import { AllowWhilePending } from 'src/auth/allow-pending.decorator';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: AuthedRequest) {
    return this.usersService.getProfile(request.user.sub);
  }

  @Get('me/activity')
  @UseGuards(JwtAuthGuard)
  getMyActivity(@Req() request: AuthedRequest) {
    return this.usersService.getActivity(request.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Body() body: UpdateProfileDto, @Req() req: AuthedRequest) {
    return this.usersService.updateProfile(req.user.sub, body);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteMe(@Req() req: AuthedRequest) {
    return this.usersService.requestDeletion(req.user.sub);
  }

  @Post('me/cancel')
  @UseGuards(JwtAuthGuard)
  @AllowWhilePending()
  cancelDelete(@Req() req: AuthedRequest) {
    return this.usersService.cancelDelete(req.user.sub);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard)
  getUser(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.usersService.getUserProfile(id, req.user.sub);
  }

  @Get('avatar/:id')
  @UseGuards(JwtAuthGuard)
  async getAvatar(@Param('id') id: string): Promise<StreamableFile> {
    const { buffer, contentType } = await this.usersService.getAvatar(id);
    return new StreamableFile(buffer, { type: contentType });
  }
}
