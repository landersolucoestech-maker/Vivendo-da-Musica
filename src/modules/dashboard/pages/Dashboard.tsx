import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, Bell, BookOpen, Briefcase, Download, PlayCircle, Users } from 'lucide-react';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useRecentCertificates } from '@/modules/certificates/hooks/useCertificates';
import { useUnreadNotificationsCount } from '@/modules/dashboard/hooks/useNotifications';
import RecentActivities from '@/modules/dashboard/components/RecentActivities';
import UserProfile from '@/modules/dashboard/components/UserProfile';
import LessonGrid from '@/modules/lessons/components/LessonGrid';
import VideoPlayer from '@/modules/lessons/components/VideoPlayer';
import { useProgressCalculation } from '@/modules/lessons/hooks/useProgressCalculation';
import { useRecommendedDownloads } from '@/modules/marketplace/hooks/useDownloads';
import ModuleProgress from '@/modules/modules-manager/components/ModuleProgress';
import { useModules } from '@/modules/modules-manager/hooks/useModules';
import StatCard from '@/shared/components/StatCard';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ROUTES } from '@/shared/constants/routes';

const SHORTCUTS = [
  { label: 'Certificados', to: ROUTES.certificates, icon: Award },
  { label: 'Downloads', to: ROUTES.downloads, icon: Download },
  { label: 'Comunidade', to: ROUTES.community, icon: Users },
  { label: 'Oportunidades', to: ROUTES.opportunities, icon: Briefcase },
];

const Dashboard = () => {
  const [currentLesson, setCurrentLesson] = useState<null | { id: string }>(null);
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();

  const { data: modules, isLoading: modulesLoading, error: modulesError } = useModules();
  const modulesWithProgress = useProgressCalculation(modules);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Estudante';
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '';
  const overallProgress = modulesWithProgress.length
    ? Math.round(
        modulesWithProgress.reduce((sum, module) => sum + module.progress, 0) /
          modulesWithProgress.length,
      )
    : 0;

  const completedLessons = modulesWithProgress.reduce(
    (total, module) => total + module.lessons.filter((lesson) => lesson.completed).length,
    0,
  );
  const totalLessons = modulesWithProgress.reduce((total, module) => total + module.lessons.length, 0);

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
  const { data: recentCertificates = [] } = useRecentCertificates(2);
  const { data: recommendedDownloads = [] } = useRecommendedDownloads(2);

  return (
    <StudentLayout>
      <section className="vdm-pattern-dots -mx-4 -mt-6 mb-8 border-b border-white/10 px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="vdm-eyebrow">Portal do aluno</p>
            <h1 className="vdm-page-title mt-2">Olá, {displayName.split(' ')[0]}.</h1>
            <p className="vdm-page-description">
              Continue seu aprendizado, acompanhe o progresso e acesse seus materiais.
            </p>
          </div>

          <Link
            to={ROUTES.notifications}
            aria-label="Notificações"
            className="vdm-icon-button relative self-start md:self-auto"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gradient-brand text-[10px] font-bold text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
        </div>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Progresso geral" value={`${overallProgress}%`} icon={Award} />
        <StatCard label="Cursos ativos" value={String(modulesWithProgress.length > 0 ? 1 : 0)} icon={BookOpen} />
        <StatCard label="Aulas concluídas" value={`${completedLessons}/${totalLessons}`} icon={PlayCircle} />
        <StatCard label="Certificados" value={String(recentCertificates.length)} icon={Award} />
      </div>

      {firstIncompleteLesson && (
        <div className="vdm-surface-interactive mb-8 flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="vdm-icon-button border-primary/30 bg-primary/15 text-primary">
              <PlayCircle className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Continuar assistindo</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">{firstIncompleteLesson.title}</p>
            </div>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to={ROUTES.lesson(firstIncompleteLesson.id)}>Continuar aula</Link>
          </Button>
        </div>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="vdm-eyebrow">Acesso rápido</p>
            <h2 className="mt-1 text-xl font-semibold">Sua área de aprendizado</h2>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map(({ label, to, icon: Icon }) => (
            <Link key={to} to={to} className="vdm-surface-interactive flex items-center gap-3 p-4">
              <span className="vdm-icon-button size-10 border-primary/25 bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-semibold text-white">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <section className="vdm-surface p-5 sm:p-6">
          <div className="mb-4">
            <p className="vdm-eyebrow">Conquistas</p>
            <h2 className="mt-1 text-lg font-semibold">Certificados recentes</h2>
          </div>
          <div className="space-y-3">
            {recentCertificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum certificado emitido até o momento.</p>
            ) : (
              recentCertificates.map((certificate) => (
                <div key={certificate.id} className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-white">{certificate.courseTitle}</p>
                  <span className="text-xs text-muted-foreground">
                    {certificate.status === 'emitido' ? certificate.issuedAt : 'Pendente'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="vdm-surface p-5 sm:p-6">
          <div className="mb-4">
            <p className="vdm-eyebrow">Materiais</p>
            <h2 className="mt-1 text-lg font-semibold">Downloads recomendados</h2>
          </div>
          <div className="space-y-3">
            {recommendedDownloads.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum material recomendado no momento.</p>
            ) : (
              recommendedDownloads.map((download) => (
                <div key={download.id} className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-white">{download.title}</p>
                  <span className="text-xs text-primary">{download.category}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <aside className="space-y-6">
          <UserProfile user={profileForCard} />
          <RecentActivities />
        </aside>

        <main className="xl:col-span-3">
          <Tabs defaultValue="aulas" className="space-y-6">
            <TabsList className="h-auto rounded-lg border border-white/10 bg-card p-1">
              <TabsTrigger value="aulas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <BookOpen className="size-4" />
                Aulas
              </TabsTrigger>
              <TabsTrigger value="progresso" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Award className="size-4" />
                Progresso
              </TabsTrigger>
            </TabsList>

            <TabsContent value="aulas" className="space-y-6">
              {modulesLoading ? (
                <div className="vdm-surface flex items-center justify-center py-16">
                  <div className="size-9 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
                </div>
              ) : modulesError ? (
                <div className="vdm-surface py-14 text-center">
                  <p className="mb-5 text-sm text-muted-foreground">Não foi possível carregar suas aulas agora.</p>
                  <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
                </div>
              ) : currentLesson ? (
                <div className="space-y-6">
                  <Button variant="outline" onClick={() => setCurrentLesson(null)}>
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
        </main>
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
