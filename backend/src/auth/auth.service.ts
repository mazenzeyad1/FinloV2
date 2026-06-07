import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailerService } from '../common/mailer/mailer.service';
import { AppExceptions, ERROR_CODES } from '../common/errors/app-exception';
import {
  RegisterDto, LoginDto,
  ForgotPasswordDto, ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailer: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw AppExceptions.conflict(ERROR_CODES.EMAIL_ALREADY_IN_USE);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, firstName: dto.firstName, lastName: dto.lastName },
    });
    await this.sendVerificationEmail(user.id, user.email, user.firstName);
    return { message: 'Account created. Check your email to verify.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw AppExceptions.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw AppExceptions.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);
    return this.issueTokens(user.id);
  }

  async refresh(token: string) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date())
      throw AppExceptions.unauthorized(ERROR_CODES.INVALID_OR_EXPIRED_TOKEN);
    await this.prisma.refreshToken.update({
      where: { id: stored.id }, data: { revokedAt: new Date() },
    });
    return this.issueTokens(stored.userId);
  }

  async verifyEmail(token: string) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.emailToken.findUnique({ where: { tokenHash: hash } });
    if (!record || record.usedAt || record.expiresAt < new Date() || record.type !== 'VERIFY_EMAIL')
      throw AppExceptions.badRequest(ERROR_CODES.INVALID_OR_EXPIRED_TOKEN);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
      this.prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    return { message: 'Email verified successfully' };
  }

  async verifyEmailChange(token: string) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.emailToken.findUnique({ where: { tokenHash: hash } });
    if (!record || record.usedAt || record.expiresAt < new Date() || record.type !== 'CHANGE_EMAIL' || !record.newEmail)
      throw AppExceptions.badRequest(ERROR_CODES.INVALID_OR_EXPIRED_TOKEN);

    // Re-check availability in case someone claimed the address since the request
    const taken = await this.prisma.user.findUnique({ where: { email: record.newEmail } });
    if (taken && taken.id !== record.userId) throw AppExceptions.conflict(ERROR_CODES.EMAIL_ALREADY_IN_USE);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { email: record.newEmail, isVerified: true },
      }),
      this.prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    return { message: 'Email updated successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'If that email exists, a reset link was sent' };
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await this.prisma.emailToken.create({
      data: { userId: user.id, tokenHash: hash, type: 'RESET_PASSWORD', expiresAt: new Date(Date.now() + 3_600_000) },
    });
    const link = `${this.config.get('APP_URL')}/reset-password?token=${token}`;
    await this.mailer.send({
      to: user.email,
      subject: 'Reset your Finlo password',
      html: `<p>Hi ${user.firstName},</p><p><a href="${link}">Reset your password</a>. Expires in 1 hour.</p>`,
    });
    return { message: 'If that email exists, a reset link was sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const record = await this.prisma.emailToken.findUnique({ where: { tokenHash: hash } });
    if (!record || record.usedAt || record.expiresAt < new Date() || record.type !== 'RESET_PASSWORD')
      throw AppExceptions.badRequest(ERROR_CODES.INVALID_OR_EXPIRED_TOKEN);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password reset successfully' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, isVerified: true, createdAt: true },
    });
    if (!user) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);
    return user;
  }

  async revokeRefreshToken(token: string) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, isVerified: true },
    });
    const accessToken = this.jwt.sign(
      { sub: userId, email: user.email },
      { expiresIn: this.config.get('JWT_ACCESS_TTL') || '15m' },
    );
    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
    const ttl = parseInt(this.config.get('JWT_REFRESH_TTL_MS') || '2592000000');
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: refreshHash, expiresAt: new Date(Date.now() + ttl) },
    });
    return { accessToken, refreshToken: rawRefresh, user };
  }

  private async sendVerificationEmail(userId: string, email: string, firstName: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await this.prisma.emailToken.create({
      data: { userId, tokenHash: hash, type: 'VERIFY_EMAIL', expiresAt: new Date(Date.now() + 86_400_000) },
    });
    const link = `${this.config.get('APP_URL')}/verify-email?token=${token}`;
    await this.mailer.send({
      to: email,
      subject: 'Verify your Finlo account',
      html: `<p>Welcome to Finlo, ${firstName}!</p><p><a href="${link}">Verify your email</a>. Expires in 24 hours.</p>`,
    });
  }
}
