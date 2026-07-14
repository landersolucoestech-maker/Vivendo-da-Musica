import { Link } from "react-router-dom";
import { Award, CalendarDays, Video } from "lucide-react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import EmptyState from "@/shared/components/EmptyState";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { useEventCertificates, useEvents } from "@/modules/events/hooks/useEvents";
import { EVENT_STATUS_LABEL as STATUS_LABEL, type MockEvent } from "@/modules/events/types/event.types";

const StudentEventsPage = () => {
  const { data: events } = useEvents();
  const { data: certificates } = useEventCertificates();
  const registeredEvents = (events ?? []).filter((e) => e.isRegistered);
  const upcomingEvents = (events ?? []).filter((e) => e.status === 'upcoming');
  const replayEvents = (events ?? []).filter((e) => e.status === 'replay');

  const renderList = (events: MockEvent[], emptyLabel: string) => {
    if (events.length === 0) return <EmptyState title={emptyLabel} />;
    return (
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.slug} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={event.status} label={STATUS_LABEL[event.status]} />
                <p className="font-medium">{event.title}</p>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5" />{event.date} · {event.time} · {event.location}
              </p>
            </div>
            <Link to={`/eventos/${event.slug}`}>
              <Button variant="outline" className="border-border shrink-0">
                <Video className="w-4 h-4 mr-2" />
                {event.status === 'replay' ? 'Assistir' : 'Entrar'}
              </Button>
            </Link>
          </div>
        ))}
        <section><h2 className="mb-3 text-sm font-semibold text-muted-foreground">Certificados de eventos</h2>{(certificates ?? []).length === 0 ? <EmptyState title="Nenhum certificado de evento emitido ainda." /> : <div className="space-y-3">{(certificates ?? []).map((certificate) => <div key={certificate.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"><Award className="h-5 w-5 text-brand-medium" /><div><p className="font-medium">{certificate.eventTitle}</p><p className="text-xs text-muted-foreground">Codigo de verificacao: {certificate.verificationCode}</p></div></div>)}</div>}</section>
      </div>
    );
  };

  return (
    <StudentLayout>
      <PageHeader title="Eventos" subtitle="Participe de eventos exclusivos e transforme sua carreira." />

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Minhas inscrições</h2>
          {renderList(registeredEvents, "Você ainda não se inscreveu em nenhum evento.")}
        </section>
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Próximos eventos</h2>
          {renderList(upcomingEvents, "Nenhum evento agendado no momento.")}
        </section>
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Replays</h2>
          {renderList(replayEvents, "Nenhum replay disponível ainda.")}
        </section>
      </div>
    </StudentLayout>
  );
};

export default StudentEventsPage;
