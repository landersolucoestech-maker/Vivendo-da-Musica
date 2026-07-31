import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Phone, Sparkles, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ROUTES } from '@/shared/constants/routes';
import { useToast } from '@/shared/hooks/use-toast';
import { registerSchema } from '@/shared/validations/authSchemas';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      toast({ title: 'Dados inválidos', description: result.error.issues[0].message, variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      await supabase.auth.signOut();
      const { data, error } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: result.data.name, phone: result.data.phone || '' },
        },
      });

      if (error) {
        const description =
          error.message.includes('already registered') || error.message.includes('User already registered')
            ? 'Este e-mail já está cadastrado. Tente fazer login.'
            : error.message.includes('Password should be at least')
              ? 'A senha não atende ao tamanho mínimo exigido.'
              : error.message.includes('Invalid email')
                ? 'Informe um endereço de e-mail válido.'
                : error.message.includes('weak password')
                  ? 'A senha informada é muito fraca.'
                  : 'Não foi possível concluir o cadastro.';
        toast({ title: 'Cadastro não concluído', description, variant: 'destructive' });
        return;
      }

      if (data.user) {
        toast({ title: 'Conta criada', description: 'Verifique seu e-mail para confirmar o cadastro.' });
        navigate(ROUTES.verifyEmail, { state: { email: result.data.email } });
      }
    } catch {
      toast({ title: 'Erro inesperado', description: 'Tente novamente em alguns instantes.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
      <div className="absolute -left-36 bottom-0 size-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -right-32 top-0 size-96 rounded-full bg-[#6C3AED]/14 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-r border-white/10 bg-black/25 px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-20">
          <BrandSignature size="lg" />

          <div className="max-w-lg">
            <span className="vdm-icon-button mb-6 size-12 border-primary/30 bg-primary/15 text-primary">
              <Sparkles className="size-6" />
            </span>
            <p className="vdm-eyebrow">Comece sua jornada</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-[1.08] tracking-[-0.05em] text-white">
              Transforme conhecimento musical em evolução profissional.
            </h1>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              Crie sua conta para acessar cursos, materiais, certificados, produtos e recursos exclusivos da plataforma.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">Ambiente seguro, organizado e preparado para seu desenvolvimento.</p>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-xl">
            <Link to={ROUTES.home} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-white lg:hidden">
              <ArrowLeft className="size-4" />
              Voltar para a página inicial
            </Link>

            <div className="mb-7 lg:hidden">
              <BrandSignature size="lg" />
            </div>

            <Card className="border-white/12 bg-card/95 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <CardHeader className="space-y-2 pb-5">
                <p className="vdm-eyebrow">Nova conta</p>
                <CardTitle className="text-3xl">Matricule-se</CardTitle>
                <CardDescription className="text-sm leading-6">
                  Preencha os dados abaixo para criar seu acesso à plataforma.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="name" value={formData.name} onChange={(event) => handleInputChange('name', event.target.value)} className="pl-9" placeholder="Seu nome completo" autoComplete="name" required disabled={isLoading} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="email" type="email" value={formData.email} onChange={(event) => handleInputChange('email', event.target.value)} className="pl-9" placeholder="seu@email.com" autoComplete="email" required disabled={isLoading} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="phone" type="tel" value={formData.phone} onChange={(event) => handleInputChange('phone', event.target.value)} className="pl-9" placeholder="(00) 00000-0000" autoComplete="tel" disabled={isLoading} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(event) => handleInputChange('password', event.target.value)} className="pl-9 pr-10" placeholder="Mínimo de 8 caracteres" autoComplete="new-password" minLength={8} required disabled={isLoading} />
                      <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-white" disabled={isLoading}>
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(event) => handleInputChange('confirmPassword', event.target.value)} className="pl-9 pr-10" placeholder="Repita sua senha" autoComplete="new-password" required disabled={isLoading} />
                      <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-white" disabled={isLoading}>
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4 sm:col-span-2">
                    <Checkbox id="terms" checked={formData.acceptTerms} onCheckedChange={(checked) => handleInputChange('acceptTerms', checked === true)} disabled={isLoading} />
                    <Label htmlFor="terms" className="text-sm font-normal leading-6 text-muted-foreground">
                      Declaro que li e aceito os <Link to="/termos" className="link-vdm">Termos de Uso</Link> e a <Link to="/privacidade" className="link-vdm">Política de Privacidade</Link>.
                    </Label>
                  </div>

                  <Button type="submit" size="lg" className="w-full sm:col-span-2" disabled={!formData.acceptTerms || isLoading}>
                    {isLoading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </form>

                <div className="border-t border-white/8 pt-5 text-center text-sm text-muted-foreground">
                  Já possui uma conta?{' '}
                  <Link to={ROUTES.login} className="link-vdm font-semibold">Faça login</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Register;
