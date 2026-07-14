import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/utils";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

type PageToken = number | 'ellipsis';

function buildPageTokens(current: number, total: number): PageToken[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const tokens: PageToken[] = [1];

  if (current > 3) tokens.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page++) tokens.push(page);

  if (current < total - 2) tokens.push('ellipsis');

  tokens.push(total);

  return tokens;
}

const PaginationControls = ({ currentPage, totalPages, onPageChange, className }: PaginationControlsProps) => {
  if (totalPages <= 1) return null;

  const tokens = buildPageTokens(currentPage, totalPages);

  return (
    <nav aria-label="Paginação" className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Anterior</span>
      </Button>

      <span className="sm:hidden text-sm text-muted-foreground px-1" aria-live="polite">
        Página {currentPage} de {totalPages}
      </span>

      <div className="hidden sm:flex items-center gap-1">
        {tokens.map((token, i) =>
          token === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1.5 text-muted-foreground text-sm select-none"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={token}
              type="button"
              onClick={() => onPageChange(token)}
              aria-current={token === currentPage ? 'page' : undefined}
              aria-label={`Página ${token}`}
              className={cn(
                "h-9 min-w-9 px-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                token === currentPage
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {token}
            </button>
          )
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Próxima página"
      >
        <span className="hidden sm:inline">Próxima</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </nav>
  );
};

export default PaginationControls;
