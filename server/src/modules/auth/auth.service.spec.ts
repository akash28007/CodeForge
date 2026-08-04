import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock; findUniqueOrThrow: jest.Mock } };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let config: { getOrThrow: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), findUniqueOrThrow: jest.fn() },
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token'), verify: jest.fn() };
    config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return values[key];
      }),
    };
    service = new AuthService(prisma as any, jwtService as any, config as any);
  });

  describe('register', () => {
    it('rejects a duplicate email with 409', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ name: 'A', email: 'a@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('hashes the password before storing and never returns it', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'new-id', name: data.name, email: data.email, role: 'USER', password: data.password }),
      );

      const result = await service.register({ name: 'A', email: 'a@example.com', password: 'password123' });

      const createdData = prisma.user.create.mock.calls[0][0].data;
      expect(createdData.password).not.toBe('password123');
      expect(await bcrypt.compare('password123', createdData.password)).toBe(true);
      expect(result.user).not.toHaveProperty('password');
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
    });
  });

  describe('login', () => {
    it('rejects an unknown email with 401 (not 404, to avoid leaking which emails are registered)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'ghost@example.com', password: 'x' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password with 401', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@example.com', password: hashed, role: 'USER' });

      await expect(service.login({ email: 'a@example.com', password: 'wrong' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('succeeds with the correct password', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'A',
        email: 'a@example.com',
        password: hashed,
        role: 'USER',
      });

      const result = await service.login({ email: 'a@example.com', password: 'correct-password' });
      expect(result.accessToken).toBe('signed-token');
    });
  });

  describe('refresh', () => {
    it('rejects a token that fails verification', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.refresh('garbage')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a valid token whose user no longer exists', async () => {
      jwtService.verify.mockReturnValue({ sub: 'deleted-user' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid-but-orphaned')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('verifies against the refresh secret specifically, not the access secret', async () => {
      jwtService.verify.mockReturnValue({ sub: 'u1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'A', email: 'a@example.com', role: 'USER' });

      await service.refresh('some-token');

      expect(jwtService.verify).toHaveBeenCalledWith('some-token', { secret: 'refresh-secret' });
    });
  });
});
