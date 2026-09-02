import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Download,
  Layers3,
  Library,
  Play,
  Sparkles,
  Users,
} from 'lucide-react';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useStudentDashboard } from '@/modules/dashboard/hooks/useStudentDashboard';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { ROUTES } from '@/shared/constants/routes';

const QUICK_ACTIONS = [
  {
    label: 'Meus cursos',
    description: 'Continue suas trilhas',
    to: ROUTES.myCourses,
    icon: BookOpen,
  },
  {
    label: 'Biblioteca',
    description: 'Acesse suas aquisições',
    to: ROUTES.library,
    icon: Library,
  },
  {
    label: 'Comunidade',
    description: 'Converse com outros alunos',
    to: ROUTES.community,
    icon: Users,
  },
  {
    label: 'Oportunidades',
    description: 'Encontre vagas e projetos',
    to: ROUTES.opportunities,
    icon: Briefcase,
  },
];

const Dashboard = () => {
  const {
    activeModule,
    firstIncompleteLesson,
    firstName,
    joinDate,
    modulesWithProgress,
    normalizedProgress,
    recentCertificates,
    recommendedDownloads,
    remainingLessons,
    totalLessons,
    unreadNotifications,
  } = useStudentDashboard();

  return (
    <StudentLayout>
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111111] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-1/3 size-72 rounded-full bg-violet-700/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="size-3.5" />
            Portal do aluno
          </div>

          <Link
            to={ROUTES.notifications}
            aria-label="Abrir notificações"
            className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:border-primary/35 hover:bg-primary/10 hover:text-white"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-4 ring-[#111111]">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
        </div>

        <div className="relative mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="max-w-3xl font-display text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
              Olá, {firstName}. <span className="text-white/45">Vamos continuar sua evolução?</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Acompanhe suas prioridades, retome a próxima aula e acesse rapidamente os recursos mais importantes.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {firstIncompleteLesson ? (
                <Button asChild className="h-11 rounded-xl px-5">
                  <Link to={ROUTES.lesson(firstIncompleteLesson.id)}>
                    <Play className="size-4 fill-current" />
                    Continuar aprendendo
                  </Link>
                </Button>
              ) : (
                <Button asChild className="h-11 rounded-xl px-5">
                  <Link to={ROUTES.academy}>
                    Explorar cursos
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="h-11 rounded-xl border-white/12 bg-white/[0.025] px-5">
                <Link to={ROUTES.myCourses}>Ver meus cursos</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-5 rounded-2xl border border-white/8 bg-black/25 p-4 sm:p-5 lg:min-w-[280px]">
            <div
              className="relative flex size-28 shrink-0 items-center justify-center rounded-full p-2"
              style={{
                background: `conic-gradient(#8A2BE2 ${normalizedProgress * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
              }}
              aria-label={`Progresso geral: ${normalizedProgress}%`}
            >
              <div className="flex size-full flex-col items-center justify-center rounded-full bg-[#111111]">
                <span className="font-display text-2xl font-bold text-white">{normalizedProgress}%</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">concluído</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Progresso geral</p>
              <p className="mt-2 text-sm font-medium text-white">
                {normalizedProgress >= 100 ? 'Trilha concluída' : 'Sua jornada está em andamento'}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {remainingLessons > 0
                  ? `${remainingLessons} aula${remainingLessons === 1 ? '' : 's'} para avançar.`
                  : 'Você concluiu todas as aulas liberadas.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="min-w-0 space-y-6">
          {firstIncompleteLesson ? (
            <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/14 via-[#15111a] to-[#101010] p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15 text-primary">
                    <Play className="size-5 fill-current" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Retome de onde parou</p>
                    <p className="mt-1 text-xs text-white/45">{activeModule?.title ?? 'Sua trilha atual'}</p>
                    <h2 className="mt-2 font-display text-xl font-semibold text-white sm:text-2xl">
                      {firstIncompleteLesson.title}
                    </h2>
                    {activeModule && (
                      <div className="mt-4 flex max-w-xl items-center gap-3">
                        <Progress value={activeModule.progress} className="h-1.5 flex-1" />
                        <span className="text-xs font-semibold text-white">{activeModule.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild className="h-11 shrink-0 rounded-xl px-5">
                  <Link to={ROUTES.lesson(firstIncompleteLesson.id)}>
                    Abrir aula
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-6">
              <div className="flex items-start gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-400">
                  <CheckCircle2 className="size-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-white">Você está em dia com suas aulas.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Explore a Academia para iniciar uma nova trilha.</p>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Atalhos</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-white">Acesso rápido</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {QUICK_ACTIONS.map(({ label, description, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex min-h-32 items-start gap-4 rounded-2xl border border-white/8 bg-[#101010] p-5 transition hover:border-primary/30 hover:bg-primary/[0.06]"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.035] text-white/65 transition group-hover:border-primary/25 group-hover:bg-primary/15 group-hover:text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Abrir
                      <ArrowRight className="size-3.5" />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-white/8 bg-[#101010] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Resumo</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-white">Sua jornada</h2>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Layers3 className="size-5" />
              </span>
            </div>

            <div className="mt-5 divide-y divide-white/8">
              <div className="flex items-center justify-between py-3 first:pt-0">
                <span className="text-sm text-muted-foreground">Módulos disponíveis</span>
                <span className="text-sm font-semibold text-white">{modulesWithProgress.length}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">Total de aulas</span>
                <span className="text-sm font-semibold text-white">{totalLessons}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">Certificados recentes</span>
                <span className="text-sm font-semibold text-white">{recentCertificates.length}</span>
              </div>
              <div className="flex items-center justify-between py-3 last:pb-0">
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" />
                  Membro desde
                </span>
                <span className="text-sm font-semibold capitalize text-white">{joinDate}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 bg-[#101010] p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Conquistas e materiais</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-white">Atualizações recentes</h2>
              </div>
              <Link to={ROUTES.downloads} className="text-xs font-semibold text-primary hover:text-primary/80">
                Ver tudo
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentCertificates.length === 0 && recommendedDownloads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma atualização recente.</p>
                </div>
              ) : (
                <>
                  {recentCertificates.map((certificate) => (
                    <Link
                      key={certificate.id}
                      to={ROUTES.certificates}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 transition hover:border-primary/25 hover:bg-primary/[0.05]"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                        <Award className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-white">{certificate.courseTitle}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">Certificado</span>
                      </span>
                      <ArrowRight className="size-3.5 text-white/25" />
                    </Link>
                  ))}

                  {recommendedDownloads.map((download) => (
                    <Link
                      key={download.id}
                      to={ROUTES.downloads}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 transition hover:border-primary/25 hover:bg-primary/[0.05]"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
                        <Download className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-white">{download.title}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{download.category}</span>
                      </span>
                      <ArrowRight className="size-3.5 text-white/25" />
                    </Link>
                  ))}
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
    </StudentLayout>
  );
};

export default Dashboard;