import { Quote, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useTestimonials } from '@/modules/courses/hooks/useTestimonials';
import UserAvatar from '@/shared/components/UserAvatar';
import { ROUTES } from '@/shared/constants/routes';

const TestimonialsSection = () => {
  const { data: testimonials } = useTestimonials();

  return (
    <section className="border-y border-white/8 bg-[#090909] py-20 sm:py-24">
      <div className="vdm-container py-0">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="vdm-eyebrow">Resultados reais</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            Quem estuda, evolui.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Experiências de alunos que aplicaram o conteúdo na prática.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {(testimonials ?? []).map((testimonial) => (
            <article key={testimonial.studentName} className="vdm-surface flex min-h-64 flex-col p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <Quote className="size-7 text-primary/70" />
                <div className="flex items-center gap-1 text-amber-400" aria-label={`${testimonial.rating} estrelas`}>
                  {Array.from({ length: testimonial.rating }).map((_, index) => (
                    <Star key={index} className="size-3.5 fill-current" />
                  ))}
                </div>
              </div>

              <p className="flex-1 text-sm leading-6 text-[#d4d4d4]">“{testimonial.text}”</p>

              <div className="mt-6 flex items-center gap-3 border-t border-white/8 pt-4">
                <UserAvatar name={testimonial.studentName} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{testimonial.studentName}</p>
                  <Link
                    to={ROUTES.academyCourse(testimonial.courseSlug)}
                    className="mt-0.5 block truncate text-xs text-primary transition hover:text-[#a65af0]"
                  >
                    {testimonial.courseTitle}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
