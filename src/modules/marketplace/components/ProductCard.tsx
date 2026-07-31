import { ArrowUpRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useCart } from '@/modules/checkout/store/CartContext';
import type { Product } from '@/modules/marketplace/types/product';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';
import { formatPrice } from '@/shared/utils/formatters';

const ProductCard = ({ product }: { product: Product }) => {
  const { addItem } = useCart();
  const href = ROUTES.marketplaceProduct(product.slug);
  const discountPercentage = product.originalPriceCents
    ? Math.round((1 - product.priceCents / product.originalPriceCents) * 100)
    : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-card shadow-[0_16px_40px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-primary/50">
      <Link to={href} className="relative block overflow-hidden">
        <div
          className="relative aspect-square overflow-hidden p-5"
          style={{ background: `linear-gradient(135deg, ${product.gradientFrom}, ${product.gradientTo})` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.2),transparent_32%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="relative flex h-full items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Produto digital</p>
              <h3 className="mt-2 max-w-[14rem] font-display text-xl font-bold leading-snug text-white">
                {product.title}
              </h3>
            </div>
          </div>
        </div>

        {discountPercentage !== null && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
            -{discountPercentage}%
          </span>
        )}

        <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition group-hover:bg-primary">
          <ArrowUpRight className="size-4" />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link to={href} className="font-display text-lg font-semibold leading-snug text-white transition hover:text-[#caa7ff]">
          {product.title}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-white/8 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Preço</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <p className="font-display text-lg font-bold text-primary">
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
            aria-label={`Adicionar ${product.title} ao carrinho`}
            className="shrink-0"
            onClick={() =>
              addItem({
                kind: 'product',
                id: product.id,
                title: product.title,
                priceCents: product.priceCents,
                currency: product.currency,
              })
            }
          >
            <ShoppingCart className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
