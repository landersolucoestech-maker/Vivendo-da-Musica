import { supabase } from '@/integrations/supabase/client';
import { beatService } from '@/modules/marketplace/services/beat.service';
import { downloadsService } from '@/modules/marketplace/services/downloads.service';
import { productService } from '@/modules/marketplace/services/product.service';
import type { Product } from '@/modules/marketplace/types/product';

export const marketplaceService = {
  ...beatService,
  ...downloadsService,
  ...productService,

  async getProductById(id: string) {
    return productService.getProductById(id);
  },

  async listRelatedProducts(product: Product, limit = 4) {
    return (await productService.listProducts())
      .filter((item) => item.id !== product.id && item.category === product.category)
      .slice(0, limit);
  },

  async getProductDescription(slug: string) {
    return (await productService.getProductDetailBundle(slug))?.description ?? '';
  },

  async getProductReviews(slug: string) {
    return (await productService.getProductDetailBundle(slug))?.reviews ?? [];
  },

  async getProductQA(slug: string) {
    return (await productService.getProductDetailBundle(slug))?.qa ?? [];
  },

  async getProductLicense(slug: string) {
    return (await productService.getProductDetailBundle(slug))?.license ?? 'Padrao';
  },

  async getProductIncludedFiles(slug: string) {
    return (await productService.getProductDetailBundle(slug))?.includedFiles ?? [];
  },

  async recordBeatEvent(beatId: string, eventType: 'view' | 'play' | 'add_to_cart' | 'checkout' | 'purchase') {
    const { error } = await supabase.from('beat_events').insert({
      beat_id: beatId,
      event_type: eventType,
    });
    if (error) throw new Error(error.message);
  },

  async getBeatDownloadUrl(deliveryId: string) {
    return downloadsService.getDownloadUrl('beat', deliveryId);
  },

  async getDigitalProductDownloadUrl(fileId: string) {
    return downloadsService.getDownloadUrl('product', fileId);
  },
};
