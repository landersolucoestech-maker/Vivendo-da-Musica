import { supabase } from '@/integrations/supabase/client';
import type { ProducerDashboardData, SellerOrderItem, SellerProduct, SellerProductType } from '@/modules/producer/types/producer.types';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  product_type: SellerProductType;
  price_cents: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  seller_product_files: { id: string }[] | null;
}

interface OrderItemRow {
  id: string;
  product_title_snapshot: string;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
}

const getProducerId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return getEffectiveUserId(user?.id ?? null);
};

const safeFileName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-');

export const producerService = {
  async listProducts(): Promise<SellerProduct[]> {
    const producerId = await getProducerId();
    const { data, error } = await supabase
      .from('seller_products')
      .select('id,title,slug,product_type,price_cents,currency,status,created_at,seller_product_files(id)')
      .eq('seller_id', producerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Não foi possível carregar os produtos: ${error.message}`);
    return ((data ?? []) as ProductRow[]).map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      productType: item.product_type,
      priceCents: item.price_cents,
      currency: item.currency,
      status: item.status,
      fileCount: item.seller_product_files?.length ?? 0,
      createdAt: item.created_at,
    }));
  },

  async createProduct(payload: {
    title: string;
    slug: string;
    description: string;
    productType: SellerProductType;
    priceCents: number;
    file: File;
  }): Promise<void> {
    const producerId = await getProducerId();
    if (payload.file.size <= 0 || payload.file.size > 500 * 1024 * 1024) {
      throw new Error('O arquivo deve possuir até 500 MB.');
    }

    const { data, error } = await supabase
      .from('seller_products')
      .insert({
        seller_id: producerId,
        title: payload.title.trim(),
        slug: payload.slug.trim().toLowerCase(),
        description: payload.description.trim(),
        product_type: payload.productType,
        price_cents: Math.max(0, Math.round(payload.priceCents)),
        currency: 'BRL',
        status: 'draft',
        is_demo: isDevAuthBypassEnabled,
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(`Não foi possível criar o produto: ${error?.message ?? 'Resposta vazia.'}`);

    const path = `${producerId}/${data.id}/${crypto.randomUUID()}-${safeFileName(payload.file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from('seller-product-files')
      .upload(path, payload.file, { upsert: false, cacheControl: '3600' });

    if (uploadError) {
      await supabase.from('seller_products').delete().eq('id', data.id).eq('seller_id', producerId);
      throw new Error(`Não foi possível enviar o arquivo: ${uploadError.message}`);
    }

    const { error: fileError } = await supabase.from('seller_product_files').insert({
      product_id: data.id,
      storage_path: path,
      file_name: payload.file.name,
      mime_type: payload.file.type || null,
      size_bytes: payload.file.size,
    });

    if (fileError) {
      await supabase.storage.from('seller-product-files').remove([path]);
      await supabase.from('seller_products').delete().eq('id', data.id).eq('seller_id', producerId);
      throw new Error(`Não foi possível registrar o arquivo: ${fileError.message}`);
    }
  },

  async setProductStatus(id: string, status: 'published' | 'archived'): Promise<void> {
    const producerId = await getProducerId();
    const { error } = await supabase
      .from('seller_products')
      .update({
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('seller_id', producerId);

    if (error) throw new Error(`Não foi possível alterar o produto: ${error.message}`);
  },

  async listOrders(): Promise<SellerOrderItem[]> {
    const producerId = await getProducerId();
    const { data, error } = await supabase
      .from('digital_product_order_items')
      .select('id,product_title_snapshot,amount_cents,currency,paid_at,created_at')
      .eq('seller_id', producerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Não foi possível carregar os pedidos: ${error.message}`);
    return ((data ?? []) as OrderItemRow[]).map((item) => ({
      id: item.id,
      productTitle: item.product_title_snapshot,
      amountCents: item.amount_cents,
      currency: item.currency,
      paidAt: item.paid_at,
      createdAt: item.created_at,
    }));
  },

  async getDashboard(): Promise<ProducerDashboardData> {
    const [products, orders] = await Promise.all([this.listProducts(), this.listOrders()]);
    const paidOrders = orders.filter((order) => order.paidAt);
    const productRevenueCents = paidOrders.reduce((sum, order) => sum + order.amountCents, 0);
    const productRanking = new Map<string, { title: string; sales: number; revenueCents: number }>();

    for (const order of paidOrders) {
      const current = productRanking.get(order.productTitle) ?? { title: order.productTitle, sales: 0, revenueCents: 0 };
      current.sales += 1;
      current.revenueCents += order.amountCents;
      productRanking.set(order.productTitle, current);
    }

    return {
      financial: {
        availableBalanceCents: productRevenueCents,
        eligibleBalanceCents: productRevenueCents,
        currency: 'BRL',
        commissionBps: 0,
        payoutMinimumCents: 0,
        payoutDelayDays: 0,
      },
      totals: {
        grossRevenueCents: productRevenueCents,
        beatRevenueCents: 0,
        productRevenueCents,
        totalSales: paidOrders.length,
        beatSales: 0,
        productSales: paidOrders.length,
        publishedBeats: 0,
        publishedProducts: products.filter((product) => product.status === 'published').length,
        averageTicketCents: paidOrders.length ? Math.round(productRevenueCents / paidOrders.length) : 0,
      },
      topProducts: [...productRanking.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
      recentOrders: orders.slice(0, 5),
    };
  },
};
