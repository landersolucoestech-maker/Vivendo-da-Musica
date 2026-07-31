import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Mail, Save, User } from 'lucide-react';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useAvatarUpload } from '@/modules/profile/hooks/useAvatarUpload';
import { useUpdateProfile, useUserProfile } from '@/modules/profile/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';

const EditProfile = () => {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const updateProfile = useUpdateProfile();
  const { uploadAvatar, isUploading } = useAvatarUpload();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const canUploadAvatar = !!user;

  useEffect(() => {
    const loadIdentity = async () => {
      const { data: { user: authenticatedUser } } = await supabase.auth.getUser();
      setName(profile?.full_name || authenticatedUser?.user_metadata?.full_name || authenticatedUser?.email?.split('@')[0] || '');
      setEmail(authenticatedUser?.email || 'Sessão de revisão sem autenticação');
    };

    void loadIdentity();
  }, [profile?.full_name]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canUploadAvatar) return;

    try {
      const avatarUrl = await uploadAvatar(file);
      if (!avatarUrl) return;
      await updateProfile.mutateAsync({ avatar_url: avatarUrl });
      toast({ title: 'Foto atualizada', description: 'A nova imagem já está vinculada ao seu perfil.' });
    } catch (error) {
      toast({
        title: 'Não foi possível atualizar a foto',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      await updateProfile.mutateAsync({ full_name: name.trim() });
      toast({ title: 'Perfil atualizado', description: 'As informações persistidas foram salvas com sucesso.' });
    } catch (error) {
      toast({
        title: 'Não foi possível atualizar o perfil',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <StudentLayout>
        <div className="vdm-surface flex min-h-72 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          Carregando perfil...
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Conta</p>
        <h1 className="vdm-page-title mt-2">Meu perfil</h1>
        <p className="vdm-page-description">Atualize os dados pessoais atualmente persistidos pela plataforma.</p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="h-fit">
          <CardHeader>
            <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary"><Camera className="size-5" /></span>
            <CardTitle className="text-xl">Foto do perfil</CardTitle>
            <CardDescription>Utilize uma imagem clara em JPG, PNG ou WEBP com até 5 MB.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center rounded-xl border border-white/8 bg-white/[0.02] p-6 text-center">
              <Avatar className="size-28 border-2 border-primary/25 shadow-[0_0_32px_rgba(138,43,226,0.18)]">
                <AvatarImage src={profile?.avatar_url || ''} alt={name || 'Foto do perfil'} />
                <AvatarFallback className="bg-primary/10 text-primary"><User className="size-9" /></AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" className="mt-5" onClick={() => fileInputRef.current?.click()} disabled={isUploading || !canUploadAvatar}>
                {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                {isUploading ? 'Enviando...' : 'Alterar foto'}
              </Button>
              {!canUploadAvatar && (
                <p className="mt-3 text-xs leading-5 text-amber-300">O upload exige uma sessão autenticada porque o Storage valida o proprietário do arquivo.</p>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleAvatarChange(event)} className="hidden" disabled={!canUploadAvatar} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary"><User className="size-5" /></span>
            <CardTitle className="text-xl">Informações pessoais</CardTitle>
            <CardDescription>O nome é exibido nas áreas internas. O e-mail pertence à identidade de autenticação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome completo" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail da conta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="text" value={email} className="pl-9" disabled />
              </div>
              <p className="text-xs leading-5 text-muted-foreground">A alteração de e-mail exige um fluxo de segurança específico e não é realizada neste formulário.</p>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-sm leading-6 text-muted-foreground">
              Campos como telefone, biografia e redes sociais não são exibidos porque ainda não possuem persistência confirmada no contrato atual do perfil.
            </div>

            <div className="flex justify-end border-t border-white/8 pt-5">
              <Button type="submit" disabled={isSaving || isUploading || !name.trim()}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </StudentLayout>
  );
};

export default EditProfile;
