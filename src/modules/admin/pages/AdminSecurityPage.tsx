import { useState } from "react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import { Switch } from "@/shared/components/ui/switch";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { useAdminRoles, useAdminAccessSessions } from "@/modules/admin/hooks/useAdminSecurity";
import { adminService } from "@/modules/admin/services/admin.service";

const AdminSecurityPage = () => {
  const { toast } = useToast();
  const { data: roles } = useAdminRoles();
  const { data: sessions } = useAdminAccessSessions();
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <AdminLayout>
      <PageHeader title="Segurança" subtitle="Permissões, roles, sessões e autenticação." />

      <div className="space-y-8">
        <section className="rounded-lg border border-border bg-card p-5 flex items-center justify-between max-w-lg">
          <div>
            <h2 className="font-semibold">Autenticação em duas etapas</h2>
            <p className="text-sm text-muted-foreground">Exigir 2FA para contas admin e super_admin.</p>
          </div>
          <Switch
            checked={twoFactor}
            onCheckedChange={(v) => {
              setTwoFactor(v);
              toast({ title: v ? "2FA ativado" : "2FA desativado" });
            }}
            aria-label="Autenticação em duas etapas"
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Roles e permissões</h2>
          <DataTable
            rows={roles ?? []}
            rowKey={(r) => r.role}
            emptyLabel="Nenhuma role configurada."
            columns={[
              { header: 'Role', cell: (r) => r.role },
              { header: 'Descrição', cell: (r) => r.description },
            ]}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Sessões ativas</h2>
          <DataTable
            rows={sessions ?? []}
            rowKey={(s) => s.device}
            emptyLabel="Nenhuma sessão ativa."
            columns={[
              { header: 'Dispositivo', cell: (s) => s.device },
              { header: 'Local', cell: (s) => s.location },
              { header: 'Última atividade', cell: (s) => s.lastActive },
              {
                header: '',
                cell: (s) => s.current
                  ? <span className="text-xs text-brand-medium">Sessão atual</span>
                  : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border"
                      onClick={async () => {
                        await adminService.revokeSession(s.device);
                        toast({ title: "Sessão revogada" });
                      }}
                    >
                      Revogar
                    </Button>
                  ),
              },
            ]}
          />
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminSecurityPage;
