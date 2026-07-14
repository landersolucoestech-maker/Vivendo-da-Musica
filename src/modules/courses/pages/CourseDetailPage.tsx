import { Link, useParams } from "react-router-dom";
import { Star, Users, PlayCircle, CheckCircle, Lock, Clock } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Button } from "@/shared/components/ui/button";
import LoadingState from "@/shared/components/LoadingState";
import ErrorState from "@/shared/components/ErrorState";
import EmptyState from "@/shared/components/EmptyState";
import CourseCard from "@/modules/courses/components/CourseCard";
import AcademyContentDetail from "@/modules/courses/components/AcademyContentDetail";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { useCart } from "@/modules/checkout/store/CartContext";
import { useToast } from "@/shared/hooks/use-toast";
import { useCourses } from "@/modules/courses/hooks/useCourses";
import { useModules } from "@/modules/modules-manager/hooks/useModules";
import { useProgressCalculation } from "@/modules/lessons/hooks/useProgressCalculation";
import { useCourseExtras } from "@/modules/courses/hooks/useCourseExtras";
import { useCourseCatalogDetail, useRelatedCourses } from "@/modules/courses/hooks/useCourseCatalogDetail";
import { usePublishedAcademyContentBySlug } from "@/modules/courses/hooks/useAcademyContents";
import { useInstructor } from "@/modules/courses/hooks/useInstructors";
import { academyService } from "@/modules/courses/services/academy.service";
import { slugify } from "@/shared/utils/utils";
import type { MockCourse } from "@/modules/courses/types/course.types";
import { formatPriceOrFree as formatPrice } from "@/shared/utils/formatters";

const MockCourseDetail = ({ course }: { course: MockCourse }) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { data: instructor } = useInstructor(course.instructorId);
  const { data: relatedCourses } = useRelatedCourses(course);

  return (
    <PublicLayout>
      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div>
          <p className="text-sm text-brand-medium font-medium mb-2">{course.category} · {course.level}</p>
          <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
          <p className="text-muted-foreground mb-4">{course.description}</p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 flex-wrap">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {course.rating} ({course.reviewCount.toLocaleString('pt-BR')})
            </span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{course.studentsCount.toLocaleString('pt-BR')} alunos</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{course.durationHours}h de conteúdo</span>
          </div>

          {instructor && (
            <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3 mb-8">
              <div
                className="w-12 h-12 rounded-full shrink-0"
                style={{ background: `linear-gradient(135deg, ${instructor.gradientFrom}, ${instructor.gradientTo})` }}
              />
              <div>
                <p className="font-medium">{instructor.name}</p>
                <p className="text-sm text-muted-foreground">{instructor.specialty} · {instructor.studentsCount.toLocaleString('pt-BR')} alunos</p>
              </div>
            </div>
          )}

          <h2 className="text-lg font-semibold mb-4">Conteúdo do curso</h2>
          <div className="space-y-3 mb-8">
            {course.modules.map((module, moduleIndex) => (
              <div key={module.title} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold mb-2">Módulo {moduleIndex + 1}: {module.title}</p>
                <div className="space-y-1">
                  {module.lessons.map((lesson) => (
                    <div key={lesson.title} className="flex items-center justify-between text-sm text-muted-foreground py-1">
                      <span className="flex items-center gap-2">
                        {lesson.free ? <PlayCircle className="w-4 h-4 text-brand-medium" /> : <Lock className="w-3.5 h-3.5" />}
                        {lesson.title}
                      </span>
                      <span>{lesson.durationMinutes} min</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold mb-4">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mb-8">
            {course.faq.map((item, i) => (
              <AccordionItem key={item.question} value={`faq-${i}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <h2 className="text-lg font-semibold mb-4">Avaliações</h2>
          <div className="space-y-3 mb-8">
            {course.reviews.map((review) => (
              <div key={review.author} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{review.author}</p>
                  <span className="flex items-center gap-1 text-sm text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" /> {review.rating}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </div>
            ))}
          </div>

          {!!relatedCourses?.length && (
            <>
              <h2 className="text-lg font-semibold mb-4">Cursos relacionados</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {relatedCourses.map((related) => (
                  <CourseCard key={related.id} course={academyService.mapMockCourseToCard(related)} />
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="rounded-lg border border-border bg-card p-5 sticky top-20">
            <div
              className="aspect-video rounded-lg mb-4"
              style={{ background: `linear-gradient(135deg, ${course.gradientFrom}, ${course.gradientTo})` }}
            />
            <div className="flex items-center gap-2 mb-4">
              <p className="text-2xl font-bold">{formatPrice(course.priceCents, course.currency)}</p>
              {course.originalPriceCents && (
                <p className="text-sm text-muted-foreground line-through">{formatPrice(course.originalPriceCents, course.currency)}</p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                addItem({ kind: "course", id: course.id, title: course.title, priceCents: course.priceCents, currency: course.currency });
                toast({ title: "Adicionado ao carrinho", description: course.title });
              }}
            >
              Matricular-se
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

const RealCourseDetail = ({ slug }: { slug: string }) => {
  const { data: courses, isLoading: coursesLoading, isError: coursesError } = useCourses();
  const { data: modules, isLoading: modulesLoading } = useModules();
  const modulesWithProgress = useProgressCalculation(modules);
  const { data: extras } = useCourseExtras(slug);

  const course = courses?.find((c) => c.slug === slug);

  if (coursesLoading) {
    return <PublicLayout><LoadingState rows={4} className="h-20 rounded-lg" /></PublicLayout>;
  }

  if (coursesError) {
    return <PublicLayout><ErrorState description="Tente novamente em alguns instantes." /></PublicLayout>;
  }

  if (!course) {
    return (
      <PublicLayout>
        <EmptyState
          title="Curso não encontrado"
          description="Esse curso pode ter sido removido ou ainda não foi publicado."
          action={<Link to="/academia"><Button>Ver Academia</Button></Link>}
        />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div>
          <p className="text-sm text-brand-medium font-medium mb-2">{extras?.level}</p>
          <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
          <p className="text-muted-foreground mb-4">{course.description}</p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {extras?.rating} ({extras?.reviewCount})
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {extras?.instructorName}
            </span>
          </div>

          <h2 className="text-lg font-semibold mb-4">Conteúdo do curso</h2>
          {modulesLoading ? (
            <LoadingState rows={3} className="h-14 rounded-lg" />
          ) : modulesWithProgress.length === 0 ? (
            <EmptyState title="Currículo em preparação" description="As aulas deste curso serão publicadas em breve." />
          ) : (
            <div className="space-y-3">
              {modulesWithProgress.map((module, moduleIndex) => (
                <div key={module.id} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm font-semibold mb-2">Módulo {moduleIndex + 1}: {module.title}</p>
                  <div className="space-y-1">
                    {module.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        to={`/academia/${course.slug}/aulas/${slugify(lesson.title)}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-1.5"
                      >
                        {lesson.completed ? (
                          <CheckCircle className="w-4 h-4 text-brand-medium shrink-0" />
                        ) : (
                          <PlayCircle className="w-4 h-4 shrink-0" />
                        )}
                        {lesson.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="rounded-lg border border-border bg-card p-5 sticky top-20">
            <div className="aspect-video rounded-lg bg-gradient-brand mb-4 overflow-hidden">
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              )}
            </div>
            <p className="text-2xl font-bold mb-4">{formatPrice(course.price_cents, course.currency)}</p>
            {modulesWithProgress.length > 0 ? (
              <Link to={`/aula/${modulesWithProgress[0]?.lessons[0]?.id}`}>
                <Button className="w-full">Começar curso</Button>
              </Link>
            ) : (
              <Button className="w-full" disabled>
                <Lock className="w-4 h-4 mr-2" />
                Em breve
              </Button>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

const CourseDetailPage = () => {
  const { courseSlug } = useParams();
  const { data: mockCourse, isLoading } = useCourseCatalogDetail(courseSlug);
  const { data: academyContent, isLoading: contentLoading } = usePublishedAcademyContentBySlug(courseSlug);

  if (isLoading || contentLoading) {
    return <PublicLayout><LoadingState rows={4} className="h-20 rounded-lg" /></PublicLayout>;
  }

  if (mockCourse) return <MockCourseDetail course={mockCourse} />;
  if (academyContent) {
    return (
      <PublicLayout>
        <AcademyContentDetail content={academyContent} />
      </PublicLayout>
    );
  }
  return <RealCourseDetail slug={courseSlug!} />;
};

export default CourseDetailPage;
