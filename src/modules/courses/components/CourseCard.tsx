import { Link } from "react-router-dom";
import { Download, FileText, PlayCircle, Star } from "lucide-react";
import FavoriteButton from "@/modules/dashboard/components/FavoriteButton";
import { ROUTES } from "@/shared/constants/routes";
import type { CatalogCourse } from "@/modules/courses/types/course.types";
import { formatPriceOrFree as formatPrice } from "@/shared/utils/formatters";

const CourseCard = ({ course }: { course: CatalogCourse }) => (
  <div className="relative">
    <Link
      to={ROUTES.academyCourse(course.slug)}
      className="rounded-lg border border-border bg-card overflow-hidden hover:border-brand-medium/50 transition-colors flex flex-col"
    >
      <div className="aspect-video relative flex items-center justify-center p-3" style={{ background: `linear-gradient(135deg, ${course.gradientFrom}, ${course.gradientTo})` }}>
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-white/90 font-semibold text-center text-xs uppercase tracking-wide">{course.category}</span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        {course.itemType === 'academy-content' && <span className="text-xs text-brand-medium font-medium">Conteudo da Academia</span>}
        <h3 className="font-semibold leading-snug line-clamp-2">{course.title}</h3>
        <p className="text-sm text-muted-foreground">com {course.instructorName}</p>
        {course.itemType === 'academy-content' ? (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {course.hasVideo && <span className="flex items-center gap-1"><PlayCircle className="w-3.5 h-3.5" />Video</span>}
            {course.hasWrittenContent && <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Texto</span>}
            {course.hasMaterials && <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" />Materiais</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-medium">{course.rating}</span>
            <span className="text-muted-foreground">({course.reviewCount})</span>
          </div>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-bold text-brand-medium">{course.itemType === 'academy-content' ? 'Acessar conteudo' : formatPrice(course.priceCents, course.currency)}</span>
        </div>
      </div>
    </Link>
    {course.isReal && (
      <FavoriteButton
        type={course.itemType === 'academy-content' ? 'conteudo' : 'curso'}
        targetId={course.id}
        className="absolute right-3 top-3 z-10 bg-background/90 backdrop-blur"
      />
    )}
  </div>
);

export default CourseCard;
