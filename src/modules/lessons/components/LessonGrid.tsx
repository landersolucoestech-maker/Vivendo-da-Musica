import { CheckCircle2, Layers3 } from 'lucide-react';

import { Progress } from '@/shared/components/ui/progress';
import LessonCard from './LessonCard';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl?: string;
  description: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: Lesson[];
}

interface LessonGridProps {
  modules: Module[];
  onLessonClick: (lesson: Lesson) => void;
}

const LessonGrid = ({ modules, onLessonClick }: LessonGridProps) => {
  if (!modules || modules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-12 text-center">
        <Layers3 className="mx-auto size-7 text-white/25" />
        <p className="mt-3 text-sm font-medium text-white">Nenhum módulo encontrado</p>
        <p className="mt-1 text-xs text-muted-foreground">Os módulos liberados aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {modules.map((module, moduleIndex) => {
        const completedLessons = module.lessons.filter((lesson) => lesson.completed).length;

        return (
          <section key={module.id} className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.018]">
            <div className="border-b border-white/8 bg-white/[0.018] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 font-display text-sm font-bold text-primary">
                    {String(moduleIndex + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-white sm:text-lg">{module.title}</h3>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 sm:text-right">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-black/20 px-3 py-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    {completedLessons} de {module.lessons.length} aulas
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <Progress value={module.progress} aria-label={`Progresso de ${module.title}`} className="h-1.5 flex-1" />
                <span className="w-10 text-right text-xs font-semibold text-white">{module.progress}%</span>
              </div>
            </div>

            <div className="space-y-2 p-3 sm:p-4">
              {module.lessons && module.lessons.length > 0 ? (
                module.lessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} onClick={() => onLessonClick(lesson)} />
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma aula encontrada neste módulo.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default LessonGrid;
