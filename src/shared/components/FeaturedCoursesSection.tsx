import { Link } from "react-router-dom";
import CourseCard from "@/modules/courses/components/CourseCard";
import { useFeaturedCourseCards } from "@/modules/courses/hooks/useCourseCards";
import { ROUTES } from "@/shared/constants/routes";

const FeaturedCoursesSection = () => {
  const { data: featured } = useFeaturedCourseCards();

  return (
    <section className="bg-background pb-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Cursos em destaque</h2>
          <Link to={ROUTES.academy} className="text-sm text-brand-medium hover:underline">Ver todos</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(featured ?? []).map((course) => <CourseCard key={course.id} course={course} />)}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCoursesSection;
