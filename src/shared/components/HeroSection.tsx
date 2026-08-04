import { ArrowRight, BookOpen, Music2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import { VdmBrand } from '@/shared/components/brand/VdmBrand';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';

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
                <Play className="size-5 fill-current" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Acesso sob demanda</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Estude no seu ritmo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="absolute -inset-10 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111] p-5 shadow-[0_32px_90px_rgba(0,0,0,0.42)] sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <VdmBrand compact />
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Plataforma completa
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-black/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">Sua evolução</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-display text-3xl font-bold text-white">Produção Musical</p>
                    <p className="mt-1 text-sm text-muted-foreground">Trilha profissional em andamento</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">68%</span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full w-[68%] rounded-full bg-gradient-brand" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">Próxima aula</p>
                  <p className="mt-3 text-lg font-semibold text-white">Mixagem e equilíbrio</p>
                  <p className="mt-1 text-sm text-muted-foreground">Módulo 4 · Aula 3</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Continuar
                    <ArrowRight className="size-4" />
                  </span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-primary/15 to-violet-700/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Marketplace</p>
                  <p className="mt-3 text-lg font-semibold text-white">Recursos para sua carreira</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Beats, templates, presets e materiais exclusivos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
