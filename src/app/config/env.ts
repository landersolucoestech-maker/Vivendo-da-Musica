function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

const isPagesPreview = import.meta.env.MODE === 'pages';

export const env = {
  supabaseUrl: requireEnv('VITE_SUPABASE_URL'),
  supabasePublishableKey: requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
  appUrl: import.meta.env.VITE_APP_URL ?? 'http://localhost:8080',
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
  isPagesPreview,
  isDevAuthBypassEnabled:
    isPagesPreview || (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'),
} as const;
