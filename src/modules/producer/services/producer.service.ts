import { supabase } from '@/integrations/supabase/client';
import type {
  ProducerDashboardData,
  SellerOrderItem,
  SellerProduct,
  SellerProductFile,
  SellerProductType,
} from '@/modules/producer/types/producer.types';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

interface ProductFileRow {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
}

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  product_type: SellerProductType;
  price_cents: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  seller_product_files: ProductFileRow[] | null;
}

interface OrderItemRow {
  id: string;
  product_title_snapshot: string;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
}

interface ProductMetadataInput {
  title: string;
  slug: string;
  description: string;
  productType: SellerProductType;
  priceCents: number;
}

const MAX_PRODUCT_FILE_SIZE = 500 * 1024 * 1024;

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

const validateProductFile = (file: File) => {
  if (file.size <= 0 || file.size > MAX_PRODUCT_FILE_SIZE) {
    throw new Error('O arquivo deve possuir até 500 MB.');
  }
};

const mapFile = (file: ProductFileRow): SellerProductFile => ({
  id: file.id,
  storagePath: file.storage_path,
  fileName: file.file_name,
  mimeType: file.mime_type,
  sizeBytes: Number(file.size_bytes),
  createdAt: file.created_at,
});

const mapProduct = (item: ProductRow): SellerProduct => {
  const files = (item.seller_product_files ?? []).map(mapFile);
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    description: item.description ?? '',
    productType: item.product_type,
    priceCents: item.price_cents,
    currency: item.currency,
    status: item.status,
    fileCount: files.length,
    files,
    createdAt: item.created_at,
  };
};

const uploadProductFile = async (producerId: string, productId: string, file: File) => {
  validateProductFile(file);
  const path = `${producerId}/${productId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from('seller-product-files')
    .upload(path, file, { upsert: false, cacheControl: '3600' });

  if (uploadError) throw new Error(`Não foi possível enviar o arquivo: ${uploadError.message}`);

  const { data: fileRecord, error: fileError } = await supabase.from('seller_product_files').insert({
    product_id: productId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
  }).select('id').single();

  if (fileError || !fileRecord) {
    await supabase.storage.from('seller-product-files').remove([path]);
    throw new Error(`Não foi possível registrar o arquivo: ${fileError?.message ?? 'Resposta vazia.'}`);
  }

  return { id: fileRecord.id, path };
};

export const producerService = {
  async listProducts(): Promise<SellerProduct[]> {
    const producerId = await getProducerId();
    const { data, error } = await supabase
      .from('seller_products')
      .select('id,title,slug,description,product_type,price_cents,currency,status,created_at,seller_product_files(id,storage_path,file_name,mime_type,size_bytes,created_at)')
      .eq('seller_id', producerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Não foi possível carregar os produtos: ${error.message}`);
    return ((data ?? []) as ProductRow[]).map(mapProduct);
  },

  async createProduct(payload: ProductMetadataInput & { file: File }): Promise<void> {
    const producerId = await getProducerId();
    validateProductFile(payload.file);

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

    try {
      await uploadProductFile(producerId, data.id, payload.file);
    } catch (uploadFailure) {
      await supabase.from('seller_products').delete().eq('id', data.id).eq('seller_id', producerId);
      throw uploadFailure;
    }
  },

  async updateProduct(id: string, payload: ProductMetadataInput & { replacementFile?: File }): Promise<void> {
    const producerId = await getProducerId();
    const { data: existing, error: readError } = await supabase
      .from('seller_products')
      .select('id,seller_product_files(id,storage_path)')
      .eq('id', id)
      .eq('seller_id', producerId)
      .maybeSingle();

    if (readError) throw new Error(`Não foi possível carregar o produto: ${readError.message}`);
    if (!existing) throw new Error('Produto não encontrado para este produtor.');

    let uploaded: { id: string; path: string } | null = null;
    if (payload.replacementFile) {
      uploaded = await uploadProductFile(producerId, id, payload.replacementFile);
    }

    const { error: updateError } = await supabase
      .from('seller_products')
      .update({
        title: payload.title.trim(),
        slug: payload.slug.trim().toLowerCase(),
        description: payload.description.trim(),
        product_type: payload.productType,
        price_cents: Math.max(0, Math.round(payload.priceCents)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('seller_id', producerId);

    if (updateError) {
      if (uploaded) {
        await supabase.from('seller_product_files').delete().eq('id', uploaded.id);
        await supabase.storage.from('seller-product-files').remove([uploaded.path]);
      }
      throw new Error(`Não foi possível atualizar o produto: ${updateError.message}`);
    }

    if (uploaded) {
      const previousFiles = (existing.seller_product_files ?? []) as Array<{ id: string; storage_path: string }>;
      if (previousFiles.length) {
        const { error: deleteRecordsError } = await supabase
          .from('seller_product_files')
          .delete()
          .in('id', previousFiles.map((file) => file.id));
        if (deleteRecordsError) throw new Error(`Produto atualizado, mas os arquivos anteriores não puderam ser removidos: ${deleteRecordsError.message}`);
        await supabase.storage.from('seller-product-files').remove(previousFiles.map((file) => file.storage_path));
      }
    }
  },

  async getProductFileDownloadUrl(file: SellerProductFile): Promise<string> {
    const { data, error } = await supabase.storage
      .from('seller-product-files')
      .createSignedUrl(file.storagePath, 300, { download: file.fileName });
    if (error || !data?.signedUrl) throw new Error(`Não foi possível liberar o arquivo: ${error?.message ?? 'URL ausente.'}`);
    return data.signedUrl;
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
