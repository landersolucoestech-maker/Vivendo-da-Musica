import { BookOpen, Download, GraduationCap, Music2 } from 'lucide-react';

const METRICS = [
  { icon: GraduationCap, value: 'Formação prática', label: 'Aprenda com trilhas estruturadas' },
  { icon: BookOpen, value: 'Conteúdo aplicado', label: 'Aulas voltadas à rotina musical' },
  { icon: Music2, value: 'Mercado musical', label: 'Conhecimento para carreira e negócio' },
  { icon: Download, value: 'Materiais de apoio', label: 'Projetos, arquivos e documentos' },
];

const StatsBar = () => (
  <section className="border-y border-white/8 bg-[#0a0a0a] py-8">
    <div className="vdm-container py-0">
      <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map(({ icon: Icon, value, label }) => (
          <div key={value} className="bg-card p-5 sm:p-6">
            <span className="vdm-icon-button mb-4 border-primary/25 bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <p className="font-display text-base font-semibold text-white">{value}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsBar;
