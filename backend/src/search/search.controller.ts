import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(@Query('q') q: string) {
    return this.searchService.search(q ?? '');
  }
}
