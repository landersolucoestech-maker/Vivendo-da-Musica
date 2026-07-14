import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Button } from "@/shared/components/ui/button";
import { useCart } from "@/modules/checkout/store/CartContext";
import { ROUTES } from "@/shared/constants/routes";
import { formatPrice } from "@/shared/utils/formatters";

const CartPage = () => {
  const { items, removeItem, totalCents } = useCart();
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Carrinho</h1>

        {items.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <p className="text-muted-foreground mb-4">Seu carrinho está vazio.</p>
            <Link to={ROUTES.marketplace}>
              <Button>Ver marketplace</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.kind}:${item.id}`} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
                <span className="font-medium">{item.title}</span>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-brand-medium">{formatPrice(item.priceCents, item.currency)}</span>
                  <button onClick={() => removeItem(item.id, item.kind)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold">{formatPrice(totalCents, items[0]?.currency ?? 'BRL')}</span>
            </div>

            <Button
              className="w-full"
              onClick={() => navigate(ROUTES.checkout)}
            >
              Ir para o checkout
            </Button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default CartPage;
