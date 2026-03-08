import { env } from '@config/env';

export const userCacheKey = (id: string) => `${env.APP_NAME}:user:${id}`;
