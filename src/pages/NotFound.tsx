import { ArrowLeft, Compass, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import AffiliateReferralRedirectPage from '@/modules/affiliate/pages/AffiliateReferralRedirectPage';
import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/constants/routes';

const NotFound = () => {
  const location = useLocation();
  const referralMatch = location.pathname.match(/^\/ref\/([a-z0-9][a-z0-9-]{2,79})\/?$/i);

  if (referralMatch) {
    return <AffiliateReferralRedirectPage slug={referralMatch[1].toLowerCase()} />;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
      <div className="absolute -right-24 top-0 size-96 rounded-full bg-primary/14 blur-3xl" />

      <div className="relative w-full max-w-xl">
        <div className="mb-7 flex justify-center">
          <BrandSignature size="lg" />
        </div>

        <Card className="border-white/12 bg-card/95 text-center shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <CardHeader className="items-center pb-5">
            <span className="mb-4 flex size-16 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
              <Compass className="size-8" />
            </span>
            <p className="vdm-eyebrow">Erro 404</p>
            <CardTitle className="mt-2 text-3xl">Página não encontrada.</CardTitle>
            <CardDescription className="max-w-md text-sm leading-6">
              O endereço informado não existe, foi removido ou não está disponível neste ambiente.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="vdm-surface p-4 text-left">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Endereço solicitado</p>
              <p className="mt-2 break-all font-mono text-sm text-white">{location.pathname}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" size="lg" variant="outline" className="w-full" onClick={() => window.history.back()}>
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
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default NotFound;
