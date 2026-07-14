import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import { useAdminCoupons } from "@/modules/admin/hooks/useAdminCoupons";

const AdminCouponsPage = () => {
  const { data: coupons } = useAdminCoupons();

  return (
    <AdminLayout>
      <PageHeader title="Cupons" subtitle="Cupons de desconto para cursos e produtos." />
      <DataTable
        rows={coupons ?? []}
        rowKey={(coupon) => coupon.code}
        emptyLabel="Nenhum cupom criado ainda."
        columns={[
          { header: 'Código', cell: (coupon) => coupon.code },
          { header: 'Desconto', cell: (coupon) => coupon.discountLabel },
          { header: 'Validade', cell: (coupon) => coupon.validUntil },
          { header: 'Uso', cell: (coupon) => `${coupon.used}/${coupon.maxUses}` },
          { header: 'Status', cell: (coupon) => <StatusBadge status={coupon.status} label={coupon.status} /> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminCouponsPage;
