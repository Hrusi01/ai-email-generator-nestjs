import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ToneEnum } from './create-thread.dto';

export class ReplyThreadDto {
  @IsString()
  @MinLength(5, { message: 'Instructions must be at least 5 characters' })
  @MaxLength(2000, { message: 'Instructions too long' })
  replyInstruction: string;

  @IsOptional()
  @IsEnum(ToneEnum, { message: 'Tone must be one of: professional, casual, friendly, urgent, neutral' })
  tone?: ToneEnum;
}
