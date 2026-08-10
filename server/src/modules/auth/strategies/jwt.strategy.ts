import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../types/jwt-payload.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Re-reads the account on every authenticated request.
   *
   * The token alone is not sufficient: suspending an account has to take effect
   * immediately, and a role carried inside an already-issued token would stay stale
   * until it expired. One indexed primary-key lookup buys correct authorisation on
   * both counts, and the role returned here is the live one rather than the one that
   * was true when the token was signed.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, suspendedAt: true },
    });

    // Deleted accounts fail here too — their tokens stay valid until expiry otherwise.
    if (!user) throw new UnauthorizedException('Account no longer exists');
    if (user.suspendedAt) throw new UnauthorizedException('This account has been suspended');

    return { sub: user.id, email: user.email, role: user.role };
  }
}
