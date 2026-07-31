import {
  Brain,
  Briefcase,
  Grid3x3,
  Headphones,
  Home,
  Megaphone,
  Music,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/constants/routes';

const AREAS = [
  { icon: Music, label: 'Produção Musical', description: 'Criação, arranjo e fluxo profissional.' },
  { icon: SlidersHorizontal, label: 'Mixagem', description: 'Equilíbrio, dinâmica e identidade sonora.' },
  { icon: Headphones, label: 'Masterização', description: 'Finalização pronta para lançamento.' },
  { icon: Grid3x3, label: 'Beatmaking', description: 'Ritmo, timbres, samples e estrutura.' },
  { icon: Home, label: 'Home Studio', description: 'Monte e organize seu ambiente de produção.' },
  { icon: Megaphone, label: 'Marketing Musical', description: 'Posicionamento, conteúdo e audiência.' },
  { icon: ShieldCheck, label: 'Direitos Autorais', description: 'Proteção de obras, fonogramas e contratos.' },
  { icon: Share2, label: 'Distribuição', description: 'Estratégia para colocar sua música no mercado.' },
  { icon: Brain, label: 'IA para Música', description: 'Ferramentas inteligentes aplicadas à produção.' },
  { icon: Briefcase, label: 'Negócios da Música', description: 'Carreira, gestão e monetização.' },
];

const ExploreAreasSection = () => (
  <section className="relative overflow-hidden border-y border-white/5 bg-[#0A0A0A] py-20">
    <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
    <div className="vdm-container relative">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="vdm-eyebrow">Trilhas de conhecimento</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold md:text-4xl">Explore as principais áreas do mercado musical</h2>
          <p className="vdm-page-description">Conteúdo organizado para quem quer aprender, produzir, lançar e transformar música em profissão.</p>
        </div>
        <Link to={ROUTES.academy} className="link-vdm shrink-0">Ver todos os cursos</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {AREAS.map(({ icon: Icon, label, description }) => (
          <Link key={label} to={ROUTES.academy} className="vdm-surface-interactive group p-5">
            <span className="vdm-icon-button mb-5 border-primary/25 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white">
              <Icon className="size-5" />
            </span>
            <h3 className="text-base font-semibold text-white">{label}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default ExploreAreasSection;
