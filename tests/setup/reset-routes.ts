import { resetControllersForTesting } from '@interfaces/http/routes/auth.routes';

export function resetAuthControllers(): void {
  resetControllersForTesting();
}