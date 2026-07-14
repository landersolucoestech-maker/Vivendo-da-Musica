import { CalendarDays, Users } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "@/shared/components/StatusBadge";
import { EVENT_STATUS_LABEL as STATUS_LABEL, type MockEvent } from "@/modules/events/types/event.types";

const EventCard = ({ event }: { event: MockEvent }) => (
  <Link
    to={`/eventos/${event.slug}`}
    className="rounded-lg border border-border bg-card overflow-hidden hover:border-brand-medium/50 transition-colors flex flex-col"
  >
    <div className="aspect-video bg-gradient-brand flex items-center justify-center p-4 relative">
      <span className="text-white font-bold text-center text-sm uppercase tracking-wide">{event.title}</span>
      <div className="absolute top-2 right-2">
        <StatusBadge status={event.status} label={STATUS_LABEL[event.status]} />
      </div>
    </div>
    <div className="p-4 space-y-2">
      <p className="font-semibold leading-snug">{event.title}</p>
      <p className="text-sm text-muted-foreground">com {event.host}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{event.date} · {event.time}</span>
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.attendees}</span>
      </div>
    </div>
  </Link>
);

export default EventCard;
