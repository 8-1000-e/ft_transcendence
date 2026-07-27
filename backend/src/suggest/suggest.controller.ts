import { Controller, UseGuards, Param, Get, Req } from '@nestjs/common';
import { SuggestService } from './suggest.services';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { SuggestedUser } from './suggest.types';
import type { AuthedRequest } from 'src/auth/authed-request';

@Controller()
export class SuggestController {
  constructor(private readonly suggesService: SuggestService) {}
  // Auto-campus: uses the logged-in 42 user's own campus (no typed campusId).
  @Get(`suggest/:projectId`)
  @UseGuards(JwtAuthGuard)
  getSuggestForMe(
    @Param('projectId') projectId: string,
    @Req() req: AuthedRequest,
  ): Promise<SuggestedUser[]> {
    return this.suggesService.getSuggestForMe(projectId, req.user.sub);
  }
}
