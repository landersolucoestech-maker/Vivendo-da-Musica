import { useEffect, useState } from 'react';
import { BookOpen, FileText, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useFavorites } from '@/modules/dashboard/hooks/useFavorites';
import { studentService } from '@/modules/dashboard/services/student.service';
import type { Favorite } from '@/modules/dashboard/types/favorite.types';
import EmptyState from '@/shared/components/EmptyState';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/use-toast';

const TYPE_ICON: Record<Favorite['type'], typeof BookOpen> = {
  curso: BookOpen,
  produto: ShoppingBag,
  conteudo: FileText,
};

const TYPE_LABEL: Record<Favorite['type'], string> = {
  curso: 'Curso',
  produto: 'Produto digital',
  conteudo: 'Conteúdo',
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
    setFavorites((current) => current.filter((favorite) => favorite.id !== id));
    toast({ title: 'Favorito removido', description: 'O item não aparece mais na sua lista.' });
  };

  return (
    <StudentLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Biblioteca pessoal</p>
        <h1 className="vdm-page-title mt-2">Favoritos</h1>
        <p className="vdm-page-description">Acesse rapidamente cursos, produtos e conteúdos que você salvou.</p>
      </header>

      {favorites.length === 0 ? (
        <EmptyState icon={Heart} title="Nenhum favorito salvo" description="Use o botão de favorito nos cursos, produtos e conteúdos para reuni-los aqui." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((favorite) => {
            const Icon = TYPE_ICON[favorite.type];
            return (
              <article key={favorite.id} className="vdm-surface-interactive flex min-h-56 flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {TYPE_LABEL[favorite.type]}
                  </span>
                </div>

                <div className="mt-6 flex-1">
                  <Link to={favorite.href} className="font-display text-lg font-semibold leading-snug text-white transition hover:text-[#caa7ff]">
                    {favorite.title}
                  </Link>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{favorite.meta}</p>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-white/8 pt-4">
                  <Link to={favorite.href} className="flex-1">
                    <Button className="w-full">Acessar</Button>
                  </Link>
                  <Button size="icon" variant="outline" aria-label={`Remover ${favorite.title} dos favoritos`} onClick={() => void handleRemove(favorite.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
};

export default FavoritesPage;
