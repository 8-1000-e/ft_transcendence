import { Controller, Get, UseGuards, Req, Post, Body, Query, Res, UnauthorizedException} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyDto } from "./dto/verify.dto";
import {RefreshDto} from "./dto/refresh.dto";
import {LogoutDto} from "./dto/logout.dto";
import { randomBytes} from "crypto";
import type { Response } from 'express';

@Controller()
export class AuthController
{
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    signup(@Body() body: SignupDto)
    {
        return this.authService.signup(body.email, body.password, body.name);
    }

    @Post('login')
    login(@Body() body: LoginDto)
    {
        return this.authService.login(body.email, body.password);
    }
    
    @Post('verify')
    verify(@Body() body: VerifyDto)
    {
        return this.authService.verify(body.email, body.code);
    }
    
    @Get('auth/42')
    ftAuth(@Res() res: Response)
    {
            const state = randomBytes(16).toString('hex');
            res.cookie('oauth_state', state, {httpOnly: true, maxAge: 5 * 60 * 1000});
            res.redirect(this.authService.getFtAuthUrl(state));
    }

    @Get('auth/42/callback')
    async ftCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Req() req: any,
    )
    {
        const cookieState = req.cookies['oauth_state'];
        if (!cookieState || cookieState !== state)
            throw new UnauthorizedException('Invalid Oauth state');
        try 
        {
            return await this.authService.getFtCallback(code);
        }
        catch
        {
            throw new UnauthorizedException("42 auth failed");
        }
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    logout(@Body() body: LogoutDto)
    {
        return this.authService.logout(body.refresh_token);
    }

    @Post('refresh')
    refresh(@Body() body: RefreshDto)
    {
        return this.authService.refresh(body.refresh_token);
    }

}
