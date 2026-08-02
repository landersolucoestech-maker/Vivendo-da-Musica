import { z } from 'zod';

export const accountProfileSchema = z.enum(['student', 'producer', 'instructor', 'company', 'affiliate']);

const optionalUrl = z.string().trim().max(500, 'O endereço informado é muito longo').refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Informe um endereço válido iniciado por http:// ou https://');

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório').email('Email deve ter um formato válido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const unifiedLoginSchema = loginSchema.extend({
  accountType: accountProfileSchema,
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

export const unifiedRegisterSchema = z
  .object({
    accountType: accountProfileSchema,
    name: z.string().trim().min(2, 'Informe o nome completo do responsável').max(160, 'O nome informado é muito longo'),
    email: z.string().trim().min(1, 'Email é obrigatório').email('Email deve ter um formato válido'),
    phone: z.string().trim().max(30, 'O telefone informado é muito longo').refine(
      (value) => !value || value.replace(/\D/g, '').length >= 8,
      'Informe um telefone válido',
    ),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Você deve aceitar os termos de uso e a política de privacidade' }),
    }),
    companyName: z.string().trim().max(180, 'O nome da empresa é muito longo'),
    professionalName: z.string().trim().max(160, 'O nome profissional é muito longo'),
    specialty: z.string().trim().max(160, 'A área de atuação é muito longa'),
    experienceYears: z.string().trim().max(2, 'Informe uma experiência válida'),
    portfolioUrl: optionalUrl,
    websiteUrl: optionalUrl,
    channelName: z.string().trim().max(160, 'O nome do canal é muito longo'),
    channelUrl: optionalUrl,
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'As senhas não coincidem', path: ['confirmPassword'] });
    }

    if (data.accountType === 'company' && data.companyName.length < 2) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o nome da empresa', path: ['companyName'] });
    }

    if ((data.accountType === 'producer' || data.accountType === 'instructor') && data.professionalName.length < 2) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe seu nome profissional', path: ['professionalName'] });
    }

    if ((data.accountType === 'producer' || data.accountType === 'instructor') && data.specialty.length < 2) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe sua área de atuação', path: ['specialty'] });
    }

    if (data.accountType === 'instructor') {
      const years = Number(data.experienceYears);
      if (!Number.isInteger(years) || years < 0 || years > 80) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a experiência entre 0 e 80 anos', path: ['experienceYears'] });
      }
    }

    if (data.accountType === 'affiliate' && data.channelName.length < 2) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o principal canal de divulgação', path: ['channelName'] });
    }

    if (data.accountType === 'affiliate' && !data.channelUrl) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o endereço do canal de divulgação', path: ['channelUrl'] });
    }
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
