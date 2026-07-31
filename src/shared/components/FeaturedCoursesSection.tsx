import { Link } from 'react-router-dom';

import CourseCard from '@/modules/courses/components/CourseCard';
import { useFeaturedCourseCards } from '@/modules/courses/hooks/useCourseCards';
import { ROUTES } from '@/shared/constants/routes';

const FeaturedCoursesSection = () => {
  const { data: featured, isLoading } = useFeaturedCourseCards();

  return (
    <section className="bg-background py-20">
      <div className="vdm-container">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="vdm-eyebrow">Formação prática</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Cursos em destaque</h2>
            <p className="vdm-page-description">Aprenda com conteúdos estruturados, aulas objetivas e materiais aplicáveis à sua rotina musical.</p>
          </div>
          <Link to={ROUTES.academy} className="link-vdm shrink-0">Explorar academia</Link>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="vdm-surface h-80 animate-pulse bg-white/[0.035]" />)}
          </div>
        ) : featured?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        ) : (
          <div className="vdm-surface py-14 text-center">
            <p className="text-sm text-muted-foreground">Os próximos cursos serão publicados em breve.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedCoursesSection;
