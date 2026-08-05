import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const beatCheckout = readProjectFile('supabase/functions/create-beat-checkout/index.ts');
const courseCheckout = readProjectFile('supabase/functions/create-course-checkout/index.ts');
const productCheckout = readProjectFile('supabase/functions/create-digital-product-checkout/index.ts');
const serviceCatalog = readProjectFile('supabase/functions/manage-service-catalog/index.ts');
const serviceRequests = readProjectFile('supabase/functions/manage-service-requests/index.ts');
const serviceDelivery = readProjectFile('supabase/functions/service-delivery-file-access/index.ts');

describe('isolamento dos fluxos sintéticos nas Edge Functions', () => {
  it('restringe os checkouts públicos ao catálogo de demonstração', () => {
    expect(beatCheckout).toContain('beats!inner(id,title,producer_id,exclusive_available,is_demo)');
    expect(beatCheckout).toContain('!item.beats.is_demo');

    expect(courseCheckout).toContain("status,visibility,is_demo");
    expect(courseCheckout).toContain("course.status !== 'published' || !course.is_demo");

    expect(productCheckout).toContain("status,is_demo");
    expect(productCheckout).toContain("item.status !== 'published' || !item.is_demo");
  });

  it('deriva o ambiente de catálogo a partir do perfil persistido', () => {
    expect(serviceCatalog).toContain("select('full_name,avatar_url,is_demo')");
    expect(serviceCatalog).toContain('const actorIsDemo = Boolean(actorProfile?.is_demo);');
    expect(serviceCatalog).toContain('is_demo: actorIsDemo');
    expect(serviceCatalog).toContain(".eq('is_demo', actorIsDemo)");
  });

  it('impede propostas e solicitações entre ambientes demo e reais', () => {
    expect(serviceRequests).toContain("select('is_demo')");
    expect(serviceRequests).toContain('const actorIsDemo = Boolean(actorProfile?.is_demo);');
    expect(serviceRequests).toContain('Boolean(listing.is_demo) !== actorIsDemo');
    expect(serviceRequests).toContain('Boolean(serviceRequest.is_demo) !== actorIsDemo');
    expect(serviceRequests).toContain('Boolean(relatedRequest?.is_demo) !== actorIsDemo');
  });

  it('impede upload e download de entregas entre ambientes', () => {
    expect(serviceDelivery).toContain("select('is_demo')");
    expect(serviceDelivery).toContain('const actorIsDemo = Boolean(actorProfile?.is_demo);');
    expect(serviceDelivery).toContain('Boolean(relation?.is_demo) !== actorIsDemo');
    expect(serviceDelivery).toContain('Boolean(contract.is_demo) !== actorIsDemo');
  });
});
