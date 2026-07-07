import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = config.get<string>('GOOGLE_CALLBACK_URL');

    // Se não estiver configurado, usa valores dummy que nunca serão usados
    const isDisabled =
      !clientID ||
      clientID === 'disabled' ||
      clientID === 'disabled-not-configured';

    super({
      clientID: isDisabled ? 'disabled' : clientID,
      clientSecret: isDisabled ? 'disabled' : clientSecret,
      callbackURL: isDisabled ? 'http://localhost/disabled' : callbackURL,
      scope: ['email', 'profile'],
    });

    if (isDisabled) {
      this.logger.warn('Google OAuth está desabilitado (GOOGLE_CLIENT_ID não configurado)');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { name, emails, photos } = profile;
    const user = {
      googleId: profile.id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      avatarUrl: photos[0]?.value,
      accessToken,
    };
    done(null, user);
  }
}
