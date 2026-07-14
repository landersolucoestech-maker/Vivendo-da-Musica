import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useVipPlans } from "@/modules/library/hooks/useVip";
import { ROUTES } from "@/shared/constants/routes";

const PlansTeaserSection = () => {
  const { data: plans } = useVipPlans();

  return (
    <section className="bg-background pb-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Planos para todo tipo de produtor</h2>
          <p className="text-muted-foreground">Comece grátis ou desbloqueie conteúdo exclusivo com o Premium.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {(plans ?? []).map((plan) => (
            <div key={plan.name} className={`rounded-lg border p-6 ${plan.highlighted ? 'border-brand-medium bg-brand-medium/5' : 'border-border bg-card'}`}>
              <p className="font-semibold mb-1">{plan.name}</p>
              <p className="text-2xl font-bold mb-4">{plan.priceLabel}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-brand-medium shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to={ROUTES.vipArea}>
                <Button className="w-full">Ver detalhes</Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlansTeaserSection;
