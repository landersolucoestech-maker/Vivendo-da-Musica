import { FileCheck2, Play, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useCart } from "@/modules/checkout/store/CartContext";
import { ROUTES } from "@/shared/constants/routes";
import { formatPrice } from "@/shared/utils/formatters";
import type { Beat } from "@/modules/marketplace/types/product";
import FavoriteButton from "@/modules/dashboard/components/FavoriteButton";

const BeatCard = ({ beat }: { beat: Beat }) => {
  const { addItem } = useCart();
  const startingLicense = beat.licenses.find((license) => license.available);
  const href = ROUTES.marketplaceBeat(beat.slug);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-brand-medium/50">
      <Link to={href} className="group relative block overflow-hidden">
        <div
          className="relative flex aspect-square items-center justify-center overflow-hidden p-4"
          style={{ background: `linear-gradient(135deg, ${beat.gradientFrom}, ${beat.gradientTo})` }}
        >
          {beat.coverUrl && (
            <img
              src={beat.coverUrl}
              alt={`Capa de ${beat.title}`}
              loading="lazy"
              className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          )}
          <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/10" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
            <Play className="h-5 w-5 fill-white" />
          </div>
        </div>
      </Link>
      <div className="space-y-3 p-3">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <Link to={href} className="text-sm font-semibold hover:text-brand-medium">
              {beat.title}
            </Link>
            {beat.copyrightStatus === "registered" && (
              <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Registro autoral confirmado" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{beat.producerName}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{beat.genre}</Badge>
          <Badge variant="outline">{beat.bpm} BPM</Badge>
          <Badge variant="outline">{beat.key}</Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">A partir de</p>
            <p className="text-sm font-bold text-brand-medium">
              {startingLicense ? formatPrice(startingLicense.priceCents, startingLicense.currency) : "Indisponivel"}
            </p>
          </div>
          <div className="flex gap-2">
            <FavoriteButton type="produto" targetId={beat.id} />
            <Button
              size="icon"
              variant="outline"
              className="shrink-0"
              aria-label={`Adicionar licença de ${beat.title} ao carrinho`}
              disabled={!startingLicense}
              onClick={() => startingLicense && addItem({
                kind: "beat_license",
                id: startingLicense.id,
                title: `${beat.title} - ${startingLicense.name}`,
                priceCents: startingLicense.priceCents,
                currency: startingLicense.currency,
              })}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeatCard;
