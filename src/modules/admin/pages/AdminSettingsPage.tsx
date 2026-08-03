import { useCallback, useEffect, useState } from 'react';

import AdminLayout from '@/app/layouts/AdminLayout';
import CommercialConfigurationPanel from '@/modules/admin/components/CommercialConfigurationPanel';
import { adminControlService, type FeatureFlag } from '@/modules/admin/services/adminControl.service';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { useToast } from '@/shared/hooks/use-toast';

const AdminSettingsPage = () => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [settings, features] = await Promise.all([
        adminControlService.listSettings(),
        adminControlService.listFeatureFlags(),
      ]);
      setName(String(settings.find((setting) => setting.key === 'platform.name')?.value ?? ''));
      setEmail(String(settings.find((setting) => setting.key === 'support.email')?.value ?? ''));
      setFlags(features);
    } catch (error) {
      toast({
        title: 'Dados não carregados',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      await Promise.all([
        adminControlService.saveSetting('platform.name', name.trim()),
        adminControlService.saveSetting('support.email', email.trim()),
      ]);
      toast({ title: 'Configurações salvas' });
    } catch (error) {
      toast({
        title: 'Não foi possível salvar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (flag: FeatureFlag) => {
    try {
      await adminControlService.toggleFeatureFlag(flag.key, !flag.enabled);
      await load();
    } catch (error) {
      toast({
        title: 'Feature flag não atualizada',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <p className="vdm-eyebrow">Governança da plataforma</p>
        <h1 className="vdm-page-title mt-2">Configurações</h1>
        <p className="vdm-page-description">
          Informações gerais, recursos e parâmetros comerciais versionados da plataforma.
        </p>
      </div>

      <div className="space-y-12">
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Informações gerais</h2>
            <div>
              <Label htmlFor="platform-name">Nome da plataforma</Label>
              <Input id="platform-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="support-email">E-mail de suporte</Label>
              <Input id="support-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <Button disabled={busy || !name.trim() || !email.trim()} onClick={() => void save()}>
              {busy ? 'Salvando...' : 'Salvar informações gerais'}
            </Button>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Feature flags</h2>
            <div className="space-y-4">
              {flags.map((flag) => (
                <div key={flag.key} className="flex items-center justify-between gap-4 rounded-lg border border-white/8 p-3">
                  <div>
                    <p className="text-sm font-medium">{flag.key}</p>
                    <p className="text-xs text-muted-foreground">
                      {flag.description} · distribuição para {flag.rolloutPercentage}%
                    </p>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={() => void toggle(flag)}
                    aria-label={`Alternar ${flag.key}`}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <CommercialConfigurationPanel />
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
