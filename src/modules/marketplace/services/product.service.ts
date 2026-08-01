import { supabase } from '@/integrations/supabase/client';
import type { Product, ProductLicense, ProductQA, ProductReview } from '@/modules/marketplace/types/product';
import { DEV_IDENTITY_IDS, getEffectiveUserId } from '@/shared/utils/devIdentity';

export type ProductType = 'preset' | 'drum_kit' | 'midi' | 'plugin' | 'template' | 'project' | 'ebook' | 'other';

interface ProductRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  product_type: ProductType;
  price_cents: number;
  currency: string;
  cover_url: string | null;
  seller_product_files: { file_name: string }[] | null;
}

interface ProductMutationInput {
  title: string;
  category: string;
  description: string;
  priceCents: number;
}

const labels: Record<ProductType, string> = {
  preset: 'Presets',
  drum_kit: 'Drum Kits',
  midi: 'MIDI',
  plugin: 'Plugins',
  template: 'Templates',
  project: 'Projetos',
  ebook: 'E-books',
  other: 'Outros',
};

const typeByLabel = new Map<string, ProductType>(
  Object.entries(labels).map(([type, label]) => [label.toLocaleLowerCase('pt-BR'), type as ProductType]),
);

const gradients = [['#8A2BE2', '#6C3AED'], ['#6C3AED', '#24103f'], ['#8A2BE2', '#1A1A1A']] as const;
const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const resolveType = (category: string): ProductType =>
  typeByLabel.get(category.trim().toLocaleLowerCase('pt-BR')) ?? 'other';

const currentSellerId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return getEffectiveUserId(user?.id ?? DEV_IDENTITY_IDS.producer);
};

const mapProduct = (row: ProductRow, index: number): Product => {
  const [gradientFrom, gradientTo] = gradients[index % gradients.length];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: labels[row.product_type],
    priceCents: row.price_cents,
    currency: row.currency,
    gradientFrom,
    gradientTo,
  };
};

const listRows = async (): Promise<ProductRow[]> => {
  const { data, error } = await supabase
    .from('seller_products')
    .select('id,slug,title,description,product_type,price_cents,currency,cover_url,seller_product_files(file_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProductRow[];
};

export const productService = {
  async listProducts(): Promise<Product[]> {
    return (await listRows()).map(mapProduct);
  },

  async listCategories(): Promise<readonly string[]> {
    const categories: string[] = (await this.listProducts()).map((product) => String(product.category));
    return [...new Set<string>(categories)].sort((left, right) => left.localeCompare(right, 'pt-BR'));
  },

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const rows = await listRows();
    const index = rows.findIndex((row) => row.slug === slug);
    return index < 0 ? undefined : mapProduct(rows[index], index);
  },

  async createProduct(input: ProductMutationInput): Promise<Product> {
    const sellerId = await currentSellerId();
    const slug = `${slugify(input.title)}-${crypto.randomUUID().slice(0, 8)}`;
    const { data, error } = await supabase.from('seller_products').insert({
      seller_id: sellerId,
      title: input.title.trim(),
      slug,
      description: input.description.trim(),
      product_type: resolveType(input.category),
      price_cents: Math.max(0, Math.round(input.priceCents)),
      currency: 'BRL',
      status: 'draft',
      is_demo: true,
    }).select('id,slug,title,description,product_type,price_cents,currency,cover_url').single();
    if (error || !data) throw new Error(error?.message ?? 'Não foi possível criar o produto.');
    return mapProduct({ ...data, seller_product_files: [] } as ProductRow, 0);
  },

  async updateProduct(id: string, input: ProductMutationInput): Promise<Product> {
    const sellerId = await currentSellerId();
    const { data, error } = await supabase.from('seller_products').update({
      title: input.title.trim(),
      description: input.description.trim(),
      product_type: resolveType(input.category),
      price_cents: Math.max(0, Math.round(input.priceCents)),
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('seller_id', sellerId)
      .select('id,slug,title,description,product_type,price_cents,currency,cover_url').single();
    if (error || !data) throw new Error(error?.message ?? 'Não foi possível atualizar o produto.');
    return mapProduct({ ...data, seller_product_files: [] } as ProductRow, 0);
  },

  async getProductDetailBundle(slug: string) {
    const rows = await listRows();
    const index = rows.findIndex((row) => row.slug === slug);
    if (index < 0) return undefined;
    const row = rows[index];
    const product = mapProduct(row, index);
    const related = rows
      .filter((candidate) => candidate.id !== row.id && candidate.product_type === row.product_type)
      .slice(0, 4)
      .map(mapProduct);
    const reviews: ProductReview[] = [];
    const qa: ProductQA[] = [];
    const license: ProductLicense = 'Padrao';
    const includedFiles = (row.seller_product_files ?? []).map((file) => file.file_name);
    return {
      product,
      description: row.description,
      reviews,
      qa,
      license,
      includedFiles,
      related,
    };
  },
};
