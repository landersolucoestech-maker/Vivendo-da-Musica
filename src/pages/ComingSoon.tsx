import { ArrowLeft, Clock3, GraduationCap, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';

import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/constants/routes';

const ComingSoon = () => (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
    <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
    <div className="absolute -left-20 bottom-0 size-80 rounded-full bg-primary/12 blur-3xl" />

    <div className="relative w-full max-w-lg">
      <div className="mb-7 flex justify-center">
        <BrandSignature size="lg" />
      </div>

      <Card className="border-white/12 bg-card/95 text-center shadow-[0_28px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <CardHeader className="items-center pb-5">
          <span className="mb-4 flex size-16 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10 text-amber-300">
            <Clock3 className="size-8" />
          </span>
          <p className="vdm-eyebrow">Acesso indisponível</p>
          <CardTitle className="mt-2 text-3xl">Este conteúdo ainda não está liberado.</CardTitle>
          <CardDescription className="max-w-md text-sm leading-6">
            A matrícula pode não estar ativa, o conteúdo pode estar em preparação ou a liberação pode depender da confirmação do pedido.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="vdm-surface grid gap-4 p-5 text-left sm:grid-cols-2">
            <div className="flex gap-3">
              <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-white">Verifique seus cursos</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Consulte matrículas e acessos já disponíveis no portal.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <LifeBuoy className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-white">Precisa de ajuda?</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Entre em contato com o suporte pelos canais oficiais.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link to={ROUTES.myCourses}>
              <Button size="lg" className="w-full">Meus cursos</Button>
            </Link>
            <Link to={ROUTES.contact}>
              <Button size="lg" variant="outline" className="w-full">Falar com o suporte</Button>
            </Link>
          </div>

          <Link to={ROUTES.home} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-white">
            <ArrowLeft className="size-4" />
            Voltar à página inicial
          </Link>
        </CardContent>
      </Card>
    </div>
  </main>
);

export default ComingSoon;
