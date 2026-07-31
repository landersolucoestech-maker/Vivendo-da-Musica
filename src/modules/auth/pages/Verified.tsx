import { ArrowRight, CheckCircle2, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/constants/routes';

const Verified = () => (
  <main className="vdm-pattern-dots min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg flex-col justify-center">
      <div className="mb-8 flex justify-center"><BrandSignature size="lg" /></div>

      <Card className="border-white/10 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-xl">
        <CardHeader className="space-y-4 border-b border-white/8 pb-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="size-7" />
          </div>
          <div>
            <p className="vdm-eyebrow">Cadastro concluído</p>
            <CardTitle className="mt-2 text-2xl">E-mail verificado</CardTitle>
            <CardDescription className="mt-2 leading-6">
              Sua conta está ativa e pronta para acessar os recursos da plataforma.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="vdm-surface p-5 text-sm leading-6 text-muted-foreground">
            Agora você pode acompanhar cursos, acessar materiais, visualizar pedidos e utilizar os ambientes disponíveis para o seu perfil.
          </div>

          <div className="grid gap-3">
            <Button asChild size="lg" className="w-full">
              <Link to={ROUTES.dashboard}><ArrowRight className="size-4" /> Ir para o portal do aluno</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={ROUTES.login}>Fazer login</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to={ROUTES.home}><Home className="size-4" /> Voltar ao início</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </main>
);

export default Verified;
