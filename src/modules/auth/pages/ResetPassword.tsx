import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ROUTES } from '@/shared/constants/routes';
import { useToast } from '@/shared/hooks/use-toast';
import { resetPasswordSchema } from '@/shared/validations/authSchemas';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = resetPasswordSchema.safeParse({ password, confirmPassword });

    if (!result.success) {
      toast({ title: 'Senha inválida', description: result.error.issues[0].message, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: result.data.password });
      if (error) {
        toast({ title: 'Não foi possível redefinir', description: error.message, variant: 'destructive' });
        return;
      }

      setIsDone(true);
      toast({ title: 'Senha redefinida', description: 'Sua nova senha já está ativa.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="vdm-pattern-dots min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg flex-col justify-center">
        <div className="mb-8 flex justify-center"><BrandSignature size="lg" /></div>

        <Card className="border-white/10 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-xl">
          <CardHeader className="space-y-3 border-b border-white/8 pb-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-primary/25 bg-primary/12 text-primary">
              {isDone ? <CheckCircle2 className="size-6" /> : <Lock className="size-5" />}
            </div>
            <div>
              <p className="vdm-eyebrow">Segurança da conta</p>
              <CardTitle className="mt-2 text-2xl">{isDone ? 'Senha redefinida' : 'Crie uma nova senha'}</CardTitle>
              <CardDescription className="mt-2 leading-6">
                {isDone ? 'Seu acesso foi atualizado com segurança.' : 'Utilize uma senha forte e diferente das anteriores.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {!isDone ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Mínimo de 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-9 pr-10" autoComplete="new-password" required minLength={8} />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-white" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repita a nova senha" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="pl-9 pr-10" autoComplete="new-password" required />
                    <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-white" aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Redefinir senha'}
                </Button>
              </form>
            ) : (
              <div className="space-y-5 text-center">
                <div className="vdm-surface p-4 text-sm leading-6 text-muted-foreground">
                  A alteração foi concluída. Utilize a nova senha no próximo acesso.
                </div>
                <Button onClick={() => navigate(ROUTES.login)} size="lg" className="w-full">Ir para o login</Button>
              </div>
            )}

            {!isDone && (
              <div className="border-t border-white/8 pt-5 text-center">
                <Link to={ROUTES.login} className="link-vdm inline-flex items-center gap-2 text-sm font-semibold">
                  <ArrowLeft className="size-4" /> Voltar ao login
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ResetPassword;
