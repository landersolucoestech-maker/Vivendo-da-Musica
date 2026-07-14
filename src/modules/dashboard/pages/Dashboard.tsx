import { useMemo, useState } from 'react';
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { BookOpen, Award, Download, CalendarDays, Bell, Users, Briefcase, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import VideoPlayer from "@/modules/lessons/components/VideoPlayer";
import UserProfile from "../components/UserProfile";
import RecentActivities from "../components/RecentActivities";
import ModuleProgress from "@/modules/modules-manager/components/ModuleProgress";
import LessonGrid from "@/modules/lessons/components/LessonGrid";
import StudentLayout from "@/app/layouts/StudentLayout";
import StatCard from "@/shared/components/StatCard";
import { useNavigate } from "react-router-dom";
import { useModules } from "@/modules/modules-manager/hooks/useModules";
import { useProgressCalculation } from "@/modules/lessons/hooks/useProgressCalculation";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { ROUTES } from "@/shared/constants/routes";
import { useRecentCertificates } from "@/modules/certificates/hooks/useCertificates";
import { useUpcomingEvents } from "@/modules/events/hooks/useEvents";
import { useRecommendedDownloads } from "@/modules/marketplace/hooks/useDownloads";
import { useUnreadNotificationsCount } from "@/modules/dashboard/hooks/useNotifications";

const SHORTCUTS = [
  { label: 'Certificados', to: ROUTES.certificates, icon: Award },
  { label: 'Downloads', to: ROUTES.downloads, icon: Download },
  { label: 'Eventos', to: ROUTES.events, icon: CalendarDays },
  { label: 'Comunidade', to: ROUTES.community, icon: Users },
  { label: 'Oportunidades', to: ROUTES.opportunities, icon: Briefcase },
];

const Dashboard = () => {
  const [currentLesson, setCurrentLesson] = useState(null);
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();

  const { data: modules, isLoading: modulesLoading, error: modulesError } = useModules();
  const modulesWithProgress = useProgressCalculation(modules);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Usuário';
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR')
    : '';
  const overallProgress = modulesWithProgress.length
    ? Math.round(
        modulesWithProgress.reduce((sum, m) => sum + m.progress, 0) / modulesWithProgress.length
      )
    : 0;

  const profileForCard = {
    name: displayName,
    email: user?.email || '',
    joinDate,
    progress: overallProgress,
  };

  const handleLessonClick = (lesson: { id: string }) => {
    navigate(ROUTES.lesson(lesson.id));
  };

  const firstIncompleteLesson = useMemo(() => {
    for (const module of modulesWithProgress) {
      const next = module.lessons.find((lesson) => !lesson.completed);
      if (next) return next;
    }
    return undefined;
  }, [modulesWithProgress]);

  const { data: unreadNotifications = 0 } = useUnreadNotificationsCount();
  const { data: upcomingEvents } = useUpcomingEvents();
  const nextEvent = upcomingEvents?.[0];
  const { data: recentCertificates = [] } = useRecentCertificates(2);
  const { data: recommendedDownloads = [] } = useRecommendedDownloads(2);

  return (
    <StudentLayout>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Olá, {displayName.split(' ')[0]} 👋</h1>
        <Link to={ROUTES.notifications} aria-label="Notificações" className="relative p-2 text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-brand-medium text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </Link>
      </div>
      <p className="text-muted-foreground mb-6">Continue de onde parou e acompanhe seu progresso.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Progresso geral" value={`${overallProgress}%`} icon={Award} />
        <StatCard label="Cursos ativos" value={String(modulesWithProgress.length > 0 ? 1 : 0)} icon={BookOpen} />
        <StatCard
          label="Próximo evento"
          value={nextEvent ? nextEvent.date : '—'}
          delta={nextEvent?.title}
          icon={CalendarDays}
        />
      </div>

      {firstIncompleteLesson && (
        <Link
          to={ROUTES.lesson(firstIncompleteLesson.id)}
          className="rounded-lg border border-brand-medium/30 bg-brand-medium/5 p-4 mb-6 flex items-center justify-between hover:border-brand-medium/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <PlayCircle className="w-5 h-5 text-brand-medium" />
            <div>
              <p className="text-sm text-muted-foreground">Continuar assistindo</p>
              <p className="font-medium">{firstIncompleteLesson.title}</p>
            </div>
          </div>
          <Button className="shrink-0">Continuar</Button>
        </Link>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {SHORTCUTS.map(({ label, to, icon: Icon }) => (
          <Link key={to} to={to} className="rounded-lg border border-border bg-card p-4 flex flex-col items-center gap-2 text-center hover:border-brand-medium/50 transition-colors">
            <Icon className="w-5 h-5 text-brand-medium" />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Certificados recentes</h2>
          <div className="space-y-2">
            {recentCertificates.map((cert) => (
              <p key={cert.id} className="text-sm">{cert.courseTitle} — <span className="text-muted-foreground">{cert.status === 'emitido' ? cert.issuedAt : 'pendente'}</span></p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Downloads recomendados</h2>
          <div className="space-y-2">
            {recommendedDownloads.map((dl) => (
              <p key={dl.id} className="text-sm">{dl.title} — <span className="text-muted-foreground">{dl.category}</span></p>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
          <UserProfile user={profileForCard} />
          <RecentActivities />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="aulas" className="space-y-6">
            <TabsList>
              <TabsTrigger value="aulas">
                <BookOpen className="w-4 h-4 mr-2" />
                Aulas
              </TabsTrigger>
              <TabsTrigger value="progresso">
                <Award className="w-4 h-4 mr-2" />
                Progresso
              </TabsTrigger>
            </TabsList>

            <TabsContent value="aulas" className="space-y-6">
              {modulesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-medium" />
                </div>
              ) : modulesError ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Não foi possível carregar suas aulas agora.</p>
                  <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
                </div>
              ) : currentLesson ? (
                <div className="space-y-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentLesson(null)}
                    className="border-border bg-transparent hover:bg-white/10"
                  >
                    ← Voltar às aulas
                  </Button>
                  <VideoPlayer lesson={currentLesson} />
                </div>
              ) : (
                <LessonGrid modules={modulesWithProgress} onLessonClick={handleLessonClick} />
              )}
            </TabsContent>

            <TabsContent value="progresso" className="space-y-6">
              <ModuleProgress modules={modulesWithProgress} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
