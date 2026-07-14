import { Briefcase, CalendarDays, Heart, MapPin, Users } from "lucide-react";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import type { MockOpportunity } from "@/modules/opportunities/types/opportunity.types";

interface OpportunityCardProps {
  opportunity: MockOpportunity;
  actionLabel: string;
  onAction?: (opportunity: MockOpportunity) => void;
  disabled?: boolean;
  onFavorite?: (opportunity: MockOpportunity) => void;
}

const OpportunityCard = ({
  opportunity,
  actionLabel,
  onAction,
  disabled = false,
  onFavorite,
}: OpportunityCardProps) => {
  const isClosed = opportunity.status === 'encerrada';

  return (
    <article className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={opportunity.status} label={isClosed ? 'Encerrada' : 'Aberta'} />
        <div className="flex items-center gap-2">{onFavorite && <button type="button" aria-label={opportunity.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} onClick={() => onFavorite(opportunity)} className={opportunity.isFavorite ? "text-brand-medium" : "text-muted-foreground"}><Heart className={`h-4 w-4 ${opportunity.isFavorite ? "fill-current" : ""}`} /></button>}<span className="text-xs text-muted-foreground flex items-center gap-1">
          <Briefcase className="w-3.5 h-3.5" />
          {opportunity.type}
        </span></div>
      </div>

      <div>
        <h2 className="font-semibold leading-snug">{opportunity.title}</h2>
        <p className="text-sm text-muted-foreground">{opportunity.company}</p>
      </div>

      <div className="grid gap-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {opportunity.location}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          Publicada em {opportunity.postedAt}
        </p>
        <p className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 shrink-0" />
          {opportunity.applicantsCount} candidaturas
        </p>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-3">{opportunity.description}</p>

      <Button
        size="sm"
        className="mt-auto"
        disabled={disabled || isClosed || opportunity.isApplied}
        onClick={() => onAction?.(opportunity)}
      >
        {opportunity.isApplied ? "Candidatura enviada" : actionLabel}
      </Button>
    </article>
  );
};

export default OpportunityCard;
