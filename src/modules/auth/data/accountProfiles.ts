import type { AccountProfile, AccountProfileDefinition } from '@/modules/auth/types/accountProfile';

export const ACCOUNT_PROFILES: AccountProfileDefinition[] = [
  {
    value: 'student',
    slug: 'aluno',
    label: 'Aluno',
    selectorDescription: 'Aprenda, acompanhe cursos, acesse conteúdos e candidate-se a oportunidades.',
    loginTitle: 'Entrar como aluno',
    loginDescription: 'Acesse seus cursos, certificados, pedidos e recursos da comunidade.',
    registerTitle: 'Criar conta de aluno',
    registerDescription: 'Cadastre-se para estudar, acompanhar seu progresso e utilizar a plataforma.',
  },
  {
    value: 'producer',
    slug: 'produtor',
    label: 'Produtor',
    selectorDescription: 'Venda beats, licenças e produtos digitais pelo portal do produtor.',
    loginTitle: 'Entrar como produtor',
    loginDescription: 'Gerencie beats, produtos, pedidos e sua operação comercial.',
    registerTitle: 'Criar conta de produtor',
    registerDescription: 'Configure seu perfil profissional para comercializar beats e produtos digitais.',
  },
  {
    value: 'instructor',
    slug: 'instrutor',
    label: 'Instrutor',
    selectorDescription: 'Crie cursos, organize aulas e acompanhe alunos e avaliações.',
    loginTitle: 'Entrar como instrutor',
    loginDescription: 'Acesse seus cursos, público, avaliações e relatórios.',
    registerTitle: 'Criar conta de instrutor',
    registerDescription: 'Cadastre seu perfil profissional para produzir e administrar conteúdos educacionais.',
  },
  {
    value: 'company',
    slug: 'empresa',
    label: 'Empresa',
    selectorDescription: 'Publique oportunidades, analise candidatos e conduza processos seletivos.',
    loginTitle: 'Entrar como empresa',
    loginDescription: 'Acesse oportunidades, candidatos, mensagens e dados institucionais.',
    registerTitle: 'Criar conta empresarial',
    registerDescription: 'Cadastre o responsável e os dados iniciais da organização.',
  },
  {
    value: 'affiliate',
    slug: 'afiliado',
    label: 'Afiliado',
    selectorDescription: 'Divulgue produtos e acompanhe links, conversões, comissões e saques.',
    loginTitle: 'Entrar como afiliado',
    loginDescription: 'Acesse seus materiais, links, resultados e informações financeiras.',
    registerTitle: 'Criar conta de afiliado',
    registerDescription: 'Cadastre seus canais de divulgação para participar do programa de afiliados.',
  },
];

export const ACCOUNT_PROFILE_BY_VALUE = new Map(ACCOUNT_PROFILES.map((profile) => [profile.value, profile]));
export const ACCOUNT_PROFILE_BY_SLUG = new Map(ACCOUNT_PROFILES.map((profile) => [profile.slug, profile]));

export const isAccountProfile = (value: string | null | undefined): value is AccountProfile =>
  ACCOUNT_PROFILE_BY_VALUE.has(value as AccountProfile);
