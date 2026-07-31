import { ArrowLeft, Home, LockKeyhole, LifeBuoy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/constants/routes';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
      <div className="absolute -left-24 bottom-0 size-80 rounded-full bg-destructive/12 blur-3xl" />

      <div className="relative w-full max-w-xl">
        <div className="mb-7 flex justify-center">
          <BrandSignature size="lg" />
        </div>

        <Card className="border-white/12 bg-card/95 text-center shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <CardHeader className="items-center pb-5">
            <span className="mb-4 flex size-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-red-300">
              <LockKeyhole className="size-8" />
            </span>
            <p className="vdm-eyebrow">Permissão necessária</p>
            <CardTitle className="mt-2 text-3xl">Acesso não autorizado.</CardTitle>
            <CardDescription className="max-w-md text-sm leading-6">
              Seu perfil atual não possui permissão para visualizar esta área. Verifique a conta utilizada ou solicite suporte.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="vdm-surface flex gap-3 p-5 text-left">
              <LifeBuoy className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-white">Acredita que isso é um erro?</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Entre em contato e informe a área acessada e o perfil esperado.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => navigate(-1)}>
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
              <Link to={ROUTES.home}>
                <Button size="lg" className="w-full">
                  <Home className="size-4" />
                  Página inicial
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link to={ROUTES.login} className="link-vdm">Trocar de conta</Link>
              <Link to={ROUTES.contact} className="link-vdm">Falar com o suporte</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AccessDenied;
