import { useState } from 'react';
import { Eye, HelpCircle, LifeBuoy, MessageSquarePlus, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useSupportFaq, useSupportTickets } from '@/modules/dashboard/hooks/useSupport';
import { studentService } from '@/modules/dashboard/services/student.service';
import type { SupportTicket } from '@/modules/dashboard/types/support.types';
import StatusBadge from '@/shared/components/StatusBadge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

const STATUS_LABELS: Record<SupportTicket['status'], string> = {
  aberto: 'Aberto',
  'em-andamento': 'Em atendimento',
  resolvido: 'Resolvido',
};

const PRIORITY_LABELS: Record<SupportTicket['priority'], string> = {
  baixa: 'Baixa',
  média: 'Média',
  alta: 'Alta',
};

const SupportPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tickets, isError: ticketsError } = useSupportTickets();
  const { data: faq, isError: faqError } = useSupportFaq();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<SupportTicket | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await studentService.openSupportTicket({ subject, message });
      await queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast({ title: 'Solicitação enviada', description: 'Seu atendimento foi registrado com sucesso.' });
      setSubject('');
      setMessage('');
      setCreateOpen(false);
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
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="vdm-eyebrow">Atendimento</p>
          <h1 className="vdm-page-title mt-2">Central de suporte</h1>
          <p className="vdm-page-description">Abra uma solicitação em popup, visualize atendimentos anteriores e consulte respostas rápidas.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <MessageSquarePlus className="size-4" />
          Nova solicitação
        </Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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
                  <p className="mt-1 text-xs text-muted-foreground">#{ticket.id.toUpperCase()} · {ticket.createdAt} · prioridade {PRIORITY_LABELS[ticket.priority].toLowerCase()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} label={STATUS_LABELS[ticket.status]} />
                  <Button size="sm" variant="outline" onClick={() => setViewing(ticket)}>
                    <Eye className="size-4" />Visualizar
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

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

      <Dialog open={createOpen} onOpenChange={(open) => !submitting && setCreateOpen(open)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nova solicitação</DialogTitle>
            <DialogDescription>Descreva o assunto e forneça os detalhes necessários para o atendimento.</DialogDescription>
          </DialogHeader>
          <form id="support-request-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: dificuldade para acessar uma aula" required minLength={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explique o que aconteceu, em qual página e o resultado esperado." rows={7} className="resize-none" required minLength={10} />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button form="support-request-form" type="submit" disabled={submitting}>
              <Send className="size-4" />{submitting ? 'Enviando...' : 'Enviar solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Visualizar solicitação</DialogTitle>
            <DialogDescription>Dados registrados para acompanhamento do atendimento.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-5">
              <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Protocolo</p><p className="mt-1 font-mono text-sm text-white">{viewing.id.toUpperCase()}</p></div>
                <div><p className="text-xs text-muted-foreground">Criado em</p><p className="mt-1 text-white">{viewing.createdAt}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={viewing.status} label={STATUS_LABELS[viewing.status]} /></div></div>
                <div><p className="text-xs text-muted-foreground">Prioridade</p><p className="mt-1 text-white">{PRIORITY_LABELS[viewing.priority]}</p></div>
              </div>
              <div><p className="text-xs text-muted-foreground">Assunto</p><p className="mt-2 font-semibold text-white">{viewing.subject}</p></div>
              <div><p className="text-xs text-muted-foreground">Mensagem</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-white">{viewing.message}</p></div>
              <div><p className="text-xs text-muted-foreground">Solicitante</p><p className="mt-2 text-sm text-white">{viewing.requester}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default SupportPage;
