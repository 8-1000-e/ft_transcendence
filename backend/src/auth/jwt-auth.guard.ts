import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate
{
    constructor(private readonly jwtService: JwtService) {}

    canActivate(ctx: ExecutionContext)
    {
        const request = ctx.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        
        if (!authHeader)
                throw new UnauthorizedException();
        const token = authHeader.split(' ')[1];
        if (!token)
                throw new UnauthorizedException();
        
        try
        {
            const payload = this.jwtService.verify(token);
            request.user = payload;
        }
        catch
        {
            throw new UnauthorizedException();
        }

        return true;
    }
}