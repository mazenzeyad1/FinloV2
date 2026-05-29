import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, RefreshDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Post('login')
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) { return this.authService.refresh(dto.refreshToken); }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) { return this.authService.verifyEmail(token); }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto); }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) { return this.authService.resetPassword(dto); }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: any) { return this.authService.me(req.user.id); }
}
