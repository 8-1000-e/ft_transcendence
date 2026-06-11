import {
  Controller,
  Get,
  UseGuards,
  Req,
  Post,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { randomBytes } from 'crypto';
import type { Response } from 'express';
import type { RequestWithCookies } from './authed-request';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body.email, body.password, body.name);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('verify')
  verify(@Body() body: VerifyDto) {
    return this.authService.verify(body.email, body.code);
  }

  @Get('auth/42')
  ftAuth(@Res() res: Response) {
    const state = randomBytes(16).toString('hex');
    res.cookie('oauth_state', state, { httpOnly: true, maxAge: 5 * 60 * 1000 });
    res.redirect(this.authService.getFtAuthUrl(state));
  }

  @Get('auth/42/callback')
  async ftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: RequestWithCookies,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const cookieState = req.cookies['oauth_state'];
    if (!cookieState || cookieState !== state)
      return res.redirect(`${frontendUrl}/login?error=invalid_state`);
    try {
      const { access_token, refresh_token } =
        await this.authService.getFtCallback(code);
      return res.redirect(
        `${frontendUrl}/auth/callback#access_token=${access_token}&refresh_token=${refresh_token}`,
      );
    } catch {
      return res.redirect(`${frontendUrl}/login?error=ft_auth_failed`);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body.refresh_token);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refresh_token);
  }
}
