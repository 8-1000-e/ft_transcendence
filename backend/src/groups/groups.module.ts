import { Module } from '@nestjs/common';
import { GroupController } from './groups.controller';
import { GroupService } from './groups.service';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FtApiModule } from 'src/ftapi/ftapi.module';

@Module({
  imports: [AuthModule, PrismaModule, FtApiModule],
  controllers: [GroupController],
  providers: [GroupService],
})
export class GroupsModule {}
