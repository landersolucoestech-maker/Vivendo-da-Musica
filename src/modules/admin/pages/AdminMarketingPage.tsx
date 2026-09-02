import AdminLayout from '@/app/layouts/AdminLayout';
import { useAdminCoupons } from '@/modules/admin/hooks/useAdminCoupons';
import { useAdminCampaigns, useAdminLandingPages, useAdminLeads } from '@/modules/admin/hooks/useAdminMarketing';
import DataTable from '@/shared/components/DataTable';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge';

const AdminMarketingPage = () => {
  const campaignsQuery = useAdminCampaigns();
  const leadsQuery = useAdminLeads();
  const landingPagesQuery = useAdminLandingPages();
  const couponsQuery = useAdminCoupons();
  const isLoading = campaignsQuery.isLoading || leadsQuery.isLoading || landingPagesQuery.isLoading || couponsQuery.isLoading;
  const hasError = campaignsQuery.isError || leadsQuery.isError || landingPagesQuery.isError || couponsQuery.isError;

  return (
    <AdminLayout>
      <PageHeader title="Marketing" subtitle="Campanhas, leads, landing pages e cupons com dados persistidos no ambiente." />

      {isLoading && <LoadingState rows={8} />}
      {hasError && (
        <p className="mb-4 text-sm text-destructive">
          Não foi possível carregar todos os dados de marketing. Verifique sua sessão e tente novamente.
        </p>
      )}

      {!isLoading && !hasError && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Campanhas</h2>
            <DataTable
              rows={campaignsQuery.data ?? []}
              rowKey={(campaign) => campaign.name}
              emptyLabel="Nenhuma campanha criada ainda."
              columns={[
                { header: 'Campanha', cell: (campaign) => campaign.name },
                { header: 'Canal', cell: (campaign) => campaign.channel },
                { header: 'Status', cell: (campaign) => <StatusBadge status={campaign.status} label={campaign.status} /> },
              ]}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Leads recentes</h2>
            <DataTable
              rows={leadsQuery.data ?? []}
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
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Landing pages</h2>
            <DataTable
              rows={landingPagesQuery.data ?? []}
              rowKey={(landingPage) => landingPage.name}
              emptyLabel="Nenhuma landing page criada ainda."
              columns={[
                { header: 'Página', cell: (landingPage) => landingPage.name },
                { header: 'Status', cell: (landingPage) => <StatusBadge status={landingPage.status} label={landingPage.status} /> },
              ]}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Cupons</h2>
            <DataTable
              rows={couponsQuery.data ?? []}
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
      )}
    </AdminLayout>
  );
};

export default AdminMarketingPage;
