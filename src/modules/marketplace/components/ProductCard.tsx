import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { useCart } from "@/modules/checkout/store/CartContext";
import { ROUTES } from "@/shared/constants/routes";
import { formatPrice } from "@/shared/utils/formatters";
import type { Product } from "@/modules/marketplace/types/product";

const ProductCard = ({ product }: { product: Product }) => {
  const { addItem } = useCart();
  const href = ROUTES.marketplaceProduct(product.slug);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-brand-medium/50 transition-colors flex flex-col">
      <Link to={href} className="block relative">
        <div
          className="aspect-square flex items-center justify-center p-4"
          style={{ background: `linear-gradient(135deg, ${product.gradientFrom}, ${product.gradientTo})` }}
        >
          <span className="text-white font-extrabold text-center text-sm uppercase tracking-wide leading-snug">
            {product.title}
          </span>
        </div>
        {product.originalPriceCents && (
          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            -{Math.round((1 - product.priceCents / product.originalPriceCents) * 100)}%
          </span>
        )}
      </Link>
      <div className="p-3 flex items-center justify-between gap-2">
        <div>
          <Link to={href} className="text-sm font-medium hover:text-brand-medium">
            {product.title}
          </Link>
          <div className="flex items-center gap-2">
            <p className="text-brand-medium font-bold text-sm">
              {formatPrice(product.priceCents, product.currency)}
            </p>
            {product.originalPriceCents && (
              <p className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPriceCents, product.currency)}
              </p>
            )}
          </div>
        </div>
        <Button
          size="icon"
          variant="outline"
          aria-label="Adicionar ao carrinho"
          className="border-border shrink-0"
          onClick={() => addItem({ kind: "product", id: product.id, title: product.title, priceCents: product.priceCents, currency: product.currency })}
        >
          <ShoppingCart className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
