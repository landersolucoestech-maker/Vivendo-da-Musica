import { supabase } from "@/integrations/supabase/client";
import type { EventCertificate, EventRegistration, EventStatus, MockEvent } from "@/modules/events/types/event.types";

const table = supabase.from as unknown as (name: string) => any;
interface EventRow {
  id: string; slug: string; title: string; host_name: string; speakers: string[]; category: string;
  status: EventStatus; starts_at: string; location: string; description: string; registration_count: number;
  event_agenda_items: { starts_at: string; title: string; position: number }[] | null;
}

const formatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });
const mapEvent = (row: EventRow, registrations: Set<string>, accessUrl: string | null = null): MockEvent => ({
  id: row.id, slug: row.slug, title: row.title, host: row.host_name, speakers: row.speakers ?? [], category: row.category,
  status: row.status, date: formatter.format(new Date(row.starts_at)), time: timeFormatter.format(new Date(row.starts_at)),
  location: row.location, description: row.description, attendees: row.registration_count, isRegistered: registrations.has(row.id),
  agenda: (row.event_agenda_items ?? []).sort((a, b) => a.position - b.position).map((item) => ({ time: timeFormatter.format(new Date(item.starts_at)), title: item.title })),
  accessUrl,
});

export const eventsService = {
  async listEvents(): Promise<MockEvent[]> {
    const { data, error } = await table("events").select("id,slug,title,host_name,speakers,category,status,starts_at,location,description,registration_count,event_agenda_items(starts_at,title,position)").in("status", ["upcoming", "live", "replay"]).order("starts_at", { ascending: true });
    if (error) throw new Error(`Nao foi possivel carregar os eventos: ${error.message}`);
    const { data: authData } = await supabase.auth.getUser();
    let registered = new Set<string>();
    if (authData.user) {
      const { data: registrations, error: registrationError } = await table("event_registrations").select("event_id").eq("user_id", authData.user.id).in("status", ["confirmed", "attended"]);
      if (registrationError) throw new Error(`Nao foi possivel carregar suas inscricoes: ${registrationError.message}`);
      registered = new Set((registrations ?? []).map((item: { event_id: string }) => item.event_id));
    }
    return ((data ?? []) as EventRow[]).map((row) => mapEvent(row, registered));
  },

  async getEventBySlug(slug: string): Promise<MockEvent | undefined> {
    const events = await this.listEvents(); const event = events.find((item) => item.slug === slug);
    if (!event || !event.isRegistered) return event;
    const { data, error } = await table("event_streams").select("live_url,replay_url").eq("event_id", event.id).maybeSingle();
    if (error) throw new Error(`Nao foi possivel carregar o acesso ao evento: ${error.message}`);
    return { ...event, accessUrl: event.status === "replay" ? data?.replay_url ?? null : data?.live_url ?? null };
  },

  async listCategories(): Promise<readonly string[]> { const categories: string[] = (await this.listEvents()).map((event) => String(event.category)); return [...new Set<string>(categories)].sort(); },
  async listUpcomingEvents(): Promise<MockEvent[]> { return (await this.listEvents()).filter((event) => event.status !== "replay"); },
  async listRegisteredEvents(): Promise<MockEvent[]> { return (await this.listEvents()).filter((event) => event.isRegistered); },
  async listReplayEvents(): Promise<MockEvent[]> { return (await this.listEvents()).filter((event) => event.status === "replay"); },

  async registerForEvent(eventId: string): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) throw new Error("Entre na sua conta para se inscrever.");
    const { error } = await table("event_registrations").insert({ event_id: eventId, user_id: data.user.id, status: "confirmed" });
    if (error?.code === "23505") return;
    if (error) throw new Error(`Nao foi possivel concluir a inscricao: ${error.message}`);
  },

  async listRegistrations(): Promise<EventRegistration[]> {
    const { data, error } = await table("event_registrations").select("event_id,user_id,attendee_name_snapshot,status,registered_at,events(title)").order("registered_at", { ascending: false });
    if (error) throw new Error(`Nao foi possivel carregar os participantes: ${error.message}`);
    return (data ?? []).map((row: any) => ({ eventId: row.event_id, userId: row.user_id, attendeeName: row.attendee_name_snapshot, eventTitle: row.events?.title ?? "Evento", status: row.status, registeredAt: row.registered_at }));
  },

  async confirmAttendance(eventId: string, userId: string): Promise<void> {
    const { error } = await table("event_registrations").update({ status: "attended", attended_at: new Date().toISOString() }).eq("event_id", eventId).eq("user_id", userId);
    if (error) throw new Error(`Nao foi possivel confirmar a presenca: ${error.message}`);
  },

  async listCertificates(): Promise<EventCertificate[]> {
    const { data, error } = await table("event_certificates").select("id,verification_code,issued_at,events(title)").order("issued_at", { ascending: false });
    if (error) throw new Error(`Nao foi possivel carregar os certificados: ${error.message}`);
    return (data ?? []).map((row: any) => ({ id: row.id, eventTitle: row.events?.title ?? "Evento", verificationCode: row.verification_code, issuedAt: row.issued_at }));
  },
};
