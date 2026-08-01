import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Headphones, ShieldCheck, Zap } from 'lucide-react';

import PublicLayout from '@/app/layouts/PublicLayout';
import { checkoutService } from '@/modules/checkout/services/checkout.service';
import { useCart } from '@/modules/checkout/store/CartContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ROUTES } from '@/shared/constants/routes';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const CheckoutPage = () => {
  const { items, totalCents } = useCart();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');

  if (items.length === 0) return <Navigate to={ROUTES.marketplace} replace />;

  const currency = items[0]?.currency ?? 'BRL';

  const handlePay = async () => {
    setIsSubmitting(true);
    try {
      const kinds = [...new Set(items.map((item) => item.kind))];
      if (kinds.length !== 1) {
        throw new Error('Finalize cursos, beats e produtos digitais em pedidos separados.');
      }

      const ids = items.map((item) => item.id);
      const checkoutUrl = kinds[0] === 'course'
        ? await checkoutService.createCourseCheckout(ids)
        : kinds[0] === 'beat_license'
          ? await checkoutService.createBeatCheckout(ids, { couponCode, affiliateCode })
          : await checkoutService.createDigitalProductCheckout(ids);

      window.location.assign(checkoutUrl);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Checkout indisponível',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-5xl py-8">
        <header className="mb-8">
          <p className="vdm-eyebrow">Pagamento</p>
          <h1 className="vdm-page-title mt-2">Finalizar compra</h1>
          <p className="vdm-page-description">Revise os itens. Os valores definitivos são recalculados pelo servidor.</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Resumo do pedido</h2>
            <div className="vdm-surface space-y-3 p-5">
              {items.map((item) => (
                <div key={`${item.kind}:${item.id}`} className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 text-sm last:border-0 last:pb-0">
                  <span className="font-medium text-white">{item.title}</span>
                  <span className="font-semibold text-white">{formatPrice(item.priceCents, item.currency)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-lg font-bold">
                <span>Total estimado</span>
                <span>{formatPrice(totalCents, currency)}</span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                O servidor valida disponibilidade, moeda, preço atual e duplicidade antes de criar o pedido.
              </p>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="vdm-surface flex items-center gap-2 p-3"><ShieldCheck className="size-4 text-primary" />Preço validado</div>
              <div className="vdm-surface flex items-center gap-2 p-3"><Zap className="size-4 text-primary" />Liberação automática</div>
              <div className="vdm-surface flex items-center gap-2 p-3"><Headphones className="size-4 text-primary" />Arquivos protegidos</div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Pagamento seguro</h2>
            <div className="vdm-surface space-y-5 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                No ambiente de desenvolvimento, a confirmação é sintética e isolada no Supabase `dev`. Em produção, o fluxo deverá usar o provedor homologado e webhook assinado.
              </p>

              {items[0]?.kind === 'beat_license' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="coupon-code" className="mb-1.5 block text-xs font-medium text-muted-foreground">Cupom</label>
                    <Input id="coupon-code" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} maxLength={32} placeholder="CUPOM" />
                  </div>
                  <div>
                    <label htmlFor="affiliate-code" className="mb-1.5 block text-xs font-medium text-muted-foreground">Código de afiliado</label>
                    <Input id="affiliate-code" value={affiliateCode} onChange={(event) => setAffiliateCode(event.target.value.toUpperCase())} maxLength={32} placeholder="AFILIADO" />
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={() => void handlePay()} disabled={isSubmitting}>
                {isSubmitting ? 'Criando pedido...' : 'Confirmar pedido'}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
};

export default CheckoutPage;
