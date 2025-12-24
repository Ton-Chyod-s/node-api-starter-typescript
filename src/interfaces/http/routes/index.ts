import { Router } from 'express';

import { env } from '@config/env';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import adminRoutes from './admin.routes';
import docsRoutes from './docs.routes';
import debugRoutes from './debug.routes';

const router = Router();

router.use(healthRoutes);

if (env.NODE_ENV === 'development') {
  router.use(docsRoutes);
}

router.use(authRoutes);
router.use(adminRoutes);

if (env.NODE_ENV === 'development' && env.DEBUG_ROUTES_ENABLED) {
  router.use(debugRoutes);
}

export default router;
