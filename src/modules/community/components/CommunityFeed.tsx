import { useState } from "react";
import { Flag, Heart, MessageCircle, Plus, Send, Users } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import UserAvatar from "@/shared/components/UserAvatar";
import PaginationControls from "@/shared/components/PaginationControls";
import { usePagination } from "@/shared/hooks/usePagination";
import { useToast } from "@/shared/hooks/use-toast";
import { useCommunityPosts, useCommunityGroups, useCommunityTopTopics, useCommunityFeaturedMembers, useCommunityOnlineMembers } from "@/modules/community/hooks/useCommunity";
import { communityService } from "@/modules/community/services/community.service";

const PAGE_SIZE = 6;

const CommunityFeed = () => {
  const { toast } = useToast();
  const { data: posts, refetch: refetchPosts } = useCommunityPosts();
  const { data: groups, refetch: refetchGroups } = useCommunityGroups();
  const { data: topTopics } = useCommunityTopTopics();
  const { data: featuredMembers } = useCommunityFeaturedMembers();
  const { data: onlineMembers } = useCommunityOnlineMembers();
  const [draft, setDraft] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const { paginatedItems: visiblePosts, currentPage, totalPages, goToPage } = usePagination({ items: posts ?? [], pageSize: PAGE_SIZE });

  const handlePublish = async () => {
    if (!draft.trim()) return;
    try {
      await communityService.createPost(draft);
      await refetchPosts();
      setDraft("");
      toast({ title: "Post publicado", description: "Seu post ja esta visivel para a comunidade." });
    } catch (error) {
      toast({ title: "Nao foi possivel publicar", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    }
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    setBusyId(postId);
    try { await communityService.togglePostLike(postId, isLiked); await refetchPosts(); }
    catch (error) { toast({ title: "Curtida nao atualizada", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  const publishComment = async (postId: string) => {
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    setBusyId(postId);
    try {
      await communityService.createComment(postId, text);
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      await refetchPosts();
    } catch (error) {
      toast({ title: "Comentario nao publicado", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const createGroup = async () => {
    setBusyId("new-group");
    try {
      await communityService.createGroup(groupName, groupDescription);
      await refetchGroups(); setGroupName(""); setGroupDescription(""); setShowGroupForm(false);
      toast({ title: "Grupo criado", description: "O grupo ja esta aberto para novos membros." });
    } catch (error) { toast({ title: "Grupo nao criado", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  const toggleGroup = async (groupId: string, isMember: boolean) => {
    setBusyId(groupId);
    try { await communityService.toggleGroupMembership(groupId, isMember); await refetchGroups(); }
    catch (error) { toast({ title: "Participacao nao atualizada", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  const reportPost = async (postId: string) => {
    const details = window.prompt("Descreva o motivo da denuncia (minimo de 5 caracteres):");
    if (details === null) return;
    if (details.trim().length < 5) { toast({ title: "Detalhes insuficientes", description: "Informe pelo menos 5 caracteres.", variant: "destructive" }); return; }
    setBusyId(postId);
    try { await communityService.reportPost(postId, "other", details); toast({ title: "Denuncia enviada", description: "A equipe de moderacao analisara o conteudo." }); }
    catch (error) { toast({ title: "Denuncia nao enviada", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  return <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
    <div>
      <div className="mb-5 rounded-lg border border-border bg-card p-4">
        <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} placeholder="O que voce quer compartilhar?" className="mb-3 resize-none" />
        <div className="flex justify-end"><Button onClick={() => void handlePublish()} disabled={!draft.trim()}><Send className="mr-2 h-4 w-4" />Publicar</Button></div>
      </div>
      <div className="space-y-4">
        {visiblePosts.length === 0 && <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">Ainda nao ha publicacoes. Inicie a primeira conversa.</div>}
        {visiblePosts.map((post) => <article key={post.id} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-3"><UserAvatar name={post.author} /><div><p className="text-sm font-medium">{post.author}</p><p className="text-xs text-muted-foreground">{post.role} · {post.timeAgo}{post.groupName ? ` · ${post.groupName}` : ""}</p></div></div>
          <p className="mb-3 whitespace-pre-wrap text-sm">{post.text}</p>
          <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
            <button onClick={() => void toggleLike(post.id, post.isLiked)} disabled={busyId === post.id} className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? "text-brand-medium" : "hover:text-foreground"}`}><Heart className={`h-4 w-4 ${post.isLiked ? "fill-brand-medium" : ""}`} />{post.likes}</button>
            <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" />{post.comments.length}</span>
            <button onClick={() => void reportPost(post.id)} disabled={busyId === post.id} className="ml-auto flex items-center gap-1.5 hover:text-destructive"><Flag className="h-4 w-4" />Denunciar</button>
          </div>
          {post.comments.length > 0 && <div className="space-y-2 border-t border-border pt-3">{post.comments.map((comment) => <p key={comment.id} className="text-sm"><span className="font-medium">{comment.author}</span>{" "}<span className="text-muted-foreground">{comment.text}</span></p>)}</div>}
          <div className="mt-3 flex gap-2 border-t border-border pt-3"><Textarea value={commentDrafts[post.id] ?? ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={2000} placeholder="Escreva um comentario..." className="min-h-10 resize-none" /><Button size="sm" disabled={busyId === post.id || !commentDrafts[post.id]?.trim()} onClick={() => void publishComment(post.id)}><Send className="h-4 w-4" /></Button></div>
        </article>)}
      </div>
      <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} className="mt-6" />
    </div>
    <aside className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-4"><h3 className="mb-3 text-sm font-semibold">Membros online</h3>{(onlineMembers ?? []).length === 0 && <p className="text-xs text-muted-foreground">Nenhum membro com presenca ativa agora.</p>}<div className="space-y-2">{(onlineMembers ?? []).map((name) => <div key={name} className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-emerald-400" />{name}</div>)}</div></div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Grupos</h3><Button size="sm" variant="ghost" onClick={() => setShowGroupForm((value) => !value)}><Plus className="h-4 w-4" /></Button></div>
        {showGroupForm && <div className="mb-4 space-y-2"><Input value={groupName} onChange={(event) => setGroupName(event.target.value)} maxLength={100} placeholder="Nome do grupo" /><Textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} maxLength={1000} placeholder="Descricao do grupo" className="min-h-20 resize-none" /><Button size="sm" className="w-full" disabled={busyId === "new-group" || groupName.trim().length < 3 || groupDescription.trim().length < 10} onClick={() => void createGroup()}>Criar grupo</Button></div>}
        <div className="space-y-3">{(groups ?? []).map((group) => <div key={group.id} className="rounded-md border border-border p-2"><p className="text-sm font-medium">{group.name}</p><p className="line-clamp-2 text-xs text-muted-foreground">{group.description}</p><div className="mt-2 flex items-center justify-between"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{group.members.toLocaleString("pt-BR")}</span><Button size="sm" variant={group.isMember ? "outline" : "default"} disabled={busyId === group.id || group.isOwner} onClick={() => void toggleGroup(group.id, group.isMember)}>{group.isOwner ? "Administrador" : group.isMember ? "Sair" : "Participar"}</Button></div></div>)}</div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4"><h3 className="mb-3 text-sm font-semibold">Topicos populares</h3><div className="space-y-2">{(topTopics ?? []).map((topic) => <p key={topic} className="text-sm text-muted-foreground">#{topic}</p>)}</div></div>
      <div className="rounded-lg border border-border bg-card p-4"><h3 className="mb-3 text-sm font-semibold">Ranking</h3><div className="space-y-2">{(featuredMembers ?? []).map((member, index) => <div key={`${member.name}:${index}`} className="flex items-center justify-between text-sm"><span>{index + 1}. {member.name}</span><span className="text-muted-foreground">{member.points} pts</span></div>)}</div></div>
    </aside>
  </div>;
};

export default CommunityFeed;
