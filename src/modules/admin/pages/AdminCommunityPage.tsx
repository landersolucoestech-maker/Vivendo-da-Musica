import { useState } from 'react';
import AdminLayout from '@/app/layouts/AdminLayout';
import PageHeader from '@/shared/components/PageHeader';
import DataTable from '@/shared/components/DataTable';
import LoadingState from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { communityService } from '@/modules/community/services/community.service';
import {
  useCommunityFeaturedMembers,
  useCommunityGroups,
  useCommunityPosts,
  useCommunityReports,
} from '@/modules/community/hooks/useCommunity';

interface ModerationRequest {
  reportId: string;
  action: 'remove' | 'dismiss';
}

const AdminCommunityPage = () => {
  const postsQuery = useCommunityPosts();
  const groupsQuery = useCommunityGroups();
  const featuredMembersQuery = useCommunityFeaturedMembers();
  const reportsQuery = useCommunityReports();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [moderationRequest, setModerationRequest] = useState<ModerationRequest | null>(null);
  const [reason, setReason] = useState('');
  const isLoading = postsQuery.isLoading || groupsQuery.isLoading || featuredMembersQuery.isLoading || reportsQuery.isLoading;
  const hasError = postsQuery.isError || groupsQuery.isError || featuredMembersQuery.isError || reportsQuery.isError;

  const openModeration = (reportId: string, action: ModerationRequest['action']) => {
    setReason('');
    setModerationRequest({ reportId, action });
  };

  const closeModeration = () => {
    if (busyId) return;
    setModerationRequest(null);
    setReason('');
  };

  const moderate = async () => {
    if (!moderationRequest) return;
    if (reason.trim().length < 5) {
      toast({
        title: 'Justificativa insuficiente',
        description: 'Informe pelo menos 5 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setBusyId(moderationRequest.reportId);
    try {
      await communityService.moderateReport(
        moderationRequest.reportId,
        moderationRequest.action,
        reason.trim(),
      );
      await reportsQuery.refetch();
      toast({
        title: 'Moderação concluída',
        description: 'A decisão foi registrada na auditoria.',
      });
      setModerationRequest(null);
      setReason('');
    } catch (error) {
      toast({
        title: 'Moderação não concluída',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Comunidade" subtitle="Posts, grupos, denúncias e ranking de membros." />

      {isLoading && <LoadingState rows={8} />}
      {hasError && (
        <p className="mb-4 text-sm text-destructive">
          Não foi possível carregar todos os dados da comunidade. Verifique sua sessão e tente novamente.
        </p>
      )}

      {!isLoading && !hasError && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Posts recentes</h2>
            <DataTable
              rows={postsQuery.data ?? []}
              rowKey={(post) => post.id}
              emptyLabel="Nenhum post ainda."
              columns={[
                { header: 'Autor', cell: (post) => post.author },
                { header: 'Conteúdo', cell: (post) => post.text },
                { header: 'Curtidas', cell: (post) => post.likes },
                { header: 'Comentários', cell: (post) => post.comments.length },
              ]}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Denúncias pendentes</h2>
            <DataTable
              rows={reportsQuery.data ?? []}
              rowKey={(report) => report.id}
              emptyLabel="Nenhuma denúncia pendente."
              columns={[
                { header: 'Alvo', cell: (report) => `${report.targetType} · ${report.targetId.slice(0, 8)}` },
                { header: 'Motivo', cell: (report) => report.reason },
                { header: 'Detalhes', cell: (report) => report.details ?? 'Não informado' },
                {
                  header: 'Ações',
                  cell: (report) => (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === report.id || report.targetType === 'user'}
                        onClick={() => openModeration(report.id, 'remove')}
                      >
                        Remover
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === report.id}
                        onClick={() => openModeration(report.id, 'dismiss')}
                      >
                        Dispensar
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Grupos</h2>
            <DataTable
              rows={groupsQuery.data ?? []}
              rowKey={(group) => group.id}
              emptyLabel="Nenhum grupo criado ainda."
              columns={[
                { header: 'Grupo', cell: (group) => group.name },
                { header: 'Membros', cell: (group) => group.members.toLocaleString('pt-BR') },
                { header: 'Descrição', cell: (group) => group.description },
              ]}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Ranking de membros</h2>
            <DataTable
              rows={featuredMembersQuery.data ?? []}
              rowKey={(member) => member.name}
              emptyLabel="Sem dados de ranking ainda."
              columns={[
                { header: 'Membro', cell: (member) => member.name },
                { header: 'Papel', cell: (member) => member.role },
                { header: 'Pontos', cell: (member) => member.points },
              ]}
            />
          </section>
        </div>
      )}

      <Dialog open={!!moderationRequest} onOpenChange={(open) => !open && closeModeration()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderationRequest?.action === 'remove' ? 'Remover conteúdo denunciado' : 'Dispensar denúncia'}
            </DialogTitle>
            <DialogDescription>
              Registre uma justificativa objetiva. A decisão ficará vinculada ao histórico de auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="moderation-reason">Justificativa</Label>
            <Textarea
              id="moderation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={5}
              maxLength={2000}
              rows={5}
              placeholder="Descreva o motivo da decisão..."
              disabled={!!busyId}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModeration} disabled={!!busyId}>Cancelar</Button>
            <Button
              variant={moderationRequest?.action === 'remove' ? 'destructive' : 'default'}
              onClick={() => void moderate()}
              disabled={!!busyId || reason.trim().length < 5}
            >
              {busyId ? 'Registrando...' : moderationRequest?.action === 'remove' ? 'Remover conteúdo' : 'Dispensar denúncia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCommunityPage;
