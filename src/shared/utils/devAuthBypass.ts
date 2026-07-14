import { env } from '@/app/config/env';

/**
 * Lets the route guards skip their redirect while developing locally, so
 * you're not bounced to /login on every reload. This can NEVER apply in a
 * production build: `import.meta.env.DEV` is hardcoded to `false` by Vite
 * outside the dev server, regardless of this env var's value.
 *
 * Important: this only skips the client-side redirect. It does NOT bypass
 * RLS — Supabase still enforces enrollment/role server-side using the real
 * session, so lesson/module data will still come back empty unless you're
 * actually logged in as an enrolled user. Use this to see public pages
 * without the redirect loop; log in with a real (enrolled) account to see
 * real course content.
 */
export const isDevAuthBypassEnabled = env.isDevAuthBypassEnabled;
