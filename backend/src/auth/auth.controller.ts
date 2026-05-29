import { Controller, Post, Get, Body, Query, UseGuards, Request, Res, Req, UnauthorizedException } from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

const COOKIE_NAME = 'finlo_refresh';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/auth/refresh',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'Account created' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive access token' })
  @ApiOkResponse({ description: 'Returns accessToken and user' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    return { accessToken, user };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  @ApiOkResponse({ description: 'Returns new accessToken' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) throw new UnauthorizedException('No refresh token');
    const { accessToken, refreshToken } = await this.authService.refresh(token);
    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and clear refresh token cookie' })
  async logout(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await this.authService.revokeRefreshToken(token);
    res.clearCookie(COOKIE_NAME, { path: '/api/auth/refresh' });
    return { ok: true };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  verifyEmail(@Query('token') token: string) { return this.authService.verifyEmail(token); }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto); }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  resetPassword(@Body() dto: ResetPasswordDto) { return this.authService.resetPassword(dto); }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({ description: 'Returns current user profile' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  me(@Request() req: any) { return this.authService.me(req.user.id); }
}
