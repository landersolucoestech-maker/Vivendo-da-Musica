import { useQuery } from '@tanstack/react-query';
import { BadgeDollarSign, BarChart3, Copy, ExternalLink, Link2, MousePointerClick, PackageOpen, WalletCards } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import AffiliateLayout from '@/app/layouts/AffiliateLayout';
import { getAffiliatePortalData } from '@/modules/affiliate/services/affiliate.api';
import StatCard from '@/shared/components/StatCard';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/constants/routes';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');

const sectionByPath: Record<string, string> = {
  [ROUTES.affiliate]: 'dashboard',
  [ROUTES.affiliateLinks]: 'links',
  [ROUTES.affiliateConversions]: 'conversions',
  [ROUTES.affiliateCommissions]: 'commissions',
  [ROUTES.affiliateWithdrawals]: 'withdrawals',
  [ROUTES.affiliateMaterials]: 'materials',
  [ROUTES.affiliateProfile]: 'profile',
};

const SectionHeader = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => (
  <header className="mb-8">
    <p className="vdm-eyebrow">{eyebrow}</p>
    <h1 className="vdm-page-title mt-2">{title}</h1>
    <p className="vdm-page-description">{description}</p>
  </header>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="vdm-surface py-12 text-center text-sm text-muted-foreground">{text}</div>
);

const AffiliatePortalPage = () => {
  const { pathname } = useLocation();
  const section = sectionByPath[pathname] ?? 'dashboard';
  const query = useQuery({ queryKey: ['affiliate-portal'], queryFn: getAffiliatePortalData });

  if (query.isLoading) {
    return (
      <AffiliateLayout>
        <div className="vdm-surface flex min-h-72 items-center justify-center">
          <div className="size-9 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
        </div>
      </AffiliateLayout>
    );
  }

  if (query.error || !query.data?.profile) {
    return (
      <AffiliateLayout>
        <SectionHeader eyebrow="Portal do afiliado" title="Não foi possível carregar os dados" description="Revise a conexão e tente novamente." />
        <EmptyState text="Nenhum perfil de afiliado disponível." />
      </AffiliateLayout>
    );
  }

  const { profile, links, conversions, commissions, withdrawals, materials } = query.data;
  const totalClicks = links.reduce((total, item) => total + item.clicks_count, 0);
  const totalConversions = links.reduce((total, item) => total + item.conversions_count, 0);
  const conversionRate = totalClicks ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0,0';

  const renderSection = () => {
    if (section === 'links') {
      return (
        <>
          <SectionHeader eyebrow="Divulgação" title="Links de afiliado" description="Acompanhe cliques e conversões de cada destino divulgado." />
          <div className="grid gap-4">
            {links.map((link) => (
              <Card key={link.id}>
                <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{link.label}</CardTitle>
                      <Badge variant={link.active ? 'success' : 'secondary'}>{link.active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">/ref/{link.slug}</p>
                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span>{link.clicks_count} cliques</span>
                      <span>{link.conversions_count} conversões</span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/ref/${link.slug}`)}>
                    <Copy className="size-4" /> Copiar link
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      );
    }

    if (section === 'conversions') {
      return (
        <>
          <SectionHeader eyebrow="Resultados" title="Conversões" description="Pedidos atribuídos aos seus links de divulgação." />
          <div className="vdm-surface overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr><th className="p-4">Referência</th><th className="p-4">Venda</th><th className="p-4">Comissão</th><th className="p-4">Data</th><th className="p-4">Status</th></tr>
              </thead>
              <tbody>
                {conversions.map((item) => (
                  <tr key={item.id} className="border-b border-white/8 last:border-0">
                    <td className="p-4 font-medium text-white">{item.customer_reference ?? 'Pedido'}</td>
                    <td className="p-4">{formatCurrency(item.gross_amount_cents)}</td>
                    <td className="p-4 text-primary">{formatCurrency(item.commission_amount_cents)}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(item.converted_at)}</td>
                    <td className="p-4"><Badge variant={item.status === 'approved' ? 'success' : 'warning'}>{item.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (section === 'commissions') {
      return (
        <>
          <SectionHeader eyebrow="Financeiro" title="Comissões" description="Valores pendentes, disponíveis, reservados e pagos." />
          <div className="grid gap-4 md:grid-cols-2">
            {commissions.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between"><CardTitle>{formatCurrency(item.amount_cents)}</CardTitle><Badge variant={item.status === 'available' ? 'success' : 'warning'}>{item.status}</Badge></div>
                  <CardDescription>Criada em {formatDate(item.created_at)}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </>
      );
    }

    if (section === 'withdrawals') {
      return (
        <>
          <SectionHeader eyebrow="Financeiro" title="Saques" description="Histórico de solicitações e pagamentos de comissões." />
          {withdrawals.length === 0 ? <EmptyState text="Nenhum saque solicitado." /> : withdrawals.map((item) => <Card key={item.id}><CardContent className="flex items-center justify-between p-5"><div><p className="font-semibold text-white">{formatCurrency(item.amount_cents)}</p><p className="text-sm text-muted-foreground">{item.payment_method.toUpperCase()} · {formatDate(item.requested_at)}</p></div><Badge>{item.status}</Badge></CardContent></Card>)}
        </>
      );
    }

    if (section === 'materials') {
      return (
        <>
          <SectionHeader eyebrow="Divulgação" title="Materiais" description="Peças aprovadas para divulgação da plataforma e dos produtos." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {materials.map((item) => (
              <Card key={item.id}>
                <CardHeader><Badge variant="outline" className="w-fit">{item.material_type}</Badge><CardTitle className="pt-3 text-lg">{item.title}</CardTitle><CardDescription>{item.description}</CardDescription></CardHeader>
                <CardContent><Button variant="outline" className="w-full" disabled={!item.asset_url}><ExternalLink className="size-4" /> Abrir material</Button></CardContent>
              </Card>
            ))}
          </div>
        </>
      );
    }

    if (section === 'profile') {
      return (
        <>
          <SectionHeader eyebrow="Conta" title="Perfil do afiliado" description="Dados comerciais e identificação do seu programa de afiliados." />
          <Card className="max-w-2xl"><CardHeader><CardTitle>{profile.display_name}</CardTitle><CardDescription>Código de indicação: {profile.referral_code}</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="vdm-surface p-4"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 font-semibold text-white">{profile.status}</p></div><div className="vdm-surface p-4"><p className="text-xs text-muted-foreground">Taxa de comissão</p><p className="mt-1 font-semibold text-white">{profile.commission_rate}%</p></div></CardContent></Card>
        </>
      );
    }

    return (
      <>
        <SectionHeader eyebrow="Portal do afiliado" title={`Olá, ${profile.display_name}.`} description="Acompanhe seu desempenho comercial, links e valores disponíveis." />
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Saldo disponível" value={formatCurrency(profile.balance_cents)} icon={WalletCards} />
          <StatCard label="Ganhos acumulados" value={formatCurrency(profile.lifetime_earnings_cents)} icon={BadgeDollarSign} />
          <StatCard label="Cliques" value={String(totalClicks)} icon={MousePointerClick} />
          <StatCard label="Conversão" value={`${conversionRate}%`} icon={BarChart3} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="size-5 text-primary" /> Links com melhor desempenho</CardTitle></CardHeader><CardContent className="space-y-3">{links.slice(0, 3).map((link) => <div key={link.id} className="flex items-center justify-between border-b border-white/8 pb-3 last:border-0"><div><p className="text-sm font-medium text-white">{link.label}</p><p className="text-xs text-muted-foreground">{link.clicks_count} cliques</p></div><span className="text-sm font-semibold text-primary">{link.conversions_count} vendas</span></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageOpen className="size-5 text-primary" /> Materiais recentes</CardTitle></CardHeader><CardContent className="space-y-3">{materials.slice(0, 3).map((item) => <div key={item.id} className="border-b border-white/8 pb-3 last:border-0"><p className="text-sm font-medium text-white">{item.title}</p><p className="text-xs text-muted-foreground">{item.material_type}</p></div>)}</CardContent></Card>
        </div>
      </>
    );
  };

  return <AffiliateLayout>{renderSection()}</AffiliateLayout>;
};

export default AffiliatePortalPage;
