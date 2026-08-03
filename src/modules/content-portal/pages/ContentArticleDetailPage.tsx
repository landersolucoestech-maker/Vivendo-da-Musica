import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, Share2 } from 'lucide-react';

import PublicLayout from '@/app/layouts/PublicLayout';
import { useArticleDetail, useRelatedArticles } from '@/modules/content-portal/hooks/useArticles';
import EmptyState from '@/shared/components/EmptyState';
import LoadingState from '@/shared/components/LoadingState';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';

const ContentArticleDetailPage = () => {
  const { articleSlug } = useParams();
  const { data: article, isLoading } = useArticleDetail(articleSlug);
  const { data: relatedArticles } = useRelatedArticles(article);

  useEffect(() => {
    if (!article) return;

    document.title = article.seo.title || article.title;

    const setMeta = (
      selector: string,
      attribute: 'name' | 'property',
      key: string,
      value: string | null,
    ) => {
      if (!value) return;
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = value;
    };

    setMeta('meta[name="description"]', 'name', 'description', article.seo.description || article.excerpt);
    setMeta('meta[property="og:title"]', 'property', 'og:title', article.seo.ogTitle || article.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', article.seo.ogDescription || article.excerpt);
    setMeta('meta[property="og:image"]', 'property', 'og:image', article.seo.ogImageUrl);
  }, [article]);

  if (isLoading) {
    return (
      <PublicLayout>
        <LoadingState rows={3} className="h-20 rounded-lg" />
      </PublicLayout>
    );
  }

  if (!article) {
    return (
      <PublicLayout>
        <EmptyState
          title="Artigo não encontrado"
          description="Esse conteúdo pode ter sido removido."
          action={(
            <Button asChild>
              <Link to="/conteudos">Ver conteúdos</Link>
            </Button>
          )}
        />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <article className="max-w-2xl">
        <div className="mb-6 flex aspect-[5/2] items-center justify-center rounded-lg bg-gradient-brand">
          <span className="px-6 text-center text-xl font-bold text-white">{article.category}</span>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <StatusBadge status={article.level} label={article.level} />
          <span className="text-sm text-muted-foreground">{article.category}</span>
        </div>

        <h1 className="mb-3 text-3xl font-bold">{article.title}</h1>
        <div className="mb-8 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{article.author}</span>
          <span>· {article.publishedAt}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {article.readMinutes} min de leitura
          </span>
        </div>

        <div className="mb-8 flex flex-wrap gap-2" aria-label="Compartilhar conteúdo">
          <Button variant="outline" size="sm" className="border-border">
            <Share2 className="mr-2 size-4" />
            Compartilhar
          </Button>
          <Button variant="outline" size="sm" className="border-border">
            Copiar link
          </Button>
        </div>

        <p className="mb-10 whitespace-pre-line leading-relaxed text-muted-foreground">{article.body}</p>

        {!!relatedArticles?.length && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Leitura relacionada</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  to={`/conteudos/${related.slug}`}
                  className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-brand-medium/50"
                >
                  <p className="mb-1 text-sm font-medium">{related.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {related.readMinutes} min · {related.category}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </PublicLayout>
  );
};

export default ContentArticleDetailPage;
