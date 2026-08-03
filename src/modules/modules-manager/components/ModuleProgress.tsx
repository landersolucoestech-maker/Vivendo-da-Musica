import { CheckCircle2, CircleDashed } from 'lucide-react';

import { Progress } from '@/shared/components/ui/progress';

interface Module {
  id: string;
  title: string;
  progress: number;
}

interface ModuleProgressProps {
  modules: Module[];
}

const ModuleProgress = ({ modules }: ModuleProgressProps) => {
  if (modules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-muted-foreground">
        Nenhum progresso disponível.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {modules.map((module) => {
        const completed = module.progress >= 100;

        return (
          <article key={module.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${
                    completed
                      ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400'
                      : 'border-primary/25 bg-primary/10 text-primary'
                  }`}
                >
                  {completed ? <CheckCircle2 className="size-4" /> : <CircleDashed className="size-4" />}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-sm font-semibold text-white">{module.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {completed ? 'Módulo concluído' : 'Em andamento'}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold text-white">{module.progress}%</span>
            </div>
            <Progress value={module.progress} aria-label={`Progresso de ${module.title}`} className="mt-4 h-1.5" />
          </article>
        );
      })}
    </div>
  );
};

export default ModuleProgress;
