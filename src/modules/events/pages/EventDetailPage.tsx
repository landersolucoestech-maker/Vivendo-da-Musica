import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, MapPin, Users, Mic2, Play } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Button } from "@/shared/components/ui/button";
import EmptyState from "@/shared/components/EmptyState";
import StatusBadge from "@/shared/components/StatusBadge";
import EventCard from "@/shared/components/EventCard";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import LoadingState from "@/shared/components/LoadingState";
import { useEventDetail, useEvents } from "@/modules/events/hooks/useEvents";
import { eventsService } from "@/modules/events/services/events.service";
import { EVENT_STATUS_LABEL as STATUS_LABEL } from "@/modules/events/types/event.types";

const EventDetailPage = () => {
  const { eventSlug } = useParams();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const { data: event, isLoading, refetch } = useEventDetail(eventSlug);
  const { data: events } = useEvents();

  if (isLoading) {
    return <PublicLayout><LoadingState rows={3} className="h-20 rounded-lg" /></PublicLayout>;
  }

  if (!event) {
    return (
      <PublicLayout>
        <EmptyState
          title="Evento nao encontrado"
          description="Esse evento pode ter sido removido ou encerrado."
          action={<Link to="/eventos"><Button>Ver Eventos</Button></Link>}
        />
      </PublicLayout>
    );
  }

  const registered = event.isRegistered;
  const relatedEvents = (events ?? [])
    .filter((item) => item.slug !== event.slug && item.category === event.category)
    .slice(0, 3);

  const handleConfirmRegistration = async () => {
    setRegistering(true);
    try {
      await eventsService.registerForEvent(event.id);
      await refetch(); setModalOpen(false);
      toast({ title: "Inscricao confirmada!", description: `Voce esta inscrito em "${event.title}".` });
    } catch (error) {
      toast({ title: "Inscricao nao concluida", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally { setRegistering(false); }
  };

  return (
    <PublicLayout>
      <div className="grid lg:grid-cols-[1fr_340px] gap-10">
        <main>
          <div className="aspect-video rounded-lg bg-gradient-brand flex items-center justify-center mb-6">
            <span className="text-white font-bold text-xl text-center px-6">{event.title}</span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <StatusBadge status={event.status} label={STATUS_LABEL[event.status]} />
            <span className="text-sm text-muted-foreground">{event.category}</span>
          </div>

          <h1 className="text-3xl font-bold mb-3">{event.title}</h1>
          <p className="text-muted-foreground mb-8">{event.description}</p>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Palestrantes</h2>
          <div className="flex flex-wrap gap-3 mb-8">
            {event.speakers.map((speaker) => (
              <span key={speaker} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                <Mic2 className="w-3.5 h-3.5 text-brand-medium" />
                {speaker}
              </span>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Agenda</h2>
          <div className="space-y-2 mb-8">
            {event.agenda.map((item) => (
              <div key={item.time} className="rounded-lg border border-border bg-card p-3 flex gap-3 text-sm">
                <span className="text-brand-medium font-medium w-14 shrink-0">{item.time}</span>
                <span className="text-muted-foreground">{item.title}</span>
              </div>
            ))}
          </div>

          {!!relatedEvents.length && (
            <>
              <h2 className="text-lg font-semibold mb-4">Eventos relacionados</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedEvents.map((related) => <EventCard key={related.slug} event={related} />)}
              </div>
            </>
          )}
        </main>

        <aside>
          <div className="rounded-lg border border-border bg-card p-5 sticky top-20 space-y-4">
            <div className="grid gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />{event.date} - {event.time}</span>
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{event.location}</span>
              <span className="flex items-center gap-2"><Users className="w-4 h-4" />{event.attendees} inscritos</span>
              <span className="flex items-center gap-2"><Mic2 className="w-4 h-4" />{event.host}</span>
            </div>

            {registered ? (
              event.accessUrl ? <Button className="w-full" size="lg" asChild><a href={event.accessUrl} target="_blank" rel="noreferrer"><Play className="mr-2 h-4 w-4" />{event.status === "replay" ? "Assistir replay" : "Entrar no evento"}</a></Button> : <Button className="w-full" size="lg" disabled>Inscricao confirmada</Button>
            ) : (
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <Button className="w-full" size="lg" onClick={() => setModalOpen(true)}>
                  Inscrever-se
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar inscricao</DialogTitle>
                    <DialogDescription>
                      Voce esta se inscrevendo em "{event.title}" no dia {event.date} as {event.time}.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" className="border-border" onClick={() => setModalOpen(false)}>Cancelar</Button>
                    <Button disabled={registering} onClick={() => void handleConfirmRegistration()}>{registering ? "Confirmando..." : "Confirmar inscricao"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </aside>
      </div>
    </PublicLayout>
  );
};

export default EventDetailPage;
