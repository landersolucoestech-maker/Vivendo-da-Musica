import { BookOpen, Download, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';

import StudentLayout from '@/app/layouts/StudentLayout';
import PageHeader from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/constants/routes';

const librarySections = [
  {
    title: 'Meus cursos',
    description: 'Acesse os cursos vinculados às suas matrículas e compras confirmadas.',
    href: ROUTES.myCourses,
    action: 'Abrir meus cursos',
    icon: BookOpen,
  },
  {
    title: 'Downloads',
    description: 'Baixe produtos digitais, materiais e arquivos liberados pelas suas compras e licenças.',
    href: ROUTES.downloads,
    action: 'Abrir downloads',
    icon: Download,
  },
  {
    title: 'Pedidos',
    description: 'Consulte o histórico das aquisições responsáveis pelos seus acessos.',
    href: ROUTES.orders,
    action: 'Ver pedidos',
    icon: ReceiptText,
  },
] as const;

const LibraryPage = () => (
  <StudentLayout>
    <PageHeader
      title="Biblioteca"
      subtitle="Seus cursos, produtos digitais, materiais e licenças ficam organizados conforme as compras e acessos confirmados."
    />

    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {librarySections.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.href} className="flex min-h-56 flex-col">
            <CardHeader>
              <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild className="w-full">
                <Link to={section.href}>{section.action}</Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </StudentLayout>
);

export default LibraryPage;
