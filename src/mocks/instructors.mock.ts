import type { Instructor } from "@/modules/courses/types/course.types";

export const MOCK_INSTRUCTORS: Instructor[] = [
  { id: 'inst-1', name: 'João Millen', specialty: 'Produção Musical', bio: 'Produtor com mais de 12 anos de carreira, já trabalhou em mais de 300 faixas lançadas.', rating: 4.9, studentsCount: 12400, coursesCount: 4, gradientFrom: '#7C3AED', gradientTo: '#312E81' },
  { id: 'inst-2', name: 'Fab Dupont', specialty: 'Mixagem', bio: 'Engenheiro de mixagem premiado, referência internacional em produção urbana.', rating: 4.8, studentsCount: 9800, coursesCount: 3, gradientFrom: '#0EA5E9', gradientTo: '#1E3A8A' },
  { id: 'inst-3', name: 'Luan Teles', specialty: 'Carreira Musical', bio: 'Consultor de carreira para artistas independentes, especialista em distribuição digital.', rating: 4.7, studentsCount: 6200, coursesCount: 2, gradientFrom: '#F59E0B', gradientTo: '#7C2D12' },
  { id: 'inst-4', name: 'Chiocki', specialty: 'Beatmaking', bio: 'Beatmaker e produtor, referência em criação de beats para trap e funk.', rating: 4.9, studentsCount: 15300, coursesCount: 5, gradientFrom: '#DB2777', gradientTo: '#4C1D95' },
  { id: 'inst-5', name: 'Mariana Costa', specialty: 'Masterização', bio: 'Engenheira de masterização com passagem por estúdios renomados em SP e RJ.', rating: 4.8, studentsCount: 5400, coursesCount: 2, gradientFrom: '#22D3EE', gradientTo: '#0E7490' },
  { id: 'inst-6', name: 'Rafael Andrade', specialty: 'Negócios da Música', bio: 'Empreendedor musical, fundador de selo independente com mais de 50 artistas.', rating: 4.6, studentsCount: 4100, coursesCount: 2, gradientFrom: '#A855F7', gradientTo: '#581C87' },
];
