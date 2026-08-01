import { Link } from 'react-router-dom';
import { BookOpen, Lock } from 'lucide-react';

import PublicLayout from '@/app/layouts/PublicLayout';
import { useLibraryItems } from '@/modules/library/hooks/useLibrary';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';

const PublicPremiumLibraryPage = () => {
  const { data: libraryItems } = useLibraryItems();
  const preview = (libraryItems ?? []).slice(0, 9);

  return (
    <PublicLayout>
      <div className="mx-auto mb-10 max-w-xl text-center">
        <p className="vdm-eyebrow">Biblioteca do aluno</p>
        <h1 className="vdm-page-title mt-2">Materiais vinculados às suas compras</h1>
        <p className="vdm-page-description mx-auto">
          Cursos, produtos digitais, beats, licenças e certificados aparecem na biblioteca depois da confirmação do acesso.
        </p>
        <Link to={ROUTES.academy} className="mt-6 inline-flex">
          <Button size="lg"><BookOpen className="size-4" />Explorar cursos</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {preview.map((item) => (
          <div key={item.id} className="vdm-surface relative overflow-hidden p-5">
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Lock className="size-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-primary">{item.type}</span>
            <p className="mt-2 font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.category}</p>
          </div>
        ))}
        {preview.length === 0 && (
          <div className="vdm-surface col-span-full p-8 text-center text-sm text-muted-foreground">
            Nenhum material público disponível para pré-visualização.
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default PublicPremiumLibraryPage;
