import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import { useAdminAuditLogs } from "@/modules/admin/hooks/useAdminSecurity";

const AdminAuditPage = () => {
  const { data: logs } = useAdminAuditLogs();

  return (
    <AdminLayout>
      <PageHeader title="Auditoria" subtitle="Histórico de ações realizadas na plataforma." />
      <DataTable
        rows={logs ?? []}
        rowKey={(log) => `${log.user}-${log.date}`}
        emptyLabel="Nenhum log registrado ainda."
        columns={[
          { header: 'Usuário', cell: (log) => log.user },
          { header: 'Ação', cell: (log) => log.action },
          { header: 'Data', cell: (log) => log.date },
          { header: 'Severidade', cell: (log) => <StatusBadge status={log.severity} label={log.severity} /> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminAuditPage;
