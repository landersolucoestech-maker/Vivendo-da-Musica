import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';

const BENEFITS = [
  'Cursos organizados por módulos e aulas',
  'Materiais complementares para download',
  'Acompanhamento de progresso e certificados',
  'Marketplace de produtos e recursos musicais',
];

const PlansTeaserSection = () => (
  <section className="bg-[#090909] py-20 sm:py-24">
    <div className="vdm-container py-0">
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 vdm-pattern-dots opacity-30 lg:block" />
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="vdm-eyebrow">Estrutura completa</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Tudo o que você precisa para aprender e transformar conhecimento em prática.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              A plataforma reúne formação, materiais, produtos e ferramentas em uma experiência única, organizada e profissional.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to={ROUTES.academy}>
                  Explorar academia
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={ROUTES.marketplace}>Conhecer marketplace</Link>
              </Button>
            </div>
          </div>

          <div className="vdm-surface relative p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Incluído na experiência</p>
            <div className="mt-5 space-y-4">
              {BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <p className="text-sm leading-6 text-[#dedede]">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default PlansTeaserSection;
