export interface StudentOrderItem {
  title: string;
  priceCents: number;
}

export interface StudentOrder {
  id: string;
  customer?: string;
  kind: 'curso' | 'beat' | 'produto';
  items: StudentOrderItem[];
  totalCents: number;
  status: 'pago' | 'pendente' | 'reembolsado';
  paymentMethod: string;
  createdAt: string;
  currency: string;
}
