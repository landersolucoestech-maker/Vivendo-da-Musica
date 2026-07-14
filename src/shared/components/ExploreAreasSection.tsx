import {
  Music, SlidersHorizontal, Headphones, Grid3x3, Home,
  Megaphone, ShieldCheck, Share2, Brain, Briefcase,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

const AREAS = [
  { icon: Music, label: 'Produção Musical' },
  { icon: SlidersHorizontal, label: 'Mixagem' },
  { icon: Headphones, label: 'Masterização' },
  { icon: Grid3x3, label: 'Beatmaking' },
  { icon: Home, label: 'Home Studio' },
  { icon: Megaphone, label: 'Marketing Musical' },
  { icon: ShieldCheck, label: 'Direitos Autorais' },
  { icon: Share2, label: 'Distribuição' },
  { icon: Brain, label: 'IA para Música' },
  { icon: Briefcase, label: 'Negócios da Música' },
];

const ExploreAreasSection = () => {
  return (
    <section className="bg-background pb-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Explore nossas áreas</h2>
          <Link to={ROUTES.academy} className="text-sm text-brand-medium hover:underline">
            Ver todas
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {AREAS.map(({ icon: Icon, label }) => (
            <Link
              key={label}
              to={ROUTES.academy}
              className="rounded-lg border border-border bg-card p-5 flex flex-col items-center gap-3 text-center hover:border-brand-medium/50 transition-colors"
            >
              <Icon className="w-6 h-6 text-brand-medium" />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExploreAreasSection;
