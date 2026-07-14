import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Headphones, ShieldCheck, Zap } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/hooks/use-toast";
import { useCart } from "@/modules/checkout/store/CartContext";
import { checkoutService } from "@/modules/checkout/services/checkout.service";
import { ROUTES } from "@/shared/constants/routes";
import { formatPrice } from "@/shared/utils/formatters";

const CheckoutPage = () => {
  const { items, totalCents } = useCart();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");

  if (items.length === 0) return <Navigate to={ROUTES.marketplace} replace />;

  const currency = items[0]?.currency ?? "BRL";
  const handlePay = async () => {
    setIsSubmitting(true);
    try {
      const kinds = [...new Set(items.map((item) => item.kind))];
      if (kinds.length !== 1) throw new Error("Finalize cursos, beats e produtos digitais em pedidos separados.");
      const ids = items.map((item) => item.id);
      const checkoutUrl = kinds[0] === "beat_license"
        ? await checkoutService.createBeatCheckout(ids, { couponCode, affiliateCode })
        : kinds[0] === "product"
          ? await checkoutService.createDigitalProductCheckout(ids)
          : (() => { throw new Error("O checkout de cursos ainda nao esta habilitado."); })();
      window.location.assign(checkoutUrl);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Checkout indisponivel",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>
      <div className="grid max-w-4xl gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Resumo do pedido</h2>
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            {items.map((item) => (
              <div key={`${item.kind}:${item.id}`} className="flex items-center justify-between gap-4 text-sm">
                <span>{item.title}</span>
                <span className="font-medium">{formatPrice(item.priceCents, item.currency)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-3 font-bold">
              <span>Total estimado</span>
              <span>{formatPrice(totalCents, currency)}</span>
            </div>
            <p className="text-xs text-muted-foreground">O valor definitivo e recalculado no servidor usando os precos atuais do Supabase.</p>
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-medium" />Pagamento processado pela Stripe</div>
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-brand-medium" />Acesso liberado somente apos webhook confirmado</div>
            <div className="flex items-center gap-2"><Headphones className="h-4 w-4 text-brand-medium" />Arquivos comerciais permanecem privados</div>
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Pagamento seguro</h2>
          <div className="space-y-4 rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Voce sera redirecionado ao ambiente hospedado da Stripe. Dados de cartao nunca passam por esta aplicacao.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="coupon-code" className="mb-1 block text-xs text-muted-foreground">Cupom</label>
                <Input id="coupon-code" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} maxLength={32} placeholder="CUPOM" />
              </div>
              <div>
                <label htmlFor="affiliate-code" className="mb-1 block text-xs text-muted-foreground">Codigo de afiliado</label>
                <Input id="affiliate-code" value={affiliateCode} onChange={(event) => setAffiliateCode(event.target.value.toUpperCase())} maxLength={32} placeholder="AFILIADO" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Cupons e afiliados sao aplicados ao checkout de beats; todos os precos sao validados no servidor.</p>
            <Button className="w-full" onClick={() => void handlePay()} disabled={isSubmitting}>
              {isSubmitting ? "Criando checkout..." : "Continuar para a Stripe"}
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default CheckoutPage;
