import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHouseholdDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
