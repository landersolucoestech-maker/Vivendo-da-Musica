import { ArrowUpRight, Clock, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useFeaturedArticles } from '@/modules/content-portal/hooks/useArticles';
import { ROUTES } from '@/shared/constants/routes';

const ArticlesTeaserSection = () => {
  const { data: featured } = useFeaturedArticles(3);

  return (
    <section className="bg-background py-20 sm:py-24">
      <div className="vdm-container py-0">
        <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="vdm-eyebrow">Conteúdo editorial</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
              Conhecimento para além das aulas.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Leituras objetivas sobre produção, carreira, direitos e mercado musical.
            </p>
          </div>
          <Link to={ROUTES.contentPortal} className="link-vdm inline-flex items-center gap-2 text-sm">
            Ver todos os conteúdos
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {(featured ?? []).map((article) => (
            <Link
              key={article.slug}
              to={ROUTES.contentArticle(article.slug)}
              className="vdm-surface-interactive group flex min-h-64 flex-col p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  {article.category}
                </span>
                {article.isPremium && <LockKeyhole className="size-4 text-primary" aria-label="Conteúdo restrito" />}
              </div>

              <h3 className="mt-6 font-display text-xl font-semibold leading-snug text-white transition group-hover:text-[#caa7ff]">
                {article.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{article.excerpt}</p>

              <div className="mt-auto flex items-center justify-between border-t border-white/8 pt-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {article.readMinutes} min de leitura
                </span>
                <ArrowUpRight className="size-4 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArticlesTeaserSection;
