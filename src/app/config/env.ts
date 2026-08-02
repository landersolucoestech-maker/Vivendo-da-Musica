function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${key}. Configure o arquivo do ambiente antes de iniciar a aplicação.`
    );
  }
  return value;
}

const isDevelopment = import.meta.env.DEV;
const isHostedDevPreview = import.meta.env.VITE_PREVIEW_MODE === 'true';

export const env = {
  supabaseUrl: requireEnv('VITE_SUPABASE_URL'),
  supabasePublishableKey: requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
  appUrl: import.meta.env.VITE_APP_URL ?? 'http://localhost:8080',
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
  isDevAuthBypassEnabled:
    (isDevelopment || isHostedDevPreview) && import.meta.env.VITE_DISABLE_AUTH === 'true',
  useMockData:
    isDevelopment && import.meta.env.VITE_USE_MOCK_DATA === 'true',
} as const;
