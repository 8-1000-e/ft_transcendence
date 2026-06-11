import { Module } from '@nestjs/common';
import { FtApiModule } from 'src/ftapi/ftapi.module';
import { SuggestService } from './suggest.services';
import { SuggestController } from './suggest.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [FtApiModule, AuthModule, PrismaModule],
  controllers: [SuggestController],
  providers: [SuggestService],
  exports: [SuggestService],
})
export class SuggestModule {}
