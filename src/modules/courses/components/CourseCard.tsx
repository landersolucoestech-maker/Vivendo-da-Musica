import { Download, FileText, Music2, PlayCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

import FavoriteButton from '@/modules/dashboard/components/FavoriteButton';
import type { CatalogCourse } from '@/modules/courses/types/course.types';
import { ROUTES } from '@/shared/constants/routes';
import { formatPriceOrFree as formatPrice } from '@/shared/utils/formatters';

const CourseCard = ({ course }: { course: CatalogCourse }) => (
  <article className="group relative overflow-hidden rounded-xl border border-white/10 bg-card shadow-[0_16px_40px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-primary/50">
    <Link to={ROUTES.academyCourse(course.slug)} className="flex h-full flex-col">
      <div
        className="relative aspect-video overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${course.gradientFrom}, ${course.gradientTo})` }}
      >
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25 p-5 text-center">
            <Music2 className="size-7 text-white/90" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Vivendo da Música</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
          {course.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {course.itemType === 'academy-content' && (
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Conteúdo da academia</span>
        )}

        <div>
          <h3 className="line-clamp-2 font-display text-lg font-semibold leading-snug text-white transition group-hover:text-[#caa7ff]">
            {course.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Com {course.instructorName}</p>
        </div>

        {course.itemType === 'academy-content' ? (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {course.hasVideo && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
                <PlayCircle className="size-3.5 text-primary" /> Vídeo
              </span>
            )}
            {course.hasWrittenContent && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
                <FileText className="size-3.5 text-primary" /> Texto
              </span>
            )}
            {course.hasMaterials && (
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
                <Download className="size-3.5 text-primary" /> Materiais
              </span>
            )}
          </div>
        ) : course.reviewCount > 0 ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-white">{course.rating}</span>
            <span className="text-muted-foreground">({course.reviewCount})</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ainda sem avaliações</p>
        )}

        <div className="mt-auto flex items-end justify-between border-t border-white/8 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {course.itemType === 'academy-content' ? 'Disponível agora' : 'Investimento'}
            </p>
            <p className="mt-1 font-display text-lg font-bold text-primary">
              {course.itemType === 'academy-content' ? 'Acessar conteúdo' : formatPrice(course.priceCents, course.currency)}
            </p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/12 text-primary transition group-hover:bg-primary group-hover:text-white">
            <PlayCircle className="size-4" />
          </span>
        </div>
      </div>
    </Link>

    {course.isReal && (
      <FavoriteButton
        type={course.itemType === 'academy-content' ? 'conteudo' : 'curso'}
        targetId={course.id}
        className="absolute right-3 top-3 z-10 border border-white/15 bg-black/65 text-white backdrop-blur hover:bg-primary"
      />
    )}
  </article>
);

export default CourseCard;
