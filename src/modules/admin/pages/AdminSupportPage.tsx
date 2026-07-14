import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import { useSupportTickets } from "@/modules/dashboard/hooks/useSupport";

const AdminSupportPage = () => {
  const { data: tickets } = useSupportTickets();

  return (
    <AdminLayout>
      <PageHeader title="Suporte" subtitle="Tickets abertos pelos alunos." />
      <DataTable
        rows={tickets ?? []}
        rowKey={(ticket) => ticket.id}
        emptyLabel="Nenhum ticket aberto."
        columns={[
          { header: 'Ticket', cell: (ticket) => ticket.id },
          { header: 'Assunto', cell: (ticket) => ticket.subject },
          { header: 'Solicitante', cell: (ticket) => ticket.requester },
          { header: 'Prioridade', cell: (ticket) => <StatusBadge status={ticket.priority} label={ticket.priority} /> },
          { header: 'Status', cell: (ticket) => <StatusBadge status={ticket.status} label={ticket.status} /> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminSupportPage;
