import { useState } from "react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { communityService } from "@/modules/community/services/community.service";
import { useCommunityPosts, useCommunityGroups, useCommunityFeaturedMembers, useCommunityReports } from "@/modules/community/hooks/useCommunity";

const AdminCommunityPage = () => {
  const { data: posts } = useCommunityPosts();
  const { data: groups } = useCommunityGroups();
  const { data: featuredMembers } = useCommunityFeaturedMembers();
  const { data: reports, refetch: refetchReports } = useCommunityReports();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const moderate = async (reportId: string, action: "remove" | "dismiss") => {
    const reason = window.prompt(action === "remove" ? "Justificativa para remover o conteudo:" : "Justificativa para dispensar a denuncia:");
    if (reason === null) return;
    if (reason.trim().length < 5) { toast({ title: "Justificativa insuficiente", description: "Informe pelo menos 5 caracteres.", variant: "destructive" }); return; }
    setBusyId(reportId);
    try { await communityService.moderateReport(reportId, action, reason); await refetchReports(); toast({ title: "Moderacao concluida", description: "A decisao foi registrada na auditoria." }); }
    catch (error) { toast({ title: "Moderacao nao concluida", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  return <AdminLayout>
    <PageHeader title="Comunidade" subtitle="Posts, grupos, denuncias e ranking de membros." />
    <div className="space-y-8">
      <section><h2 className="mb-3 text-sm font-semibold text-muted-foreground">Posts recentes</h2><DataTable rows={posts ?? []} rowKey={(post) => post.id} emptyLabel="Nenhum post ainda." columns={[
        { header: "Autor", cell: (post) => post.author }, { header: "Conteudo", cell: (post) => post.text }, { header: "Curtidas", cell: (post) => post.likes }, { header: "Comentarios", cell: (post) => post.comments.length },
      ]} /></section>
      <section><h2 className="mb-3 text-sm font-semibold text-muted-foreground">Denuncias pendentes</h2><DataTable rows={reports ?? []} rowKey={(report) => report.id} emptyLabel="Nenhuma denuncia pendente." columns={[
        { header: "Alvo", cell: (report) => `${report.targetType} · ${report.targetId.slice(0, 8)}` },
        { header: "Motivo", cell: (report) => report.reason },
        { header: "Detalhes", cell: (report) => report.details ?? "Nao informado" },
        { header: "Acoes", cell: (report) => <div className="flex gap-2"><Button size="sm" variant="destructive" disabled={busyId === report.id || report.targetType === "user"} onClick={() => void moderate(report.id, "remove")}>Remover</Button><Button size="sm" variant="outline" disabled={busyId === report.id} onClick={() => void moderate(report.id, "dismiss")}>Dispensar</Button></div> },
      ]} /></section>
      <section><h2 className="mb-3 text-sm font-semibold text-muted-foreground">Grupos</h2><DataTable rows={groups ?? []} rowKey={(group) => group.id} emptyLabel="Nenhum grupo criado ainda." columns={[
        { header: "Grupo", cell: (group) => group.name }, { header: "Membros", cell: (group) => group.members.toLocaleString("pt-BR") }, { header: "Descricao", cell: (group) => group.description },
      ]} /></section>
      <section><h2 className="mb-3 text-sm font-semibold text-muted-foreground">Ranking de membros</h2><DataTable rows={featuredMembers ?? []} rowKey={(member) => member.name} emptyLabel="Sem dados de ranking ainda." columns={[
        { header: "Membro", cell: (member) => member.name }, { header: "Papel", cell: (member) => member.role }, { header: "Pontos", cell: (member) => member.points },
      ]} /></section>
    </div>
  </AdminLayout>;
};

export default AdminCommunityPage;
