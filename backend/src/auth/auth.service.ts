import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';
import { randomInt, randomBytes, createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { FtApiService } from 'src/ftapi/ftapi.services';
import { Prisma, User } from 'generated/prisma/client';
import { randomIdentity } from 'src/utils/anon';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly ft: FtApiService,
  ) {}

  createAccessToken(userId: string, tokenVersion: number) {
    const payload = { sub: userId, tv: tokenVersion };
    return this.jwtService.sign(payload);
  }

  async signup(email: string, password: string, name: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException(`Email ${email} already exist`);

    const passwordHash = await bcrypt.hash(password, 10);
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.pendingRegistration.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        verifCode: code,
        verifCodeExpiresAt: expiresAt,
      },
      create: {
        email,
        name,
        passwordHash,
        verifCode: code,
        verifCodeExpiresAt: expiresAt,
      },
    });

    await this.mail.sendVerificationEmail(email, code);

    return { message: `Verification code sent to ${email}` };
  }

  private async issueTokens(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    const refresh_token = await this.createRefreshToken(userId);
    const access_token = this.createAccessToken(
      userId,
      user?.tokenVersion ?? 0,
    );
    return { refresh_token, access_token };
  }

  async verify(email: string, code: string) {
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { email },
    });

    if (!pending)
      throw new BadRequestException(`No pending registration for ${email}`);

    if (pending.verifCode !== code)
      throw new BadRequestException('Invalid code');

    if (pending.verifCodeExpiresAt < new Date())
      throw new BadRequestException('Code Expired');

    const rdmData = await randomIdentity();

    try {
      const [user] = await this.prisma.$transaction([
        this.prisma.user.create({
          data: {
            email,
            name: pending.name,
            passwordHash: pending.passwordHash,
            rdmName: rdmData.name,
            rdmCampus: rdmData.city,
            rdmPfp: rdmData.pfp,
          },
        }),
        this.prisma.pendingRegistration.delete({ where: { email } }),
      ]);
      return this.issueTokens(user.id);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new BadRequestException('Email already taken');
      throw e;
    }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException();

    let match;
    if (user.passwordHash)
      match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new UnauthorizedException();

    this.ft.syncUserTeam(user.id).catch(() => {});
    return this.issueTokens(user.id);
  }

  // Verify an access token out-of-band (the 42-link redirect can't send an
  // Authorization header) and return its user id.
  verifyToken(token: string): string {
    const payload = this.jwtService.verify<{ sub: string }>(token);
    return payload.sub;
  }

  // Attach a 42 identity to an existing account; refuses if that 42 account is
  // already linked to another user.
  async linkFtAccount(userId: string, code: string) {
    const ftProfile = await this.ft.getProfileFromCode(code);
    const ftId = String(ftProfile.id);

    const owner = await this.prisma.user.findUnique({ where: { ftId } });
    if (owner && owner.id !== userId) {
      throw new BadRequestException(
        'This 42 account is already linked to another user',
      );
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ftId,
        login: ftProfile.login,
        ftPfpUrl: ftProfile.image?.link ?? null,
        campus: ftProfile.campus?.[0]?.name ?? null,
        campusId:
          ftProfile.campus?.[0]?.id != null
            ? String(ftProfile.campus[0].id)
            : null,
      },
    });
    this.ft.syncUserTeam(user.id).catch(() => {});
    return this.issueTokens(user.id);
  }

  getFtAuthUrl(state: string) {
    const clientId = this.config.getOrThrow<string>('FT_OAUTH_CLIENT_ID');
    const redirectUri = encodeURIComponent(
      this.config.getOrThrow<string>('FT_OAUTH_REDIRECT_URI'),
    );
    return `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=public&state=${state}`;
  }

  async getFtCallback(code: string) {
    const ftProfile = await this.ft.getProfileFromCode(code);

    const ftId = String(ftProfile.id);
    const email = ftProfile.email;
    const login = ftProfile.login;
    const ftPfpUrl = ftProfile.image?.link ?? null;
    const campus = ftProfile.campus?.[0]?.name ?? null;
    const campusId =
      ftProfile.campus?.[0]?.id != null ? String(ftProfile.campus[0].id) : null;

    const existing = await this.prisma.user.findUnique({ where: { ftId } });

    let user: User;
    if (existing) {
      // `login` is the immutable real handle; `name` is the editable pseudo and
      // is NOT overwritten on re-login (the user may have changed it).
      user = await this.prisma.user.update({
        where: { ftId },
        data: { login, ftPfpUrl, campus, campusId },
      });
    } else {
      const rdmData = await randomIdentity();
      user = await this.prisma.user.upsert({
        where: { email },
        update: { ftId, login, ftPfpUrl, campus, campusId },
        create: {
          ftId,
          login,
          email,
          name: login, // initial pseudo defaults to the 42 login
          ftPfpUrl,
          campus,
          campusId,
          rdmName: rdmData.name,
          rdmPfp: rdmData.pfp,
          rdmCampus: rdmData.city,
        },
      });
    }

    this.ft.syncUserTeam(user.id).catch(() => {});
    return this.issueTokens(user.id);
  }

  async logout(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });

    return { message: 'Logged out successfully' };
  }

  async createRefreshToken(userId: string) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 60 * 60 * 24 * 1000);

    await this.prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    return token;
  }

  async refresh(refreshToken: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored) throw new UnauthorizedException();

    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
    if (count === 0) throw new UnauthorizedException();

    // Team sync runs on login, not on refresh (frequent) — no 42 re-crawl here.
    return this.issueTokens(stored.userId);
  }
}
