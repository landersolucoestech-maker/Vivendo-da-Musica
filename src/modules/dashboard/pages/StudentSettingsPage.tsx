import { useEffect, useState } from "react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { useStudentSettings } from "@/modules/dashboard/hooks/useStudentSettings";
import { studentService } from "@/modules/dashboard/services/student.service";

const DEFAULT_NOTIFICATIONS = { courseUpdates: true, communityActivity: true, marketingEmails: false };
const DEFAULT_PRIVACY = { publicProfile: true, showProgress: false };

const StudentSettingsPage = () => {
  const { toast } = useToast();
  const { data: settings } = useStudentSettings();
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);

  useEffect(() => {
    if (settings) {
      setNotifications(settings.notifications);
      setPrivacy(settings.privacy);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings) return;
    await studentService.saveStudentSettings({ ...settings, notifications, privacy });
    toast({ title: "Configurações salvas" });
  };

  return (
    <StudentLayout>
      <PageHeader title="Configurações" subtitle="Notificações, privacidade, assinatura e preferências." />

      <div className="max-w-lg space-y-6">
        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Notificações</h2>
          <div className="flex items-center justify-between">
            <Label htmlFor="n1">Atualizações de cursos</Label>
            <Switch id="n1" checked={notifications.courseUpdates} onCheckedChange={(v) => setNotifications((s) => ({ ...s, courseUpdates: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="n2">Atividade na comunidade</Label>
            <Switch id="n2" checked={notifications.communityActivity} onCheckedChange={(v) => setNotifications((s) => ({ ...s, communityActivity: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="n3">E-mails de marketing</Label>
            <Switch id="n3" checked={notifications.marketingEmails} onCheckedChange={(v) => setNotifications((s) => ({ ...s, marketingEmails: v }))} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Privacidade</h2>
          <div className="flex items-center justify-between">
            <Label htmlFor="p1">Perfil público</Label>
            <Switch id="p1" checked={privacy.publicProfile} onCheckedChange={(v) => setPrivacy((s) => ({ ...s, publicProfile: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="p2">Mostrar progresso para outros</Label>
            <Switch id="p2" checked={privacy.showProgress} onCheckedChange={(v) => setPrivacy((s) => ({ ...s, showProgress: v }))} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold mb-1">Assinatura</h2>
          <p className="text-sm text-muted-foreground">Plano atual: <span className="text-foreground font-medium">{settings?.subscriptionPlan ?? '—'}</span></p>
          <Button variant="outline" className="border-border">Fazer upgrade para Premium</Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 space-y-2">
          <h2 className="font-semibold mb-1">Idioma e tema</h2>
          <p className="text-sm text-muted-foreground">Idioma: {settings?.language ?? '—'}</p>
          <p className="text-sm text-muted-foreground">Tema: {settings?.theme ?? '—'}</p>
        </section>

        <Button onClick={handleSave}>Salvar alterações</Button>
      </div>
    </StudentLayout>
  );
};

export default StudentSettingsPage;
