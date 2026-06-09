import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthedRequest, JwtPayload } from './authed-request';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) throw new UnauthorizedException();
    const token = authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedException();

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }
}
