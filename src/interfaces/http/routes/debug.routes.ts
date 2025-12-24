import { Router } from 'express';

const router = Router();

router.get('/debug-sentry', () => {
  throw new Error('Sentry/GlitchTip test error');
});

export default router;
