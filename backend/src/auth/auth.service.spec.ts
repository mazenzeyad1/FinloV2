import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../common/mailer/mailer.service';
import { AppException } from '../common/errors/app-exception';
import { ERROR_CODES } from '../common/errors/error-codes';

jest.mock('bcrypt');

const mockFullUser = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  passwordHash: '$2b$12$hashedpassword',
  isVerified: true,
  createdAt: new Date(),
};

const mockUserProfile = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  isVerified: true,
};

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    emailToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const jwtMock = { sign: jest.fn() };
  const configMock = { get: jest.fn() };
  const mailerMock = { send: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    jwtMock.sign.mockReturnValue('mock-access-token');
    configMock.get.mockImplementation((key: string) =>
      ({ JWT_ACCESS_TTL: '15m', JWT_REFRESH_TTL_MS: '2592000000', APP_URL: 'http://localhost:3000' }[key] ?? null),
    );
    mailerMock.send.mockResolvedValue(undefined);
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.refreshToken.update.mockResolvedValue({});
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.emailToken.create.mockResolvedValue({});
    prismaMock.emailToken.update.mockResolvedValue({});
    prismaMock.user.update.mockResolvedValue({});
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
        { provide: MailerService, useValue: mailerMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = { email: 'alice@example.com', password: 'password123', firstName: 'Alice', lastName: 'Smith' };

    it('throws CONFLICT when user already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockFullUser);
      await expect(service.register(dto)).rejects.toMatchObject({
        code: ERROR_CODES.EMAIL_ALREADY_IN_USE,
        statusCode: 409,
      });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('hashes the password with bcrypt and creates the user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockFullUser);

      await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: dto.email, passwordHash: 'hashed-password' }),
        }),
      );
    });

    it('sends a verification email after creating the user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockFullUser);

      await service.register(dto);

      expect(prismaMock.emailToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'VERIFY_EMAIL', userId: 'user-1' }) }),
      );
      expect(mailerMock.send).toHaveBeenCalledWith(expect.objectContaining({ to: dto.email }));
    });

    it('returns a success message', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockFullUser);

      const result = await service.register(dto);
      expect(result).toEqual({ message: 'Account created. Check your email to verify.' });
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    const dto = { email: 'alice@example.com', password: 'password123' };

    it('throws UNAUTHORIZED when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toMatchObject({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        statusCode: 401,
      });
    });

    it('throws UNAUTHORIZED when password does not match', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockFullUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toMatchObject({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        statusCode: 401,
      });
    });

    it('returns accessToken, refreshToken, and user on success', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(mockFullUser)     // login lookup by email
        .mockResolvedValueOnce(mockUserProfile); // issueTokens lookup by id
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user).toMatchObject(mockUserProfile);
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBeGreaterThan(0);
    });
  });

  // ─── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('throws UNAUTHORIZED when token hash is not found in DB', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('unknown-token')).rejects.toMatchObject({
        code: ERROR_CODES.INVALID_OR_EXPIRED_TOKEN,
        statusCode: 401,
      });
    });

    it('throws UNAUTHORIZED when token is revoked', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1_000_000),
      });
      await expect(service.refresh('revoked-token')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws UNAUTHORIZED when token is expired', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1_000),
      });
      await expect(service.refresh('expired-token')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('revokes old token and returns new tokens on success', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1_000_000),
      });
      prismaMock.user.findUnique.mockResolvedValue(mockUserProfile);

      const result = await service.refresh('valid-token');

      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' }, data: { revokedAt: expect.any(Date) } }),
      );
      expect(result.accessToken).toBe('mock-access-token');
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  // ─── verifyEmail ─────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    const validRecord = {
      id: 'et-1',
      userId: 'user-1',
      type: 'VERIFY_EMAIL',
      usedAt: null,
      expiresAt: new Date(Date.now() + 1_000_000),
    };

    it('throws BAD_REQUEST when token is not found', async () => {
      prismaMock.emailToken.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bad-token')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws BAD_REQUEST when token was already used', async () => {
      prismaMock.emailToken.findUnique.mockResolvedValue({ ...validRecord, usedAt: new Date() });
      await expect(service.verifyEmail('used-token')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws BAD_REQUEST when token is expired', async () => {
      prismaMock.emailToken.findUnique.mockResolvedValue({
        ...validRecord,
        expiresAt: new Date(Date.now() - 1_000),
      });
      await expect(service.verifyEmail('expired-token')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('marks user as verified and token as used on success', async () => {
      prismaMock.emailToken.findUnique.mockResolvedValue(validRecord);

      await service.verifyEmail('valid-token');

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' }, data: { isVerified: true } }),
      );
      expect(prismaMock.emailToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'et-1' }, data: { usedAt: expect.any(Date) } }),
      );
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    const dto = { email: 'alice@example.com' };
    const safeMessage = { message: 'If that email exists, a reset link was sent' };

    it('returns the safe message without creating a token when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(result).toEqual(safeMessage);
      expect(prismaMock.emailToken.create).not.toHaveBeenCalled();
      expect(mailerMock.send).not.toHaveBeenCalled();
    });

    it('creates an email token and sends the reset email when user exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockFullUser);

      const result = await service.forgotPassword(dto);

      expect(prismaMock.emailToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', type: 'RESET_PASSWORD' }),
        }),
      );
      expect(mailerMock.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'alice@example.com' }),
      );
      expect(result).toEqual(safeMessage);
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    const dto = { token: 'reset-token', password: 'NewPass123!' };
    const validRecord = {
      id: 'et-2',
      userId: 'user-1',
      type: 'RESET_PASSWORD',
      usedAt: null,
      expiresAt: new Date(Date.now() + 1_000_000),
    };

    it('throws BAD_REQUEST when token is not found', async () => {
      prismaMock.emailToken.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws BAD_REQUEST when token is already used', async () => {
      prismaMock.emailToken.findUnique.mockResolvedValue({ ...validRecord, usedAt: new Date() });
      await expect(service.resetPassword(dto)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('hashes the new password, updates the user, and revokes all refresh tokens', async () => {
      prismaMock.emailToken.findUnique.mockResolvedValue(validRecord);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.resetPassword(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 12);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' }, data: { passwordHash: 'new-hashed-password' } }),
      );
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  // ─── revokeRefreshToken ───────────────────────────────────────────────────────

  describe('revokeRefreshToken', () => {
    it('calls updateMany with the correct SHA-256 hash and revokedAt', async () => {
      const token = 'my-plaintext-refresh-token';
      const expectedHash = crypto.createHash('sha256').update(token).digest('hex');

      await service.revokeRefreshToken(token);

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expectedHash, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
