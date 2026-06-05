import { Controller, Get, UseGuards, Req, Post, Body} from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyDto } from "./dto/verify.dto";
import {RefreshDto} from "./dto/refresh.dto"

@Controller()
export class AuthController
{
    constructor(private readonly authService: AuthService) {}

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Req() request: any) 
    {

        return this.authService.getProfile(request.user.sub);
    }

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

    @Post('refresh')
    refresh(@Body() body: RefreshDto)
    {
        return this.authService.refresh(body.refresh_token);
    }

}
