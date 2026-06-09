import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupChatModule } from './group-chat/group-chat.module';
import { GroupsModule } from './groups/groups.module';
import { FtApiModule } from './ftapi/ftapi.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    GroupChatModule,
    GroupsModule,
    FtApiModule,
  ],
})
export class AppModule {}
