import { useEffect, useState } from "react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { useAdminIntegrations } from "@/modules/admin/hooks/useAdminIntegrations";
import { adminService } from "@/modules/admin/services/admin.service";
import type { IntegrationStatus } from "@/modules/admin/types/integration.types";

const AdminIntegrationsPage = () => {
  const { toast } = useToast();
  const { data } = useAdminIntegrations();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [selected, setSelected] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    if (data) setIntegrations(data);
  }, [data]);

  const handleToggle = async () => {
    if (!selected) return;
    await adminService.toggleIntegration(selected.name);
    setIntegrations((current) =>
      current.map((i) => (i.name === selected.name ? { ...i, status: i.status === 'conectado' ? 'desconectado' : 'conectado' } : i))
    );
    toast({ title: `${selected.name} ${selected.status === 'conectado' ? 'desconectado' : 'conectado'} com sucesso` });
    setSelected(null);
  };

  return (
    <AdminLayout>
      <PageHeader title="Integrações" subtitle="Conecte serviços externos à plataforma." />

      <div className="grid sm:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div key={integration.name} className="rounded-lg border border-border bg-card p-5 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">{integration.name}</p>
                <StatusBadge status={integration.status} label={integration.status} />
              </div>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
            </div>
            <Button variant="outline" className="border-border shrink-0" onClick={() => setSelected(integration)}>
              Configurar
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.status === 'conectado'
                ? `Desconectar ${selected?.name} da plataforma?`
                : `Insira as credenciais de ${selected?.name} para conectar (simulado nesta etapa).`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={handleToggle}>
              {selected?.status === 'conectado' ? 'Desconectar' : 'Conectar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminIntegrationsPage;
