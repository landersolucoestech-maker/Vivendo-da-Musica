import { supabase } from "@/integrations/supabase/client";
import type { CommunityGroup, CommunityMember, CommunityPost, CommunityReport, CommunityReportReason } from "@/modules/community/types/community.types";

interface PostRow {
  id: string;
  author_id: string;
  author_name_snapshot: string;
  author_role_snapshot: string;
  content: string;
  like_count: number;
  created_at: string;
  community_comments: { id: string; author_name_snapshot: string; content: string; created_at: string }[] | null;
  community_post_likes: { user_id: string }[] | null;
  community_groups: { name: string } | null;
}

interface GroupRow { id: string; slug: string; name: string; description: string; member_count: number; community_group_members?: { user_id: string; member_role: string }[] | null }

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const table = supabase.from as unknown as (name: string) => any;
const roleLabel = (role: string) => ({ student: "Aluno", producer: "Produtor", instructor: "Instrutor", admin: "Admin", super_admin: "Admin" }[role] ?? "Membro");
const timeAgo = (createdAt: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 1000));
  if (seconds < 60) return "agora";
  if (seconds < 3600) return `ha ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `ha ${Math.floor(seconds / 3600)} h`;
  return `ha ${Math.floor(seconds / 86400)} d`;
};

export const communityService = {
  async listPosts(): Promise<CommunityPost[]> {
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await table("community_posts")
      .select("id,author_id,author_name_snapshot,author_role_snapshot,content,like_count,created_at,community_comments(id,author_name_snapshot,content,created_at),community_post_likes(user_id),community_groups(name)")
      .eq("status", "published").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(`Nao foi possivel carregar o feed: ${error.message}`);
    return ((data ?? []) as PostRow[]).map((post) => ({
      id: post.id,
      authorId: post.author_id,
      author: post.author_name_snapshot,
      role: roleLabel(post.author_role_snapshot),
      timeAgo: timeAgo(post.created_at),
      createdAt: post.created_at,
      text: post.content,
      likes: post.like_count,
      isLiked: Boolean(authData.user && post.community_post_likes?.some((like) => like.user_id === authData.user?.id)),
      groupName: post.community_groups?.name ?? null,
      comments: (post.community_comments ?? []).map((comment) => ({ id: comment.id, author: comment.author_name_snapshot, text: comment.content, createdAt: comment.created_at })),
    }));
  },

  async listGroups(): Promise<CommunityGroup[]> {
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await table("community_groups").select("id,slug,name,description,member_count,community_group_members(user_id,member_role)").eq("status", "active").eq("visibility", "public").order("member_count", { ascending: false }).limit(20);
    if (error) throw new Error(`Nao foi possivel carregar os grupos: ${error.message}`);
    return ((data ?? []) as GroupRow[]).map((group) => ({ id: group.id, slug: group.slug, name: group.name, description: group.description, members: group.member_count, isMember: Boolean(authData.user && group.community_group_members?.some((member) => member.user_id === authData.user?.id)), isOwner: Boolean(authData.user && group.community_group_members?.some((member) => member.user_id === authData.user?.id && member.member_role === "owner")) }));
  },

  async createGroup(name: string, description: string): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) throw new Error("Entre na sua conta para criar um grupo.");
    const cleanName = name.trim(); const cleanDescription = description.trim(); const baseSlug = slugify(cleanName);
    if (cleanName.length < 3 || cleanName.length > 100) throw new Error("O nome deve ter entre 3 e 100 caracteres.");
    if (cleanDescription.length < 10 || cleanDescription.length > 1000) throw new Error("A descricao deve ter entre 10 e 1.000 caracteres.");
    const { error } = await table("community_groups").insert({ owner_id: data.user.id, name: cleanName, description: cleanDescription, slug: `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`, visibility: "public" });
    if (error) throw new Error(`Nao foi possivel criar o grupo: ${error.message}`);
  },

  async toggleGroupMembership(groupId: string, isMember: boolean): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) throw new Error("Entre na sua conta para participar.");
    const query = table("community_group_members");
    const { error } = isMember ? await query.delete().eq("group_id", groupId).eq("user_id", data.user.id) : await query.insert({ group_id: groupId, user_id: data.user.id });
    if (error) throw new Error(isMember ? `Nao foi possivel sair do grupo: ${error.message}` : `Nao foi possivel entrar no grupo: ${error.message}`);
  },

  async reportPost(postId: string, reason: CommunityReportReason, details?: string): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) throw new Error("Entre na sua conta para denunciar.");
    const { error } = await table("community_reports").insert({ reporter_id: data.user.id, target_type: "post", target_id: postId, reason, details: details?.trim() || null });
    if (error?.code === "23505") throw new Error("Voce ja denunciou esta publicacao.");
    if (error) throw new Error(`Nao foi possivel enviar a denuncia: ${error.message}`);
  },

  async listReports(): Promise<CommunityReport[]> {
    const { data, error } = await table("community_reports").select("id,target_type,target_id,reason,details,status,created_at").in("status", ["open", "reviewing"]).order("created_at", { ascending: true });
    if (error) throw new Error(`Nao foi possivel carregar as denuncias: ${error.message}`);
    return (data ?? []).map((report: any) => ({ id: report.id, targetType: report.target_type, targetId: report.target_id, reason: report.reason, details: report.details, status: report.status, createdAt: report.created_at }));
  },

  async moderateReport(reportId: string, action: "remove" | "dismiss", reason: string): Promise<void> {
    const rpc = supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    const { error } = await rpc("moderate_community_report", { p_report_id: reportId, p_action: action, p_reason: reason });
    if (error) throw new Error(`Nao foi possivel concluir a moderacao: ${error.message}`);
  },

  async listTopTopics(): Promise<string[]> {
    const posts = await this.listPosts();
    const hashtags = posts.flatMap((post) => post.text.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((tag) => tag.slice(1).toLowerCase());
    const counts = new Map<string, number>();
    hashtags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);
  },

  async listFeaturedMembers(): Promise<CommunityMember[]> {
    const posts = await this.listPosts();
    const members = new Map<string, CommunityMember>();
    posts.forEach((post) => {
      const current = members.get(post.authorId) ?? { name: post.author, role: post.role, points: 0 };
      current.points += 10 + post.likes * 2 + post.comments.length * 3;
      members.set(post.authorId, current);
    });
    return [...members.values()].sort((a, b) => b.points - a.points).slice(0, 5);
  },

  async listOnlineMembers(): Promise<string[]> { return []; },

  async createPost(text: string): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) throw new Error("Entre na sua conta para publicar.");
    const content = text.trim();
    if (!content || content.length > 5000) throw new Error("O post deve ter entre 1 e 5.000 caracteres.");
    const { error } = await table("community_posts").insert({ author_id: data.user.id, content, status: "published" });
    if (error) throw new Error(`Nao foi possivel publicar: ${error.message}`);
  },

  async togglePostLike(postId: string, isLiked: boolean): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) throw new Error("Entre na sua conta para curtir.");
    const query = table("community_post_likes");
    const { error } = isLiked
      ? await query.delete().eq("post_id", postId).eq("user_id", data.user.id)
      : await query.insert({ post_id: postId, user_id: data.user.id });
    if (error) throw new Error(`Nao foi possivel atualizar a curtida: ${error.message}`);
  },

  async createComment(postId: string, text: string): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) throw new Error("Entre na sua conta para comentar.");
    const content = text.trim();
    if (!content || content.length > 2000) throw new Error("O comentario deve ter entre 1 e 2.000 caracteres.");
    const { error } = await table("community_comments").insert({ post_id: postId, author_id: data.user.id, content, status: "published" });
    if (error) throw new Error(`Nao foi possivel comentar: ${error.message}`);
  },
};
