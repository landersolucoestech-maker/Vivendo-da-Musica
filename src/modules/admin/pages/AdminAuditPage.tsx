import AdminLayout from '@/app/layouts/AdminLayout';
import { useAdminAuditLogs } from '@/modules/admin/hooks/useAdminSecurity';
import DataTable from '@/shared/components/DataTable';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';

const AdminAuditPage = () => {
  const logsQuery = useAdminAuditLogs();

  return (
    <AdminLayout>
      <PageHeader title="Auditoria" subtitle="Histórico persistido de ações administrativas registradas na plataforma." />

      {logsQuery.isLoading && <LoadingState rows={6} />}
      {logsQuery.isError && <p className="text-sm text-destructive">Não foi possível carregar os logs de auditoria.</p>}

      {logsQuery.data && !logsQuery.isLoading && !logsQuery.isError && (
        <DataTable
          rows={logsQuery.data}
          rowKey={(log) => `${log.user}-${log.action}-${log.date}`}
          emptyLabel="Nenhum log registrado ainda."
          columns={[
            { header: 'Usuário', cell: (log) => log.user },
            { header: 'Ação', cell: (log) => log.action },
            { header: 'Data', cell: (log) => log.date },
          ]}
        />
      )}
    </AdminLayout>
  );
};

export default AdminAuditPage;
