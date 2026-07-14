import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  // AuthModule provides JwtService for the JwtAuthGuard used on the controller.
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
