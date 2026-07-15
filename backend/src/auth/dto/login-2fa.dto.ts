import { IsEmail, IsString, Matches } from 'class-validator';

export class LoginTwoFactorDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;
}
