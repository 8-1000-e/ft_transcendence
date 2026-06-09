import { Injectable, OnModuleInit } from '@nestjs/common';
import { FtService } from 'src/ft/ft.service';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(private readonly ft: FtService) {}

  onModuleInit() {
    this.ft.syncAllProjects().catch((e) => console.error('INIT SYNC ERROR', e));
  }
}
