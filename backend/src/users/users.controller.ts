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
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TwoFactorDto } from './dto/two-factor.dto';
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

  @Get('me/export')
  @UseGuards(JwtAuthGuard)
  @AllowWhilePending()
  exportData(@Req() req: AuthedRequest) {
    return this.usersService.exportData(req.user.sub);
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

  @Post('me/2fa/setup')
  @UseGuards(JwtAuthGuard)
  setup2fa(@Req() req: AuthedRequest) {
    return this.usersService.setupTwoFactor(req.user.sub);
  }

  @Post('me/2fa/enable')
  @UseGuards(JwtAuthGuard)
  enable2fa(@Body() body: TwoFactorDto, @Req() req: AuthedRequest) {
    return this.usersService.enableTwoFactor(req.user.sub, body.code);
  }

  @Post('me/2fa/disable')
  @UseGuards(JwtAuthGuard)
  disable2fa(@Body() body: TwoFactorDto, @Req() req: AuthedRequest) {
    return this.usersService.disableTwoFactor(req.user.sub, body.code);
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

  // Another user's public forum activity; same shape as GET /me/activity.
  @Get('users/:id/activity')
  @UseGuards(JwtAuthGuard)
  getUserActivity(@Param('id') id: string) {
    return this.usersService.getActivity(id);
  }

  // Proxy a 42-CDN image URL (suggested mentors aren't app users); 42-only data,
  // SSRF-guarded server-side.
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | void> {
    // No picture → 204 (not 404) to keep the console clean; Avatar shows initials.
    const img = await this.usersService.getAvatar(id, req.user.sub);
    if (!img) {
      res.status(204);
      return;
    }
    return new StreamableFile(img.buffer, { type: img.contentType });
  }
}
