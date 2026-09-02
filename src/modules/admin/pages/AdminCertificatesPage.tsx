import AdminLayout from '@/app/layouts/AdminLayout';
import { useCertificates } from '@/modules/certificates/hooks/useCertificates';
import DataTable from '@/shared/components/DataTable';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge';

const certificateStatusLabel = (status: string) => ({
  emitido: 'Emitido',
  revogado: 'Revogado',
}[status] ?? status);

const AdminCertificatesPage = () => {
  const certificatesQuery = useCertificates();

  return (
    <AdminLayout>
      <PageHeader title="Certificados" subtitle="Certificados emitidos para alunos conforme a visibilidade autorizada no banco." />

      {certificatesQuery.isLoading && <LoadingState rows={6} />}
      {certificatesQuery.isError && <p className="text-sm text-destructive">Não foi possível carregar os certificados.</p>}

      {certificatesQuery.data && !certificatesQuery.isLoading && !certificatesQuery.isError && (
        <DataTable
          rows={certificatesQuery.data}
          rowKey={(certificate) => certificate.id}
          emptyLabel="Nenhum certificado emitido ainda."
          columns={[
            { header: 'Aluno', cell: (certificate) => certificate.studentName },
            { header: 'Curso', cell: (certificate) => certificate.courseTitle },
            { header: 'Código', cell: (certificate) => certificate.code },
            { header: 'Status', cell: (certificate) => <StatusBadge status={certificate.status} label={certificateStatusLabel(certificate.status)} /> },
          ]}
        />
      )}
    </AdminLayout>
  );
};

export default AdminCertificatesPage;
