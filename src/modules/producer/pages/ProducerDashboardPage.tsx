import { BarChart3, CircleDollarSign, Music2, Package, ShoppingBag, WalletCards } from "lucide-react";
import ProducerLayout from "@/app/layouts/ProducerLayout";
import { useProducerDashboard } from "@/modules/producer/hooks/useProducerProducts";
import DataTable from "@/shared/components/DataTable";
import EmptyState from "@/shared/components/EmptyState";
import LoadingState from "@/shared/components/LoadingState";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import { Badge } from "@/shared/components/ui/badge";
import { formatPrice } from "@/shared/utils/formatters";

const ProducerDashboardPage = () => {
  const { data, isLoading, error } = useProducerDashboard();
  if (isLoading) return <ProducerLayout><LoadingState rows={6} /></ProducerLayout>;
  if (!data || error) return <ProducerLayout><EmptyState title="Dashboard indisponivel" description={error instanceof Error ? error.message : "Tente novamente mais tarde."} /></ProducerLayout>;

  const stats = [
    { label: "Saldo liquido", value: formatPrice(data.financial.availableBalanceCents, data.financial.currency), icon: WalletCards },
    { label: "Receita bruta", value: formatPrice(data.totals.grossRevenueCents, data.financial.currency), icon: CircleDollarSign },
    { label: "Vendas totais", value: String(data.totals.totalSales), icon: ShoppingBag },
    { label: "Ticket medio", value: formatPrice(data.totals.averageTicketCents, data.financial.currency), icon: BarChart3 },
    { label: "Beats publicados", value: String(data.totals.publishedBeats), icon: Music2 },
    { label: "Produtos publicados", value: String(data.totals.publishedProducts), icon: Package },
  ];

  return <ProducerLayout>
    <PageHeader title="Dashboard do produtor" subtitle="Visao consolidada de beats, produtos digitais, receita e repasses." />
    <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</section>
    <section className="mb-6 grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Receita com beats</p><p className="mt-2 text-xl font-bold">{formatPrice(data.totals.beatRevenueCents, data.financial.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{data.totals.beatSales} vendas</p></div>
      <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Receita com produtos</p><p className="mt-2 text-xl font-bold">{formatPrice(data.totals.productRevenueCents, data.financial.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{data.totals.productSales} vendas</p></div>
      <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Elegivel para repasse</p><p className="mt-2 text-xl font-bold">{formatPrice(data.financial.eligibleBalanceCents, data.financial.currency)}</p><p className="mt-1 text-xs text-muted-foreground">Comissao {(data.financial.commissionBps / 100).toFixed(2)}% · carencia {data.financial.payoutDelayDays} dias</p></div>
    </section>
    <div className="grid gap-6 xl:grid-cols-2">
      <section><h2 className="mb-3 font-semibold">Produtos com maior receita</h2><DataTable rows={data.topProducts} rowKey={(item) => item.title} emptyLabel="Ainda nao ha vendas pagas de produtos." columns={[{ header: "Produto", cell: (item) => item.title }, { header: "Vendas", cell: (item) => String(item.sales) }, { header: "Receita", cell: (item) => formatPrice(item.revenueCents, data.financial.currency) }]} /></section>
      <section><h2 className="mb-3 font-semibold">Pedidos recentes de produtos</h2><DataTable rows={data.recentOrders} rowKey={(item) => item.id} emptyLabel="Nenhum pedido recebido." columns={[{ header: "Produto", cell: (item) => item.productTitle }, { header: "Valor", cell: (item) => formatPrice(item.amountCents, item.currency) }, { header: "Status", cell: (item) => <Badge variant={item.paidAt ? "default" : "secondary"}>{item.paidAt ? "Pago" : "Pendente"}</Badge> }]} /></section>
    </div>
  </ProducerLayout>;
};

export default ProducerDashboardPage;
