import { useQuery } from "@tanstack/react-query";
import { eventsService } from "@/modules/events/services/events.service";

export const useEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => eventsService.listEvents(),
  });
};

export const useEventCategories = () => {
  return useQuery({
    queryKey: ['event-categories'],
    queryFn: () => eventsService.listCategories(),
  });
};

export const useEventDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['event-detail', slug],
    queryFn: () => eventsService.getEventBySlug(slug!),
    enabled: !!slug,
  });
};

export const useUpcomingEvents = () => {
  return useQuery({
    queryKey: ['events-upcoming'],
    queryFn: () => eventsService.listUpcomingEvents(),
  });
};

export const useRegisteredEvents = () => {
  return useQuery({
    queryKey: ['events-registered'],
    queryFn: () => eventsService.listRegisteredEvents(),
  });
};

export const useReplayEvents = () => {
  return useQuery({
    queryKey: ['events-replay'],
    queryFn: () => eventsService.listReplayEvents(),
  });
};

export const useEventRegistrations = () => useQuery({ queryKey: ['event-registrations'], queryFn: () => eventsService.listRegistrations() });
export const useEventCertificates = () => useQuery({ queryKey: ['event-certificates'], queryFn: () => eventsService.listCertificates() });
