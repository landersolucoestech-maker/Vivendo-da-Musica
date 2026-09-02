import { Activity, AlertTriangle, CheckCircle2, Clock3, Gauge, Server } from "lucide-react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import LoadingState from "@/shared/components/LoadingState";
import ErrorState from "@/shared/components/ErrorState";
import EmptyState from "@/shared/components/EmptyState";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAcknowledgeAlert, useObservability } from "@/modules/admin/hooks/useObservability";

const statusLabel = { healthy: "Saudável", degraded: "Degradado", unhealthy: "Indisponível" } as const;
const statusClass = { healthy: "bg-emerald-500/15 text-emerald-400", degraded: "bg-amber-500/15 text-amber-400", unhealthy: "bg-red-500/15 text-red-400" } as const;
const severityLabel = { info: "Informativo", warning: "Atenção", critical: "Crítico" } as const;

const AdminObservabilityPage = () => {
  const query = useObservability();
  const acknowledge = useAcknowledgeAlert();
  if (query.isLoading) return <AdminLayout><LoadingState /></AdminLayout>;
  if (query.isError) return <AdminLayout><ErrorState title="Falha ao carregar observabilidade" description={query.error.message} onRetry={() => query.refetch()} /></AdminLayout>;

  const snapshot = query.data!;
  const latestHealth = Array.from(new Map(snapshot.health.map((item) => [item.service, item])).values());
  const latestMetrics = Array.from(new Map(snapshot.metrics.map((item) => [item.metric_name, item])).values());
  const errorRateSample = latestMetrics.find((item) => item.metric_name === "api.error_rate.5m");
  const backlogSample = latestMetrics.find((item) => item.metric_name === "webhook.backlog");
  const averageDuration = snapshot.traces.length
    ? Math.round(snapshot.traces.reduce((sum, trace) => sum + trace.duration_ms, 0) / snapshot.traces.length)
    : null;
  const healthyServices = latestHealth.filter((item) => item.status === "healthy").length;

  return <AdminLayout>
    <PageHeader title="Observabilidade" subtitle="Saúde, métricas, alertas e traces da plataforma remota." />
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Serviços saudáveis" value={latestHealth.length ? `${healthyServices}/${latestHealth.length}` : "Sem amostra"} icon={Server} />
      <StatCard label="Erros API (5 min)" value={errorRateSample ? `${errorRateSample.metric_value}%` : "Sem amostra"} icon={Gauge} />
      <StatCard label="Backlog de webhooks" value={backlogSample ? backlogSample.metric_value : "Sem amostra"} icon={Clock3} />
      <StatCard label="Latência média" value={averageDuration === null ? "Sem amostra" : `${averageDuration} ms`} icon={Activity} />
    </div>
    <div className="grid lg:grid-cols-2 gap-6 mb-6">
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Saúde dos serviços</h2>
        {latestHealth.length === 0 ? (
          <EmptyState title="Sem verificações recentes" description="Nenhuma amostra de saúde foi retornada neste snapshot." />
        ) : (
          <div className="space-y-3">
            {latestHealth.map((check) => <div key={check.service} className="flex items-center justify-between rounded-md border border-border px-3 py-2"><div><p className="text-sm font-medium">{check.service}</p><p className="text-xs text-muted-foreground">{new Date(check.checked_at).toLocaleString("pt-BR")}</p></div><Badge className={statusClass[check.status]}>{statusLabel[check.status]}</Badge></div>)}
          </div>
        )}
      </section>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alertas ativos</h2>
        {snapshot.alerts.length === 0 ? (
          <EmptyState title="Nenhum alerta ativo" description="O snapshot não retornou alertas abertos ou reconhecidos." />
        ) : (
          <div className="space-y-3">
            {snapshot.alerts.map((alert) => <div key={alert.id} className="rounded-md border border-border p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{alert.title}</p><p className="text-xs text-muted-foreground mt-1">{alert.description}</p></div><Badge variant="outline">{severityLabel[alert.severity]}</Badge></div>{alert.status === "open" && <Button size="sm" variant="outline" className="mt-3" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate(alert.id)}>Reconhecer</Button>}</div>)}
          </div>
        )}
      </section>
    </div>
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-5 border-b border-border"><h2 className="font-semibold">Requisições recentes</h2></div>
      {snapshot.traces.length === 0 ? (
        <div className="p-5"><EmptyState title="Sem traces recentes" description="Nenhuma requisição foi retornada neste snapshot." /></div>
      ) : (
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th className="p-3">Horário</th><th className="p-3">Método</th><th className="p-3">Rota</th><th className="p-3">Status</th><th className="p-3">Duração</th><th className="p-3">Trace</th></tr></thead><tbody>{snapshot.traces.map((trace) => <tr key={trace.id} className="border-t border-border"><td className="p-3">{new Date(trace.occurred_at).toLocaleString("pt-BR")}</td><td className="p-3">{trace.method}</td><td className="p-3 font-mono text-xs">{trace.route}</td><td className="p-3">{trace.status_code}</td><td className="p-3">{trace.duration_ms} ms</td><td className="p-3 font-mono text-xs">{trace.trace_id.slice(0, 8)}</td></tr>)}</tbody></table></div>
      )}
    </section>
  </AdminLayout>;
};

export default AdminObservabilityPage;
