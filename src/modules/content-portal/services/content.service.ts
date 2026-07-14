import { supabase } from "@/integrations/supabase/client";
import type { ContentArticle } from "@/modules/content-portal/types/article.types";

const table = supabase.from as unknown as (name:string)=>any;
interface Row { id:string;slug:string;title:string;category:string|null;tag:string|null;level:string|null;read_minutes:number;is_premium:boolean;is_featured:boolean;excerpt:string;body:string;author_name_snapshot:string;published_at:string|null;related_slugs:string[];seo_title:string|null;seo_description:string|null;canonical_url:string|null;og_title:string|null;og_description:string|null;og_image_url:string|null }
const formatDate=(value:string|null)=>value?new Intl.DateTimeFormat('pt-BR').format(new Date(value)):'';
const map=(row:Row):ContentArticle=>({id:row.id,slug:row.slug,title:row.title,category:row.category??'Conteudo',tag:row.tag??'',level:(row.level??'Iniciante') as ContentArticle['level'],readMinutes:row.read_minutes,isPremium:row.is_premium,isFeatured:row.is_featured,excerpt:row.excerpt,body:row.body,author:row.author_name_snapshot,publishedAt:formatDate(row.published_at),relatedSlugs:row.related_slugs??[],seo:{title:row.seo_title,description:row.seo_description,canonicalUrl:row.canonical_url,ogTitle:row.og_title,ogDescription:row.og_description,ogImageUrl:row.og_image_url}});
const fields='id,slug,title,category,tag,level,read_minutes,is_premium,is_featured,excerpt,body,author_name_snapshot,published_at,related_slugs,seo_title,seo_description,canonical_url,og_title,og_description,og_image_url';

export const contentService={
 async listArticles():Promise<ContentArticle[]>{const {data,error}=await table('cms_documents').select(fields).eq('document_type','article').order('published_at',{ascending:false});if(error)throw new Error(`Nao foi possivel carregar os artigos: ${error.message}`);return ((data??[]) as Row[]).map(map);},
 async getArticleBySlug(slug:string):Promise<ContentArticle|undefined>{const {data,error}=await table('cms_documents').select(fields).eq('document_type','article').eq('slug',slug).maybeSingle();if(error)throw new Error(`Nao foi possivel carregar o artigo: ${error.message}`);return data?map(data as Row):undefined;},
 async listRelatedArticles(article:ContentArticle):Promise<ContentArticle[]>{const all=await this.listArticles();const explicit=new Set(article.relatedSlugs);return all.filter(item=>item.slug!==article.slug&&(explicit.has(item.slug)||item.category===article.category)).slice(0,3);},
 async listCategories():Promise<readonly string[]>{const categories:string[]=(await this.listArticles()).map(article=>String(article.category));return [...new Set<string>(categories)].sort();},
 async listFeaturedArticles(limit=3):Promise<ContentArticle[]>{return (await this.listArticles()).filter(article=>article.isFeatured).slice(0,limit);}
};
