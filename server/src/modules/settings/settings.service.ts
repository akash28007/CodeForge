import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto, DeleteAccountDto, UpdatePreferencesDto } from './dto/settings.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Preferences are created on first read, so existing accounts need no backfill. */
  async getPreferences(userId: string) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user) throw new NotFoundException('User not found');

    const matches = await bcrypt.compare(dto.currentPassword, user.password);
    if (!matches) {
      // Deliberately specific: the caller is already authenticated, so telling them the
      // *current* password was wrong leaks nothing and avoids a confusing dead end.
      throw new UnauthorizedException('Your current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Your new password must be different from the current one');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(dto.newPassword, SALT_ROUNDS) },
    });
    return { changed: true };
  }

  /**
   * Permanently deletes the account. Requires the password again — an authenticated
   * session alone should not be enough to destroy everything.
   *
   * Rows in other tables go via `onDelete: Cascade`, except Submissions, whose relation
   * to User has no cascade, so they are removed explicitly first.
   */
  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const matches = await bcrypt.compare(dto.password, user.password);
    if (!matches) throw new UnauthorizedException('Password is incorrect');

    const authoredProblems = await this.prisma.problem.count({ where: { createdById: userId } });
    if (authoredProblems > 0) {
      throw new BadRequestException(
        `This account authored ${authoredProblems} problem(s). Reassign or delete them before deleting the account.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.submission.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    return { deleted: true };
  }
}
