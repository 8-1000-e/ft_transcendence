import { Injectable, OnModuleInit } from '@nestjs/common';
import { FtApiService } from 'src/ftapi/ftapi.services';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(private readonly ft: FtApiService) {}

  onModuleInit() {
    this.ft.syncAllProjects().catch((e) => console.error('INIT SYNC ERROR', e));
  }
}
