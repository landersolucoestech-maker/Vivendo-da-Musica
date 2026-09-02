import { Star, Users } from 'lucide-react';

import { useInstructors } from '@/modules/courses/hooks/useInstructors';
import UserAvatar from '@/shared/components/UserAvatar';

const InstructorsSection = () => {
  const { data: instructors, isLoading } = useInstructors();
  const visibleInstructors = instructors?.filter((instructor) => instructor.coursesCount > 0) ?? [];

  return (
    <section className="bg-[#0A0A0A] py-20">
      <div className="vdm-container">
        <div className="mb-8 max-w-3xl">
          <p className="vdm-eyebrow">Experiência de mercado</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Aprenda com quem faz</h2>
          <p className="vdm-page-description">Conheça os profissionais responsáveis pelos cursos publicados na plataforma.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="vdm-surface h-72 animate-pulse bg-white/[0.035]" />)}
          </div>
        ) : visibleInstructors.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleInstructors.map((instructor) => (
              <article key={instructor.id} className="vdm-surface-interactive p-6">
                <div className="mb-5 flex items-center gap-4">
                  <UserAvatar name={instructor.name} size="lg" />
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-white">{instructor.name}</h3>
                    <p className="mt-1 text-sm text-primary">
                      {instructor.coursesCount} curso{instructor.coursesCount === 1 ? '' : 's'} publicado{instructor.coursesCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {instructor.bio ? (
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{instructor.bio}</p>
                ) : null}

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/8 pt-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-sm font-semibold text-white">
                      {instructor.rating > 0 ? (
                        <>
                          <Star className="size-4 fill-amber-400 text-amber-400" />
                          {instructor.rating}
                        </>
                      ) : '—'}
                    </div>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Avaliação</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-sm font-semibold text-white">
                      <Users className="size-4 text-primary" />
                      {instructor.studentsCount.toLocaleString('pt-BR')}
                    </div>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Alunos</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{instructor.coursesCount}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Cursos</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="vdm-surface py-14 text-center">
            <p className="text-sm text-muted-foreground">Os instrutores serão apresentados quando houver cursos publicados.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default InstructorsSection;
