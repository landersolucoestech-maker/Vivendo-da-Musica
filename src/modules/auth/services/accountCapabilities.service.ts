import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

export type AccountCapability = 'student' | 'instructor' | 'producer' | 'affiliate' | 'company' | 'admin' | 'super_admin';

export interface AccountCapabilityRecord {
  capability: AccountCapability;
  status: 'requested' | 'active' | 'rejected' | 'revoked';
  isDefault: boolean;
}

const headers = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error && !isDevAuthBypassEnabled) throw error;
  const token = data.session?.access_token ?? env.supabasePublishableKey;
  return {
    apikey: env.supabasePublishableKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...(await headers()), ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string; details?: string } | null;
    throw new Error(payload?.message ?? payload?.error ?? payload?.details ?? 'Não foi possível atualizar os ambientes da conta.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const currentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error && !isDevAuthBypassEnabled) throw error;
  return getEffectiveUserId(data.user?.id ?? null);
};

export const accountCapabilitiesService = {
  async list(): Promise<AccountCapabilityRecord[]> {
    const userId = await currentUserId();
    const rows = await request<Array<{ capability: AccountCapability; status: AccountCapabilityRecord['status']; is_default: boolean }>>(
      `account_capabilities?select=capability,status,is_default&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`,
    );
    return rows.map((row) => ({ capability: row.capability, status: row.status, isDefault: row.is_default }));
  },

  async requestCapability(capability: 'instructor' | 'producer' | 'affiliate'): Promise<void> {
    const userId = await currentUserId();
    const rpc = isDevAuthBypassEnabled ? 'request_demo_account_capability' : 'request_account_capability';
    const body = isDevAuthBypassEnabled
      ? { target_user_id: userId, target_capability: capability }
      : { target_capability: capability };
    await request(`rpc/${rpc}`, { method: 'POST', body: JSON.stringify(body) });
  },

  async setDefault(capability: AccountCapability): Promise<void> {
    const userId = await currentUserId();
    const rpc = isDevAuthBypassEnabled ? 'set_demo_default_account_capability' : 'set_default_account_capability';
    const body = isDevAuthBypassEnabled
      ? { target_user_id: userId, target_capability: capability }
      : { target_capability: capability };
    await request(`rpc/${rpc}`, { method: 'POST', body: JSON.stringify(body) });
  },
};
