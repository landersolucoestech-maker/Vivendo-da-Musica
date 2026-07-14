export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  requester: string;
  status: 'aberto' | 'em-andamento' | 'resolvido';
  priority: 'baixa' | 'média' | 'alta';
  createdAt: string;
}

export interface SupportFaqItem {
  id: string;
  question: string;
  answer: string;
}
