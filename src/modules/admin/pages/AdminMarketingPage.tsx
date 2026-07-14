import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import { useAdminCampaigns, useAdminLeads, useAdminLandingPages } from "@/modules/admin/hooks/useAdminMarketing";
import { useAdminCoupons } from "@/modules/admin/hooks/useAdminCoupons";

const AdminMarketingPage = () => {
  const { data: campaigns } = useAdminCampaigns();
  const { data: leads } = useAdminLeads();
  const { data: landingPages } = useAdminLandingPages();
  const { data: coupons } = useAdminCoupons();

  return (
    <AdminLayout>
      <PageHeader title="Marketing" subtitle="Campanhas, leads, landing pages e cupons." />

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Campanhas</h2>
          <DataTable
            rows={campaigns ?? []}
            rowKey={(c) => c.name}
            emptyLabel="Nenhuma campanha criada ainda."
            columns={[
              { header: 'Campanha', cell: (c) => c.name },
              { header: 'Canal', cell: (c) => c.channel },
              { header: 'Status', cell: (c) => <StatusBadge status={c.status} label={c.status} /> },
              { header: 'Leads', cell: (c) => c.leads },
              { header: 'Conversão', cell: (c) => `${c.conversionPct}%` },
            ]}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Leads recentes</h2>
          <DataTable
            rows={leads ?? []}
            rowKey={(lead) => lead.email}
            emptyLabel="Nenhum lead capturado ainda."
            columns={[
              { header: 'Nome', cell: (lead) => lead.name },
              { header: 'E-mail', cell: (lead) => lead.email },
              { header: 'Origem', cell: (lead) => lead.source },
              { header: 'Data', cell: (lead) => lead.createdAt },
            ]}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Landing pages</h2>
          <DataTable
            rows={landingPages ?? []}
            rowKey={(lp) => lp.name}
            emptyLabel="Nenhuma landing page criada ainda."
            columns={[
              { header: 'Página', cell: (lp) => lp.name },
              { header: 'Visitas', cell: (lp) => lp.visits },
              { header: 'Conversão', cell: (lp) => `${lp.conversionPct}%` },
              { header: 'Status', cell: (lp) => <StatusBadge status={lp.status} label={lp.status} /> },
            ]}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Cupons</h2>
          <DataTable
            rows={coupons ?? []}
            rowKey={(coupon) => coupon.code}
            emptyLabel="Nenhum cupom criado ainda."
            columns={[
              { header: 'Código', cell: (coupon) => coupon.code },
              { header: 'Desconto', cell: (coupon) => coupon.discountLabel },
              { header: 'Uso', cell: (coupon) => `${coupon.used}/${coupon.maxUses}` },
              { header: 'Status', cell: (coupon) => <StatusBadge status={coupon.status} label={coupon.status} /> },
            ]}
          />
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketingPage;
