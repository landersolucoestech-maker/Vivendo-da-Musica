import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageSquareText } from 'lucide-react';

import AdminLayout from '@/app/layouts/AdminLayout';
import { adminSupportService, type AdminSupportMessage, type SupportMessageStatus } from '@/modules/admin/services/adminSupport.service';
import DataTable from '@/shared/components/DataTable';
import PageHeader from '@/shared/components/PageHeader';
import StatCard from '@/shared/components/StatCard';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';

const statusLabel: Record<SupportMessageStatus, string> = {
  new: 'Nova',
  in_progress: 'Em atendimento',
  resolved: 'Resolvida',
  archived: 'Arquivada',
};

const AdminSupportPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<AdminSupportMessage | null>(null);
  const messages = useQuery({ queryKey: ['admin-support-messages'], queryFn: () => adminSupportService.listMessages() });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportMessageStatus }) => adminSupportService.updateStatus(id, status),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-support-messages'] });
      setSelected((current) => current?.id === variables.id ? { ...current, status: variables.status } : current);
      toast({ title: 'Status atualizado' });
    },
    onError: (error) => toast({ title: 'Não foi possível atualizar', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const rows = messages.data ?? [];
  const openCount = rows.filter((message) => message.status === 'new' || message.status === 'in_progress').length;
  const resolvedCount = rows.filter((message) => message.status === 'resolved').length;

  return (
    <AdminLayout>
      <PageHeader title="Suporte" subtitle="Mensagens persistidas pelos canais de contato da plataforma." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total de mensagens" value={String(rows.length)} icon={MessageSquareText} />
        <StatCard label="Pendentes" value={String(openCount)} icon={Mail} />
        <StatCard label="Resolvidas" value={String(resolvedCount)} />
      </div>

      {messages.isLoading && <p className="text-sm text-muted-foreground">Carregando mensagens...</p>}
      {messages.isError && <p className="text-sm text-destructive">Não foi possível carregar as mensagens de suporte.</p>}
      {!messages.isLoading && !messages.isError && (
        <DataTable
          rows={rows}
          rowKey={(message) => message.id}
          emptyLabel="Nenhuma mensagem recebida."
          columns={[
            { header: 'Assunto', cell: (message) => message.subject },
            { header: 'Solicitante', cell: (message) => message.name },
            { header: 'E-mail', cell: (message) => message.email },
            { header: 'Recebida em', cell: (message) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(message.created_at)) },
            { header: 'Status', cell: (message) => <StatusBadge status={message.status} label={statusLabel[message.status]} /> },
            { header: '', cell: (message) => <Button size="sm" variant="outline" onClick={() => setSelected(message)}>Visualizar</Button> },
          ]}
        />
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
            <DialogDescription>{selected?.name} · {selected?.email}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-sm leading-7 text-muted-foreground whitespace-pre-wrap">{selected.message}</div>
              <div className="flex flex-wrap gap-2">
                {(['new', 'in_progress', 'resolved', 'archived'] as SupportMessageStatus[]).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={selected.status === status ? 'default' : 'outline'}
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: selected.id, status })}
                  >
                    {statusLabel[status]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSupportPage;
