import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Play, CheckCircle, Clock } from "lucide-react";

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
    <Card className="hover:border-primary/40 transition-colors cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="flex-shrink-0">
              {lesson.completed ? (
                <div className="w-11 h-11 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
              ) : (
                <div className="w-11 h-11 bg-muted rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold mb-1">{lesson.title}</h4>
              <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{lesson.description}</p>
              {lesson.duration && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  {lesson.duration}
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 ml-4">
            <Button
              onClick={onClick}
              variant={lesson.completed ? "secondary" : "default"}
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              {lesson.completed ? 'Revisar' : 'Assistir'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LessonCard;
