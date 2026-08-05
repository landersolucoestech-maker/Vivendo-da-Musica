import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const customAuthFunctions = [
  'api-v1',
  'create-beat-checkout',
  'create-course-checkout',
  'create-digital-product-checkout',
  'download-access',
  'manage-service-catalog',
  'manage-service-requests',
  'payment-webhook',
  'service-delivery-file-access',
  'stripe-beat-webhook',
  'stripe-digital-product-webhook',
  'vivendo-preview',
] as const;

describe('contratos de autenticação das Edge Functions', () => {
  it('mantém todas as funções com autenticação própria versionadas', () => {
    for (const functionName of customAuthFunctions) {
      expect(
        existsSync(resolve(process.cwd(), `supabase/functions/${functionName}/index.ts`)),
        `${functionName} deve existir no repositório`,
      ).toBe(true);
    }
  });

  it('mantém o script de deploy alinhado com as funções sem JWT da plataforma', () => {
    const deployScript = readProjectFile('scripts/deploy-supabase-functions.mjs');

    for (const functionName of customAuthFunctions) {
      expect(deployScript).toContain(`'${functionName}'`);
    }
    expect(deployScript).toContain("args.push('--no-verify-jwt')");
    expect(deployScript).toContain('Funções sem JWT não versionadas');
  });

  it('mantém o config.toml alinhado com o manifest de deploy', () => {
    const config = readProjectFile('supabase/config.toml');

    for (const functionName of customAuthFunctions) {
      const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(config).toMatch(
        new RegExp(`\\[functions\\.${escapedName}\\]\\s+verify_jwt\\s*=\\s*false`),
      );
    }
  });

  it('usa segredos independentes para endpoints Stripe distintos', () => {
    const beatWebhook = readProjectFile('supabase/functions/stripe-beat-webhook/index.ts');
    const productWebhook = readProjectFile('supabase/functions/stripe-digital-product-webhook/index.ts');
    const canonicalWebhook = readProjectFile('supabase/functions/payment-webhook/index.ts');
    const sharedWebhook = readProjectFile('supabase/functions/_shared/stripeWebhook.ts');

    expect(beatWebhook).toContain('[\n    "STRIPE_BEAT_WEBHOOK_SECRET",\n    "STRIPE_WEBHOOK_SECRET",\n  ]');
    expect(productWebhook).toContain('[\n    "STRIPE_DIGITAL_PRODUCT_WEBHOOK_SECRET",\n    "STRIPE_WEBHOOK_SECRET",\n  ]');
    expect(canonicalWebhook).toContain('STRIPE_WEBHOOK_SECRET');
    expect(sharedWebhook).toContain('Deno.env.get(name)');
    expect(sharedWebhook).toContain('for (const name of secretNames)');
  });

  it('não desabilita JWT nas rotas privadas de download e certificado', () => {
    const deployScript = readProjectFile('scripts/deploy-supabase-functions.mjs');
    const config = readProjectFile('supabase/config.toml');

    for (const functionName of [
      'get-beat-download-url',
      'get-beat-license-contract',
      'get-course-certificate',
      'get-digital-product-download-url',
      'get-signed-lesson-url',
      'request-producer-payout',
    ]) {
      expect(deployScript).not.toContain(`'${functionName}'`);
      expect(config).not.toContain(`[functions.${functionName}]`);
    }
  });
});
