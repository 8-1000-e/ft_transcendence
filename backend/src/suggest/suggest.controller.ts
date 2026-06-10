import { Controller, UseGuards, Param, Get, Req } from '@nestjs/common';
import { SuggestService } from './suggest.services';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { SuggestedUser } from './suggest.types';
import type { AuthedRequest } from 'src/auth/authed-request';

@Controller()
export class SuggestController {
  constructor(private readonly suggesService: SuggestService) {}
  @Get(`suggest/:projectId/:campusId`)
  @UseGuards(JwtAuthGuard)
  getSuggest(
    @Param('projectId') projectId: string,
    @Param('campusId') campusId: string,
    @Req() req: AuthedRequest,
  ): Promise<SuggestedUser[]> {
    return this.suggesService.getSuggestByProject(
      projectId,
      campusId,
      req.user.sub,
    );
  }
}
