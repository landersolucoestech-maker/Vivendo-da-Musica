import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('env', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws a clear error when a required Supabase variable is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key');

    await expect(import('./env')).rejects.toThrow(/VITE_SUPABASE_URL/);

    vi.unstubAllEnvs();
  });

  it('exposes the configured Supabase values when present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key');

    const { env } = await import('./env');

    expect(env.supabaseUrl).toBe('https://example.supabase.co');
    expect(env.supabasePublishableKey).toBe('anon-key');

    vi.unstubAllEnvs();
  });
});
