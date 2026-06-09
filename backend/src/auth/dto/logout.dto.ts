import { Length } from 'class-validator';

export class LogoutDto {
  @Length(64, 64)
  refresh_token: string;
}
