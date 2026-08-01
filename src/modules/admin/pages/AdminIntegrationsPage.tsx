import AdminLayout from '@/app/layouts/AdminLayout';
import { useAdminIntegrations } from '@/modules/admin/hooks/useAdminIntegrations';
import PageHeader from '@/shared/components/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { PlugZap } from 'lucide-react';

const AdminIntegrationsPage = () => {
  const { data: integrations = [], isLoading, error } = useAdminIntegrations();

  return (
    <AdminLayout>
      <PageHeader
        title="Integrações"
        subtitle="Estado cadastrado dos serviços externos previstos para a plataforma."
      />

      <Alert className="mb-6">
        <PlugZap className="h-4 w-4" />
        <AlertTitle>Configuração protegida</AlertTitle>
        <AlertDescription>
          Esta interface não recebe, armazena ou altera credenciais. A ativação de uma integração exige secrets do ambiente,
          validação do provedor e um fluxo administrativo autenticado ainda não disponibilizado nesta tela.
        </AlertDescription>
      </Alert>

      {error && (
        <p className="mb-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Não foi possível carregar as integrações.'}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
            Carregando integrações...
          </div>
        ) : integrations.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
            Nenhuma integração cadastrada.
          </div>
        ) : integrations.map((integration) => (
          <div key={integration.name} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <p className="font-semibold">{integration.name}</p>
                <StatusBadge
                  status={integration.status}
                  label={integration.status === 'conectado' ? 'Conectado' : 'Desconectado'}
                />
              </div>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminIntegrationsPage;
