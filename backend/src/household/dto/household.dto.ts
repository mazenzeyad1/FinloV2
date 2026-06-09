import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateHouseholdDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class InviteMemberDto {
  @Transform(({ value }) => value?.trim?.()?.toLowerCase?.() || value)
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
