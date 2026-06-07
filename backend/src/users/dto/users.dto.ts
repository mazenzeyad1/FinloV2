import { IsString, IsNotEmpty, IsOptional, MinLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional() @IsString() @IsNotEmpty() firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional() @IsString() @IsNotEmpty() lastName?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPass123!' })
  @IsString() @IsNotEmpty() currentPassword: string;

  @ApiProperty({ example: 'NewPass456!', minLength: 8 })
  @IsString() @MinLength(8) newPassword: string;
}

export class ChangeEmailDto {
  @ApiProperty({ example: 'new@example.com' })
  @IsEmail() newEmail: string;

  @ApiProperty({ example: 'CurrentPass123!' })
  @IsString() @IsNotEmpty() currentPassword: string;
}

export class DeleteAccountDto {
  @ApiProperty({ example: 'CurrentPass123!' })
  @IsString() @IsNotEmpty() password: string;
}
