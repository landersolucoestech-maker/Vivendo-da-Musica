import { useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import CompanyLayout from '@/app/layouts/CompanyLayout';
import { useCompanyConversations } from '@/modules/company/hooks/useCompanyPortal';
import { companyService } from '@/modules/company/services/company.service';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Nova',
  reviewing: 'Em análise',
  shortlisted: 'Pré-selecionada',
  interview: 'Entrevista',
  approved: 'Aprovada',
  rejected: 'Recusada',
  withdrawn: 'Retirada',
};

const CompanyMessagesPage = () => {
  const { data, isLoading, isError, error, refetch } = useCompanyConversations();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => {
    const conversations = data ?? [];
    return conversations.find((item) => item.applicationId === selectedId) ?? conversations[0] ?? null;
  }, [data, selectedId]);
  const selectedApplicationId = selected?.applicationId ?? null;
  const selectedUnreadCount = selected?.unreadCount ?? 0;

  useEffect(() => {
    if (!selectedApplicationId || selectedUnreadCount < 1) return;

    const markRead = async () => {
      try {
        await companyService.markConversationRead(selectedApplicationId);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['company-conversations'] }),
          queryClient.invalidateQueries({ queryKey: ['company-dashboard'] }),
        ]);
      } catch {
        // Reading the conversation remains available even when the read receipt fails.
      }
    };

    void markRead();
  }, [queryClient, selectedApplicationId, selectedUnreadCount]);

  const selectConversation = (applicationId: string) => {
    setSelectedId(applicationId);
  };

  const send = async () => {
    if (!selected || !message.trim()) return;
    setBusy(true);
    try {
      await companyService.sendMessage(selected.applicationId, message);
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['company-conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['company-dashboard'] });
    } catch (sendError) {
      toast({ title: 'Mensagem não enviada', description: sendError instanceof Error ? sendError.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CompanyLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Comunicação com candidatos</p>
        <h1 className="vdm-page-title mt-2">Mensagens</h1>
        <p className="vdm-page-description">Centralize convites, atualizações e retornos de cada processo seletivo.</p>
      </header>

      {isLoading ? <LoadingState rows={3} className="h-56 rounded-xl" /> : isError ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : !data?.length ? (
        <EmptyState icon={MessageSquareText} title="Nenhuma conversa iniciada" description="As conversas aparecerão após uma resposta ser enviada ao candidato." />
      ) : (
        <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-white/10 bg-card lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-sm font-semibold text-white">Conversas</p>
              <p className="mt-1 text-xs text-muted-foreground">{data.length} processos com comunicação</p>
            </div>
            <div className="max-h-[620px] overflow-y-auto p-2">
              {data.map((conversation) => (
                <button
                  key={conversation.applicationId}
                  type="button"
                  onClick={() => selectConversation(conversation.applicationId)}
                  className={`w-full rounded-xl p-4 text-left transition ${selected?.applicationId === conversation.applicationId ? 'bg-primary/12 ring-1 ring-primary/30' : 'hover:bg-white/[0.04]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{conversation.candidateName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.opportunityTitle}</p>
                    </div>
                    {conversation.unreadCount > 0 && <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{conversation.unreadCount}</span>}
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{conversation.messages.at(-1)?.body ?? 'Conversa ainda sem mensagens.'}</p>
                </button>
              ))}
            </div>
          </aside>

          {selected && (
            <section className="flex min-h-0 flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <p className="font-semibold text-white">{selected.candidateName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.candidateHeadline} · {selected.opportunityTitle}</p>
                </div>
                <Badge variant="outline">{STATUS_LABELS[selected.status]}</Badge>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5 lg:max-h-[470px]">
                {!selected.messages.length ? (
                  <div className="flex h-full min-h-72 items-center justify-center text-center text-sm text-muted-foreground">Envie a primeira mensagem deste processo.</div>
                ) : selected.messages.map((item) => (
                  <div key={item.id} className={`flex ${item.senderType === 'company' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${item.senderType === 'company' ? 'bg-primary text-white' : 'border border-white/10 bg-white/[0.04] text-[#e7e7e7]'}`}>
                      <p className="whitespace-pre-wrap text-sm leading-6">{item.body}</p>
                      <p className={`mt-2 text-[11px] ${item.senderType === 'company' ? 'text-white/65' : 'text-muted-foreground'}`}>{new Date(item.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 p-4">
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={5000} placeholder="Escreva uma mensagem objetiva para o candidato." />
                <div className="mt-3 flex justify-end">
                  <Button disabled={busy || !message.trim()} onClick={() => void send()}>{busy ? 'Enviando...' : 'Enviar mensagem'}<Send className="size-4" /></Button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </CompanyLayout>
  );
};

export default CompanyMessagesPage;
