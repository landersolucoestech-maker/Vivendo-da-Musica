import { Link } from "react-router-dom";
import { Check, Users, Library, CalendarDays, GraduationCap } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Button } from "@/shared/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { ROUTES } from "@/shared/constants/routes";
import { useVipPlans, useVipBenefits, useVipTestimonials, useVipFaq } from "@/modules/library/hooks/useVip";

const FEATURE_CARDS = [
  { icon: Users, title: 'Comunidade VIP', description: 'Grupo exclusivo para assinantes Premium.' },
  { icon: Library, title: 'Biblioteca Premium', description: 'Aulas, templates e presets exclusivos.' },
  { icon: CalendarDays, title: 'Eventos com prioridade', description: 'Acesso antecipado e descontos em eventos.' },
  { icon: GraduationCap, title: 'Mentorias em grupo', description: 'Encontros mensais com instrutores.' },
];

const VipAreaPage = () => {
  const { data: plans } = useVipPlans();
  const { data: benefits } = useVipBenefits();
  const { data: testimonials } = useVipTestimonials();
  const { data: faq } = useVipFaq();

  return (
  <PublicLayout>
    <section className="text-center max-w-2xl mx-auto mb-16">
      <p className="text-brand-medium font-medium mb-2">Área VIP</p>
      <h1 className="text-3xl font-bold mb-4">Leve sua música mais longe com o Premium</h1>
      <p className="text-muted-foreground mb-6">
        Conteúdo exclusivo, comunidade fechada e mentorias para quem quer acelerar a carreira na música.
      </p>
      <Link to={ROUTES.register}>
        <Button size="lg">Quero ser Premium</Button>
      </Link>
    </section>

    <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
      {FEATURE_CARDS.map(({ icon: Icon, title, description }) => (
        <div key={title} className="rounded-lg border border-border bg-card p-5">
          <Icon className="w-6 h-6 text-brand-medium mb-3" />
          <p className="font-semibold mb-1">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      ))}
    </section>

    <section className="mb-16">
      <h2 className="text-2xl font-bold text-center mb-8">Benefícios Premium</h2>
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {(benefits ?? []).map((benefit) => (
          <div key={benefit.title} className="flex gap-3">
            <Check className="w-5 h-5 text-brand-medium shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{benefit.title}</p>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="mb-16">
      <h2 className="text-2xl font-bold text-center mb-8">Planos</h2>
      <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
        {(plans ?? []).map((plan) => (
          <div
            key={plan.name}
            className={`rounded-lg border p-6 ${plan.highlighted ? 'border-brand-medium bg-brand-medium/5' : 'border-border bg-card'}`}
          >
            <p className="font-semibold mb-1">{plan.name}</p>
            <p className="text-2xl font-bold mb-4">{plan.priceLabel}</p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-medium shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link to={ROUTES.register}>
              <Button className="w-full">Assinar</Button>
            </Link>
          </div>
        ))}
      </div>
    </section>

    <section className="mb-16">
      <h2 className="text-2xl font-bold text-center mb-8">O que dizem os assinantes</h2>
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {(testimonials ?? []).map((testimonial) => (
          <div key={testimonial.name} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-3">"{testimonial.text}"</p>
            <p className="font-medium text-sm">{testimonial.name}</p>
            <p className="text-xs text-muted-foreground">{testimonial.role}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-8">Perguntas frequentes</h2>
      <Accordion type="single" collapsible>
        {(faq ?? []).map((item, i) => (
          <AccordionItem key={item.question} value={`item-${i}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  </PublicLayout>
  );
};

export default VipAreaPage;
