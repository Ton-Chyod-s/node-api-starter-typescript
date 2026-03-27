import { z } from 'zod';
import { passwordSchema } from '@domain/dtos/shared/password-schema';

export const registerRequestSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .transform((v) => v.trim()),
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  password: passwordSchema,
});

export type RegisterRequestDTO = z.infer<typeof registerRequestSchema>;
