import { ArrowRight, BookOpen, Music2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import { VdmBrand } from '@/shared/components/brand/VdmBrand';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';

const HeroSection = () => (
  <section id="home" className="relative overflow-hidden border-b border-white/10 pb-20 pt-28 sm:pt-32 lg:pb-28">
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute left-[-10rem] top-8 size-[30rem] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute right-[-12rem] top-32 size-[32rem] rounded-full bg-[#6C3AED]/12 blur-[130px]" />
      <div className="vdm-pattern-dots absolute inset-0 opacity-30" />
    </div>

    <div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="text-center lg:text-left">
          <VdmBrand showTagline className="mb-8 justify-center lg:justify-start" />

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

          <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground lg:justify-start">
            <span className="inline-flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              Cursos estruturados
            </span>
            <span className="inline-flex items-center gap-2">
              <Music2 className="size-4 text-primary" />
              Conteúdo prático
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl">
          <div className="absolute -inset-5 rounded-[2rem] bg-gradient-brand opacity-15 blur-3xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#111111] p-2 shadow-brand-lg">
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-gradient-surface">
              <div className="vdm-pattern-dots absolute inset-0 opacity-45" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(138,43,226,0.25),transparent_55%)]" />

              <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/10 bg-black/35 px-4 py-3 backdrop-blur-sm">
                <VdmBrand compact className="scale-75 origin-left" />
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Aula prática
                </span>
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  aria-label="Reproduzir apresentação"
                  className="flex size-20 items-center justify-center rounded-full border border-white/30 bg-gradient-brand text-white shadow-brand transition duration-200 hover:scale-105 hover:brightness-110"
                >
                  <Play className="ml-1 size-8 fill-current" />
                </button>
              </div>

              <div className="absolute inset-x-5 bottom-5 rounded-xl border border-white/10 bg-black/55 p-4 backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Produção musical</p>
                <p className="mt-1 font-display text-lg font-semibold text-white">Aprenda fazendo, do fundamento ao resultado final.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
