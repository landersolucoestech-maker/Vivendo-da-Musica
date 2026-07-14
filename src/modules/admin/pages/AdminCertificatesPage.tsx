import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import { useCertificates } from "@/modules/certificates/hooks/useCertificates";

const AdminCertificatesPage = () => {
  const { data: certificates } = useCertificates();

  return (
    <AdminLayout>
      <PageHeader title="Certificados" subtitle="Certificados emitidos para alunos." />
      <DataTable
        rows={certificates ?? []}
        rowKey={(cert) => cert.id}
        emptyLabel="Nenhum certificado emitido ainda."
        columns={[
          { header: 'Aluno', cell: (cert) => cert.studentName },
          { header: 'Curso', cell: (cert) => cert.courseTitle },
          { header: 'Código', cell: (cert) => cert.code },
          { header: 'Status', cell: (cert) => <StatusBadge status={cert.status} label={cert.status} /> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminCertificatesPage;
