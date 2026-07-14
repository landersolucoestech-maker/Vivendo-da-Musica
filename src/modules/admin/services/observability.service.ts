import { supabase } from "@/integrations/supabase/client";

const table = supabase.from as unknown as (name: string) => any;

export interface HealthCheck { id: number; service: string; status: "healthy" | "degraded" | "unhealthy"; latency_ms: number | null; details: Record<string, unknown>; checked_at: string; }
export interface MetricSample { id: number; metric_name: string; metric_value: number; unit: string; observed_at: string; }
export interface ObservabilityAlert { id: string; service: string; severity: "info" | "warning" | "critical"; status: "open" | "acknowledged" | "resolved"; title: string; description: string; occurrence_count: number; last_seen_at: string; }
export interface RequestTrace { id: number; trace_id: string; request_id: string; service: string; route: string; method: string; status_code: number; duration_ms: number; error_code: string | null; occurred_at: string; }
export interface ObservabilitySnapshot { health: HealthCheck[]; metrics: MetricSample[]; alerts: ObservabilityAlert[]; traces: RequestTrace[]; }

export const observabilityService = {
  async getSnapshot(): Promise<ObservabilitySnapshot> {
    const healthResult = await table("observability_health_checks").select("id,service,status,latency_ms,details,checked_at").order("checked_at", { ascending: false }).limit(12);
    if (healthResult.error) throw new Error(healthResult.error.message);
    const metricsResult = await table("observability_metric_samples").select("id,metric_name,metric_value,unit,observed_at").order("observed_at", { ascending: false }).limit(24);
    if (metricsResult.error) throw new Error(metricsResult.error.message);
    const alertsResult = await table("observability_alerts").select("id,service,severity,status,title,description,occurrence_count,last_seen_at").neq("status", "resolved").order("last_seen_at", { ascending: false }).limit(20);
    if (alertsResult.error) throw new Error(alertsResult.error.message);
    const tracesResult = await table("observability_request_traces").select("id,trace_id,request_id,service,route,method,status_code,duration_ms,error_code,occurred_at").order("occurred_at", { ascending: false }).limit(50);
    if (tracesResult.error) throw new Error(tracesResult.error.message);
    return { health: healthResult.data ?? [], metrics: (metricsResult.data ?? []).map((metric: any) => ({ ...metric, metric_value: Number(metric.metric_value) })), alerts: alertsResult.data ?? [], traces: tracesResult.data ?? [] };
  },
  async acknowledgeAlert(id: string): Promise<void> {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Sessão administrativa inválida.");
    const { error } = await table("observability_alerts").update({ status: "acknowledged", acknowledged_at: new Date().toISOString(), acknowledged_by: data.user.id }).eq("id", id).eq("status", "open");
    if (error) throw new Error(error.message);
  },
};
