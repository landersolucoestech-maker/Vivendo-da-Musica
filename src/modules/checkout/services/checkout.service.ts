import { supabase } from '@/integrations/supabase/client';
import { getAffiliateReferralSlug } from '@/modules/affiliate/utils/referralSession';
import type { StudentOrder } from '@/modules/checkout/types/order.types';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

interface CourseOrderRow {
  id: string;
  status: string;
  provider: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  course_order_items: Array<{ course_title_snapshot: string; amount_cents: number }> | null;
}

interface BeatOrderRow {
  id: string;
  status: string;
  provider: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  beat_order_items: Array<{ beat_title_snapshot: string; license_name_snapshot: string; amount_cents: number }> | null;
}

interface ProductOrderRow {
  id: string;
  status: string;
  provider: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  digital_product_order_items: Array<{ product_title_snapshot: string; amount_cents: number }> | null;
}

const mapStatus = (status: string): StudentOrder['status'] => {
  if (status === 'paid') return 'pago';
  if (status === 'refunded') return 'reembolsado';
  return 'pendente';
};

const getCurrentStudentId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return getEffectiveUserId(user?.id ?? null);
};

const readCheckoutUrl = (data: unknown): string => {
  if (!data || typeof data !== 'object' || !('checkoutUrl' in data) || typeof data.checkoutUrl !== 'string') {
    throw new Error('O checkout não retornou uma URL válida.');
  }
  return data.checkoutUrl;
};

const referralSlug = () => getAffiliateReferralSlug();

export const checkoutService = {
  async listOrders(): Promise<StudentOrder[]> {
    const userId = await getCurrentStudentId();

    const [courseResult, beatResult, productResult] = await Promise.all([
      supabase
        .from('course_orders')
        .select('id,status,provider,amount_cents,currency,created_at,course_order_items(course_title_snapshot,amount_cents)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('beat_orders')
        .select('id,status,provider,amount_cents,currency,created_at,beat_order_items(beat_title_snapshot,license_name_snapshot,amount_cents)')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('digital_product_orders')
        .select('id,status,provider,amount_cents,currency,created_at,digital_product_order_items(product_title_snapshot,amount_cents)')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    const failure = courseResult.error ?? beatResult.error ?? productResult.error;
    if (failure) throw new Error(`Não foi possível carregar os pedidos: ${failure.message}`);

    const courses: StudentOrder[] = ((courseResult.data ?? []) as CourseOrderRow[]).map((order) => ({
      id: order.id,
      kind: 'curso',
      items: (order.course_order_items ?? []).map((item) => ({
        title: item.course_title_snapshot,
        priceCents: item.amount_cents,
      })),
      totalCents: order.amount_cents,
      status: mapStatus(order.status),
      paymentMethod: order.provider,
      createdAt: order.created_at,
      currency: order.currency,
    }));

    const beats: StudentOrder[] = ((beatResult.data ?? []) as BeatOrderRow[]).map((order) => ({
      id: order.id,
      kind: 'beat',
      items: (order.beat_order_items ?? []).map((item) => ({
        title: `${item.beat_title_snapshot} — ${item.license_name_snapshot}`,
        priceCents: item.amount_cents,
      })),
      totalCents: order.amount_cents,
      status: mapStatus(order.status),
      paymentMethod: order.provider,
      createdAt: order.created_at,
      currency: order.currency,
    }));

    const products: StudentOrder[] = ((productResult.data ?? []) as ProductOrderRow[]).map((order) => ({
      id: order.id,
      kind: 'produto',
      items: (order.digital_product_order_items ?? []).map((item) => ({
        title: item.product_title_snapshot,
        priceCents: item.amount_cents,
      })),
      totalCents: order.amount_cents,
      status: mapStatus(order.status),
      paymentMethod: order.provider,
      createdAt: order.created_at,
      currency: order.currency,
    }));

    return [...courses, ...beats, ...products]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  },

  async createCourseCheckout(courseIds: string[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-course-checkout', {
      body: {
        courseIds,
        referralSlug: referralSlug(),
        idempotencyKey: `course_${crypto.randomUUID()}`,
      },
    });
    if (error) throw new Error(error.message);
    return readCheckoutUrl(data);
  },

  async createBeatCheckout(
    licenseIds: string[],
    promotions?: { couponCode?: string; affiliateCode?: string },
  ): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-beat-checkout', {
      body: {
        licenseIds,
        couponCode: promotions?.couponCode?.trim() || null,
        affiliateCode: promotions?.affiliateCode?.trim() || null,
        referralSlug: referralSlug(),
        idempotencyKey: `beat_${crypto.randomUUID()}`,
      },
    });
    if (error) throw new Error(error.message);
    return readCheckoutUrl(data);
  },

  async createDigitalProductCheckout(productIds: string[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-digital-product-checkout', {
      body: {
        productIds,
        referralSlug: referralSlug(),
        idempotencyKey: `digital_${crypto.randomUUID()}`,
      },
    });
    if (error) throw new Error(error.message);
    return readCheckoutUrl(data);
  },
};
