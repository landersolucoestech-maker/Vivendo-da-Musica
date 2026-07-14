import { Link } from "react-router-dom";
import { Clock, Lock } from "lucide-react";
import { useFeaturedArticles } from "@/modules/content-portal/hooks/useArticles";
import { ROUTES } from "@/shared/constants/routes";

const ArticlesTeaserSection = () => {
  const { data: featured } = useFeaturedArticles(3);

  return (
    <section className="bg-background pb-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Artigos em destaque</h2>
          <Link to={ROUTES.contentPortal} className="text-sm text-brand-medium hover:underline">Ver todos</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(featured ?? []).map((article) => (
            <Link
              key={article.slug}
              to={ROUTES.contentArticle(article.slug)}
              className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3 hover:border-brand-medium/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-medium font-medium">{article.category}</span>
                {article.isPremium && <Lock className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="font-semibold leading-snug">{article.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground mt-auto pt-2">
                <Clock className="w-3.5 h-3.5" />{article.readMinutes} min
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArticlesTeaserSection;
