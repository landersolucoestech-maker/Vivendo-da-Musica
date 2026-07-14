import { useEffect, useState } from "react";
import AdminLayout from "@/app/layouts/AdminLayout";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from "@/shared/hooks/use-toast";
import { adminControlService, type FeatureFlag } from "@/modules/admin/services/adminControl.service";

const AdminSettingsPage=()=>{
 const {toast}=useToast();const [name,setName]=useState('');const [email,setEmail]=useState('');const [flags,setFlags]=useState<FeatureFlag[]>([]);const [busy,setBusy]=useState(false);
 const load=async()=>{try{const settings=await adminControlService.listSettings();const features=await adminControlService.listFeatureFlags();setName(String(settings.find(x=>x.key==='platform.name')?.value??''));setEmail(String(settings.find(x=>x.key==='support.email')?.value??''));setFlags(features);}catch(error){toast({title:'Dados nao carregados',description:error instanceof Error?error.message:'Tente novamente.',variant:'destructive'});}};
 useEffect(()=>{void load();},[]);
 const save=async()=>{setBusy(true);try{await adminControlService.saveSetting('platform.name',name.trim());await adminControlService.saveSetting('support.email',email.trim());toast({title:'Configuracoes salvas'});}catch(error){toast({title:'Nao foi possivel salvar',description:error instanceof Error?error.message:'Tente novamente.',variant:'destructive'});}finally{setBusy(false);}};
 const toggle=async(flag:FeatureFlag)=>{try{await adminControlService.toggleFeatureFlag(flag.key,!flag.enabled);await load();}catch(error){toast({title:'Feature flag nao atualizada',description:error instanceof Error?error.message:'Tente novamente.',variant:'destructive'});}};
 return <AdminLayout><div className="mb-6"><h1 className="text-2xl font-bold">Configuracoes</h1><p className="mt-1 text-muted-foreground">Informacoes gerais e recursos da plataforma.</p></div><div className="max-w-2xl space-y-8"><section className="space-y-4 rounded-lg border border-border bg-card p-5"><div><Label htmlFor="platform-name">Nome da plataforma</Label><Input id="platform-name" value={name} onChange={e=>setName(e.target.value)}/></div><div><Label htmlFor="support-email">E-mail de suporte</Label><Input id="support-email" type="email" value={email} onChange={e=>setEmail(e.target.value)}/></div><Button disabled={busy||!name.trim()||!email.trim()} onClick={()=>void save()}>{busy?'Salvando...':'Salvar'}</Button></section><section className="rounded-lg border border-border bg-card p-5"><h2 className="mb-4 font-semibold">Feature flags</h2><div className="space-y-4">{flags.map(flag=><div key={flag.key} className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">{flag.key}</p><p className="text-xs text-muted-foreground">{flag.description} · rollout {flag.rolloutPercentage}%</p></div><Switch checked={flag.enabled} onCheckedChange={()=>void toggle(flag)}/></div>)}</div></section></div></AdminLayout>;
};
export default AdminSettingsPage;
