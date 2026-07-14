export const MOCK_VIP_PLANS = [
  {
    name: 'Premium Mensal',
    priceLabel: 'R$ 49,90/mês',
    features: ['Biblioteca Premium completa', 'Eventos exclusivos', 'Comunidade VIP', 'Suporte prioritário'],
    highlighted: false,
  },
  {
    name: 'Premium Anual',
    priceLabel: 'R$ 39,90/mês',
    features: ['Tudo do plano mensal', '2 meses grátis', 'Mentoria em grupo mensal', 'Certificados ilimitados'],
    highlighted: true,
  },
];

export const MOCK_VIP_BENEFITS = [
  { title: 'Conteúdo exclusivo', description: 'Aulas, templates e presets que não estão no catálogo público.' },
  { title: 'Mentorias em grupo', description: 'Encontros mensais ao vivo com instrutores da plataforma.' },
  { title: 'Comunidade fechada', description: 'Grupo exclusivo de assinantes Premium para trocar feedback.' },
  { title: 'Eventos com desconto', description: 'Acesso prioritário e descontos em workshops e imersões.' },
];

export const MOCK_VIP_TESTIMONIALS = [
  { name: 'Ana Oliveira', role: 'Assinante Premium', text: 'A biblioteca premium pagou o investimento no primeiro mês.' },
  { name: 'Lucas Beats', role: 'Assinante Premium', text: 'As mentorias em grupo aceleraram muito minha evolução.' },
];

export const MOCK_VIP_FAQ = [
  { question: 'Posso cancelar quando quiser?', answer: 'Sim, o cancelamento pode ser feito a qualquer momento direto na sua conta.' },
  { question: 'O conteúdo premium expira?', answer: 'Enquanto sua assinatura estiver ativa, você tem acesso a todo o catálogo.' },
  { question: 'Certificados são inclusos?', answer: 'Sim, todos os cursos concluídos geram certificado, ilimitado no plano anual.' },
];
