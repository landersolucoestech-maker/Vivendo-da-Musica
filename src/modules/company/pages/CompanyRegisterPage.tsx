import { useState } from 'react';
import { ArrowLeft, Building2, Lock, Mail, UserRound } from 'lucide-react';
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

const CompanyRegisterPage = () => {
  const [form, setForm] = useState({ representativeName: '', companyName: '', email: '', password: '', acceptTerms: false });
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (form.representativeName.trim().length < 2 || form.companyName.trim().length < 2 || form.password.length < 8 || !form.acceptTerms) {
      toast({ title: 'Revise os dados', description: 'Preencha os campos obrigatórios, use uma senha de pelo menos 8 caracteres e aceite os documentos legais.', variant: 'destructive' });
      return;
    }

    setBusy(true);
    try {
      await supabase.auth.signOut();
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}${ROUTES.company}`,
          data: {
            full_name: form.representativeName.trim(),
            company_name: form.companyName.trim(),
            account_type: 'company',
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        toast({ title: 'Conta empresarial criada', description: 'Confirme o e-mail para acessar o Portal da Empresa.' });
        navigate(ROUTES.verifyEmail, { state: { email: form.email.trim() } });
      }
    } catch (registrationError) {
      const message = registrationError instanceof Error ? registrationError.message : 'Não foi possível concluir o cadastro.';
      toast({ title: 'Cadastro não concluído', description: message.includes('already registered') ? 'Este e-mail já possui uma conta.' : message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
      <div className="absolute -left-40 bottom-0 size-[32rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -right-32 top-0 size-96 rounded-full bg-[#6C3AED]/14 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-r border-white/10 bg-black/25 px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-20">
          <BrandSignature size="lg" />
          <div className="max-w-lg">
            <span className="vdm-icon-button mb-6 size-12 border-primary/30 bg-primary/15 text-primary"><Building2 className="size-6" /></span>
            <p className="vdm-eyebrow">Contrate pela plataforma</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-[1.08] tracking-[-0.05em] text-white">Encontre profissionais preparados para o mercado da música.</h1>
            <p className="mt-6 text-base leading-8 text-muted-foreground">Publique oportunidades, analise competências e portfólios, organize o processo seletivo e responda aos candidatos em um único ambiente.</p>
          </div>
          <p className="text-xs text-muted-foreground">Perfis empresariais passam por verificação antes da operação definitiva.</p>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-xl">
            <Link to={ROUTES.home} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-white lg:hidden"><ArrowLeft className="size-4" />Voltar para o início</Link>
            <div className="mb-7 lg:hidden"><BrandSignature size="lg" /></div>

            <Card className="border-white/12 bg-card/95 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <CardHeader>
                <p className="vdm-eyebrow">Nova conta empresarial</p>
                <CardTitle className="text-3xl">Cadastrar empresa</CardTitle>
                <CardDescription>Crie o acesso do responsável e o perfil inicial da organização.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="company-name">Nome da empresa</Label><div className="relative"><Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="company-name" className="pl-9" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} required /></div></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="representative-name">Nome do responsável</Label><div className="relative"><UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="representative-name" className="pl-9" value={form.representativeName} onChange={(event) => setForm({ ...form, representativeName: event.target.value })} required /></div></div>
                  <div className="space-y-2"><Label htmlFor="company-email">E-mail profissional</Label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="company-email" type="email" className="pl-9" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div></div>
                  <div className="space-y-2"><Label htmlFor="company-password">Senha</Label><div className="relative"><Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="company-password" type="password" minLength={8} className="pl-9" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></div></div>
                  <div className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4 sm:col-span-2">
                    <Checkbox id="company-terms" checked={form.acceptTerms} onCheckedChange={(checked) => setForm({ ...form, acceptTerms: checked === true })} />
                    <Label htmlFor="company-terms" className="text-sm font-normal leading-6 text-muted-foreground">Declaro que li e aceito os <Link className="link-vdm" to={ROUTES.termsOfUse}>Termos de Uso</Link> e a <Link className="link-vdm" to={ROUTES.privacyPolicy}>Política de Privacidade</Link>.</Label>
                  </div>
                  <Button className="w-full sm:col-span-2" size="lg" type="submit" disabled={busy}>{busy ? 'Criando conta...' : 'Criar conta empresarial'}</Button>
                </form>
                <div className="mt-6 border-t border-white/8 pt-5 text-center text-sm text-muted-foreground">Já possui acesso? <Link className="link-vdm font-semibold" to={ROUTES.login}>Entrar</Link></div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CompanyRegisterPage;
