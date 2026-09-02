import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Clock, Lock, PlayCircle, Star, Users } from 'lucide-react';

import PublicLayout from '@/app/layouts/PublicLayout';
import AcademyContentDetail from '@/modules/courses/components/AcademyContentDetail';
import CourseCard from '@/modules/courses/components/CourseCard';
import { usePublishedAcademyContentBySlug } from '@/modules/courses/hooks/useAcademyContents';
import { useCourseCatalogDetail, useRelatedCourses } from '@/modules/courses/hooks/useCourseCatalogDetail';
import { useCourseExtras } from '@/modules/courses/hooks/useCourseExtras';
import { useCourses } from '@/modules/courses/hooks/useCourses';
import { useInstructor } from '@/modules/courses/hooks/useInstructors';
import { academyService } from '@/modules/courses/services/academy.service';
import type { MockCourse } from '@/modules/courses/types/course.types';
import { useCart } from '@/modules/checkout/store/CartContext';
import { useProgressCalculation } from '@/modules/lessons/hooks/useProgressCalculation';
import { useCourseModules } from '@/modules/modules-manager/hooks/useModules';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPriceOrFree as formatPrice } from '@/shared/utils/formatters';
import { slugify } from '@/shared/utils/utils';

const formatStudentCount = (count: number) =>
  `${count.toLocaleString('pt-BR')} ${count === 1 ? 'aluno' : 'alunos'}`;

const MockCourseDetail = ({ course }: { course: MockCourse }) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { data: instructor } = useInstructor(course.instructorId);
  const { data: relatedCourses } = useRelatedCourses(course);

  return (
    <PublicLayout>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="mb-2 text-sm font-medium text-brand-medium">{course.category} · {course.level}</p>
          <h1 className="mb-3 text-3xl font-bold">{course.title}</h1>
          <p className="mb-4 text-muted-foreground">{course.description}</p>

          <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {course.reviewCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {course.rating} ({course.reviewCount.toLocaleString('pt-BR')})
              </span>
            )}
            <span className="flex items-center gap-1"><Users className="size-4" />{formatStudentCount(course.studentsCount)}</span>
            <span className="flex items-center gap-1"><Clock className="size-4" />{course.durationHours}h de conteúdo</span>
          </div>

          {instructor && (
            <div className="mb-8 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <div
                className="size-12 shrink-0 rounded-full"
                style={{ background: `linear-gradient(135deg, ${instructor.gradientFrom}, ${instructor.gradientTo})` }}
              />
              <div>
                <p className="font-medium">{instructor.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[instructor.specialty, formatStudentCount(instructor.studentsCount)].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          )}

          <h2 className="mb-4 text-lg font-semibold">Conteúdo do curso</h2>
          <div className="mb-8 space-y-3">
            {course.modules.map((module, moduleIndex) => (
              <div key={module.title} className="rounded-lg border border-border bg-card p-4">
                <p className="mb-2 text-sm font-semibold">Módulo {moduleIndex + 1}: {module.title}</p>
                <div className="space-y-1">
                  {module.lessons.map((lesson) => (
                    <div key={lesson.title} className="flex items-center justify-between py-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        {lesson.free ? <PlayCircle className="size-4 text-brand-medium" /> : <Lock className="size-3.5" />}
                        {lesson.title}
                      </span>
                      <span>{lesson.durationMinutes} min</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {course.faq.length > 0 && (
            <>
              <h2 className="mb-4 text-lg font-semibold">Perguntas frequentes</h2>
              <Accordion type="single" collapsible className="mb-8">
                {course.faq.map((item, index) => (
                  <AccordionItem key={item.question} value={`faq-${index}`}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          )}

          <h2 className="mb-4 text-lg font-semibold">Avaliações</h2>
          {course.reviews.length === 0 ? (
            <div className="mb-8">
              <EmptyState title="Ainda sem avaliações" description="As avaliações publicadas pelos alunos aparecerão aqui." />
            </div>
          ) : (
            <div className="mb-8 space-y-3">
              {course.reviews.map((review) => (
                <div key={`${review.author}-${review.comment}`} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium">{review.author}</p>
                    <span className="flex items-center gap-1 text-sm text-amber-400">
                      <Star className="size-4 fill-amber-400" /> {review.rating}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          )}

          {!!relatedCourses?.length && (
            <>
              <h2 className="mb-4 text-lg font-semibold">Cursos relacionados</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedCourses.map((related) => (
                  <CourseCard key={related.id} course={academyService.mapMockCourseToCard(related)} />
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="sticky top-20 rounded-lg border border-border bg-card p-5">
            <div
              className="mb-4 aspect-video overflow-hidden rounded-lg"
              style={{ background: `linear-gradient(135deg, ${course.gradientFrom}, ${course.gradientTo})` }}
            >
              {course.thumbnailUrl && (
                <img src={course.thumbnailUrl} alt={course.title} className="size-full object-cover" />
              )}
            </div>
            <div className="mb-4 flex items-center gap-2">
              <p className="text-2xl font-bold">{formatPrice(course.priceCents, course.currency)}</p>
              {course.originalPriceCents && (
                <p className="text-sm text-muted-foreground line-through">{formatPrice(course.originalPriceCents, course.currency)}</p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                addItem({ kind: 'course', id: course.id, title: course.title, priceCents: course.priceCents, currency: course.currency });
                toast({ title: 'Adicionado ao carrinho', description: course.title });
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
  const course = courses?.find((candidate) => candidate.slug === slug);
  const { data: modules, isLoading: modulesLoading } = useCourseModules(course?.id);
  const modulesWithProgress = useProgressCalculation(modules);
  const { data: extras } = useCourseExtras(slug);
  const firstLesson = modulesWithProgress.flatMap((module) => module.lessons)[0];

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
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          {extras?.level && <p className="mb-2 text-sm font-medium text-brand-medium">{extras.level}</p>}
          <h1 className="mb-3 text-3xl font-bold">{course.title}</h1>
          <p className="mb-4 text-muted-foreground">{course.description}</p>

          <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {(extras?.reviewCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {extras?.rating} ({extras?.reviewCount})
              </span>
            )}
            {(extras?.studentsCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Users className="size-4" />
                {formatStudentCount(extras?.studentsCount ?? 0)}
              </span>
            )}
            {extras?.instructorName && <span>Com {extras.instructorName}</span>}
          </div>

          <h2 className="mb-4 text-lg font-semibold">Conteúdo do curso</h2>
          {modulesLoading ? (
            <LoadingState rows={3} className="h-14 rounded-lg" />
          ) : modulesWithProgress.length === 0 ? (
            <EmptyState title="Currículo em preparação" description="As aulas deste curso serão publicadas em breve." />
          ) : (
            <div className="space-y-3">
              {modulesWithProgress.map((module, moduleIndex) => (
                <div key={module.id} className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-semibold">Módulo {moduleIndex + 1}: {module.title}</p>
                  <div className="space-y-1">
                    {module.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        to={`/academia/${course.slug}/aulas/${slugify(lesson.title)}`}
                        className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        {lesson.completed ? (
                          <CheckCircle className="size-4 shrink-0 text-brand-medium" />
                        ) : (
                          <PlayCircle className="size-4 shrink-0" />
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
          <div className="sticky top-20 rounded-lg border border-border bg-card p-5">
            <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-gradient-brand">
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt={course.title} className="size-full object-cover" />
              )}
            </div>
            <p className="mb-4 text-2xl font-bold">{formatPrice(course.price_cents, course.currency)}</p>
            {firstLesson ? (
              <Link to={`/aula/${firstLesson.id}`}>
                <Button className="w-full">Começar curso</Button>
              </Link>
            ) : (
              <Button className="w-full" disabled>
                <Lock className="mr-2 size-4" />
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
