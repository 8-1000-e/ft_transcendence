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
import { FtService } from './ftService.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly ft: FtService,
  ) {}

  createAccessToken(userId: string) {
    const payload = { sub: userId };
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
    const refresh_token = await this.createRefreshToken(userId);
    const access_token = this.createAccessToken(userId);
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

    const user = await this.prisma.user.create({
      data: { email, name: pending.name, passwordHash: pending.passwordHash },
    });

    await this.prisma.pendingRegistration.delete({ where: { email } });

    return this.issueTokens(user.id);
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
    const name = ftProfile.login;
    const ftPfpUrl = ftProfile.image?.link ?? null;
    const campus = ftProfile.campus?.[0]?.name ?? null;

    const user = await this.prisma.user.upsert({
      where: { email },
      update: { ftId, ftPfpUrl, campus },
      create: { ftId, email, name, ftPfpUrl, campus },
    });

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

    if (!stored || stored.expiresAt < new Date())
      throw new UnauthorizedException();

    await this.prisma.refreshToken.delete({ where: { tokenHash } });
    this.ft.syncUserTeam(stored.userId).catch(() => {});
    return this.issueTokens(stored.userId);
  }
}
