import { FacebookAuthController } from '@interfaces/http/controllers/user/facebook-auth-controller';

export function makeFacebookAuthController() {
  return new FacebookAuthController();
}
