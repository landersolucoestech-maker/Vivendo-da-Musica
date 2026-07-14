import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório').email('Email deve ter um formato válido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome completo é obrigatório'),
    email: z.string().trim().min(1, 'Email é obrigatório').email('Email deve ter um formato válido'),
    phone: z.string().trim().optional(),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Você deve aceitar os termos de uso' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório').email('Email deve ter um formato válido'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });
