import { useState } from "react";
import { Receipt } from "lucide-react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import { useOrders } from "@/modules/checkout/hooks/useOrders";
import type { StudentOrder } from "@/modules/checkout/types/order.types";
import { formatPrice } from "@/shared/utils/formatters";

const OrdersPage = () => {
  const { data: orders } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<StudentOrder | null>(null);

  return (
    <StudentLayout>
      <PageHeader title="Pedidos" subtitle="Histórico de compras de cursos e produtos." />

      <DataTable
        rows={orders ?? []}
        rowKey={(order) => order.id}
        emptyLabel="Você ainda não fez nenhuma compra."
        columns={[
          { header: 'Pedido', cell: (order) => order.id.slice(0, 8).toUpperCase() },
          { header: 'Tipo', cell: (order) => order.kind },
          { header: 'Itens', cell: (order) => order.items.map((i) => i.title).join(', ') },
          { header: 'Total', cell: (order) => formatPrice(order.totalCents, order.currency) },
          { header: 'Status', cell: (order) => <StatusBadge status={order.status} label={order.status} /> },
          {
            header: '',
            cell: (order) => (
              <Button size="sm" variant="outline" className="border-border" onClick={() => setSelectedOrder(order)}>
                <Receipt className="w-4 h-4 mr-2" />
                Detalhe
              </Button>
            ),
          },
        ]}
      />

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedido {selectedOrder?.id}</DialogTitle>
            <DialogDescription>{selectedOrder?.createdAt} · {selectedOrder?.paymentMethod}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {selectedOrder?.items.map((item) => (
              <div key={item.title} className="flex items-center justify-between text-sm">
                <span>{item.title}</span>
                <span className="font-medium">{selectedOrder && formatPrice(item.priceCents, selectedOrder.currency)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex items-center justify-between font-bold">
              <span>Total</span>
              <span>{selectedOrder && formatPrice(selectedOrder.totalCents, selectedOrder.currency)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default OrdersPage;
