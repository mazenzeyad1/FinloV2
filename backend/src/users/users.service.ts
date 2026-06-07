import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailerService } from '../common/mailer/mailer.service';
import { AppExceptions, ERROR_CODES } from '../common/errors/app-exception';
import { UpdateProfileDto, ChangePasswordDto, ChangeEmailDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailer: MailerService,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName, lastName: dto.lastName },
      select: { id: true, email: true, firstName: true, lastName: true, isVerified: true },
    });
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw AppExceptions.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Revoke every session — the client will be asked to sign in again
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: 'Password changed successfully' };
  }

  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw AppExceptions.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);

    const newEmail = dto.newEmail.toLowerCase().trim();
    if (newEmail === user.email.toLowerCase()) throw AppExceptions.badRequest(ERROR_CODES.INVALID_STATE);

    const taken = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) throw AppExceptions.conflict(ERROR_CODES.EMAIL_ALREADY_IN_USE);

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await this.prisma.emailToken.create({
      data: {
        userId,
        tokenHash: hash,
        type: 'CHANGE_EMAIL',
        newEmail,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });

    const link = `${this.config.get('APP_URL')}/verify-email-change?token=${token}`;
    await this.mailer.send({
      to: newEmail,
      subject: 'Confirm your new Finlo email',
      html: `<p>Hi ${user.firstName},</p><p>Confirm this address to finish changing your Finlo email: <a href="${link}">Confirm new email</a>. Expires in 1 hour.</p>`,
    });

    return { message: 'Confirmation link sent to your new email address' };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppExceptions.notFound(ERROR_CODES.RESOURCE_NOT_FOUND);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw AppExceptions.unauthorized(ERROR_CODES.INVALID_CREDENTIALS);

    // All related rows (accounts, transactions, tokens, etc.) cascade on delete
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Account deleted' };
  }
}
