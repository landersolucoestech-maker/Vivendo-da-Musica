import { Zap, Layers, ShoppingBag, ShieldCheck } from "lucide-react";

const STATS = [
  { icon: Zap, value: '+8.500', label: 'Alunos ativos' },
  { icon: Layers, value: '+500', label: 'Cursos' },
  { icon: ShoppingBag, value: '+2.000', label: 'Produtos' },
  { icon: ShieldCheck, value: '+50', label: 'Certificações' },
];

const StatsBar = () => {
  return (
    <section className="bg-background pb-16">
      <div className="container mx-auto px-4">
        <div className="rounded-2xl border border-border bg-card grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-border">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3 px-6 py-5">
              <Icon className="w-5 h-5 text-brand-medium shrink-0" />
              <div>
                <p className="text-xl font-bold leading-none">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
