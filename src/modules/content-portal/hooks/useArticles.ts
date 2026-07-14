import { useQuery } from "@tanstack/react-query";
import { contentService } from "@/modules/content-portal/services/content.service";
import type { ContentArticle } from "@/modules/content-portal/types/article.types";

export const useArticles = () => useQuery({ queryKey: ['articles'], queryFn: () => contentService.listArticles() });
export const useArticleCategories = () => useQuery({ queryKey: ['article-categories'], queryFn: () => contentService.listCategories() });
export const useFeaturedArticles = (limit = 3) => useQuery({ queryKey: ['articles-featured', limit], queryFn: () => contentService.listFeaturedArticles(limit) });

export const useArticleDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['article-detail', slug],
    queryFn: () => contentService.getArticleBySlug(slug!),
    enabled: !!slug,
  });
};

export const useRelatedArticles = (article: ContentArticle | undefined) => {
  return useQuery({
    queryKey: ['related-articles', article?.slug],
    queryFn: () => contentService.listRelatedArticles(article!),
    enabled: !!article,
  });
};
