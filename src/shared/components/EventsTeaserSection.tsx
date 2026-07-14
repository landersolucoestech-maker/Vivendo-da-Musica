import { Link } from "react-router-dom";
import EventCard from "@/shared/components/EventCard";
import { useUpcomingEvents } from "@/modules/events/hooks/useEvents";
import { ROUTES } from "@/shared/constants/routes";

const EventsTeaserSection = () => {
  const { data: upcoming } = useUpcomingEvents();

  return (
    <section className="bg-background pb-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Próximos eventos</h2>
          <Link to={ROUTES.eventsPublic} className="text-sm text-brand-medium hover:underline">Ver todos</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(upcoming ?? []).slice(0, 4).map((event) => <EventCard key={event.slug} event={event} />)}
        </div>
      </div>
    </section>
  );
};

export default EventsTeaserSection;
