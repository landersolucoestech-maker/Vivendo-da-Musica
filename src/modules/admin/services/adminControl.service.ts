import { supabase } from "@/integrations/supabase/client";
const table=supabase.from as unknown as (name:string)=>any;
export interface PlatformSetting{key:string;value:unknown;description:string|null;isPublic:boolean}
export interface FeatureFlag{key:string;description:string;enabled:boolean;rolloutPercentage:number}
const actor=async()=>{const {data}=await supabase.auth.getUser();if(!data.user)throw new Error('Sessao administrativa invalida.');return data.user.id;};
export const adminControlService={
 async listSettings():Promise<PlatformSetting[]>{const {data,error}=await table('platform_settings').select('key,value,description,is_public').order('key');if(error)throw new Error(error.message);return (data??[]).map((x:any)=>({key:x.key,value:x.value,description:x.description,isPublic:x.is_public}));},
 async saveSetting(key:string,value:unknown):Promise<void>{const userId=await actor();const {error}=await table('platform_settings').update({value,updated_by:userId,updated_at:new Date().toISOString()}).eq('key',key);if(error)throw new Error(error.message);await table('admin_audit_logs').insert({actor_id:userId,action:'update_setting',entity_type:'platform_setting',entity_id:key,metadata:{value}});},
 async listFeatureFlags():Promise<FeatureFlag[]>{const {data,error}=await table('feature_flags').select('key,description,enabled,rollout_percentage').order('key');if(error)throw new Error(error.message);return (data??[]).map((x:any)=>({key:x.key,description:x.description,enabled:x.enabled,rolloutPercentage:x.rollout_percentage}));},
 async toggleFeatureFlag(key:string,enabled:boolean):Promise<void>{const userId=await actor();const {error}=await table('feature_flags').update({enabled,updated_by:userId,updated_at:new Date().toISOString()}).eq('key',key);if(error)throw new Error(error.message);await table('admin_audit_logs').insert({actor_id:userId,action:enabled?'enable_feature':'disable_feature',entity_type:'feature_flag',entity_id:key});}
};
