import { supabase } from '@/integrations/supabase/client';
import type { Product, ProductLicense, ProductQA, ProductReview } from '@/modules/marketplace/types/product';

interface ProductRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  product_type: 'preset' | 'drum_kit' | 'midi' | 'plugin' | 'template' | 'project' | 'ebook' | 'other';
  price_cents: number;
  currency: string;
  cover_url: string | null;
  seller_product_files: { file_name: string }[] | null;
}

const labels: Record<ProductRow['product_type'], string> = {
  preset: 'Presets', drum_kit: 'Drum Kits', midi: 'MIDI', plugin: 'Plugins', template: 'Templates',
  project: 'Projetos', ebook: 'E-books', other: 'Outros',
};

const gradients = [['#8A2BE2', '#6C3AED'], ['#6C3AED', '#24103f'], ['#8A2BE2', '#1A1A1A']] as const;

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
    return [...new Set((await this.listProducts()).map((product) => product.category))].sort();
  },

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const rows = await listRows();
    const index = rows.findIndex((row) => row.slug === slug);
    return index < 0 ? undefined : mapProduct(rows[index], index);
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
