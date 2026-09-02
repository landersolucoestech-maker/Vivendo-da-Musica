import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import LoadingState from "@/shared/components/LoadingState";
import StatusBadge from "@/shared/components/StatusBadge";
import { useAdminCoupons } from "@/modules/admin/hooks/useAdminCoupons";

const couponStatusLabel = (status: string) => ({
  ativo: 'Ativo',
  expirado: 'Expirado',
}[status] ?? status);

const AdminCouponsPage = () => {
  const couponsQuery = useAdminCoupons();

  return (
    <AdminLayout>
      <PageHeader title="Cupons" subtitle="Cupons de desconto para cursos e produtos." />

      {couponsQuery.isLoading && <LoadingState rows={6} />}
      {couponsQuery.isError && <p className="text-sm text-destructive">Não foi possível carregar os cupons.</p>}

      {couponsQuery.data && !couponsQuery.isLoading && !couponsQuery.isError && (
        <DataTable
          rows={couponsQuery.data}
          rowKey={(coupon) => coupon.code}
          emptyLabel="Nenhum cupom criado ainda."
          columns={[
            { header: 'Código', cell: (coupon) => coupon.code },
            { header: 'Desconto', cell: (coupon) => coupon.discountLabel },
            { header: 'Validade', cell: (coupon) => coupon.validUntil },
            { header: 'Uso', cell: (coupon) => `${coupon.used}/${coupon.maxUses}` },
            { header: 'Status', cell: (coupon) => <StatusBadge status={coupon.status} label={couponStatusLabel(coupon.status)} /> },
          ]}
        />
      )}
    </AdminLayout>
  );
};

export default AdminCouponsPage;
