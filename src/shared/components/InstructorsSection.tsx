import { Star, Users } from "lucide-react";
import { useInstructors } from "@/modules/courses/hooks/useInstructors";

const InstructorsSection = () => {
  const { data: instructors } = useInstructors();

  return (
  <section className="bg-background pb-20">
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold mb-6">Aprenda com quem faz</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(instructors ?? []).map((instructor) => (
          <div key={instructor.id} className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
            <div
              className="w-14 h-14 rounded-full"
              style={{ background: `linear-gradient(135deg, ${instructor.gradientFrom}, ${instructor.gradientTo})` }}
            />
            <div>
              <p className="font-semibold">{instructor.name}</p>
              <p className="text-sm text-muted-foreground">{instructor.specialty}</p>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{instructor.bio}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{instructor.rating}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{instructor.studentsCount.toLocaleString('pt-BR')} alunos</span>
              <span>{instructor.coursesCount} cursos</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
  );
};

export default InstructorsSection;
