export type EventStatus = 'upcoming' | 'live' | 'replay';

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  upcoming: 'Próximo',
  live: 'Ao vivo',
  replay: 'Replay',
};

export interface AgendaItem {
  time: string;
  title: string;
}

export interface MockEvent {
  id: string;
  slug: string;
  title: string;
  host: string;
  speakers: string[];
  category: string;
  status: EventStatus;
  date: string;
  time: string;
  location: string;
  description: string;
  attendees: number;
  isRegistered: boolean;
  agenda: AgendaItem[];
  accessUrl: string | null;
}

export interface EventRegistration { eventId: string; userId: string; attendeeName: string; eventTitle: string; status: 'confirmed' | 'cancelled' | 'attended'; registeredAt: string }
export interface EventCertificate { id: string; eventTitle: string; verificationCode: string; issuedAt: string }
