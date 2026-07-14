import type { CommunityPost, CommunityGroup, CommunityMember } from "@/modules/community/types/community.types";

export const MOCK_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    author: 'Lucas Beats',
    role: 'Produtor',
    timeAgo: 'há 2 horas',
    text: 'Fiz essa produção usando as técnicas que aprendi no curso de Mixagem. O que acharam?',
    likes: 45,
    comments: [
      { author: 'Ana Oliveira', text: 'Ficou muito boa a mixagem, parabéns!' },
      { author: 'João Millen', text: 'Gostei do groove do baixo.' },
    ],
  },
  {
    id: 'post-2',
    author: 'Ana Oliveira',
    role: 'Beatmaker',
    timeAgo: 'há 5 horas',
    text: 'Alguém mais usando o Sample Pack Trap Essentials? Tô amando os 808s.',
    likes: 28,
    comments: [{ author: 'Lucas Beats', text: 'Sim! Os 808s são insanos.' }],
  },
];

export const MOCK_COMMUNITY_GROUPS: CommunityGroup[] = [
  { name: 'Produtores Iniciantes', members: 1234, description: 'Para quem está começando na produção musical.' },
  { name: 'Mixagem & Master', members: 842, description: 'Discussões avançadas sobre mixagem e masterização.' },
  { name: 'Beatmakers SP', members: 310, description: 'Comunidade de beatmakers de São Paulo.' },
];

export const MOCK_TOP_TOPICS = [
  'Como melhorar o low-end da mixagem',
  'Plugins gratuitos que valem a pena',
  'Dicas para vender beats online',
];

export const MOCK_FEATURED_MEMBERS: CommunityMember[] = [
  { name: 'Lucas Beats', role: 'Produtor', points: 4820 },
  { name: 'Ana Oliveira', role: 'Beatmaker', points: 3910 },
  { name: 'João Millen', role: 'Instrutor', points: 7600 },
];

export const MOCK_ONLINE_MEMBERS = ['Lucas Beats', 'Ana Oliveira', 'João Millen', 'Mariana Santos', 'Felipe Rodrigues'];
