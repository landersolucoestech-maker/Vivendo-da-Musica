import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSign, BarChart3, Copy, ExternalLink, Link2, MousePointerClick, PackageOpen, WalletCards } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import AffiliateLayout from '@/app/layouts/AffiliateLayout';
import { getAffiliatePortalData, requestAffiliateWithdrawal } from '@/modules/affiliate/services/affiliate.api';
import DataTable from '@/shared/components/DataTable';
import EmptyState from '@/shared/components/EmptyState';
import StatCard from '@/shared/components/StatCard';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { ROUTES } from '@/shared/constants/routes';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value));

const statusLabel = (status: string) => ({
  active: 'Ativo',
  approved: 'Aprovada',
  pending: 'Pendente',
  available: 'Disponível',
  reserved: 'Reservada',
  requested: 'Solicitado',
  processing: 'Em processamento',
  paid: 'Pago',
  rejected: 'Rejeitado',
  canceled: 'Cancelado',
}[status] ?? status);

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

const AffiliatePortalPage = () => {
  const { pathname } = useLocation();
  const section = sectionByPath[pathname] ?? 'dashboard';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'bank_transfer'>('pix');
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
  const query = useQuery({ queryKey: ['affiliate-portal'], queryFn: getAffiliatePortalData });

  if (query.isLoading) {
    return <AffiliateLayout><div className="vdm-surface flex min-h-72 items-center justify-center"><div className="size-9 animate-spin rounded-full border-2 border-white/10 border-t-primary" /></div></AffiliateLayout>;
  }

  if (query.error || !query.data?.profile) {
    return <AffiliateLayout><SectionHeader eyebrow="Portal do afiliado" title="Dados indisponíveis" description="Não foi possível localizar um perfil de afiliado para esta identidade." /><EmptyState title="Perfil de afiliado não encontrado" /></AffiliateLayout>;
  }

  const { profile, links, conversions, commissions, withdrawals, materials } = query.data;
  const totalClicks = links.reduce((total, item) => total + item.clicks_count, 0);
  const totalConversions = links.reduce((total, item) => total + item.conversions_count, 0);
  const conversionRate = totalClicks ? ((totalConversions / totalClicks) * 100).toFixed(1).replace('.', ',') : '0,0';

  const submitWithdrawal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (requestingWithdrawal) return;

    const normalized = Number(withdrawalAmount.replace(',', '.'));
    const amountCents = Math.round(normalized * 100);
    if (!Number.isFinite(normalized) || amountCents < 1000) {
      toast({ title: 'Valor inválido', description: 'Informe um valor mínimo de R$ 10,00.', variant: 'destructive' });
      return;
    }

    setRequestingWithdrawal(true);
    try {
      await requestAffiliateWithdrawal(amountCents, paymentMethod);
      setWithdrawalAmount('');
      await queryClient.invalidateQueries({ queryKey: ['affiliate-portal'] });
      toast({ title: 'Saque solicitado', description: 'A solicitação foi registrada para análise financeira.' });
    } catch (error) {
      toast({ title: 'Não foi possível solicitar o saque', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setRequestingWithdrawal(false);
    }
  };

  const renderSection = () => {
    if (section === 'links') return <><SectionHeader eyebrow="Divulgação" title="Links de afiliado" description="Acompanhe cliques e conversões de cada destino divulgado." /><div className="grid gap-4">{links.map((link) => <Card key={link.id}><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><CardTitle className="text-base">{link.label}</CardTitle><Badge variant={link.active ? 'success' : 'secondary'}>{link.active ? 'Ativo' : 'Inativo'}</Badge></div><p className="mt-2 text-sm text-muted-foreground">/ref/{link.slug}</p><div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span>{link.clicks_count} cliques</span><span>{link.conversions_count} conversões</span></div></div><Button variant="outline" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/ref/${link.slug}`)}><Copy className="size-4" />Copiar link</Button></CardContent></Card>)}</div></>;

    if (section === 'conversions') return <><SectionHeader eyebrow="Resultados" title="Conversões" description="Pedidos atribuídos aos seus links de divulgação." /><DataTable rows={conversions} rowKey={(item) => item.id} emptyLabel="Nenhuma conversão registrada." columns={[{ header: 'Referência', cell: (item) => item.customer_reference ?? 'Pedido' }, { header: 'Venda', cell: (item) => formatCurrency(item.gross_amount_cents) }, { header: 'Comissão', cell: (item) => formatCurrency(item.commission_amount_cents) }, { header: 'Data', cell: (item) => formatDate(item.converted_at) }, { header: 'Status', cell: (item) => <Badge variant={item.status === 'approved' ? 'success' : 'warning'}>{statusLabel(item.status)}</Badge> }]} /></>;

    if (section === 'commissions') return <><SectionHeader eyebrow="Financeiro" title="Comissões" description="Valores pendentes, disponíveis, reservados e pagos." /><DataTable rows={commissions} rowKey={(item) => item.id} emptyLabel="Nenhuma comissão registrada." columns={[{ header: 'Valor', cell: (item) => formatCurrency(item.amount_cents) }, { header: 'Criação', cell: (item) => formatDate(item.created_at) }, { header: 'Disponibilidade', cell: (item) => item.available_at ? formatDate(item.available_at) : 'Aguardando' }, { header: 'Status', cell: (item) => <Badge variant={item.status === 'available' ? 'success' : 'warning'}>{statusLabel(item.status)}</Badge> }]} /></>;

    if (section === 'withdrawals') return <><SectionHeader eyebrow="Financeiro" title="Saques" description="Solicite o repasse das comissões disponíveis e acompanhe o processamento." /><div className="mb-6 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]"><Card><CardHeader><CardTitle className="text-xl">Solicitar saque</CardTitle><CardDescription>Saldo disponível: {formatCurrency(profile.balance_cents)}</CardDescription></CardHeader><CardContent><form onSubmit={submitWithdrawal} className="space-y-4"><div className="space-y-2"><Label htmlFor="withdrawal-amount">Valor em reais</Label><Input id="withdrawal-amount" inputMode="decimal" value={withdrawalAmount} onChange={(event) => setWithdrawalAmount(event.target.value)} placeholder="0,00" required /></div><div className="space-y-2"><Label htmlFor="withdrawal-method">Forma de pagamento</Label><select id="withdrawal-method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'pix' | 'bank_transfer')} className="h-11 w-full rounded-lg border border-white/10 bg-background px-3 text-sm"><option value="pix">Pix</option><option value="bank_transfer">Transferência bancária</option></select></div><Button type="submit" className="w-full" disabled={requestingWithdrawal}>{requestingWithdrawal ? 'Registrando...' : 'Solicitar saque'}</Button></form></CardContent></Card><DataTable rows={withdrawals} rowKey={(item) => item.id} emptyLabel="Nenhum saque solicitado." columns={[{ header: 'Valor', cell: (item) => formatCurrency(item.amount_cents) }, { header: 'Método', cell: (item) => item.payment_method === 'pix' ? 'Pix' : 'Transferência bancária' }, { header: 'Solicitação', cell: (item) => formatDate(item.requested_at) }, { header: 'Status', cell: (item) => <Badge variant={item.status === 'paid' ? 'success' : 'warning'}>{statusLabel(item.status)}</Badge> }]} /></div></>;

    if (section === 'materials') return <><SectionHeader eyebrow="Divulgação" title="Materiais" description="Peças aprovadas para divulgação da plataforma e dos produtos." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{materials.map((item) => <Card key={item.id}><CardHeader><Badge variant="outline" className="w-fit">{item.material_type}</Badge><CardTitle className="pt-3 text-lg">{item.title}</CardTitle><CardDescription>{item.description}</CardDescription></CardHeader><CardContent><Button variant="outline" className="w-full" disabled={!item.asset_url} onClick={() => item.asset_url && window.open(item.asset_url, '_blank', 'noopener,noreferrer')}><ExternalLink className="size-4" />Abrir material</Button></CardContent></Card>)}</div></>;

    if (section === 'profile') return <><SectionHeader eyebrow="Conta" title="Perfil do afiliado" description="Dados comerciais e identificação do seu programa de afiliados." /><Card className="max-w-2xl"><CardHeader><CardTitle>{profile.display_name}</CardTitle><CardDescription>Código de indicação: {profile.referral_code}</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="vdm-surface p-4"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 font-semibold text-white">{statusLabel(profile.status)}</p></div><div className="vdm-surface p-4"><p className="text-xs text-muted-foreground">Taxa de comissão</p><p className="mt-1 font-semibold text-white">{profile.commission_rate}%</p></div></CardContent></Card></>;

    return <><SectionHeader eyebrow="Portal do afiliado" title={`Olá, ${profile.display_name}.`} description="Acompanhe seu desempenho comercial, links e valores disponíveis." /><div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Saldo disponível" value={formatCurrency(profile.balance_cents)} icon={WalletCards} /><StatCard label="Ganhos acumulados" value={formatCurrency(profile.lifetime_earnings_cents)} icon={BadgeDollarSign} /><StatCard label="Cliques" value={String(totalClicks)} icon={MousePointerClick} /><StatCard label="Conversão" value={`${conversionRate}%`} icon={BarChart3} /></div><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="size-5 text-primary" />Links com melhor desempenho</CardTitle></CardHeader><CardContent className="space-y-3">{links.slice(0, 3).map((link) => <div key={link.id} className="flex items-center justify-between border-b border-white/8 pb-3 last:border-0"><div><p className="text-sm font-medium text-white">{link.label}</p><p className="text-xs text-muted-foreground">{link.clicks_count} cliques</p></div><span className="text-sm font-semibold text-primary">{link.conversions_count} vendas</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageOpen className="size-5 text-primary" />Materiais recentes</CardTitle></CardHeader><CardContent className="space-y-3">{materials.slice(0, 3).map((item) => <div key={item.id} className="border-b border-white/8 pb-3 last:border-0"><p className="text-sm font-medium text-white">{item.title}</p><p className="text-xs text-muted-foreground">{item.material_type}</p></div>)}</CardContent></Card></div></>;
  };

  return <AffiliateLayout>{renderSection()}</AffiliateLayout>;
};

export default AffiliatePortalPage;
