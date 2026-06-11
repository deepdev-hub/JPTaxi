import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export type JwtValidatedUser = { id: number; role: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { id?: number; role?: string }): JwtValidatedUser {
    if (payload.id == null) {
      throw new UnauthorizedException();
    }
    return {
      id: payload.id,
      role: payload.role ?? 'customer',
    };
  }
}
