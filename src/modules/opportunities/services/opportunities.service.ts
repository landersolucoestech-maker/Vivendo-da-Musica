import { supabase } from "@/integrations/supabase/client";
import type { MockOpportunity } from "@/modules/opportunities/types/opportunity.types";

const table = supabase.from as unknown as (name: string) => any;
interface Row { id:string; kind:MockOpportunity['kind']; title:string; organization_name:string; location:string; engagement_type:string; status:string; published_at:string|null; created_at:string; description:string; application_count:number }
const date = (value:string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value));

export const opportunitiesService = {
  async listOpportunities(): Promise<MockOpportunity[]> {
    const { data, error } = await table('opportunities').select('id,kind,title,organization_name,location,engagement_type,status,published_at,created_at,description,application_count').order('published_at',{ascending:false,nullsFirst:false});
    if(error) throw new Error(`Nao foi possivel carregar as oportunidades: ${error.message}`);
    const { data: auth } = await supabase.auth.getUser(); let favorites=new Set<string>(); let applications=new Set<string>();
    if(auth.user){
      const {data:f}=await table('opportunity_favorites').select('opportunity_id').eq('user_id',auth.user.id); favorites=new Set((f??[]).map((x:any)=>x.opportunity_id));
      const {data:a}=await table('opportunity_applications').select('opportunity_id').eq('applicant_id',auth.user.id).neq('status','withdrawn'); applications=new Set((a??[]).map((x:any)=>x.opportunity_id));
    }
    return ((data??[]) as Row[]).map(row=>({id:row.id,kind:row.kind,title:row.title,company:row.organization_name,location:row.location,type:row.engagement_type as MockOpportunity['type'],status:row.status==='open'?'aberta':'encerrada',postedAt:date(row.published_at??row.created_at),description:row.description,applicantsCount:row.application_count,isFavorite:favorites.has(row.id),isApplied:applications.has(row.id)}));
  },
  async listOpenOpportunities():Promise<MockOpportunity[]>{ return (await this.listOpportunities()).filter(o=>o.status==='aberta'); },
  async applyToOpportunity(id:string,coverLetter:string,portfolioUrl?:string):Promise<void>{
    const {data,error:authError}=await supabase.auth.getUser(); if(authError||!data.user) throw new Error('Entre na sua conta para se candidatar.');
    const letter=coverLetter.trim(); if(letter.length<20) throw new Error('A apresentacao deve ter pelo menos 20 caracteres.');
    const {error}=await table('opportunity_applications').insert({opportunity_id:id,applicant_id:data.user.id,cover_letter:letter,portfolio_url:portfolioUrl?.trim()||null});
    if(error?.code==='23505') throw new Error('Voce ja se candidatou a esta oportunidade.'); if(error) throw new Error(`Nao foi possivel enviar a candidatura: ${error.message}`);
  },
  async toggleFavorite(id:string,isFavorite:boolean):Promise<void>{
    const {data,error:authError}=await supabase.auth.getUser(); if(authError||!data.user) throw new Error('Entre na sua conta para favoritar.');
    const q=table('opportunity_favorites'); const {error}=isFavorite?await q.delete().eq('opportunity_id',id).eq('user_id',data.user.id):await q.insert({opportunity_id:id,user_id:data.user.id});
    if(error) throw new Error(`Nao foi possivel atualizar o favorito: ${error.message}`);
  }
};
