import { CalendarDays, CircleDollarSign, ShoppingBag } from 'lucide-react';

import ProducerLayout from '@/app/layouts/ProducerLayout';
import { useProducerOrders } from '@/modules/producer/hooks/useProducerProducts';
import DataTable from '@/shared/components/DataTable';
import LoadingState from '@/shared/components/LoadingState';
import StatCard from '@/shared/components/StatCard';
import { Badge } from '@/shared/components/ui/badge';
import { formatPrice } from '@/shared/utils/formatters';

const ProducerOrdersPage = () => {
  const { data, isLoading, isError } = useProducerOrders();

  if (isLoading) {
    return (
      <ProducerLayout>
        <LoadingState rows={5} />
      </ProducerLayout>
    );
  }

  if (isError || !data) {
    return (
      <ProducerLayout>
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-300">
          Não foi possível carregar os pedidos.
        </p>
      </ProducerLayout>
    );
  }

  const paidOrders = data.filter((item) => item.paidAt);
  const grossRevenueCents = paidOrders.reduce((total, item) => total + item.amountCents, 0);
  const currency = data[0]?.currency ?? 'BRL';

  return (
    <ProducerLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Operação comercial</p>
        <h1 className="vdm-page-title mt-2">Pedidos de produtos</h1>
        <p className="vdm-page-description">Consulte vendas, situação dos pagamentos e valores brutos associados aos seus produtos.</p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pedidos recebidos" value={String(data.length)} icon={ShoppingBag} />
        <StatCard label="Pagamentos confirmados" value={String(paidOrders.length)} icon={CalendarDays} />
        <StatCard label="Receita bruta paga" value={formatPrice(grossRevenueCents, currency)} icon={CircleDollarSign} />
      </div>

      <section>
        <div className="mb-4">
          <p className="vdm-eyebrow">Histórico</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-white">Pedidos registrados</h2>
        </div>
        <DataTable
          rows={data}
          rowKey={(item) => item.id}
          emptyLabel="Nenhum pedido de produto recebido."
          columns={[
            { header: 'Pedido', cell: (item) => <span className="font-mono text-xs text-white">#{item.id.slice(0, 8).toUpperCase()}</span> },
            { header: 'Produto', cell: (item) => <span className="font-semibold text-white">{item.productTitle}</span> },
            { header: 'Valor', cell: (item) => formatPrice(item.amountCents, item.currency) },
            { header: 'Data', cell: (item) => new Date(item.createdAt).toLocaleDateString('pt-BR') },
            { header: 'Pagamento', cell: (item) => <Badge variant={item.paidAt ? 'success' : 'warning'}>{item.paidAt ? 'Pago' : 'Pendente'}</Badge> },
          ]}
        />
      </section>
    </ProducerLayout>
  );
};

export default ProducerOrdersPage;