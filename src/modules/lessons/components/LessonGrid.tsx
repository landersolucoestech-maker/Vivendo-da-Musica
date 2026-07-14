import { Progress } from "@/shared/components/ui/progress";
import LessonCard from "./LessonCard";

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
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum módulo encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {modules.map((module) => (
        <div key={module.id} className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold">{module.title}</h3>
              <p className="text-muted-foreground text-sm">{module.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-muted-foreground">Progresso</p>
              <p className="font-semibold">{module.progress}%</p>
            </div>
          </div>

          <Progress value={module.progress} aria-label={`Progresso de ${module.title}`} className="h-2" />

          <div className="grid grid-cols-1 gap-4">
            {module.lessons && module.lessons.length > 0 ? (
              module.lessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  onClick={() => onLessonClick(lesson)}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">Nenhuma aula encontrada neste módulo</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LessonGrid;
