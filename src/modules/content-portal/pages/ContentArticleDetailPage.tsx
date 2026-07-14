import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Clock, Lock, Share2 } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Button } from "@/shared/components/ui/button";
import EmptyState from "@/shared/components/EmptyState";
import LoadingState from "@/shared/components/LoadingState";
import StatusBadge from "@/shared/components/StatusBadge";
import { useArticleDetail, useRelatedArticles } from "@/modules/content-portal/hooks/useArticles";

const ContentArticleDetailPage = () => {
  const { articleSlug } = useParams();
  const { data: article, isLoading } = useArticleDetail(articleSlug);
  const { data: relatedArticles } = useRelatedArticles(article);

  useEffect(() => {
    if (!article) return;
    document.title = article.seo.title || article.title;
    const setMeta = (selector: string, attribute: 'name' | 'property', key: string, value: string | null) => {
      if (!value) return; let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
      element.content = value;
    };
    setMeta('meta[name="description"]', 'name', 'description', article.seo.description || article.excerpt);
    setMeta('meta[property="og:title"]', 'property', 'og:title', article.seo.ogTitle || article.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', article.seo.ogDescription || article.excerpt);
    setMeta('meta[property="og:image"]', 'property', 'og:image', article.seo.ogImageUrl);
  }, [article]);

  if (isLoading) {
    return <PublicLayout><LoadingState rows={3} className="h-20 rounded-lg" /></PublicLayout>;
  }

  if (!article) {
    return (
      <PublicLayout>
        <EmptyState
          title="Artigo não encontrado"
          description="Esse conteúdo pode ter sido removido."
          action={<Link to="/conteudos"><Button>Ver Conteúdos</Button></Link>}
        />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl">
        <div className="aspect-[5/2] rounded-lg bg-gradient-brand flex items-center justify-center mb-6">
          <span className="text-white font-bold text-xl text-center px-6">{article.category}</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge status={article.level} label={article.level} />
          <span className="text-sm text-muted-foreground">{article.category}</span>
          {article.isPremium && <span className="flex items-center gap-1 text-xs text-amber-400"><Lock className="w-3.5 h-3.5" />Premium</span>}
        </div>
        <h1 className="text-3xl font-bold mb-3">{article.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
          <span>{article.author}</span>
          <span>· {article.publishedAt}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{article.readMinutes} min de leitura</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-8" aria-label="Compartilhar conteudo">
          <Button variant="outline" size="sm" className="border-border">
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          <Button variant="outline" size="sm" className="border-border">
            Copiar link
          </Button>
        </div>

        {article.isPremium ? (
          <EmptyState
            icon={Lock}
            title="Conteúdo exclusivo para assinantes Premium"
            description="Assine o plano Premium para liberar este e outros artigos."
            action={<Link to="/area-vip"><Button>Conhecer Área VIP</Button></Link>}
          />
        ) : (
          <p className="text-muted-foreground leading-relaxed mb-10">{article.body}</p>
        )}

        {!!relatedArticles?.length && (
          <>
            <h2 className="text-lg font-semibold mb-4">Leitura relacionada</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  to={`/conteudos/${related.slug}`}
                  className="rounded-lg border border-border bg-card p-4 hover:border-brand-medium/50 transition-colors"
                >
                  <p className="font-medium text-sm mb-1">{related.title}</p>
                  <p className="text-xs text-muted-foreground">{related.readMinutes} min · {related.category}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
};

export default ContentArticleDetailPage;
