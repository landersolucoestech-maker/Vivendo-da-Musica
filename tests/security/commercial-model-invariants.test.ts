import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const walk = (directory: string): string[] => readdirSync(join(root, directory)).flatMap((entry) => {
  const relative = join(directory, entry);
  return statSync(join(root, relative)).isDirectory() ? walk(relative) : [relative];
});

const sourceText = () => walk('src')
  .filter((path) => /\.(ts|tsx|mts)$/.test(path))
  .map((path) => read(path))
  .join('\n');

describe('commercial model invariants', () => {
  it('does not restore premium content or recurring commercial plans', () => {
    const source = sourceText().toLowerCase();
    expect(source).not.toContain('biblioteca premium');
    expect(source).not.toContain('conteúdo premium');
    expect(source).not.toContain('assinantes premium');
    expect(source).not.toContain('mock_subscription_plans');
    expect(source).not.toContain('premium mensal');
    expect(source).not.toContain('premium anual');
    expect(source).not.toContain('clube vdm');
  });

  it('does not hardcode the old beat license prices in the beat service', () => {
    const service = read('src/modules/marketplace/services/beat.service.ts');
    expect(service).not.toMatch(/price_cents\s*:\s*9900/);
    expect(service).not.toMatch(/price_cents\s*:\s*19900/);
    expect(service).not.toMatch(/price_cents\s*:\s*149900/);
    expect(service).not.toContain('Licença Premium');
  });

  it('keeps every development checkout restricted to the dev project', () => {
    const checkoutPaths = [
      'supabase/functions/create-course-checkout/index.ts',
      'supabase/functions/create-beat-checkout/index.ts',
      'supabase/functions/create-digital-product-checkout/index.ts',
    ];

    checkoutPaths.forEach((path) => {
      const checkout = read(path);
      expect(checkout).toContain("const DEV_REF = 'ywirfqvobfnunlcsnptm'");
      expect(checkout).toContain('url.includes(DEV_REF)');
      expect(checkout).toContain("provider: 'development'");
    });
  });

  it('verifies the payment webhook signature before processing events', () => {
    const webhook = read('supabase/functions/payment-webhook/index.ts');
    expect(webhook).toContain('verifyStripeSignature');
    expect(webhook).toContain('constantTimeEqual');
    expect(webhook).toContain('payment_webhook_events');
  });

  it('keeps portal sidebars fixed outside the content scroll', () => {
    const sidebar = read('src/shared/components/CommercePortalSidebarEnhanced.tsx');
    expect(sidebar).toContain('fixed bottom-0 left-0');
    expect(sidebar).toContain('w-64');
    expect(sidebar).not.toContain('sticky');
  });

  it('exposes the required commerce routes through the centralized route contract', () => {
    const app = read('src/AppWithCommerce.tsx');
    const routes = read('src/shared/constants/routes.ts');

    expect(routes).toContain("servicesPublic: '/servicos'");
    expect(routes).toContain("studentServices: '/aluno/servicos'");
    expect(routes).toContain("instructorFinance: '/instrutor/financeiro'");
    expect(routes).toContain("producerServices: '/produtor/servicos'");
    expect(routes).toContain("companyCredits: '/empresa/creditos'");

    expect(app).toContain('path={ROUTES.servicesPublic}');
    expect(app).toContain('path={ROUTES.studentServices}');
    expect(app).toContain('path={ROUTES.instructorFinance}');
    expect(app).toContain('path={ROUTES.producerServices}');
    expect(app).toContain('path={ROUTES.companyCredits}');
  });

  it('uses private storage for lessons and service deliveries', () => {
    const lessonMigration = read('supabase/migrations/20260803195800_create_private_lesson_video_delivery.sql');
    const serviceMigration = read('supabase/migrations/20260803224000_create_private_service_delivery_storage.sql');
    expect(lessonMigration).toMatch(/'lesson-videos'[\s\S]*false/);
    expect(serviceMigration).toMatch(/'service-deliveries'[\s\S]*false/);
  });
});
