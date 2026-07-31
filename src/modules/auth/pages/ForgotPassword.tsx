import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ROUTES } from '@/shared/constants/routes';
import { useToast } from '@/shared/hooks/use-toast';
import { forgotPasswordSchema } from '@/shared/validations/authSchemas';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      toast({ title: 'E-mail inválido', description: result.error.issues[0].message, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
        redirectTo: `${window.location.origin}${ROUTES.resetPassword}`,
      });

      if (error) {
        toast({ title: 'Não foi possível enviar', description: error.message, variant: 'destructive' });
        return;
      }

      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="vdm-pattern-dots min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg flex-col justify-center">
        <div className="mb-8 flex justify-center">
          <BrandSignature size="lg" />
        </div>

        <Card className="border-white/10 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-xl">
          <CardHeader className="space-y-3 border-b border-white/8 pb-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-primary/25 bg-primary/12 text-primary">
              {isSubmitted ? <CheckCircle2 className="size-6" /> : <Mail className="size-5" />}
            </div>
            <div>
              <p className="vdm-eyebrow">Recuperação de acesso</p>
              <CardTitle className="mt-2 text-2xl">
                {isSubmitted ? 'E-mail enviado' : 'Redefina sua senha'}
              </CardTitle>
              <CardDescription className="mt-2 leading-6">
                {isSubmitted
                  ? 'Enviamos as instruções para o endereço informado, caso ele esteja cadastrado.'
                  : 'Informe o e-mail da sua conta para receber o link de redefinição.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar instruções'}
                </Button>
              </form>
            ) : (
              <div className="space-y-5 text-center">
                <div className="vdm-surface p-4 text-sm leading-6 text-muted-foreground">
                  Se <span className="font-medium text-white">{email}</span> estiver cadastrado, o link chegará em breve.
                </div>
                <Button onClick={() => setIsSubmitted(false)} variant="outline" className="w-full">
                  Informar outro e-mail
                </Button>
              </div>
            )}

            <div className="border-t border-white/8 pt-5 text-center">
              <Link to={ROUTES.login} className="link-vdm inline-flex items-center gap-2 text-sm font-semibold">
                <ArrowLeft className="size-4" />
                Voltar ao login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ForgotPassword;
