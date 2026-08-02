import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  AudioLines,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  Link2,
  Lock,
  Mail,
  Megaphone,
  Phone,
  Presentation,
  User,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import AccountTypeSelector from '@/modules/auth/components/AccountTypeSelector';
import { ACCOUNT_PROFILE_BY_SLUG, ACCOUNT_PROFILE_BY_VALUE } from '@/modules/auth/data/accountProfiles';
import type { AccountProfile, AuthMode } from '@/modules/auth/types/accountProfile';
import type { UserRole } from '@/modules/auth/types/role';
import BrandSignature from '@/shared/components/BrandSignature';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ROUTES } from '@/shared/constants/routes';
import { useToast } from '@/shared/hooks/use-toast';
import { getPortalRoute } from '@/shared/utils/portalRoute';
import { unifiedLoginSchema, unifiedRegisterSchema } from '@/shared/validations/authSchemas';

const PROFILE_ICONS = {
  student: GraduationCap,
  producer: AudioLines,
  instructor: Presentation,
  company: Building2,
  affiliate: Megaphone,
} as const;

interface UnifiedAuthPageProps {
  mode: AuthMode;
}

interface AuthFormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  companyName: string;
  professionalName: string;
  specialty: string;
  experienceYears: string;
  portfolioUrl: string;
  websiteUrl: string;
  channelName: string;
  channelUrl: string;
}

const INITIAL_FORM: AuthFormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
  companyName: '',
  professionalName: '',
  specialty: '',
  experienceYears: '',
  portfolioUrl: '',
  websiteUrl: '',
  channelName: '',
  channelUrl: '',
};

const profileQuery = (profile: AccountProfile) => `?perfil=${ACCOUNT_PROFILE_BY_VALUE.get(profile)?.slug ?? 'aluno'}`;

const UnifiedAuthPage = ({ mode }: UnifiedAuthPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProfile = ACCOUNT_PROFILE_BY_SLUG.get(searchParams.get('perfil') as never)?.value ?? null;
  const [selectedProfile, setSelectedProfile] = useState<AccountProfile | null>(initialProfile);
  const [form, setForm] = useState<AuthFormState>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const definition = useMemo(
    () => selectedProfile ? ACCOUNT_PROFILE_BY_VALUE.get(selectedProfile) ?? null : null,
    [selectedProfile],
  );
  const ProfileIcon = selectedProfile ? PROFILE_ICONS[selectedProfile] : GraduationCap;

  const selectProfile = (profile: AccountProfile) => {
    setSelectedProfile(profile);
    setSearchParams({ perfil: ACCOUNT_PROFILE_BY_VALUE.get(profile)?.slug ?? 'aluno' }, { replace: true });
    setForm(INITIAL_FORM);
  };

  const resetProfile = () => {
    setSelectedProfile(null);
    setSearchParams({}, { replace: true });
    setForm(INITIAL_FORM);
  };

  const updateField = <Key extends keyof AuthFormState>(field: Key, value: AuthFormState[Key]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const login = async (profile: AccountProfile) => {
    const result = unifiedLoginSchema.safeParse({ accountType: profile, email: form.email, password: form.password });
    if (!result.success) throw new Error(result.error.issues[0].message);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });
    if (error) {
      if (error.message.includes('Invalid login credentials')) throw new Error('E-mail ou senha incorretos.');
      if (error.message.includes('Email not confirmed')) throw new Error('Confirme seu e-mail antes de acessar a plataforma.');
      throw error;
    }
    if (!data.user) throw new Error('Não foi possível identificar a conta autenticada.');

    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .single();
    if (profileError || !profileData) {
      await supabase.auth.signOut();
      throw new Error('O perfil desta conta não pôde ser validado.');
    }

    const role = profileData.role as UserRole;
    const staffAccount = role === 'admin' || role === 'super_admin';
    if (!staffAccount && role !== profile) {
      await supabase.auth.signOut();
      const actual = ACCOUNT_PROFILE_BY_VALUE.get(role as AccountProfile)?.label ?? 'outro perfil';
      throw new Error(`Esta conta está cadastrada como ${actual}. Selecione o tipo correto para entrar.`);
    }

    toast({ title: 'Acesso realizado', description: `Bem-vindo ao ${staffAccount ? 'painel administrativo' : definition?.label ?? 'portal'}.` });
    navigate(getPortalRoute(role));
  };

  const register = async (profile: AccountProfile) => {
    const result = unifiedRegisterSchema.safeParse({ accountType: profile, ...form });
    if (!result.success) throw new Error(result.error.issues[0].message);

    await supabase.auth.signOut();
    const account = result.data;
    const metadata = {
      account_type: account.accountType,
      full_name: account.name,
      phone: account.phone,
      company_name: account.accountType === 'company' ? account.companyName : '',
      professional_name: ['producer', 'instructor'].includes(account.accountType) ? account.professionalName : '',
      specialty: ['producer', 'instructor'].includes(account.accountType) ? account.specialty : '',
      experience_years: account.accountType === 'instructor' ? Number(account.experienceYears) : null,
      portfolio_url: ['producer', 'instructor'].includes(account.accountType) ? account.portfolioUrl : '',
      website_url: account.accountType === 'company' ? account.websiteUrl : '',
      channel_name: account.accountType === 'affiliate' ? account.channelName : '',
      channel_url: account.accountType === 'affiliate' ? account.channelUrl : '',
    };

    const { data, error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        emailRedirectTo: `${window.location.origin}${getPortalRoute(account.accountType)}`,
        data: metadata,
      },
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        throw new Error('Este e-mail já possui uma conta.');
      }
      if (error.message.includes('Password should be at least')) throw new Error('A senha não atende ao tamanho mínimo exigido.');
      if (error.message.includes('Invalid email')) throw new Error('Informe um endereço de e-mail válido.');
      throw error;
    }
    if (!data.user) throw new Error('Não foi possível concluir a criação da conta.');

    toast({ title: 'Conta criada', description: 'Verifique seu e-mail para confirmar o cadastro.' });
    navigate(ROUTES.verifyEmail, { state: { email: account.email } });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProfile || busy) return;
    setBusy(true);
    try {
      if (mode === 'login') await login(selectedProfile);
      else await register(selectedProfile);
    } catch (submissionError) {
      toast({
        title: mode === 'login' ? 'Não foi possível entrar' : 'Cadastro não concluído',
        description: submissionError instanceof Error ? submissionError.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!selectedProfile || !definition) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-8 lg:px-12">
        <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
        <div className="absolute -left-36 bottom-0 size-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-32 top-0 size-96 rounded-full bg-[#6C3AED]/14 blur-3xl" />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1500px] flex-col justify-center">
          <div className="mb-8 flex items-center justify-between gap-4">
            <BrandSignature size="lg" />
            <Button asChild variant="ghost" size="sm"><Link to={ROUTES.home}><ArrowLeft className="size-4" />Voltar</Link></Button>
          </div>
          <Card className="border-white/12 bg-card/95 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <AccountTypeSelector mode={mode} onSelect={selectProfile} />
              <div className="mt-8 border-t border-white/8 pt-6 text-center text-sm text-muted-foreground">
                {mode === 'login' ? 'Ainda não possui uma conta?' : 'Já possui uma conta?'}{' '}
                <Link to={mode === 'login' ? ROUTES.register : ROUTES.login} className="link-vdm font-semibold">
                  {mode === 'login' ? 'Criar conta' : 'Entrar'}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const isProfessional = selectedProfile === 'producer' || selectedProfile === 'instructor';

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
      <div className="absolute -left-36 bottom-0 size-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -right-32 top-0 size-96 rounded-full bg-[#6C3AED]/14 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[0.88fr_1.12fr]">
        <section className="hidden border-r border-white/10 bg-black/25 px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-20">
          <BrandSignature size="lg" />
          <div className="max-w-lg">
            <span className="vdm-icon-button mb-6 size-12 border-primary/30 bg-primary/15 text-primary"><ProfileIcon className="size-6" /></span>
            <p className="vdm-eyebrow">Perfil selecionado · {definition.label}</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-[1.08] tracking-[-0.05em] text-white">
              {mode === 'login' ? definition.loginTitle : definition.registerTitle}
            </h1>
            <p className="mt-6 text-base leading-8 text-muted-foreground">
              {mode === 'login' ? definition.loginDescription : definition.registerDescription}
            </p>
          </div>
          <Button variant="ghost" className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-white" onClick={resetProfile}>
            <ArrowLeft className="size-4" />Trocar tipo de perfil
          </Button>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-2xl">
            <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
              <BrandSignature size="lg" />
              <Button variant="ghost" size="sm" onClick={resetProfile}><ArrowLeft className="size-4" />Trocar perfil</Button>
            </div>

            <Card className="border-white/12 bg-card/95 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <CardHeader className="space-y-2 pb-5">
                <div className="flex items-center gap-3">
                  <span className="vdm-icon-button size-10 border-primary/25 bg-primary/10 text-primary"><ProfileIcon className="size-5" /></span>
                  <div>
                    <p className="vdm-eyebrow">{definition.label}</p>
                    <CardTitle className="mt-1 text-3xl">{mode === 'login' ? definition.loginTitle : definition.registerTitle}</CardTitle>
                  </div>
                </div>
                <CardDescription className="pt-2 text-sm leading-6">
                  {mode === 'login' ? definition.loginDescription : definition.registerDescription}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
                  {mode === 'register' && (
                    <>
                      {selectedProfile === 'company' && (
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="company-name">Nome da empresa</Label>
                          <div className="relative"><Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="company-name" className="pl-9" value={form.companyName} onChange={(event) => updateField('companyName', event.target.value)} placeholder="Nome comercial da organização" required disabled={busy} /></div>
                        </div>
                      )}

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="name">{selectedProfile === 'company' ? 'Nome do responsável' : 'Nome completo'}</Label>
                        <div className="relative"><User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="name" className="pl-9" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder={selectedProfile === 'company' ? 'Responsável pela conta empresarial' : 'Seu nome completo'} autoComplete="name" required disabled={busy} /></div>
                      </div>

                      {isProfessional && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="professional-name">Nome profissional</Label>
                            <Input id="professional-name" value={form.professionalName} onChange={(event) => updateField('professionalName', event.target.value)} placeholder={selectedProfile === 'producer' ? 'Nome artístico ou de produtor' : 'Nome de apresentação'} required disabled={busy} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="specialty">Área de atuação</Label>
                            <Input id="specialty" value={form.specialty} onChange={(event) => updateField('specialty', event.target.value)} placeholder={selectedProfile === 'producer' ? 'Ex.: produção musical, beatmaking' : 'Ex.: produção, negócios, direitos autorais'} required disabled={busy} />
                          </div>
                          {selectedProfile === 'instructor' && (
                            <div className="space-y-2">
                              <Label htmlFor="experience-years">Anos de experiência</Label>
                              <Input id="experience-years" type="number" min="0" max="80" value={form.experienceYears} onChange={(event) => updateField('experienceYears', event.target.value)} placeholder="0" required disabled={busy} />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="portfolio-url">Portfólio ou site profissional</Label>
                            <div className="relative"><Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="portfolio-url" type="url" className="pl-9" value={form.portfolioUrl} onChange={(event) => updateField('portfolioUrl', event.target.value)} placeholder="https://" disabled={busy} /></div>
                          </div>
                        </>
                      )}

                      {selectedProfile === 'company' && (
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="website-url">Site da empresa <span className="text-muted-foreground">(opcional)</span></Label>
                          <div className="relative"><Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="website-url" type="url" className="pl-9" value={form.websiteUrl} onChange={(event) => updateField('websiteUrl', event.target.value)} placeholder="https://" disabled={busy} /></div>
                        </div>
                      )}

                      {selectedProfile === 'affiliate' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="channel-name">Principal canal de divulgação</Label>
                            <div className="relative"><Megaphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="channel-name" className="pl-9" value={form.channelName} onChange={(event) => updateField('channelName', event.target.value)} placeholder="Ex.: Instagram, YouTube, site" required disabled={busy} /></div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="channel-url">Endereço do canal</Label>
                            <div className="relative"><Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="channel-url" type="url" className="pl-9" value={form.channelUrl} onChange={(event) => updateField('channelUrl', event.target.value)} placeholder="https://" required disabled={busy} /></div>
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <div className="relative"><Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="phone" type="tel" className="pl-9" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="(00) 00000-0000" autoComplete="tel" disabled={busy} /></div>
                      </div>
                    </>
                  )}

                  <div className={mode === 'login' ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
                    <Label htmlFor="email">{selectedProfile === 'company' ? 'E-mail profissional' : 'E-mail'}</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" className="pl-9" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="seu@email.com" autoComplete="email" required disabled={busy} /></div>
                  </div>

                  <div className={mode === 'login' ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="password" type={showPassword ? 'text' : 'password'} className="pl-9 pr-10" value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder={mode === 'register' ? 'Mínimo de 8 caracteres' : 'Digite sua senha'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : undefined} required disabled={busy} />
                      <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-white" disabled={busy}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="confirm-password">Confirmar senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} className="pl-9 pr-10" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} placeholder="Repita sua senha" autoComplete="new-password" required disabled={busy} />
                          <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-white" disabled={busy}>{showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4 sm:col-span-2">
                        <Checkbox id="terms" checked={form.acceptTerms} onCheckedChange={(checked) => updateField('acceptTerms', checked === true)} disabled={busy} />
                        <Label htmlFor="terms" className="text-sm font-normal leading-6 text-muted-foreground">
                          Declaro que li e aceito os <Link to={ROUTES.termsOfUse} className="link-vdm">Termos de Uso</Link> e a <Link to={ROUTES.privacyPolicy} className="link-vdm">Política de Privacidade</Link>.
                        </Label>
                      </div>
                    </>
                  )}

                  {mode === 'login' && (
                    <div className="flex justify-end sm:col-span-2"><Link to={ROUTES.forgotPassword} className="link-vdm text-sm">Esqueceu a senha?</Link></div>
                  )}

                  <Button type="submit" size="lg" className="w-full sm:col-span-2" disabled={busy || (mode === 'register' && !form.acceptTerms)}>
                    {busy ? (mode === 'login' ? 'Entrando...' : 'Criando conta...') : (mode === 'login' ? `Entrar como ${definition.label.toLowerCase()}` : `Criar conta de ${definition.label.toLowerCase()}`)}
                  </Button>
                </form>

                <div className="border-t border-white/8 pt-5 text-center text-sm text-muted-foreground">
                  {mode === 'login' ? 'Ainda não possui uma conta?' : 'Já possui uma conta?'}{' '}
                  <Link to={`${mode === 'login' ? ROUTES.register : ROUTES.login}${profileQuery(selectedProfile)}`} className="link-vdm font-semibold">
                    {mode === 'login' ? 'Criar conta' : 'Entrar'}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
};

export default UnifiedAuthPage;
