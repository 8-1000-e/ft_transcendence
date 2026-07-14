import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthedRequest, JwtPayload } from './authed-request';
import { ALLOW_PENDING } from './allow-pending.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) throw new UnauthorizedException();
    const token = authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedException();

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, deleteAt: true, tokenVersion: true },
    });
    if (!user) throw new UnauthorizedException();
    // A password change bumps tokenVersion → all previously-issued access
    // tokens (which carry the old tv) are rejected here, forcing re-login.
    if ((payload.tv ?? 0) !== user.tokenVersion)
      throw new UnauthorizedException();

    const allowPending = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PENDING,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (user.deleteAt && !allowPending)
      throw new ForbiddenException({ code: 'ACCOUNT_PENDING_DELETION' });

    request.user = payload;
    return true;
  }
}
