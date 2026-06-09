import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Patch,
  Body,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthedRequest } from 'src/auth/authed-request';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: AuthedRequest) {
    return this.usersService.getProfile(request.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Body() body: UpdateProfileDto, @Req() req: AuthedRequest) {
    return this.usersService.updateProfile(req.user.sub, body);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteMe(@Req() req: AuthedRequest) {
    return this.usersService.deleteAccount(req.user.sub);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard)
  getUser(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }
}
