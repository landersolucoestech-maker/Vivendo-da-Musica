import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { CheckCircle, Play, BookOpen } from "lucide-react";
import { useRecentActivities } from "../hooks/useRecentActivities";

const RecentActivities = () => {
  const { data: activities, isLoading, error } = useRecentActivities();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lesson_completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'lesson_started':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'module_progress':
        return <BookOpen className="w-4 h-4 text-brand-medium" />;
      default:
        return <BookOpen className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atividades recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Carregando atividades...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atividades recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Erro ao carregar atividades</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atividades recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
            <p className="text-xs text-muted-foreground mt-1">Comece assistindo uma aula!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Atividades recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((item, index) => (
          <div key={index} className="border-b border-border pb-3 last:border-b-0">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm break-words">{item.activity}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecentActivities;
