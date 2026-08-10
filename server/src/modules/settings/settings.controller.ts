import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ChangePasswordDto, DeleteAccountDto, UpdatePreferencesDto } from './dto/settings.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('preferences')
  getPreferences(@CurrentUser() user: JwtPayload) {
    return this.settings.getPreferences(user.sub);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePreferencesDto) {
    return this.settings.updatePreferences(user.sub, dto);
  }

  @Post('password')
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.settings.changePassword(user.sub, dto);
  }

  @Delete('account')
  deleteAccount(@CurrentUser() user: JwtPayload, @Body() dto: DeleteAccountDto) {
    return this.settings.deleteAccount(user.sub, dto);
  }
}
