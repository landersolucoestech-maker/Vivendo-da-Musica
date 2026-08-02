import { useEffect, useState } from 'react';
import { BadgeCheck, Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import CompanyLayout from '@/app/layouts/CompanyLayout';
import { useCompanyProfile } from '@/modules/company/hooks/useCompanyPortal';
import { companyService } from '@/modules/company/services/company.service';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

const CompanyProfilePage = () => {
  const { data, isLoading, isError, error, refetch } = useCompanyProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    displayName: '', legalName: '', description: '', websiteUrl: '', logoUrl: '', industry: '', city: '', state: '', country: 'Brasil',
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      displayName: data.displayName,
      legalName: data.legalName,
      description: data.description,
      websiteUrl: data.websiteUrl,
      logoUrl: data.logoUrl,
      industry: data.industry,
      city: data.city,
      state: data.state,
      country: data.country,
    });
  }, [data]);

  const save = async () => {
    if (form.displayName.trim().length < 2) {
      toast({ title: 'Informe o nome da empresa', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await companyService.saveProfile(form);
      await queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      toast({ title: 'Perfil empresarial atualizado' });
    } catch (saveError) {
      toast({ title: 'Não foi possível salvar', description: saveError instanceof Error ? saveError.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CompanyLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Identidade do contratante</p>
        <h1 className="vdm-page-title mt-2">Perfil da empresa</h1>
        <p className="vdm-page-description">Estas informações identificam a empresa nas oportunidades e na comunicação com candidatos.</p>
      </header>

      {isLoading ? <LoadingState rows={3} className="h-44 rounded-xl" /> : isError || !data ? (
        <ErrorState description={error?.message ?? 'Não foi possível carregar o perfil.'} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader><CardTitle>Dados institucionais</CardTitle></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="company-display-name">Nome de exibição</Label><Input id="company-display-name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="company-legal-name">Razão social</Label><Input id="company-legal-name" value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="company-industry">Segmento</Label><Input id="company-industry" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} placeholder="Música, audiovisual, eventos..." /></div>
              <div className="space-y-2"><Label htmlFor="company-website">Website</Label><Input id="company-website" type="url" value={form.websiteUrl} onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })} placeholder="https://" /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="company-logo">URL do logotipo</Label><Input id="company-logo" type="url" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} placeholder="https://" /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="company-description">Apresentação</Label><Textarea id="company-description" rows={7} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Apresente a empresa, atuação, cultura e tipo de projetos desenvolvidos." /></div>
              <div className="space-y-2"><Label htmlFor="company-city">Cidade</Label><Input id="company-city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="company-state">Estado</Label><Input id="company-state" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="company-country">País</Label><Input id="company-country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} /></div>
              <div className="sm:col-span-2"><Button disabled={busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar alterações'}</Button></div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardContent className="p-6">
                <span className="vdm-icon-button mb-4 size-12 border-primary/25 bg-primary/10 text-primary"><Building2 className="size-6" /></span>
                <h2 className="font-display text-xl font-semibold text-white">{data.displayName}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{data.industry || 'Segmento não informado'}</p>
                <p className="mt-4 text-sm leading-6 text-[#d4d4d4]">{data.description || 'Adicione uma apresentação institucional para fortalecer a confiança dos candidatos.'}</p>
                <div className="mt-5 border-t border-white/8 pt-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Identificador público</p>
                  <p className="mt-2 break-all font-mono text-sm text-white">{data.slug}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <span className="vdm-icon-button border-emerald-400/25 bg-emerald-400/10 text-emerald-300"><BadgeCheck className="size-5" /></span>
                  <div>
                    <p className="font-semibold text-white">Situação da empresa</p>
                    <Badge className="mt-3" variant={data.verificationStatus === 'verified' ? 'success' : 'secondary'}>
                      {data.verificationStatus === 'verified' ? 'Verificada' : data.verificationStatus === 'rejected' ? 'Revisão recusada' : 'Verificação pendente'}
                    </Badge>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">A verificação ajuda a proteger candidatos e aumenta a credibilidade das publicações.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
};

export default CompanyProfilePage;
