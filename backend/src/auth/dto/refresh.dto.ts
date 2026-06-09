import { Length } from 'class-validator';

export class RefreshDto {
  @Length(64, 64)
  refresh_token: string;
}
