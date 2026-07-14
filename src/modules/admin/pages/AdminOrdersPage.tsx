import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import { useOrders } from "@/modules/checkout/hooks/useOrders";
import { formatPrice } from "@/shared/utils/formatters";

const AdminOrdersPage = () => {
  const { data: orders } = useOrders();

  return (
    <AdminLayout>
      <PageHeader title="Pedidos" subtitle="Pedidos de cursos e produtos." />
      <DataTable
        rows={orders ?? []}
        rowKey={(order) => order.id}
        emptyLabel="Nenhum pedido registrado ainda."
        columns={[
          { header: 'Pedido', cell: (order) => order.id },
          { header: 'Cliente', cell: (order) => order.customer },
          { header: 'Total', cell: (order) => formatPrice(order.totalCents) },
          { header: 'Pagamento', cell: (order) => order.paymentMethod },
          { header: 'Status', cell: (order) => <StatusBadge status={order.status} label={order.status} /> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminOrdersPage;
