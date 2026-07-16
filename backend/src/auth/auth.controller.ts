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
import { LoginTwoFactorDto } from './dto/login-2fa.dto';
import { VerifyDto } from './dto/verify.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { randomBytes } from 'crypto';
import type { Response } from 'express';
import type { RequestWithCookies } from './authed-request';
import { AllowWhilePending } from './allow-pending.decorator';

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

  @Post('login/2fa')
  loginTwoFactor(@Body() body: LoginTwoFactorDto) {
    return this.authService.loginTwoFactor(
      body.email,
      body.password,
      body.code,
    );
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

  // Links 42 to the current account. The token rides in a query param because a
  // browser redirect can't carry an Authorization header.
  @Get('auth/42/link')
  ftLink(@Query('token') token: string, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    let userId: string;
    try {
      userId = this.authService.verifyToken(token);
    } catch {
      return res.redirect(`${frontendUrl}/settings?error=link_auth`);
    }
    const state = `link.${userId}.${randomBytes(8).toString('hex')}`;
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
    // A `link.<userId>.<rand>` state means: attach 42 to that existing account.
    const isLink = state.startsWith('link.');
    try {
      const { access_token, refresh_token } = isLink
        ? await this.authService.linkFtAccount(state.split('.')[1], code)
        : await this.authService.getFtCallback(code);
      return res.redirect(
        `${frontendUrl}/auth/callback#access_token=${access_token}&refresh_token=${refresh_token}${isLink ? '&linked=1' : ''}`,
      );
    } catch {
      // A failed link (e.g. that 42 already owns an account) goes back to
      // Settings, not the login screen.
      return res.redirect(
        isLink
          ? `${frontendUrl}/settings?link_error=1`
          : `${frontendUrl}/login?error=ft_auth_failed`,
      );
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @AllowWhilePending()
  logout(@Body() body: LogoutDto) {
    return this.authService.logout(body.refresh_token);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refresh_token);
  }
}
