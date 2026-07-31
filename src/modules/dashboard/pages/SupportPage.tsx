import { useState } from 'react';
import { HelpCircle, LifeBuoy, MessageSquarePlus, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useSupportFaq, useSupportTickets } from '@/modules/dashboard/hooks/useSupport';
import { studentService } from '@/modules/dashboard/services/student.service';
import StatusBadge from '@/shared/components/StatusBadge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  pending: 'Pendente',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
  closed: 'Encerrado',
};

const SupportPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tickets, isError: ticketsError } = useSupportTickets();
  const { data: faq, isError: faqError } = useSupportFaq();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await studentService.openSupportTicket({ subject, message });
      await queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast({ title: 'Solicitação enviada', description: 'Seu atendimento foi registrado com sucesso.' });
      setSubject('');
      setMessage('');
    } catch (error) {
      toast({
        title: 'Não foi possível abrir a solicitação',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Atendimento</p>
        <h1 className="vdm-page-title mt-2">Central de suporte</h1>
        <p className="vdm-page-description">Abra uma solicitação, acompanhe atendimentos anteriores e consulte respostas rápidas.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card className="border-white/12 bg-card/95">
            <CardHeader>
              <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary">
                <MessageSquarePlus className="size-5" />
              </span>
              <CardTitle className="text-xl">Nova solicitação</CardTitle>
              <CardDescription>Descreva o assunto e forneça os detalhes necessários para o atendimento.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: dificuldade para acessar uma aula" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explique o que aconteceu, em qual página e o resultado esperado." rows={7} className="resize-none" required />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  <Send className="size-4" />
                  {submitting ? 'Enviando...' : 'Enviar solicitação'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary"><LifeBuoy className="size-5" /></span>
              <div>
                <h2 className="font-display text-xl font-semibold text-white">Meus atendimentos</h2>
                <p className="text-sm text-muted-foreground">Histórico e situação das solicitações abertas.</p>
              </div>
            </div>

            <div className="space-y-3">
              {ticketsError && <p className="rounded-xl border border-destructive/25 bg-destructive/8 p-4 text-sm text-red-300">Não foi possível carregar seus atendimentos.</p>}
              {!ticketsError && (tickets ?? []).length === 0 && (
                <div className="vdm-surface py-10 text-center text-sm text-muted-foreground">Nenhuma solicitação registrada.</div>
              )}
              {(tickets ?? []).map((ticket) => (
                <article key={ticket.id} className="vdm-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">#{ticket.id.slice(0, 8).toUpperCase()} · {ticket.createdAt}</p>
                  </div>
                  <StatusBadge status={ticket.status} label={STATUS_LABELS[ticket.status] ?? ticket.status} />
                </article>
              ))}
            </div>
          </section>
        </div>

        <Card className="h-fit border-white/12 bg-card/95 xl:sticky xl:top-24">
          <CardHeader>
            <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary">
              <HelpCircle className="size-5" />
            </span>
            <CardTitle className="text-xl">Perguntas frequentes</CardTitle>
            <CardDescription>Respostas rápidas para dúvidas comuns sobre acesso, cursos, pedidos e conta.</CardDescription>
          </CardHeader>
          <CardContent>
            {faqError ? (
              <p className="text-sm text-red-300">Não foi possível carregar as perguntas frequentes.</p>
            ) : (
              <Accordion type="single" collapsible>
                {(faq ?? []).map((item, index) => (
                  <AccordionItem key={item.id} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                    <AccordionContent className="leading-6 text-muted-foreground">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default SupportPage;
