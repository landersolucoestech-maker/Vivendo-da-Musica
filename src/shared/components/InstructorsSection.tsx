import { Star, Users } from 'lucide-react';

import { useInstructors } from '@/modules/courses/hooks/useInstructors';

const InstructorsSection = () => {
  const { data: instructors, isLoading } = useInstructors();

  return (
    <section className="bg-[#0A0A0A] py-20">
      <div className="vdm-container">
        <div className="mb-8 max-w-3xl">
          <p className="vdm-eyebrow">Experiência de mercado</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Aprenda com quem faz</h2>
          <p className="vdm-page-description">Instrutores com vivência prática, repertório profissional e conteúdo orientado a resultado.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="vdm-surface h-72 animate-pulse bg-white/[0.035]" />)}
          </div>
        ) : instructors?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {instructors.map((instructor) => (
              <article key={instructor.id} className="vdm-surface-interactive p-6">
                <div className="mb-5 flex items-center gap-4">
                  <div
                    className="size-16 rounded-full border border-white/10 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${instructor.gradientFrom}, ${instructor.gradientTo})` }}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{instructor.name}</h3>
                    <p className="mt-1 text-sm text-primary">{instructor.specialty}</p>
                  </div>
                </div>

                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{instructor.bio}</p>

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/8 pt-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-sm font-semibold text-white">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      {instructor.rating}
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
            <p className="text-sm text-muted-foreground">Os instrutores serão publicados em breve.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default InstructorsSection;
