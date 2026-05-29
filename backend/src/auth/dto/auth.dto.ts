import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsString() @IsNotEmpty() firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString() @IsNotEmpty() lastName: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail() email: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString() @MinLength(8) password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail() email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString() @IsNotEmpty() password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail() email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123...' })
  @IsString() @IsNotEmpty() token: string;

  @ApiProperty({ example: 'NewPass456!' })
  @IsString() @MinLength(8) password: string;
}
