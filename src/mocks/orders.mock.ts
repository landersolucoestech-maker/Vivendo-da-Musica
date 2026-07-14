import type { MockOrder } from "@/modules/checkout/types/order.types";

export const MOCK_ORDERS: MockOrder[] = [
  { id: '#1046', customer: 'Felipe Rodrigues', items: [{ title: 'Masterização Além do Limite', priceCents: 19700 }], totalCents: 19700, status: 'pago', paymentMethod: 'Pix', createdAt: '12/06/2026' },
  { id: '#1045', customer: 'Carla Mendes', items: [{ title: 'Home Studio: Setup e Acústica', priceCents: 14700 }], totalCents: 14700, status: 'pago', paymentMethod: 'Cartão de crédito', createdAt: '11/06/2026' },
  { id: '#1044', customer: 'Pedro Santos', items: [{ title: 'Beatmaking — Criação de Beats', priceCents: 14700 }, { title: 'MIDI Trap Melodies', priceCents: 2490 }], totalCents: 17190, status: 'pago', paymentMethod: 'Cartão de crédito', createdAt: '10/06/2026' },
  { id: '#1042', customer: 'Ana Oliveira', items: [{ title: 'Produção Musical — Do Zero ao Profissional', priceCents: 29700 }], totalCents: 29700, status: 'pago', paymentMethod: 'Cartão de crédito', createdAt: '10/06/2026' },
  { id: '#1041', customer: 'Lucas Beats', items: [{ title: 'Trap Essentials Sample Pack', priceCents: 4990 }], totalCents: 4990, status: 'pago', paymentMethod: 'Pix', createdAt: '09/06/2026' },
  { id: '#1040', customer: 'João Millen', items: [{ title: 'Drill Drum Kit Vol.1', priceCents: 3990 }], totalCents: 3990, status: 'pendente', paymentMethod: 'Cartão de crédito', createdAt: '08/06/2026' },
  { id: '#1039', customer: 'Beatriz Lima', items: [{ title: 'Mixagem Passo a Passo', priceCents: 19700 }], totalCents: 19700, status: 'reembolsado', paymentMethod: 'Cartão de crédito', createdAt: '05/06/2026' },
  { id: '#1038', customer: 'Mariana Santos', items: [{ title: 'Guia Completo de Distribuição', priceCents: 3990 }], totalCents: 3990, status: 'pago', paymentMethod: 'Pix', createdAt: '03/06/2026' },
];

export const getOrdersByCustomer = (customer: string) => MOCK_ORDERS.filter((o) => o.customer === customer);
