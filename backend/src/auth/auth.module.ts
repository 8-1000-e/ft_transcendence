import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [JwtModule.registerAsync({
        inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
              secret: config.get('JWT_SECRET'),
              signOptions: {expiresIn: '15m'}
              }),
              }),
          MailModule,
          PrismaModule,
        
        ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})

export class AuthModule {}
