import { BarChart3, BookOpen, CircleDollarSign, LayoutDashboard, UsersRound } from 'lucide-react';

import CommercePortalSidebar from '@/shared/components/CommercePortalSidebar';

const items = [
  { label: 'Visão geral', href: '/instrutor', icon: LayoutDashboard },
  { label: 'Cursos', href: '/instrutor/cursos', icon: BookOpen },
  { label: 'Alunos e avaliações', href: '/instrutor/alunos-avaliacoes', icon: UsersRound },
  { label: 'Relatórios', href: '/instrutor/relatorios', icon: BarChart3 },
  { label: 'Financeiro', href: '/instrutor/financeiro', icon: CircleDollarSign },
];

const InstructorSidebarCommerce = () => (
  <CommercePortalSidebar
    eyebrow="Vivendo da Música"
    title="Portal do Instrutor"
    description="Cursos, alunos, desempenho e repasses em uma única operação."
    items={items}
  />
);

export default InstructorSidebarCommerce;
