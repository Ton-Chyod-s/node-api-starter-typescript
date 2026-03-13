import { GoogleAuthController } from '@interfaces/http/controllers/user/google-auth-controller';

export function makeGoogleAuthController() {
  return new GoogleAuthController();
}
