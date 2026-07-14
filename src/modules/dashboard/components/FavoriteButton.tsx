import { useState } from "react";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { useFavorites } from "@/modules/dashboard/hooks/useFavorites";
import { studentService } from "@/modules/dashboard/services/student.service";
import type { FavoriteTargetType } from "@/modules/dashboard/types/favorite.types";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import { useToast } from "@/shared/hooks/use-toast";

interface FavoriteButtonProps {
  type: FavoriteTargetType;
  targetId: string;
  className?: string;
}

const FavoriteButton = ({ type, targetId, className }: FavoriteButtonProps) => {
  const { user } = useAuthContext();
  const { data: favorites } = useFavorites(!!user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const favorite = favorites?.find((item) => item.type === type && item.targetId === targetId);

  const toggle = async () => {
    if (!user) {
      navigate(ROUTES.login);
      return;
    }
    setSaving(true);
    try {
      if (favorite) await studentService.removeFavorite(favorite.id);
      else await studentService.addFavorite(type, targetId);
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({ title: favorite ? "Removido dos favoritos" : "Adicionado aos favoritos" });
    } catch (error) {
      toast({ title: "Não foi possível atualizar", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={className}
      disabled={saving}
      aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-pressed={!!favorite}
      onClick={() => void toggle()}
    >
      <Heart className={`h-4 w-4 ${favorite ? "fill-brand-medium text-brand-medium" : ""}`} />
    </Button>
  );
};

export default FavoriteButton;
