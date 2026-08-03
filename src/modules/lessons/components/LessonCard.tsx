import { ArrowUpRight, Check, Clock3, Play } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration?: string;
  completed: boolean;
  video_url?: string;
  videoUrl?: string;
  description: string;
}

interface LessonCardProps {
  lesson: Lesson;
  onClick: () => void;
}

const LessonCard = ({ lesson, onClick }: LessonCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 text-left transition duration-200 hover:border-primary/35 hover:bg-primary/[0.06] sm:p-5"
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${
          lesson.completed
            ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400'
            : 'border-white/10 bg-white/[0.04] text-white group-hover:border-primary/30 group-hover:bg-primary/15 group-hover:text-primary'
        }`}
      >
        {lesson.completed ? <Check className="size-5" /> : <Play className="size-5 fill-current" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-semibold text-white sm:text-base">{lesson.title}</span>
          {lesson.completed && (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
              Concluída
            </span>
          )}
        </span>
        <span className="mt-1.5 line-clamp-2 block text-xs leading-5 text-muted-foreground sm:text-sm">
          {lesson.description}
        </span>
        {lesson.duration && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/45">
            <Clock3 className="size-3.5" />
            {lesson.duration}
          </span>
        )}
      </span>

      <span className="hidden shrink-0 items-center gap-2 text-xs font-semibold text-primary sm:flex">
        {lesson.completed ? 'Revisar' : 'Assistir'}
        <ArrowUpRight className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
};

export default LessonCard;
