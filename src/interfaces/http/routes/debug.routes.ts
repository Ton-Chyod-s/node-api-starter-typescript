import { Router } from 'express';
import { env } from '@config/env';

const router = Router();

router.get('/debug-sentry', (_req, res) => {
  if (!env.DEBUG_ROUTES_ENABLED || env.NODE_ENV === 'production') {
    return res.sendStatus(404);
  }
  throw new Error('Sentry/GlitchTip test error');
});

export default router;
