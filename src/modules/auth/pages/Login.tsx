import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Music2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/modules/auth/types/role';
import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ROUTES } from '@/shared/constants/routes';
import { useToast } from '@/shared/hooks/use-toast';
import { getPortalRoute } from '@/shared/utils/portalRoute';
import { loginSchema } from '@/shared/validations/authSchemas';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      toast({ title: 'Erro', description: result.error.issues[0].message, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: result.data.email, password: result.data.password });
      if (error) {
        const description = error.message.includes('Invalid login credentials')
          ? 'E-mail ou senha incorretos.'
          : error.message.includes('Email not confirmed')
            ? 'Confirme seu e-mail antes de acessar a plataforma.'
            : error.message;
        toast({ title: 'Não foi possível entrar', description, variant: 'destructive' });
        return;
      }

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        const role = (profile?.role ?? 'student') as UserRole;
        toast({ title: 'Acesso realizado', description: 'Bem-vindo à plataforma Vivendo da Música.' });
        navigate(getPortalRoute(role));
      }
    } catch {
      toast({ title: 'Erro inesperado', description: 'Tente novamente em alguns instantes.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 vdm-pattern-dots opacity-25" />
      <div className="absolute -left-32 top-1/4 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -right-40 bottom-0 size-[30rem] rounded-full bg-[#6C3AED]/12 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-white/10 bg-black/25 px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-20">
          <BrandSignature size="lg" />
          <div className="max-w-xl">
            <span className="vdm-icon-button mb-6 size-12 border-primary/30 bg-primary/15 text-primary"><Music2 className="size-6" /></span>
            <p className="vdm-eyebrow">Seu próximo nível começa aqui</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-[1.08] tracking-[-0.05em] text-white">Aprenda, pratique, contrate e construa uma carreira na música.</h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-muted-foreground">Acesse o portal correspondente ao seu perfil: aluno, instrutor, produtor, afiliado, empresa ou administração.</p>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Vivendo da Música. Todos os direitos reservados.</p>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <Link to={ROUTES.home} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-white lg:hidden"><ArrowLeft className="size-4" />Voltar para a página inicial</Link>
            <div className="mb-7 lg:hidden"><BrandSignature size="lg" /></div>

            <Card className="border-white/12 bg-card/95 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <CardHeader className="space-y-2 pb-5">
                <p className="vdm-eyebrow">Área de acesso</p>
                <CardTitle className="text-3xl">Entrar na plataforma</CardTitle>
                <CardDescription className="text-sm leading-6">Informe suas credenciais para acessar seu portal.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-9" autoComplete="email" required /></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-9 pr-10" autoComplete="current-password" required />
                      <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-white">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                    </div>
                  </div>
                  <div className="flex justify-end"><Link to={ROUTES.forgotPassword} className="link-vdm text-sm">Esqueceu a senha?</Link></div>
                  <Button type="submit" size="lg" className="w-full" disabled={isLoading}>{isLoading ? 'Entrando...' : 'Entrar'}</Button>
                </form>

                <div className="space-y-3 border-t border-white/8 pt-5 text-center text-sm text-muted-foreground">
                  <p>Ainda não possui uma conta? <Link to={ROUTES.register} className="link-vdm font-semibold">Matricule-se</Link></p>
                  <p>Representa uma empresa? <Link to={ROUTES.companyRegister} className="link-vdm font-semibold">Criar conta empresarial</Link></p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
