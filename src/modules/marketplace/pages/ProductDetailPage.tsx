import { useState } from "react";
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
  const [activeImage, setActiveImage] = useState(0);
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
  const previewImages = [product, product, product]; // same gradient, simulates a gallery of 3 angles/previews
  const specifications = [
    { label: 'Categoria', value: product.category },
    { label: 'Licença', value: license },
    { label: 'Arquivos inclusos', value: String(includedFiles.length) },
    { label: 'Entrega', value: 'Download digital' },
  ];

  return (
    <PublicLayout>
      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div>
          <div
            className="aspect-video rounded-lg flex items-center justify-center mb-3"
            style={{ background: `linear-gradient(135deg, ${previewImages[activeImage].gradientFrom}, ${previewImages[activeImage].gradientTo})` }}
          >
            <span className="text-white font-extrabold text-2xl uppercase text-center px-6">{product.title}</span>
          </div>
          <div className="flex gap-2 mb-6">
            {previewImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`w-16 h-12 rounded-lg border-2 transition-colors ${i === activeImage ? 'border-brand-medium' : 'border-border'}`}
                style={{ background: `linear-gradient(135deg, ${product.gradientFrom}, ${product.gradientTo})` }}
              />
            ))}
          </div>

          <p className="text-sm text-brand-medium font-medium mb-2">{product.category}</p>
          <h1 className="text-3xl font-bold mb-3">{product.title}</h1>
          <p className="text-muted-foreground mb-6">{description}</p>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3">O que está incluso</h2>
          <ul className="space-y-2 mb-8">
            {includedFiles.map((file) => (
              <li key={file} className="flex items-center gap-2 text-sm">
                <FileCheck className="w-4 h-4 text-brand-medium shrink-0" />
                {file}
              </li>
            ))}
          </ul>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Especificações</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {specifications.map((spec) => (
              <div key={spec.label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{spec.label}</p>
                <p className="text-sm font-medium">{spec.value}</p>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold mb-4">Avaliações</h2>
          {reviews.length === 0 ? (
            <EmptyState title="Ainda sem avaliações" description="Seja o primeiro a avaliar este produto." />
          ) : (
            <div className="space-y-3 mb-8">
              {reviews.map((review) => (
                <div key={review.author} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">{review.author}</p>
                    <span className="flex items-center gap-1 text-sm text-amber-400">
                      <Star className="w-4 h-4 fill-amber-400" /> {review.rating}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          )}

          <h2 className="text-lg font-semibold mb-4">Perguntas e respostas</h2>
          {qa.length === 0 ? (
            <EmptyState title="Nenhuma pergunta ainda" description="Seja o primeiro a perguntar sobre este produto." />
          ) : (
            <div className="space-y-3 mb-8">
              {qa.map((item) => (
                <div key={item.question} className="rounded-lg border border-border bg-card p-4">
                  <p className="font-medium text-sm mb-1">{item.question}</p>
                  <p className="text-sm text-muted-foreground">{item.answer} — <span className="italic">{item.author}</span></p>
                </div>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <>
              <h2 className="text-lg font-semibold mb-4">Produtos relacionados</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {related.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} />)}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="rounded-lg border border-border bg-card p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-2xl font-bold">{formatPrice(product.priceCents, product.currency)}</p>
              {product.originalPriceCents && (
                <p className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPriceCents, product.currency)}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-brand-medium" />
              Licença {license}
            </p>
            <Button
              className="w-full"
              onClick={() => addItem({ kind: "product", id: product.id, title: product.title, priceCents: product.priceCents, currency: product.currency })}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Adicionar ao carrinho
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ProductDetailPage;
