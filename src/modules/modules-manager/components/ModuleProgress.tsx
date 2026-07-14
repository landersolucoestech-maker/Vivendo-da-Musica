import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";

interface Module {
  id: string;
  title: string;
  progress: number;
}

interface ModuleProgressProps {
  modules: Module[];
}

const ModuleProgress = ({ modules }: ModuleProgressProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estatísticas de progresso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {modules.map((module) => (
          <div key={module.id} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{module.title}</span>
              <span className="text-muted-foreground">{module.progress}%</span>
            </div>
            <Progress value={module.progress} aria-label={`Progresso de ${module.title}`} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ModuleProgress;
