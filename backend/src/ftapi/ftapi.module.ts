import { Module } from '@nestjs/common';
import { FtApiService } from './ftapi.services';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FtApiService],
  exports: [FtApiService],
})
export class FtApiModule {}
