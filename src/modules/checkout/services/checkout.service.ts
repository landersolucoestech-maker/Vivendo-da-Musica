import type { StudentOrder } from "@/modules/checkout/types/order.types";
import { supabase } from "@/integrations/supabase/client";

interface CourseOrderRow {
  id: string;
  status: 'pending' | 'paid' | 'canceled' | 'refunded';
  provider: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  course_order_items: { amount_cents: number; courses: { title: string } | null }[] | null;
}

interface BeatOrderRow {
  id: string;
  status: 'pending' | 'paid' | 'canceled' | 'refunded';
  provider: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  beat_order_items: {
    amount_cents: number;
    beats: { title: string } | null;
    beat_licenses: { name: string } | null;
  }[] | null;
}

interface DigitalProductOrderRow {
  id: string;
  status: 'pending' | 'paid' | 'canceled' | 'refunded' | 'disputed';
  provider: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  digital_product_order_items: { product_title_snapshot: string; amount_cents: number }[] | null;
}

const mapStatus = (status: CourseOrderRow['status']): StudentOrder['status'] =>
  status === 'paid' ? 'pago' : status === 'refunded' ? 'reembolsado' : 'pendente';

export const checkoutService = {
  async listOrders(): Promise<StudentOrder[]> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Entre na sua conta para consultar os pedidos.');

    const courseTable = supabase.from as unknown as (table: 'course_orders') => {
      select(columns: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): Promise<{ data: CourseOrderRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: courseOrders, error: courseError } = await courseTable('course_orders')
      .select('id, status, provider, amount_cents, currency, created_at, course_order_items(amount_cents, courses(title))')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false });
    if (courseError) throw new Error(`Nao foi possivel carregar os pedidos de cursos: ${courseError.message}`);

    const beatTable = supabase.from as unknown as (table: 'beat_orders') => {
      select(columns: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): Promise<{ data: BeatOrderRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: beatOrders, error: beatError } = await beatTable('beat_orders')
      .select('id, status, provider, amount_cents, currency, created_at, beat_order_items(amount_cents, beats(title), beat_licenses(name))')
      .eq('buyer_id', authData.user.id)
      .order('created_at', { ascending: false });
    if (beatError) throw new Error(`Nao foi possivel carregar os pedidos de beats: ${beatError.message}`);

    const productTable = supabase.from as unknown as (table: 'digital_product_orders') => {
      select(columns: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): Promise<{ data: DigitalProductOrderRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    const { data: productOrders, error: productError } = await productTable('digital_product_orders')
      .select('id, status, provider, amount_cents, currency, created_at, digital_product_order_items(product_title_snapshot, amount_cents)')
      .eq('buyer_id', authData.user.id)
      .order('created_at', { ascending: false });
    if (productError) throw new Error(`Nao foi possivel carregar os pedidos de produtos: ${productError.message}`);

    const courses: StudentOrder[] = (courseOrders ?? []).map((order) => ({
      id: order.id,
      kind: 'curso',
      items: (order.course_order_items ?? []).map((item) => ({
        title: item.courses?.title ?? 'Curso',
        priceCents: item.amount_cents,
      })),
      totalCents: order.amount_cents,
      status: mapStatus(order.status),
      paymentMethod: order.provider,
      createdAt: order.created_at,
      currency: order.currency,
    }));
    const beats: StudentOrder[] = (beatOrders ?? []).map((order) => ({
      id: order.id,
      kind: 'beat',
      items: (order.beat_order_items ?? []).map((item) => ({
        title: `${item.beats?.title ?? 'Beat'} - ${item.beat_licenses?.name ?? 'Licenca'}`,
        priceCents: item.amount_cents,
      })),
      totalCents: order.amount_cents,
      status: mapStatus(order.status),
      paymentMethod: order.provider,
      createdAt: order.created_at,
      currency: order.currency,
    }));
    const products: StudentOrder[] = (productOrders ?? []).map((order) => ({
      id: order.id,
      kind: 'produto',
      items: (order.digital_product_order_items ?? []).map((item) => ({
        title: item.product_title_snapshot,
        priceCents: item.amount_cents,
      })),
      totalCents: order.amount_cents,
      status: mapStatus(order.status === 'disputed' ? 'pending' : order.status),
      paymentMethod: order.provider,
      createdAt: order.created_at,
      currency: order.currency,
    }));
    return [...courses, ...beats, ...products].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  },

  async createBeatCheckout(
    licenseIds: string[],
    promotions?: { couponCode?: string; affiliateCode?: string },
  ): Promise<string> {
    const { data, error } = await supabase.functions.invoke("create-beat-checkout", {
      body: {
        licenseIds,
        couponCode: promotions?.couponCode?.trim() || null,
        affiliateCode: promotions?.affiliateCode?.trim() || null,
      },
    });
    if (error) throw new Error(error.message);
    if (!data?.checkoutUrl) throw new Error(data?.error ?? "O checkout nao retornou uma URL valida.");
    return data.checkoutUrl as string;
  },

  async createDigitalProductCheckout(productIds: string[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke("create-digital-product-checkout", {
      body: {
        productIds,
        idempotencyKey: `digital_${crypto.randomUUID()}`,
      },
    });
    if (error) throw new Error(error.message);
    if (!data?.checkoutUrl) throw new Error(data?.error ?? "O checkout nao retornou uma URL valida.");
    return data.checkoutUrl as string;
  },
};
