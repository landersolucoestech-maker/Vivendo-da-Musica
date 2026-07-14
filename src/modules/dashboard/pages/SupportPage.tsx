import { useState } from "react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { useToast } from "@/shared/hooks/use-toast";
import { useSupportTickets, useSupportFaq } from "@/modules/dashboard/hooks/useSupport";
import { studentService } from "@/modules/dashboard/services/student.service";
import { useQueryClient } from "@tanstack/react-query";

const SupportPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tickets, isError: ticketsError } = useSupportTickets();
  const { data: faq, isError: faqError } = useSupportFaq();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await studentService.openSupportTicket({ subject, message });
      await queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast({ title: "Ticket aberto!", description: "Nossa equipe vai responder em breve." });
      setSubject('');
      setMessage('');
    } catch (error) {
      toast({ title: "Não foi possível abrir o ticket", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout>
      <PageHeader title="Suporte" subtitle="Abra um ticket ou consulte as perguntas frequentes." />

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Abrir ticket</h2>
          <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div>
              <Label htmlFor="subject">Assunto</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Enviando..." : "Enviar"}</Button>
          </form>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3 mt-6">Meus tickets</h2>
          <div className="space-y-2">
            {ticketsError && <p className="text-sm text-destructive">Não foi possível carregar seus tickets.</p>}
            {(tickets ?? []).map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">{ticket.id} · {ticket.createdAt}</p>
                </div>
                <StatusBadge status={ticket.status} label={ticket.status} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Perguntas frequentes</h2>
          <Accordion type="single" collapsible>
            {faqError && <p className="text-sm text-destructive">Não foi possível carregar as perguntas frequentes.</p>}
            {(faq ?? []).map((item, i) => (
              <AccordionItem key={item.id} value={`faq-${i}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </StudentLayout>
  );
};

export default SupportPage;
