import { useEffect, useState } from "react";
import { Heart, BookOpen, ShoppingBag, FileText } from "lucide-react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import EmptyState from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { useFavorites } from "@/modules/dashboard/hooks/useFavorites";
import { studentService } from "@/modules/dashboard/services/student.service";
import type { Favorite } from "@/modules/dashboard/types/favorite.types";
import { Link } from "react-router-dom";

const TYPE_ICON: Record<Favorite['type'], typeof BookOpen> = {
  curso: BookOpen,
  produto: ShoppingBag,
  conteudo: FileText,
};

const FavoritesPage = () => {
  const { toast } = useToast();
  const { data } = useFavorites();
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    if (data) setFavorites(data);
  }, [data]);

  const handleRemove = async (id: string) => {
    await studentService.removeFavorite(id);
    setFavorites((current) => current.filter((f) => f.id !== id));
    toast({ title: "Removido dos favoritos" });
  };

  return (
    <StudentLayout>
      <PageHeader title="Favoritos" subtitle="Cursos, produtos e conteúdos que você salvou." />

      {favorites.length === 0 ? (
        <EmptyState icon={Heart} title="Você ainda não tem favoritos" description="Toque no coração em cursos, produtos ou artigos para salvá-los aqui." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((favorite) => {
            const Icon = TYPE_ICON[favorite.type];
            return (
              <div key={favorite.id} className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
                <Icon className="w-5 h-5 text-brand-medium" />
                <div>
                  <Link to={favorite.href} className="font-medium hover:text-brand-medium">{favorite.title}</Link>
                  <p className="text-sm text-muted-foreground">{favorite.meta}</p>
                </div>
                <Button size="sm" variant="outline" className="border-border mt-auto" onClick={() => handleRemove(favorite.id)}>
                  Remover
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
};

export default FavoritesPage;
