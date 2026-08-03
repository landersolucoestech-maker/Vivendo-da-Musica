import { supabase } from '@/integrations/supabase/client';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

interface CheckoutResponse {
  checkoutUrl?: unknown;
  orderId?: unknown;
  provider?: unknown;
  paid?: unknown;
}

const readCheckoutUrl = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('O checkout não retornou uma resposta válida.');
  }
  const checkoutUrl = (payload as CheckoutResponse).checkoutUrl;
  if (typeof checkoutUrl !== 'string' || !checkoutUrl) {
    throw new Error('O checkout não retornou uma URL válida.');
  }
  return checkoutUrl;
};

const getBuyerId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error && !import.meta.env.DEV) throw error;
  return getEffectiveUserId(data.user?.id ?? null);
};

export const canonicalCheckoutService = {
  async createCheckout(
    offerIds: string[],
    context: Record<string, string | number | boolean> = {},
    returnPath = '/pagamento-sucesso',
    cancelPath = '/checkout',
  ): Promise<string> {
    if (!offerIds.length) throw new Error('Selecione ao menos uma oferta.');
    const buyerId = await getBuyerId();
    const origin = window.location.origin;
    const { data, error } = await supabase.functions.invoke('create-commerce-checkout', {
      body: {
        offerIds,
        buyerId,
        context,
        idempotencyKey: `commerce_${crypto.randomUUID()}`,
        successUrl: `${origin}${returnPath}`,
        cancelUrl: `${origin}${cancelPath}`,
      },
    });
    if (error) throw new Error(error.message);
    return readCheckoutUrl(data);
  },
};
