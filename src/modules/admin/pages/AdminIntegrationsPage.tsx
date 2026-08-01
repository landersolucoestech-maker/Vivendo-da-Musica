import { useEffect, useState } from 'react';

import AdminLayout from '@/app/layouts/AdminLayout';
import { useAdminIntegrations } from '@/modules/admin/hooks/useAdminIntegrations';
import { adminService } from '@/modules/admin/services/admin.service';
import type { IntegrationStatus } from '@/modules/admin/types/integration.types';
import PageHeader from '@/shared/components/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';

const AdminIntegrationsPage = () => {
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useAdminIntegrations();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [selected, setSelected] = useState<IntegrationStatus | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (data) setIntegrations(data);
  }, [data]);

  const handleToggle = async () => {
    if (!selected || updating) return;
    setUpdating(true);
    try {
      await adminService.toggleIntegration(selected.name);
      await refetch();
      toast({
        title: 'Estado atualizado no ambiente de desenvolvimento',
        description: `${selected.name} foi ${selected.status === 'conectado' ? 'desconectado' : 'marcado como conectado'}.`,
      });
      setSelected(null);
    } catch (toggleError) {
      toast({
        title: 'Não foi possível atualizar a integração',
        description: toggleError instanceof Error ? toggleError.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Integrações"
        subtitle="Acompanhe o estado operacional dos serviços externos configurados para a plataforma."
      />

      <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        Esta tela não coleta chaves, tokens ou senhas. No ambiente de desenvolvimento, a ação abaixo altera somente o estado sintético usado para revisão da interface.
      </div>

      {error && (
        <p className="mb-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Não foi possível carregar as integrações.'}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Carregando integrações...</div>
        ) : integrations.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Nenhuma integração cadastrada.</div>
        ) : integrations.map((integration) => (
          <div key={integration.name} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <p className="font-semibold">{integration.name}</p>
                <StatusBadge status={integration.status} label={integration.status === 'conectado' ? 'Conectado' : 'Desconectado'} />
              </div>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
            </div>
            <Button variant="outline" className="shrink-0 border-border" onClick={() => setSelected(integration)}>
              Alterar estado
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && !updating && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.status === 'conectado'
                ? 'Marcar esta integração sintética como desconectada no Supabase DEV?'
                : 'Marcar esta integração sintética como conectada no Supabase DEV? Nenhuma credencial será solicitada ou armazenada.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-border" disabled={updating} onClick={() => setSelected(null)}>
              Cancelar
            </Button>
            <Button disabled={updating} onClick={() => void handleToggle()}>
              {updating ? 'Atualizando...' : selected?.status === 'conectado' ? 'Marcar como desconectada' : 'Marcar como conectada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminIntegrationsPage;
