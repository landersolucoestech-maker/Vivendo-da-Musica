import { useState } from 'react';
import { PackageCheck, ReceiptText } from 'lucide-react';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useOrders } from '@/modules/checkout/hooks/useOrders';
import type { StudentOrder } from '@/modules/checkout/types/order.types';
import DataTable from '@/shared/components/DataTable';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { formatPrice } from '@/shared/utils/formatters';

const KIND_LABELS: Record<StudentOrder['kind'], string> = {
  curso: 'Curso',
  produto: 'Produto digital',
  beat: 'Beat',
};

const STATUS_LABELS: Record<StudentOrder['status'], string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  reembolsado: 'Reembolsado',
};

const OrdersPage = () => {
  const { data: orders } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<StudentOrder | null>(null);

  return (
    <StudentLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Compras</p>
        <h1 className="vdm-page-title mt-2">Meus pedidos</h1>
        <p className="vdm-page-description">Consulte itens adquiridos, valores, formas de pagamento e situação de cada pedido.</p>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="vdm-surface p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Total de pedidos</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{orders?.length ?? 0}</p>
        </div>
        <div className="vdm-surface p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Pagos</p>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-300">{orders?.filter((order) => order.status === 'pago').length ?? 0}</p>
        </div>
        <div className="vdm-surface p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Pendentes</p>
          <p className="mt-2 font-display text-2xl font-bold text-amber-300">{orders?.filter((order) => order.status === 'pendente').length ?? 0}</p>
        </div>
      </div>

      <DataTable
        rows={orders ?? []}
        rowKey={(order) => order.id}
        emptyLabel="Você ainda não possui pedidos registrados."
        columns={[
          { header: 'Pedido', cell: (order) => <span className="font-mono text-xs text-white">#{order.id.slice(0, 8).toUpperCase()}</span> },
          { header: 'Tipo', cell: (order) => KIND_LABELS[order.kind] },
          { header: 'Itens', cell: (order) => <span className="line-clamp-2 max-w-sm">{order.items.map((item) => item.title).join(', ')}</span> },
          { header: 'Total', cell: (order) => <span className="font-semibold text-white">{formatPrice(order.totalCents, order.currency)}</span> },
          { header: 'Status', cell: (order) => <StatusBadge status={order.status} label={STATUS_LABELS[order.status]} /> },
          {
            header: '',
            cell: (order) => (
              <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                <ReceiptText className="size-4" />
                Ver detalhes
              </Button>
            ),
          },
        ]}
      />

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary">
              <PackageCheck className="size-5" />
            </span>
            <DialogTitle className="text-2xl">Pedido #{selectedOrder?.id.slice(0, 8).toUpperCase()}</DialogTitle>
            <DialogDescription>
              {selectedOrder?.createdAt} · {selectedOrder?.paymentMethod}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.02]">
              {selectedOrder?.items.map((item) => (
                <div key={`${item.title}-${item.priceCents}`} className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-3 text-sm last:border-0">
                  <span className="text-[#d4d4d4]">{item.title}</span>
                  <span className="shrink-0 font-semibold text-white">{selectedOrder && formatPrice(item.priceCents, selectedOrder.currency)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/8 px-4 py-4">
              <span className="font-semibold text-white">Total do pedido</span>
              <span className="font-display text-xl font-bold text-primary">{selectedOrder && formatPrice(selectedOrder.totalCents, selectedOrder.currency)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default OrdersPage;
