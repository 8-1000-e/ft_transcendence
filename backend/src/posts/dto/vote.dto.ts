import { IsEnum } from 'class-validator';
import { VoteValue } from 'generated/prisma/client';

export class VoteDto {
  @IsEnum(VoteValue)
  vote: VoteValue;
}
