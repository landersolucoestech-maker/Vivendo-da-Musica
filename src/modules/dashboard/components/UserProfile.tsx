import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { User, Award, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserProfile } from "@/modules/profile/hooks/useUserProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { useLessons } from "@/modules/lessons/hooks/useLessons";
import { useUserProgress } from "@/modules/lessons/hooks/useUserProgress";
import { useToast } from "@/shared/hooks/use-toast";
import { ROUTES } from "@/shared/constants/routes";

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    joinDate: string;
    progress: number;
  };
}

const UserProfile = ({ user }: UserProfileProps) => {
  const { data: profile } = useUserProfile();
  const { data: allLessons } = useLessons();
  const { data: userProgress } = useUserProgress();
  const { toast } = useToast();

  const allLessonsCompleted =
    !!allLessons?.length &&
    !!userProgress &&
    userProgress.filter((progress) => progress.completed).length === allLessons.length;

  const handleCertificatesClick = () => {
    if (!allLessonsCompleted) {
      toast({
        title: "Acesso restrito",
        description: "Complete todas as aulas do curso para desbloquear os certificados.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Certificados disponíveis!",
      description: "Parabéns por concluir o curso completo!",
    });
  };

  return (
    <Card className="w-full max-w-[380px]">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between w-full gap-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{user.name}</CardTitle>
              <CardDescription className="text-sm truncate">{user.email}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" asChild>
            <Link to={ROUTES.editProfile} aria-label="Editar perfil">
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Membro desde</p>
          <p>{user.joinDate}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Progresso geral</p>
          <Progress value={user.progress} aria-label="Progresso geral" className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">{user.progress}% concluído</p>
        </div>

        <Button
          className="w-full"
          onClick={handleCertificatesClick}
        >
          <Award className="w-4 h-4 mr-2" />
          Certificados
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
