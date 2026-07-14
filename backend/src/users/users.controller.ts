import {
  Controller,
  Get,
  Param,
  Query,
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
import { ChangePasswordDto } from './dto/change-password.dto';
import type { AuthedRequest } from 'src/auth/authed-request';
import { AllowWhilePending } from 'src/auth/allow-pending.decorator';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @AllowWhilePending()
  getMe(@Req() request: AuthedRequest) {
    // Allowed while pending deletion so a scheduled-for-deletion user can log
    // back in, see the pending banner, and cancel (POST /me/cancel).
    return this.usersService.getProfile(request.user.sub);
  }

  @Get('me/activity')
  @UseGuards(JwtAuthGuard)
  getMyActivity(@Req() request: AuthedRequest) {
    return this.usersService.getActivity(request.user.sub);
  }

  @Post('me/ping')
  @UseGuards(JwtAuthGuard)
  ping(@Req() req: AuthedRequest) {
    return this.usersService.touchLastSeen(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Body() body: UpdateProfileDto, @Req() req: AuthedRequest) {
    return this.usersService.updateProfile(req.user.sub, body);
  }

  @Post('me/password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() body: ChangePasswordDto, @Req() req: AuthedRequest) {
    return this.usersService.setPassword(
      req.user.sub,
      body.currentPassword,
      body.newPassword,
    );
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

  // Public activity (posts + comments) for another user's profile — the content
  // is public forum content; reuses the same shape as GET /me/activity.
  @Get('users/:id/activity')
  @UseGuards(JwtAuthGuard)
  getUserActivity(@Param('id') id: string) {
    return this.usersService.getActivity(id);
  }

  // Proxy a 42-CDN image URL (suggested mentors aren't app users). 42-only data,
  // SSRF-guarded server-side. Declared before avatar/:id (different path).
  @Get('ft-avatar')
  @UseGuards(JwtAuthGuard)
  async getFtAvatar(
    @Query('url') url: string,
    @Req() req: AuthedRequest,
  ): Promise<StreamableFile> {
    const { buffer, contentType } = await this.usersService.proxyFtImage(
      url ?? '',
      req.user.sub,
    );
    return new StreamableFile(buffer, { type: contentType });
  }

  @Get('avatar/:id')
  @UseGuards(JwtAuthGuard)
  async getAvatar(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ): Promise<StreamableFile> {
    const { buffer, contentType } = await this.usersService.getAvatar(
      id,
      req.user.sub,
    );
    return new StreamableFile(buffer, { type: contentType });
  }
}
