import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/**
 * Same JWT verification as `JwtAuthGuard`, but a request with *no* credentials is
 * allowed through as anonymous instead of being rejected with a 401.
 *
 * Used by endpoints that are public yet personalise their response when the caller
 * happens to be signed in (e.g. `GET /problems` adding per-user solved/bookmarked
 * flags). A request that *does* present an Authorization header still has to present
 * a valid one — a malformed or expired token is rejected rather than silently
 * downgraded to anonymous, so a stale session can't quietly read as "not logged in".
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser, _info: unknown, context: ExecutionContext): TUser | null {
    if (err) throw err;
    if (user) return user;

    const request = context.switchToHttp().getRequest<Request>();
    if (request.headers.authorization) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return null;
  }
}
