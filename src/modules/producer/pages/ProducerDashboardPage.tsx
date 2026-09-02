import { BarChart3, CircleDollarSign, Music2, Package, ShoppingBag, WalletCards } from 'lucide-react';

import ProducerLayout from '@/app/layouts/ProducerLayout';
import { useProducerDashboard } from '@/modules/producer/hooks/useProducerProducts';
import DataTable from '@/shared/components/DataTable';
import EmptyState from '@/shared/components/EmptyState';
import LoadingState from '@/shared/components/LoadingState';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { formatPrice } from '@/shared/utils/formatters';

const ProducerDashboardPage = () => {
  const { data, isLoading, error } = useProducerDashboard();

  if (isLoading) return <ProducerLayout><LoadingState rows={6} /></ProducerLayout>;
  if (!data || error) {
    return (
      <ProducerLayout>
        <EmptyState title="Dashboard indisponível" description={error instanceof Error ? error.message : 'Tente novamente mais tarde.'} />
      </ProducerLayout>
    );
  }

  const primaryStats = [
    { label: 'Saldo financeiro', value: formatPrice(data.financial.availableBalanceCents, data.financial.currency), icon: WalletCards },
    { label: 'Receita bruta', value: formatPrice(data.totals.grossRevenueCents, data.financial.currency), icon: CircleDollarSign },
    { label: 'Vendas totais', value: String(data.totals.totalSales), icon: ShoppingBag },
  ];
  const secondaryStats = [
    { label: 'Ticket médio', value: formatPrice(data.totals.averageTicketCents, data.financial.currency), icon: BarChart3 },
    { label: 'Beats publicados', value: String(data.totals.publishedBeats), icon: Music2 },
    { label: 'Produtos publicados', value: String(data.totals.publishedProducts), icon: Package },
  ];

  return (
    <ProducerLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Portal do produtor</p>
        <h1 className="vdm-page-title mt-2">Visão comercial consolidada</h1>
        <p className="vdm-page-description">Acompanhe beats, produtos digitais, receita, pedidos e valores disponíveis para repasse.</p>
      </header>

      <section className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-card">
        <div className="grid lg:grid-cols-3">
          {primaryStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`p-6 ${index ? 'border-t border-white/10 lg:border-l lg:border-t-0' : ''}`}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</p>
                  <Icon className="size-5 text-primary" />
                </div>
                <p className="font-display text-3xl font-semibold tracking-tight text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>
        <div className="grid border-t border-white/10 sm:grid-cols-3">
          {secondaryStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`flex items-center justify-between gap-4 px-5 py-4 ${index ? 'border-t border-white/10 sm:border-l sm:border-t-0' : ''}`}>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{stat.value}</p>
                </div>
                <Icon className="size-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><p className="vdm-eyebrow">Beats</p><CardTitle className="text-xl">{formatPrice(data.totals.beatRevenueCents, data.financial.currency)}</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{data.totals.beatSales} vendas confirmadas</p></CardContent>
        </Card>
        <Card>
          <CardHeader><p className="vdm-eyebrow">Produtos digitais</p><CardTitle className="text-xl">{formatPrice(data.totals.productRevenueCents, data.financial.currency)}</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{data.totals.productSales} vendas confirmadas</p></CardContent>
        </Card>
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader><p className="vdm-eyebrow">Repasse</p><CardTitle className="text-xl">{formatPrice(data.financial.eligibleBalanceCents, data.financial.currency)}</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Comissão {(data.financial.commissionBps / 100).toFixed(2)}% · carência de {data.financial.payoutDelayDays} dias</p></CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-3"><p className="vdm-eyebrow">Desempenho</p><h2 className="mt-1 text-xl font-semibold">Produtos com maior receita</h2></div>
          <DataTable
            rows={data.topProducts}
            rowKey={(item) => item.title}
            emptyLabel="Ainda não há vendas pagas de produtos."
            columns={[
              { header: 'Produto', cell: (item) => item.title },
              { header: 'Vendas', cell: (item) => String(item.sales) },
              { header: 'Receita', cell: (item) => formatPrice(item.revenueCents, data.financial.currency) },
            ]}
          />
        </section>

        <section>
          <div className="mb-3"><p className="vdm-eyebrow">Operação</p><h2 className="mt-1 text-xl font-semibold">Pedidos recentes de produtos digitais</h2></div>
          <DataTable
            rows={data.recentOrders}
            rowKey={(item) => item.id}
            emptyLabel="Nenhum pedido de produto digital recebido."
            columns={[
              { header: 'Produto', cell: (item) => item.productTitle },
              { header: 'Valor', cell: (item) => formatPrice(item.amountCents, item.currency) },
              { header: 'Status', cell: (item) => <Badge variant={item.paidAt ? 'success' : 'warning'}>{item.paidAt ? 'Pago' : 'Pendente'}</Badge> },
            ]}
          />
        </section>
      </div>
    </ProducerLayout>
  );
};

export default ProducerDashboardPage;