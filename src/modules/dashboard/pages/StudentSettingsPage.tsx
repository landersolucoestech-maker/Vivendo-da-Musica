import { useEffect, useState } from 'react';
import { BellRing, Languages, Save, ShieldCheck } from 'lucide-react';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useStudentSettings } from '@/modules/dashboard/hooks/useStudentSettings';
import { studentService } from '@/modules/dashboard/services/student.service';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/use-toast';

const DEFAULT_NOTIFICATIONS = { courseUpdates: true, communityActivity: true, marketingEmails: false };
const DEFAULT_PRIVACY = { publicProfile: true, showProgress: false };

interface SettingRowProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

const SettingRow = ({ id, title, description, checked, onCheckedChange }: SettingRowProps) => (
  <div className="flex items-start justify-between gap-5 border-b border-white/8 py-4 last:border-0">
    <div className="min-w-0">
      <Label htmlFor={id} className="text-sm font-semibold text-white">{title}</Label>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5 shrink-0" />
  </div>
);

const StudentSettingsPage = () => {
  const { toast } = useToast();
  const { data: settings } = useStudentSettings();
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setNotifications(settings.notifications);
      setPrivacy(settings.privacy);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings || saving) return;
    setSaving(true);
    try {
      await studentService.saveStudentSettings({ ...settings, notifications, privacy });
      toast({ title: 'Configurações salvas', description: 'Suas preferências foram atualizadas.' });
    } catch (error) {
      toast({
        title: 'Não foi possível salvar',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudentLayout>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="vdm-eyebrow">Preferências</p>
          <h1 className="vdm-page-title mt-2">Configurações</h1>
          <p className="vdm-page-description">Gerencie notificações, privacidade e preferências gerais da sua conta.</p>
        </div>
        <Button onClick={() => void handleSave()} disabled={!settings || saving}>
          <Save className="size-4" />
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary"><BellRing className="size-5" /></span>
            <CardTitle className="text-xl">Notificações</CardTitle>
            <CardDescription>Escolha quais atualizações deseja receber da plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow id="course-updates" title="Atualizações de cursos" description="Novas aulas, materiais e alterações nos cursos matriculados." checked={notifications.courseUpdates} onCheckedChange={(value) => setNotifications((current) => ({ ...current, courseUpdates: value }))} />
            <SettingRow id="community-activity" title="Atividade na comunidade" description="Respostas, menções e interações relacionadas à sua conta." checked={notifications.communityActivity} onCheckedChange={(value) => setNotifications((current) => ({ ...current, communityActivity: value }))} />
            <SettingRow id="marketing-emails" title="Comunicações promocionais" description="Novidades comerciais, campanhas e ofertas da plataforma." checked={notifications.marketingEmails} onCheckedChange={(value) => setNotifications((current) => ({ ...current, marketingEmails: value }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span>
            <CardTitle className="text-xl">Privacidade</CardTitle>
            <CardDescription>Controle a visibilidade das informações associadas ao seu perfil.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow id="public-profile" title="Perfil público" description="Permite que outros usuários visualizem as informações públicas do perfil." checked={privacy.publicProfile} onCheckedChange={(value) => setPrivacy((current) => ({ ...current, publicProfile: value }))} />
            <SettingRow id="show-progress" title="Exibir progresso" description="Permite mostrar seu progresso acadêmico em áreas sociais da plataforma." checked={privacy.showProgress} onCheckedChange={(value) => setPrivacy((current) => ({ ...current, showProgress: value }))} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary"><Languages className="size-5" /></span>
            <CardTitle className="text-xl">Idioma e aparência</CardTitle>
            <CardDescription>Configurações ativas para a experiência da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="vdm-surface p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Idioma</p>
              <p className="mt-2 text-sm font-semibold text-white">{settings?.language ?? 'Português (Brasil)'}</p>
            </div>
            <div className="vdm-surface p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Tema</p>
              <p className="mt-2 text-sm font-semibold text-white">{settings?.theme ?? 'Escuro'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => void handleSave()} disabled={!settings || saving}>
          <Save className="size-4" />
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </StudentLayout>
  );
};

export default StudentSettingsPage;
