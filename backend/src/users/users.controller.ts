import { Controller, Patch, Post, Delete, Body, UseGuards, Request, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { COOKIE_NAME, COOKIE_OPTIONS } from '../auth/cookie.constants';
import { UpdateProfileDto, ChangePasswordDto, ChangeEmailDto, DeleteAccountDto } from './dto/users.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update profile (name)' })
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.service.updateProfile(req.user.id, dto);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change password (revokes all sessions)' })
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(req.user.id, dto);
  }

  @Post('change-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request an email-address change (sends confirmation link)' })
  changeEmail(@Request() req: any, @Body() dto: ChangeEmailDto) {
    return this.service.changeEmail(req.user.id, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete the current account permanently' })
  async deleteAccount(
    @Request() req: any,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.deleteAccount(req.user.id, dto.password);
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    return result;
  }
}
