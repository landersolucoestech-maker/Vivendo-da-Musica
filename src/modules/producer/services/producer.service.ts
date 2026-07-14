import { supabase } from "@/integrations/supabase/client";
import type { ProducerDashboardData, SellerOrderItem, SellerProduct, SellerProductType } from "@/modules/producer/types/producer.types";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";

interface ProductRow { id: string; title: string; slug: string; product_type: SellerProductType; price_cents: number; currency: string; status: 'draft' | 'published' | 'archived'; created_at: string; seller_product_files: { id: string }[] }
interface OrderItemRow { id: string; product_title_snapshot: string; amount_cents: number; currency: string; paid_at: string | null; created_at: string }

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Entre como produtor para continuar.');
  return data.user.id;
};

const productsTable = supabase.from as unknown as (name: 'seller_products') => any;
const filesTable = supabase.from as unknown as (name: 'seller_product_files') => any;
const orderItemsTable = supabase.from as unknown as (name: 'digital_product_order_items') => any;

export const producerService = {
  async listProducts(): Promise<SellerProduct[]> {
    const userId = await getUserId();
    const { data, error } = await productsTable('seller_products').select('id,title,slug,product_type,price_cents,currency,status,created_at,seller_product_files(id)').eq('seller_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(`Nao foi possivel carregar os produtos: ${error.message}`);
    return ((data ?? []) as ProductRow[]).map((item) => ({ id: item.id, title: item.title, slug: item.slug, productType: item.product_type, priceCents: item.price_cents, currency: item.currency, status: item.status, fileCount: item.seller_product_files?.length ?? 0, createdAt: item.created_at }));
  },

  async createProduct(payload: { title: string; slug: string; description: string; productType: SellerProductType; priceCents: number; file: File }): Promise<void> {
    const userId = await getUserId();
    const { data, error } = await productsTable('seller_products').insert({ seller_id: userId, title: payload.title, slug: payload.slug, description: payload.description, product_type: payload.productType, price_cents: payload.priceCents, currency: 'BRL', status: 'draft' }).select('id').single();
    if (error || !data) throw new Error(`Nao foi possivel criar o produto: ${error?.message ?? 'Resposta vazia.'}`);
    const productId = data.id as string;
    const safeName = payload.file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${userId}/${productId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('seller-product-files').upload(path, payload.file, { upsert: false });
    if (uploadError) {
      await productsTable('seller_products').delete().eq('id', productId);
      throw new Error(`Nao foi possivel enviar o arquivo: ${uploadError.message}`);
    }
    const { error: fileError } = await filesTable('seller_product_files').insert({ product_id: productId, storage_path: path, file_name: payload.file.name, mime_type: payload.file.type || null, size_bytes: payload.file.size });
    if (fileError) {
      await supabase.storage.from('seller-product-files').remove([path]);
      await productsTable('seller_products').delete().eq('id', productId);
      throw new Error(`Nao foi possivel registrar o arquivo: ${fileError.message}`);
    }
  },

  async setProductStatus(id: string, status: 'published' | 'archived'): Promise<void> {
    const userId = await getUserId();
    const { error } = await productsTable('seller_products').update({ status }).eq('id', id).eq('seller_id', userId);
    if (error) throw new Error(`Nao foi possivel alterar o produto: ${error.message}`);
  },

  async listOrders(): Promise<SellerOrderItem[]> {
    const userId = await getUserId();
    const { data, error } = await orderItemsTable('digital_product_order_items').select('id,product_title_snapshot,amount_cents,currency,paid_at,created_at').eq('seller_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(`Nao foi possivel carregar os pedidos: ${error.message}`);
    return ((data ?? []) as OrderItemRow[]).map((item) => ({ id: item.id, productTitle: item.product_title_snapshot, amountCents: item.amount_cents, currency: item.currency, paidAt: item.paid_at, createdAt: item.created_at }));
  },

  async getDashboard(): Promise<ProducerDashboardData> {
    const beatDashboard = await marketplaceService.getProducerBeatDashboard();
    const products = await this.listProducts();
    const orders = await this.listOrders();
    const paidProductOrders = orders.filter((order) => order.paidAt);
    const productRevenueCents = paidProductOrders.reduce((sum, order) => sum + order.amountCents, 0);
    const productRanking = new Map<string, { title: string; sales: number; revenueCents: number }>();
    paidProductOrders.forEach((order) => {
      const current = productRanking.get(order.productTitle) ?? { title: order.productTitle, sales: 0, revenueCents: 0 };
      current.sales += 1;
      current.revenueCents += order.amountCents;
      productRanking.set(order.productTitle, current);
    });
    const beatSales = beatDashboard.totals.totalSales;
    const productSales = paidProductOrders.length;
    const totalSales = beatSales + productSales;
    const grossRevenueCents = beatDashboard.totals.totalRevenueCents + productRevenueCents;

    return {
      financial: {
        availableBalanceCents: beatDashboard.financial.availableBalanceCents,
        eligibleBalanceCents: beatDashboard.financial.eligibleBalanceCents,
        currency: beatDashboard.financial.currency,
        commissionBps: beatDashboard.financial.commissionBps,
        payoutMinimumCents: beatDashboard.financial.payoutMinimumCents,
        payoutDelayDays: beatDashboard.financial.payoutDelayDays,
      },
      totals: {
        grossRevenueCents,
        beatRevenueCents: beatDashboard.totals.totalRevenueCents,
        productRevenueCents,
        totalSales,
        beatSales,
        productSales,
        publishedBeats: beatDashboard.beats.filter((beat) => beat.status === "published").length,
        publishedProducts: products.filter((product) => product.status === "published").length,
        averageTicketCents: totalSales ? Math.round(grossRevenueCents / totalSales) : 0,
      },
      topProducts: [...productRanking.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
      recentOrders: orders.slice(0, 5),
    };
  },
};
