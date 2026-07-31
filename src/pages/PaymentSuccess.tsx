import { ArrowRight, CheckCircle2, Home, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';

import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/constants/routes';

const PaymentSuccess = () => (
  <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
    <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
    <div className="absolute -left-24 bottom-0 size-80 rounded-full bg-primary/14 blur-3xl" />
    <div className="absolute -right-24 top-0 size-80 rounded-full bg-[#6C3AED]/12 blur-3xl" />

    <div className="relative w-full max-w-xl">
      <div className="mb-7 flex justify-center">
        <BrandSignature size="lg" />
      </div>

      <Card className="border-white/12 bg-card/95 text-center shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <CardHeader className="items-center pb-5">
          <span className="mb-4 flex size-16 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 className="size-8" />
          </span>
          <p className="vdm-eyebrow">Pedido confirmado</p>
          <CardTitle className="mt-2 text-3xl">Pagamento recebido.</CardTitle>
          <CardDescription className="max-w-md text-sm leading-6">
            A confirmação foi registrada. Os itens adquiridos ficam disponíveis conforme o status definitivo do pedido e as regras de entrega de cada produto.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="vdm-surface grid gap-4 p-5 text-left sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Próximo passo</p>
              <p className="mt-2 text-sm font-semibold text-white">Consulte seus pedidos e acessos liberados.</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Comprovante</p>
              <p className="mt-2 text-sm font-semibold text-white">Disponível no detalhe do pedido quando emitido.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link to={ROUTES.orders}>
              <Button size="lg" className="w-full">
                <ReceiptText className="size-4" />
                Ver meus pedidos
              </Button>
            </Link>
            <Link to={ROUTES.dashboard}>
              <Button size="lg" variant="outline" className="w-full">
                Acessar portal
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>

          <Link to={ROUTES.home} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-white">
            <Home className="size-4" />
            Voltar à página inicial
          </Link>
        </CardContent>
      </Card>
    </div>
  </main>
);

export default PaymentSuccess;
