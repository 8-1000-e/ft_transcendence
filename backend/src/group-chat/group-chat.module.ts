import { Module } from '@nestjs/common';
import { GroupChatController } from './group-chat.controller';
import { GroupChatService } from './group-chat.service';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PusherModule } from 'src/pusher/pusher.module';

@Module({
  imports: [AuthModule, PrismaModule, PusherModule],
  controllers: [GroupChatController],
  providers: [GroupChatService],
})
export class GroupChatModule {}
