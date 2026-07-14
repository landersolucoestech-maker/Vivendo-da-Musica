import { BarChart3, DollarSign, Eye, FileCheck2, Play, ShoppingBag, TrendingUp } from "lucide-react";
import ProducerLayout from "@/app/layouts/ProducerLayout";
import LoadingState from "@/shared/components/LoadingState";
import EmptyState from "@/shared/components/EmptyState";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { useProducerBeatDashboard, useRequestProducerPayout } from "@/modules/marketplace/hooks/useBeats";
import BeatPublishDialog from "@/modules/marketplace/components/BeatPublishDialog";
import BeatManageActions from "@/modules/marketplace/components/BeatManageActions";
import BeatLicenseEditor from "@/modules/marketplace/components/BeatLicenseEditor";
import { formatPrice } from "@/shared/utils/formatters";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";

const ProducerBeatsDashboardPage = () => {
  const { data, isLoading, refetch } = useProducerBeatDashboard();
  const payoutMutation = useRequestProducerPayout();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <ProducerLayout>
        <LoadingState rows={5} />
      </ProducerLayout>
    );
  }

  if (!data) {
    return (
      <ProducerLayout>
        <EmptyState title="Nenhum beat encontrado" description="Publique seu primeiro beat para acompanhar as metricas." />
      </ProducerLayout>
    );
  }

  const stats = [
    { label: "Saldo líquido", value: formatPrice(data.financial.availableBalanceCents, data.financial.currency), icon: DollarSign },
    { label: "Receita bruta", value: formatPrice(data.totals.totalRevenueCents, "BRL"), icon: DollarSign },
    { label: "Vendas", value: String(data.totals.totalSales), icon: ShoppingBag },
    { label: "Visualizacoes", value: String(data.totals.totalViews), icon: Eye },
    { label: "Reproducoes", value: String(data.totals.totalPlays), icon: Play },
    { label: "Conversao media", value: `${data.totals.averageConversionRate}%`, icon: TrendingUp },
  ];
  const payoutMethod = data.financial.payoutMethods.find((method) => method.isDefault) ?? data.financial.payoutMethods[0];
  const canRequestPayout = Boolean(
    payoutMethod
    && data.financial.eligibleBalanceCents >= data.financial.payoutMinimumCents
    && !payoutMutation.isPending
  );

  const requestPayout = async () => {
    if (!payoutMethod) return;
    try {
      await payoutMutation.mutateAsync({
        payoutMethodId: payoutMethod.id,
        amountCents: data.financial.eligibleBalanceCents,
        currency: data.financial.currency,
      });
      toast({ title: "Repasse solicitado", description: "O valor foi reservado e entrou na fila de processamento." });
    } catch (error) {
      toast({
        title: "Nao foi possivel solicitar o repasse",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <ProducerLayout>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestao de Beats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe vendas, receita, licencas, conversoes e protecao autoral do seu catalogo.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Comissao efetiva: {(data.financial.commissionBps / 100).toFixed(2)}% | Repasse minimo: {formatPrice(data.financial.payoutMinimumCents, data.financial.currency)} | Carencia: {data.financial.payoutDelayDays} dias
          </p>
        </div>
        <BeatPublishDialog onPublished={() => void refetch()} />
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
              <Icon className="mb-3 h-5 w-5 text-brand-medium" />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Catalogo e desempenho</h2>
                <p className="text-sm text-muted-foreground">Controle precos, licencas, exclusividade e arquivos entregues.</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {data.beats.map((beat) => (
                <div key={beat.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{beat.title}</p>
                        <Badge variant="secondary">{beat.genre}</Badge>
                        <Badge variant={beat.status === "published" ? "default" : "outline"}>
                          {beat.status === "published" ? "Publicado" : beat.status === "archived" ? "Arquivado" : "Rascunho"}
                        </Badge>
                        {beat.exclusiveAvailable ? <Badge variant="outline">Exclusiva disponivel</Badge> : <Badge>Exclusiva vendida</Badge>}
                        {beat.copyrightStatus === "registered" && (
                          <Badge variant="outline" className="gap-1">
                            <FileCheck2 className="h-3 w-3" />
                            Registrado
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {beat.sales} vendas | {formatPrice(beat.revenueCents, "BRL")} | {beat.views} views | {beat.plays} plays
                      </p>
                    </div>
                    <div className="w-full md:w-48">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Conversao</span>
                        <span>{beat.conversionRate}%</span>
                      </div>
                      <Progress value={beat.conversionRate * 10} className="h-2" />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {beat.licenses.map((license) => (
                      <BeatLicenseEditor key={license.id} beatId={beat.id} license={license} onChanged={() => void refetch()} />
                    ))}
                  </div>
                  <BeatManageActions beat={beat} onChanged={() => void refetch()} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 font-semibold">Historico de transacoes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4">Beat</th>
                    <th className="py-2 pr-4">Comprador</th>
                    <th className="py-2 pr-4">Licenca</th>
                    <th className="py-2 pr-4">Valor</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{transaction.beatTitle}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{transaction.buyerName}</td>
                      <td className="py-3 pr-4">{transaction.licenseName}</td>
                      <td className="py-3 pr-4">{formatPrice(transaction.amountCents, transaction.currency)}</td>
                      <td className="py-3"><Badge variant="secondary">{transaction.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-semibold">Repasses</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Saldo elegivel</p>
                <p className="font-semibold">{formatPrice(data.financial.eligibleBalanceCents, data.financial.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo total</p>
                <p className="font-semibold">{formatPrice(data.financial.availableBalanceCents, data.financial.currency)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {payoutMethod
                ? `Destino verificado: ${payoutMethod.label}`
                : "Nenhum destino tokenizado e verificado foi configurado."}
            </p>
            {data.financial.nextEligibilityAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Proximo saldo previsto em {new Date(data.financial.nextEligibilityAt).toLocaleDateString("pt-BR")}.
              </p>
            )}
            <Button className="mt-4 w-full" disabled={!canRequestPayout} onClick={() => void requestPayout()}>
              {payoutMutation.isPending ? "Solicitando..." : "Solicitar saldo elegivel"}
            </Button>
            {!payoutMethod && <p className="mt-2 text-xs text-amber-600">A verificacao do destino e feita pelo backend financeiro.</p>}
            {payoutMethod && data.financial.eligibleBalanceCents < data.financial.payoutMinimumCents && (
              <p className="mt-2 text-xs text-muted-foreground">
                O minimo para solicitar e {formatPrice(data.financial.payoutMinimumCents, data.financial.currency)}.
              </p>
            )}
            {data.financial.payoutRequests.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                {data.financial.payoutRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-2 text-xs">
                    <span>{formatPrice(request.amountCents, data.financial.currency)}</span>
                    <Badge variant="secondary">{request.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-4 font-semibold">Ranking mais vendidos</h2>
            <div className="space-y-3">
              {data.ranking.map((beat, index) => (
                <div key={beat.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{beat.title}</p>
                      <p className="text-xs text-muted-foreground">{beat.sales} vendas</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(beat.revenueCents, "BRL")}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 font-semibold">Automacoes ativas</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Publicacao gera evidencia autoral e hash do arquivo mestre.</p>
              <p>Pagamento aprovado emite licenca, comprovante e libera arquivos.</p>
              <p>Venda confirmada gera lancamentos imutaveis e balanceados no ledger.</p>
              <p>Venda exclusiva bloqueia novas licencas do mesmo beat.</p>
              <p>Eventos de view/play/checkout alimentam relatorios em tempo real.</p>
            </div>
          </section>
        </aside>
      </div>
    </ProducerLayout>
  );
};

export default ProducerBeatsDashboardPage;
