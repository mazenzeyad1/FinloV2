import { Controller, Post, Get, Body, Query, UseGuards, Request, Res, Req, UnauthorizedException, HttpCode } from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { COOKIE_NAME, COOKIE_OPTIONS } from './cookie.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'Account created' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive access token' })
  @ApiOkResponse({ description: 'Returns accessToken and user' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);
    // Web stores the refresh token in an httpOnly cookie. Native clients (React
    // Native) have no cookie jar, so they opt in via the `x-client: mobile`
    // header and receive the refresh token in the body to store securely.
    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    return isMobileClient(req) ? { accessToken, refreshToken, user } : { accessToken, user };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie or body token' })
  @ApiOkResponse({ description: 'Returns new accessToken' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    // Mobile sends the refresh token in the request body; web relies on the cookie.
    const bodyToken = (req.body as { refreshToken?: string })?.refreshToken;
    const token = bodyToken ?? req.cookies?.[COOKIE_NAME];
    if (!token) throw new UnauthorizedException('No refresh token');
    const { accessToken, refreshToken } = await this.authService.refresh(token);
    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    // Rotation: hand the rotated refresh token back to body-based (mobile) clients.
    return bodyToken ? { accessToken, refreshToken } : { accessToken };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and clear refresh token cookie' })
  async logout(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const bodyToken = (req.body as { refreshToken?: string })?.refreshToken;
    const token = bodyToken ?? req.cookies?.[COOKIE_NAME];
    if (token) await this.authService.revokeRefreshToken(token);
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    return { ok: true };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  verifyEmail(@Query('token') token: string) { return this.authService.verifyEmail(token); }

  @Get('verify-email-change')
  @ApiOperation({ summary: 'Confirm a pending email-address change' })
  verifyEmailChange(@Query('token') token: string) { return this.authService.verifyEmailChange(token); }

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

/** Native clients identify themselves with the `x-client: mobile` header. */
function isMobileClient(req: ExpressRequest): boolean {
  return req.headers['x-client'] === 'mobile';
}
