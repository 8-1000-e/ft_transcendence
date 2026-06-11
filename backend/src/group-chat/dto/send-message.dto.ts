import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  Matches,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^\/uploads\/[\w-]+\.\w+$/, { each: true })
  @MaxLength(255, { each: true })
  filesUrl?: string[];
}
