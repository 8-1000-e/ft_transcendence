import {Injectable} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/prisma/prisma.service";
import * as bcrypt from 'bcrypt'
import { UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AuthService
{
    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
    ) {}

    createAccessToken(userId: string)
    {
        const payload = {sub: userId};
        return this.jwtService.sign(payload);
    }

    async signup(email: string, password: string, name: string)
    {
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.create({
            data: {email, name, passwordHash}
        })

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