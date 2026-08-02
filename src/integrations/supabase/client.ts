import { createClient, type User } from '@supabase/supabase-js';

import { env } from '@/app/config/env';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { getDevIdentityId } from '@/shared/utils/devIdentity';

export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

if (isDevAuthBypassEnabled) {
  supabase.auth.getUser = (async () => ({
    data: {
      user: {
        id: getDevIdentityId(),
        aud: 'authenticated',
        role: 'authenticated',
        email: null,
        phone: null,
        app_metadata: {},
        user_metadata: { synthetic: true },
        identities: [],
        created_at: new Date(0).toISOString(),
      } as User,
    },
    error: null,
  })) as typeof supabase.auth.getUser;
}
