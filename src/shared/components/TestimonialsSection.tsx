import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import UserAvatar from "@/shared/components/UserAvatar";
import { useTestimonials } from "@/modules/courses/hooks/useTestimonials";
import { ROUTES } from "@/shared/constants/routes";

const TestimonialsSection = () => {
  const { data: testimonials } = useTestimonials();

  return (
    <section className="bg-background pb-20">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6 text-center">O que nossos alunos dizem</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(testimonials ?? []).map((testimonial) => (
            <div key={testimonial.studentName} className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: testimonial.rating }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />)}
              </div>
              <p className="text-sm text-muted-foreground flex-1">"{testimonial.text}"</p>
              <div className="flex items-center gap-2 pt-2">
                <UserAvatar name={testimonial.studentName} size="sm" />
                <div>
                  <p className="text-sm font-medium">{testimonial.studentName}</p>
                  <Link to={ROUTES.academyCourse(testimonial.courseSlug)} className="text-xs text-brand-medium hover:underline">
                    {testimonial.courseTitle}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
