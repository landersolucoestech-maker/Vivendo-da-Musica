import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export type CommercialValueType = 'integer' | 'decimal' | 'money' | 'percentage_bps' | 'boolean' | 'text' | 'json';

export interface CommercialParameter {
  id: string;
  key: string;
  category: string;
  label: string;
  description: string;
  valueType: CommercialValueType;
  scopeType: string;
  scopeId: string | null;
  visibility: 'public' | 'authenticated' | 'staff';
  value: unknown;
  version: number;
  effectiveFrom: string;
  isDemo: boolean;
}

export interface AdminJobCreditPack {
  id: string;
  code: string;
  name: string;
  description: string;
  creditQuantity: number;
  priceCents: number;
  currency: string;
  validityDays: number;
  active: boolean;
  sortOrder: number;
  isDemo: boolean;
}

export interface AdminBeatLicenseTemplate {
  id: string;
  code: string;
  licenseType: 'basic' | 'pro' | 'unlimited' | 'exclusive';
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  deliverables: string[];
  usageRights: string[];
  maxCopies: number | null;
  isExclusive: boolean;
  active: boolean;
  sortOrder: number;
  isDemo: boolean;
}

interface ParameterRow {
  id: string;
  key: string;
  category: string;
  label: string;
  description: string | null;
  value_type: CommercialValueType;
  scope_type: string;
  scope_id: string | null;
  visibility: CommercialParameter['visibility'];
  is_demo: boolean;
}

interface VersionRow {
  parameter_id: string;
  version: number;
  value: unknown;
  effective_from: string;
}

const stringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string')
  : [];

const getAuthorizationHeaders = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error && !isDevAuthBypassEnabled) throw new Error(error.message);
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
    headers: {
      ...(await getAuthorizationHeaders()),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {
      message?: string;
      error?: string;
      details?: string;
    } | null;
    throw new Error(payload?.message ?? payload?.error ?? payload?.details ?? 'Operação administrativa não concluída.');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const rpc = <T>(name: string, body: Record<string, unknown>) => request<T>(`rpc/${name}`, {
  method: 'POST',
  body: JSON.stringify(body),
});

const parseInputValue = (parameter: CommercialParameter, rawValue: string): unknown => {
  switch (parameter.valueType) {
    case 'integer':
    case 'money':
    case 'percentage_bps': {
      const parsed = Number(rawValue);
      if (!Number.isSafeInteger(parsed)) throw new Error('Informe um número inteiro válido.');
      return parsed;
    }
    case 'decimal': {
      const parsed = Number(rawValue.replace(',', '.'));
      if (!Number.isFinite(parsed)) throw new Error('Informe um número decimal válido.');
      return parsed;
    }
    case 'boolean':
      return rawValue === 'true';
    case 'json':
      return JSON.parse(rawValue) as unknown;
    case 'text':
      return rawValue;
  }
};

export const adminCommercialService = {
  parseInputValue,

  async listParameters(): Promise<CommercialParameter[]> {
    const [parameters, versions] = await Promise.all([
      request<ParameterRow[]>(
        'commercial_parameters?select=id,key,category,label,description,value_type,scope_type,scope_id,visibility,is_demo&status=eq.active&order=category.asc,label.asc',
      ),
      request<VersionRow[]>(
        'commercial_parameter_versions?select=parameter_id,version,value,effective_from&status=eq.published&effective_from=lte.now()&order=effective_from.desc,version.desc',
      ),
    ]);

    const latestVersion = new Map<string, VersionRow>();
    for (const version of versions) {
      if (!latestVersion.has(version.parameter_id)) latestVersion.set(version.parameter_id, version);
    }

    return parameters.flatMap((parameter) => {
      const version = latestVersion.get(parameter.id);
      if (!version) return [];
      return [{
        id: parameter.id,
        key: parameter.key,
        category: parameter.category,
        label: parameter.label,
        description: parameter.description ?? '',
        valueType: parameter.value_type,
        scopeType: parameter.scope_type,
        scopeId: parameter.scope_id,
        visibility: parameter.visibility,
        value: version.value,
        version: version.version,
        effectiveFrom: version.effective_from,
        isDemo: parameter.is_demo,
      } satisfies CommercialParameter];
    });
  },

  async publishParameter(parameter: CommercialParameter, value: unknown): Promise<void> {
    if (isDevAuthBypassEnabled) {
      await rpc('admin_publish_demo_commercial_parameter', {
        target_parameter_id: parameter.id,
        target_value: value,
        target_effective_from: new Date().toISOString(),
      });
      return;
    }

    await rpc('admin_publish_commercial_parameter', {
      target_key: parameter.key,
      target_category: parameter.category,
      target_label: parameter.label,
      target_description: parameter.description,
      target_value_type: parameter.valueType,
      target_value: value,
      target_scope_type: parameter.scopeType,
      target_scope_id: parameter.scopeId,
      target_visibility: parameter.visibility,
      target_effective_from: new Date().toISOString(),
    });
  },

  async listJobCreditPacks(): Promise<AdminJobCreditPack[]> {
    const rows = await request<Array<Record<string, unknown>>>(
      'job_credit_packs?select=id,code,name,description,credit_quantity,price_cents,currency,validity_days,active,sort_order,is_demo&order=sort_order.asc,created_at.asc',
    );
    return rows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      description: row.description ? String(row.description) : '',
      creditQuantity: Number(row.credit_quantity),
      priceCents: Number(row.price_cents),
      currency: String(row.currency),
      validityDays: Number(row.validity_days),
      active: Boolean(row.active),
      sortOrder: Number(row.sort_order),
      isDemo: Boolean(row.is_demo),
    }));
  },

  async saveJobCreditPack(pack: AdminJobCreditPack): Promise<void> {
    if (isDevAuthBypassEnabled) {
      await rpc('admin_update_demo_job_credit_pack', {
        target_pack_id: pack.id,
        target_name: pack.name,
        target_description: pack.description,
        target_credit_quantity: pack.creditQuantity,
        target_price_cents: pack.priceCents,
        target_currency: pack.currency,
        target_validity_days: pack.validityDays,
        target_active: pack.active,
        target_sort_order: pack.sortOrder,
      });
      return;
    }

    await rpc('admin_upsert_job_credit_pack', {
      target_pack_id: pack.id,
      target_code: pack.code,
      target_name: pack.name,
      target_description: pack.description,
      target_credit_quantity: pack.creditQuantity,
      target_price_cents: pack.priceCents,
      target_currency: pack.currency,
      target_validity_days: pack.validityDays,
      target_active: pack.active,
      target_sort_order: pack.sortOrder,
    });
  },

  async listBeatLicenseTemplates(): Promise<AdminBeatLicenseTemplate[]> {
    const rows = await request<Array<Record<string, unknown>>>(
      'beat_license_templates?select=id,code,license_type,name,description,price_cents,currency,deliverables,usage_rights,max_copies,is_exclusive,active,sort_order,is_demo&order=sort_order.asc,created_at.asc',
    );
    return rows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      licenseType: row.license_type as AdminBeatLicenseTemplate['licenseType'],
      name: String(row.name),
      description: row.description ? String(row.description) : '',
      priceCents: Number(row.price_cents),
      currency: String(row.currency),
      deliverables: stringArray(row.deliverables),
      usageRights: stringArray(row.usage_rights),
      maxCopies: row.max_copies === null || row.max_copies === undefined ? null : Number(row.max_copies),
      isExclusive: Boolean(row.is_exclusive),
      active: Boolean(row.active),
      sortOrder: Number(row.sort_order),
      isDemo: Boolean(row.is_demo),
    }));
  },

  async saveBeatLicenseTemplate(template: AdminBeatLicenseTemplate): Promise<void> {
    if (isDevAuthBypassEnabled) {
      await rpc('admin_update_demo_beat_license_template', {
        target_template_id: template.id,
        target_name: template.name,
        target_description: template.description,
        target_price_cents: template.priceCents,
        target_currency: template.currency,
        target_deliverables: template.deliverables,
        target_usage_rights: template.usageRights,
        target_max_copies: template.maxCopies,
        target_active: template.active,
        target_sort_order: template.sortOrder,
      });
      return;
    }

    await rpc('admin_upsert_beat_license_template', {
      target_template_id: template.id,
      target_code: template.code,
      target_license_type: template.licenseType,
      target_name: template.name,
      target_description: template.description,
      target_price_cents: template.priceCents,
      target_currency: template.currency,
      target_deliverables: template.deliverables,
      target_usage_rights: template.usageRights,
      target_max_copies: template.maxCopies,
      target_is_exclusive: template.isExclusive,
      target_active: template.active,
      target_sort_order: template.sortOrder,
    });
  },
};
