import { useQuery } from '@tanstack/react-query';

import AdminLayout from '@/app/layouts/AdminLayout';
import { adminCanonicalFinanceService } from '@/modules/admin/services/adminCanonicalFinance.service';
import DataTable from '@/shared/components/DataTable';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge';
import { formatPrice } from '@/shared/utils/formatters';

const AdminOrdersPage = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-canonical-orders'],
    queryFn: async () => (await adminCanonicalFinanceService.getDashboard()).orders,
  });

  return (
    <AdminLayout>
      <PageHeader title="Pedidos" subtitle="Pedidos canônicos registrados na operação da plataforma." />

      {isLoading && <LoadingState rows={6} />}
      {isError && <ErrorState description={error.message} onRetry={() => void refetch()} />}

      {data && !isLoading && !isError && (
        <DataTable
          rows={data}
          rowKey={(order) => order.id}
          emptyLabel="Nenhum pedido registrado ainda."
          columns={[
            { header: 'Pedido', cell: (order) => order.id.slice(0, 8) },
            { header: 'Itens', cell: (order) => order.itemTitles.join(', ') || '—' },
            { header: 'Total', cell: (order) => formatPrice(order.totalCents, order.currency) },
            { header: 'Pagamento', cell: (order) => order.provider ?? '—' },
            { header: 'Status', cell: (order) => <StatusBadge status={order.status} label={order.status} /> },
            { header: 'Pago em', cell: (order) => order.paidAt ? new Date(order.paidAt).toLocaleString('pt-BR') : '—' },
          ]}
        />
      )}
    </AdminLayout>
  );
};

export default AdminOrdersPage;
