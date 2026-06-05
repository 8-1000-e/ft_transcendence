import {BadGatewayException, Injectable} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/prisma/prisma.service";
import * as bcrypt from 'bcrypt'
import { UnauthorizedException } from "@nestjs/common";
import { MailService } from "src/mail/mail.service";
import { randomInt } from "crypto";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class AuthService
{
    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly mail: MailService,
    ) {}

    createAccessToken(userId: string)
    {
        const payload = {sub: userId};
        return this.jwtService.sign(payload);
    }

    async signup(email: string, password: string, name: string)
    {
        const existing = await this.prisma.user.findUnique({where: {email}});
        if (existing)
            throw new BadRequestException(`Email ${email} already exist`);

        const passwordHash = await bcrypt.hash(password, 10);
        const code = randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.prisma.pendingRegistration.upsert({
            where: {email},
            update: {name, passwordHash, verifCode: code, verifCodeExpiresAt: expiresAt},
            create: {email, name, passwordHash, verifCode: code, verifCodeExpiresAt: expiresAt}
        })

        await this.mail.sendVerificationEmail(email, code);

        return { message: `Verification code sent to ${email}` };
    }

    async verify(email: string, code: string)
    {
        const pending = await this.prisma.pendingRegistration.findUnique({ where: { email } });

        if (!pending)
            throw new BadRequestException(`No pending registration for ${email}`);

        if (pending.verifCode !== code)
            throw new BadRequestException("Invalid code");

        if (pending.verifCodeExpiresAt < new Date())
            throw new BadRequestException('Code Expired');

        const user = await this.prisma.user.create({
                data: {email, name: pending.name, passwordHash: pending.passwordHash}
        });

        await this.prisma.pendingRegistration.delete({where: { email }});

        return this.createAccessToken(user.id);
    }

    async login(email: string, password:string)
    {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
                throw new UnauthorizedException();

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match)
                throw new UnauthorizedException();
        
        return this.createAccessToken(user.id);
    }

    async getProfile(userId: string)
    {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });
    }


}