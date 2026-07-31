import { useState } from 'react';
import { CheckCircle2, Home, Mail, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { ROUTES } from '@/shared/constants/routes';
import { useToast } from '@/shared/hooks/use-toast';

const STEPS = [
  'Abra sua caixa de entrada.',
  'Verifique também a pasta de spam.',
  'Clique no link de confirmação.',
  'Retorne à plataforma e faça login.',
];

const VerifyEmail = () => {
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const [email, setEmail] = useState(stateEmail || '');
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    if (!email) {
      toast({ title: 'E-mail obrigatório', description: 'Informe o endereço utilizado no cadastro.', variant: 'destructive' });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        toast({ title: 'Não foi possível reenviar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'E-mail reenviado', description: 'Verifique sua caixa de entrada e a pasta de spam.' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="vdm-pattern-dots min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl flex-col justify-center">
        <div className="mb-8 flex justify-center"><BrandSignature size="lg" /></div>

        <Card className="border-white/10 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-xl">
          <CardHeader className="space-y-4 border-b border-white/8 pb-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-primary/25 bg-primary/12 text-primary">
              <Mail className="size-6" />
            </div>
            <div>
              <p className="vdm-eyebrow">Confirmação de cadastro</p>
              <CardTitle className="mt-2 text-2xl">Verifique seu e-mail</CardTitle>
              <CardDescription className="mt-2 leading-6">
                Enviamos um link de confirmação para ativar sua conta na plataforma.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="vdm-surface p-5">
              <p className="mb-4 text-sm font-semibold text-white">Próximos passos</p>
              <ol className="space-y-3">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {!stateEmail && (
              <div className="space-y-2">
                <label htmlFor="verify-email" className="text-sm font-medium text-white">E-mail utilizado no cadastro</label>
                <Input id="verify-email" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            )}

            {stateEmail && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/8 p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="size-5 shrink-0 text-primary" />
                Mensagem enviada para <span className="font-medium text-white">{stateEmail}</span>
              </div>
            )}

            <div className="grid gap-3">
              <Button onClick={handleResendEmail} disabled={isResending} size="lg" className="w-full">
                {isResending ? <RefreshCw className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {isResending ? 'Reenviando...' : 'Reenviar e-mail'}
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link to={ROUTES.login}>Já confirmei — Fazer login</Link>
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to={ROUTES.home}><Home className="size-4" /> Voltar ao início</Link>
              </Button>
            </div>

            <p className="border-t border-white/8 pt-5 text-center text-xs leading-5 text-muted-foreground">
              O recebimento pode levar alguns minutos. Não compartilhe o link de confirmação com terceiros.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default VerifyEmail;
