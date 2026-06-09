import { Module } from '@nestjs/common';
import { FtService } from './ft.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FtService],
  exports: [FtService],
})
export class FtModule {}
