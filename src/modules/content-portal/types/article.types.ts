export interface ContentArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  tag: string;
  level: 'Iniciante' | 'Intermediario' | 'Avancado';
  readMinutes: number;
  isPremium: boolean;
  isFeatured: boolean;
  excerpt: string;
  body: string;
  author: string;
  publishedAt: string;
  relatedSlugs: string[];
  seo: { title:string|null;description:string|null;canonicalUrl:string|null;ogTitle:string|null;ogDescription:string|null;ogImageUrl:string|null };
}
