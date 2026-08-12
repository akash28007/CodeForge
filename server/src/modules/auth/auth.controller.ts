import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /*
   * The credential endpoints are limited far below the global default.
   *
   * 100 requests a minute is a reasonable ceiling for browsing, and a wide-open door for
   * credential stuffing: it is 144,000 password guesses a day per IP. These three are the
   * only endpoints where an attacker gets an oracle for "was that the right password", so
   * they get their own budget.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Slightly looser: a legitimate client refreshes on a timer, and a refresh token is
  // not guessable in the way a password is.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }
}
