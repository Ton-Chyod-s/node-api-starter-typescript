import { z } from 'zod';

/**
 * Schema de senha compartilhado entre registro e reset de senha.
 * Requisitos: 8–72 chars, ao menos 1 maiúscula, 1 número e 1 caractere especial.
 * max(72) alinhado ao limite real do Argon2 para evitar truncamento silencioso.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(72, 'Senha deve ter no máximo 72 caracteres')
  .refine((v) => /[A-Z]/.test(v), { message: 'Senha deve conter ao menos uma letra maiúscula' })
  .refine((v) => /[0-9]/.test(v), { message: 'Senha deve conter ao menos um número' })
  .refine((v) => /[^A-Za-z0-9]/.test(v), {
    message: 'Senha deve conter ao menos um caractere especial',
  });
