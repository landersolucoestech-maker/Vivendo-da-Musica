import type { Testimonial } from "@/modules/courses/types/course.types";

export const MOCK_TESTIMONIALS: Testimonial[] = [
  { studentName: 'Ana Oliveira', courseSlug: 'producao-musical-do-zero-ao-profissional', courseTitle: 'Produção Musical — Do Zero ao Profissional', rating: 5, text: 'Em 4 meses consegui lançar minha primeira faixa profissionalmente. O curso muda o jogo.' },
  { studentName: 'Pedro Santos', courseSlug: 'beatmaking-criacao-de-beats', courseTitle: 'Beatmaking — Criação de Beats', rating: 5, text: 'Os kits de sample e as aulas práticas aceleraram demais minha evolução como beatmaker.' },
  { studentName: 'Carla Mendes', courseSlug: 'home-studio-setup-e-acustica', courseTitle: 'Home Studio: Setup e Acústica', rating: 5, text: 'Resolvi o eco do meu quarto e hoje grito vocais com qualidade de estúdio profissional.' },
  { studentName: 'Felipe Rodrigues', courseSlug: 'masterizacao-alem-do-limite', courseTitle: 'Masterização Além do Limite', rating: 5, text: 'Minhas masters ficaram irreconhecíveis depois desse curso, parecem de estúdio grande.' },
];
