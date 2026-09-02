import { ArrowRight, BookOpen, Briefcase, Library, Music2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { VdmBrand } from '@/shared/components/brand/VdmBrand';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';

const PLATFORM_AREAS = [
  {
    icon: BookOpen,
    title: 'Formação estruturada',
    description: 'Cursos e trilhas para desenvolver conhecimento aplicável ao mercado musical.',
  },
  {
    icon: Music2,
    title: 'Recursos profissionais',
    description: 'Materiais e ferramentas para apoiar produção, lançamento e evolução de carreira.',
  },
  {
    icon: Library,
    title: 'Conteúdo especializado',
    description: 'Conhecimento sobre produção, direitos, distribuição, marketing e gestão musical.',
  },
  {
    icon: Briefcase,
    title: 'Carreira e oportunidades',
    description: 'Conexões entre aprendizado, mercado e desenvolvimento profissional.',
  },
];

const HeroSection = () => (
  <section id="home" className="relative overflow-hidden border-b border-white/10 pb-20 pt-12 lg:pb-28">
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute left-[-10rem] top-8 size-[30rem] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute right-[-12rem] top-32 size-[32rem] rounded-full bg-[#6C3AED]/12 blur-[130px]" />
      <div className="vdm-pattern-dots absolute inset-0 opacity-30" />
    </div>

    <div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="vdm-eyebrow">Formação musical completa</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            Aprenda. Crie.
            <br />
            Produza. <span className="gradient-text">Viva da música.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0">
            Cursos de produção musical, materiais profissionais e ferramentas para transformar conhecimento em evolução real.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Button asChild size="lg">
              <Link to={ROUTES.academy}>
                Explorar cursos
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to={ROUTES.marketplace}>Acessar marketplace</Link>
            </Button>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <div className="vdm-surface flex items-center gap-3 p-4 text-left">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <BookOpen className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Cursos completos</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Aprendizado estruturado</p>
              </div>
            </div>
            <div className="vdm-surface flex items-center gap-3 p-4 text-left">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Music2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Materiais profissionais</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Ferramentas para produzir</p>
              </div>
            </div>
            <div className="vdm-surface flex items-center gap-3 p-4 text-left">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Briefcase className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Mercado e carreira</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Conhecimento aplicado</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="absolute -inset-10 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111] p-5 shadow-[0_32px_90px_rgba(0,0,0,0.42)] sm:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-6">
              <VdmBrand compact />
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Plataforma completa
              </span>
            </div>

            <div className="py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Um ecossistema para evoluir</p>
              <h2 className="mt-3 max-w-lg font-display text-2xl font-bold text-white sm:text-3xl">
                Formação, recursos e mercado no mesmo ambiente.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                Desenvolva conhecimento, amplie seu repertório profissional e encontre recursos para avançar em diferentes etapas da carreira musical.
              </p>
            </div>

            <div className="divide-y divide-white/8 border-t border-white/8">
              {PLATFORM_AREAS.map(({ icon: Icon, title, description }) => (
                <div key={title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 py-4 first:pt-5 last:pb-0">
                  <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
