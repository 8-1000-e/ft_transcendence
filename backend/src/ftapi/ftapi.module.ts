import { Module } from '@nestjs/common';
import { FtApiService } from './ftapi.services';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  // FtApiService demande PrismaService dans son constructeur.
  // Importer PrismaModule ici rend PrismaService disponible dans CE module Nest.
  imports: [PrismaModule],

  // Le service contient la logique: token, fetch, erreurs, appels API 42.
  providers: [FtApiService],

  // Export permet aux autres modules d'injecter FtApiService plus tard.
  exports: [FtApiService],
})
export class FtApiModule {}
