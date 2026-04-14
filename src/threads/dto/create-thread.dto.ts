import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';

export enum ToneEnum {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  URGENT = 'urgent',
  NEUTRAL = 'neutral',
}

export class CreateThreadDto {
  @IsString()
  @MinLength(5, { message: 'Prompt must be at least 5 characters' })
  @MaxLength(2000, { message: 'Prompt too long' })
  prompt: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsEnum(ToneEnum, { message: 'Tone must be one of: professional, casual, friendly, urgent, neutral' })
  tone?: ToneEnum = ToneEnum.PROFESSIONAL;
}
