import { z } from 'zod';

export const loginCredentialsSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
