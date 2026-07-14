import { useState } from "react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { useEvents, useEventRegistrations } from "@/modules/events/hooks/useEvents";
import { eventsService } from "@/modules/events/services/events.service";
import { EVENT_STATUS_LABEL as STATUS_LABEL } from "@/modules/events/types/event.types";

const AdminEventsPage = () => {
  const { data: events } = useEvents();
  const { data: registrations, refetch } = useEventRegistrations();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const confirmAttendance = async (eventId: string, userId: string) => {
    const key = `${eventId}:${userId}`; setBusy(key);
    try { await eventsService.confirmAttendance(eventId, userId); await refetch(); toast({ title: "Presenca confirmada", description: "O certificado foi emitido quando habilitado para o evento." }); }
    catch (error) { toast({ title: "Presenca nao confirmada", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); }
    finally { setBusy(null); }
  };

  return (
    <AdminLayout>
      <PageHeader title="Eventos" subtitle="Workshops, masterclasses e lives." />
      <div className="space-y-8"><DataTable
        rows={events ?? []}
        rowKey={(event) => event.slug}
        emptyLabel="Nenhum evento agendado ainda."
        columns={[
          { header: 'Evento', cell: (event) => event.title },
          { header: 'Anfitrião', cell: (event) => event.host },
          { header: 'Data', cell: (event) => `${event.date} · ${event.time}` },
          { header: 'Inscritos', cell: (event) => event.attendees },
          { header: 'Status', cell: (event) => <StatusBadge status={event.status} label={STATUS_LABEL[event.status]} /> },
        ]}
      />
      <section><h2 className="mb-3 text-sm font-semibold text-muted-foreground">Participantes</h2><DataTable rows={registrations ?? []} rowKey={(registration) => `${registration.eventId}:${registration.userId}`} emptyLabel="Nenhum participante inscrito." columns={[
        { header: "Participante", cell: (registration) => registration.attendeeName },
        { header: "Evento", cell: (registration) => registration.eventTitle },
        { header: "Status", cell: (registration) => registration.status },
        { header: "Acao", cell: (registration) => registration.status === "attended" ? "Presenca confirmada" : <Button size="sm" disabled={busy === `${registration.eventId}:${registration.userId}`} onClick={() => void confirmAttendance(registration.eventId, registration.userId)}>Confirmar presenca</Button> },
      ]} /></section></div>
    </AdminLayout>
  );
};

export default AdminEventsPage;
