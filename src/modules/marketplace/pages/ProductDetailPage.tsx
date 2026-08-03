import { Link, useParams } from "react-router-dom";
import { Star, ShoppingCart, FileCheck, ShieldCheck } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Button } from "@/shared/components/ui/button";
import EmptyState from "@/shared/components/EmptyState";
import LoadingState from "@/shared/components/LoadingState";
import ProductCard from "@/modules/marketplace/components/ProductCard";
import { useCart } from "@/modules/checkout/store/CartContext";
import { useProductDetail } from "@/modules/marketplace/hooks/useProductDetail";
import { formatPrice } from "@/shared/utils/formatters";

const ProductDetailPage = () => {
  const { productSlug } = useParams();
  const { addItem } = useCart();
  const { data, isLoading } = useProductDetail(productSlug);

  if (isLoading) {
    return <PublicLayout><LoadingState rows={4} className="h-20 rounded-lg" /></PublicLayout>;
  }

  if (!data) {
    return (
      <PublicLayout>
        <EmptyState
          title="Produto não encontrado"
          description="Esse produto pode ter sido removido do catálogo."
          action={<Link to="/marketplace"><Button>Ver Marketplace</Button></Link>}
        />
      </PublicLayout>
    );
  }

  const { product, description, reviews, qa, license, includedFiles, related } = data;
  const specifications = [
    { label: 'Categoria', value: product.category },
    { label: 'Licença', value: license },
    { label: 'Arquivos inclusos', value: String(includedFiles.length) },
    { label: 'Entrega', value: 'Download digital' },
  ];

  return (
    <PublicLayout>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div
            className="relative mb-6 aspect-video overflow-hidden rounded-xl border border-white/10"
            style={{ background: `linear-gradient(135deg, ${product.gradientFrom}, ${product.gradientTo})` }}
          >
            {product.coverUrl ? (
              <img
                src={product.coverUrl}
                alt={`Capa de ${product.title}`}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center px-6 text-center">
                <span className="font-display text-2xl font-extrabold uppercase text-white">{product.title}</span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>

          <p className="mb-2 text-sm font-medium text-brand-medium">{product.category}</p>
          <h1 className="mb-3 text-3xl font-bold">{product.title}</h1>
          <p className="mb-6 text-muted-foreground">{description}</p>

          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">O que está incluso</h2>
          <ul className="mb-8 space-y-2">
            {includedFiles.map((file) => (
              <li key={file} className="flex items-center gap-2 text-sm">
                <FileCheck className="size-4 shrink-0 text-brand-medium" />
                {file}
              </li>
            ))}
          </ul>

          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Especificações</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {specifications.map((spec) => (
              <div key={spec.label} className="rounded-lg border border-border bg-card p-4">
                <p className="mb-1 text-xs text-muted-foreground">{spec.label}</p>
                <p className="text-sm font-medium">{spec.value}</p>
              </div>
            ))}
          </div>

          <h2 className="mb-4 text-lg font-semibold">Avaliações</h2>
          {reviews.length === 0 ? (
            <EmptyState title="Ainda sem avaliações" description="Seja o primeiro a avaliar este produto." />
          ) : (
            <div className="mb-8 space-y-3">
              {reviews.map((review) => (
                <div key={review.author} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium">{review.author}</p>
                    <span className="flex items-center gap-1 text-sm text-amber-400">
                      <Star className="size-4 fill-amber-400" /> {review.rating}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          )}

          <h2 className="mb-4 text-lg font-semibold">Perguntas e respostas</h2>
          {qa.length === 0 ? (
            <EmptyState title="Nenhuma pergunta ainda" description="Seja o primeiro a perguntar sobre este produto." />
          ) : (
            <div className="mb-8 space-y-3">
              {qa.map((item) => (
                <div key={item.question} className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-1 text-sm font-medium">{item.question}</p>
                  <p className="text-sm text-muted-foreground">{item.answer} — <span className="italic">{item.author}</span></p>
                </div>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <>
              <h2 className="mb-4 text-lg font-semibold">Produtos relacionados</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} />)}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="sticky top-20 rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <p className="text-2xl font-bold">{formatPrice(product.priceCents, product.currency)}</p>
              {product.originalPriceCents && (
                <p className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPriceCents, product.currency)}</p>
              )}
            </div>
            <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-brand-medium" />
              Licença {license}
            </p>
            <Button
              className="w-full"
              onClick={() => addItem({ kind: "product", id: product.id, title: product.title, priceCents: product.priceCents, currency: product.currency })}
            >
              <ShoppingCart className="mr-2 size-4" />
              Adicionar ao carrinho
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ProductDetailPage;
