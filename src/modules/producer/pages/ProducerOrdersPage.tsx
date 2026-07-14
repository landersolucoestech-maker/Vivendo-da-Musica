import ProducerLayout from "@/app/layouts/ProducerLayout";
import { useProducerOrders } from "@/modules/producer/hooks/useProducerProducts";
import DataTable from "@/shared/components/DataTable";
import PageHeader from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { formatPrice } from "@/shared/utils/formatters";

const ProducerOrdersPage = () => {
  const { data, isError } = useProducerOrders();
  return <ProducerLayout>
    <PageHeader title="Pedidos de produtos" subtitle="Itens vendidos, pagamentos confirmados e valores brutos." />
    {isError && <p className="mb-4 text-sm text-destructive">Não foi possível carregar os pedidos.</p>}
    <DataTable rows={data ?? []} rowKey={(item) => item.id} emptyLabel="Nenhum pedido de produto recebido." columns={[
      { header: 'Produto', cell: (item) => item.productTitle }, { header: 'Valor', cell: (item) => formatPrice(item.amountCents, item.currency) }, { header: 'Data', cell: (item) => new Date(item.createdAt).toLocaleDateString('pt-BR') }, { header: 'Pagamento', cell: (item) => <Badge variant={item.paidAt ? 'default' : 'secondary'}>{item.paidAt ? 'Pago' : 'Pendente'}</Badge> },
    ]} />
  </ProducerLayout>;
};

export default ProducerOrdersPage;
