import { supabase } from "@/integrations/supabase/client";
import type { Opportunity } from "@/modules/opportunities/types/opportunity.types";

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value));

export const opportunitiesService = {
  async listOpportunities(): Promise<Opportunity[]> {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id,kind,title,organization_name,location,engagement_type,status,published_at,created_at,description,application_count')
      .order('published_at', { ascending: false, nullsFirst: false });
    if (error) throw new Error(`Não foi possível carregar as oportunidades: ${error.message}`);

    const { data: auth } = await supabase.auth.getUser();
    let favorites = new Set<string>();
    let applications = new Set<string>();

    if (auth.user) {
      const { data: favoriteRows, error: favoriteError } = await supabase
        .from('opportunity_favorites')
        .select('opportunity_id')
        .eq('user_id', auth.user.id);
      if (favoriteError) throw new Error(`Não foi possível carregar os favoritos: ${favoriteError.message}`);
      favorites = new Set((favoriteRows ?? []).map((row) => row.opportunity_id));

      const { data: applicationRows, error: applicationError } = await supabase
        .from('opportunity_applications')
        .select('opportunity_id')
        .eq('applicant_id', auth.user.id)
        .neq('status', 'withdrawn');
      if (applicationError) throw new Error(`Não foi possível carregar as candidaturas: ${applicationError.message}`);
      applications = new Set((applicationRows ?? []).map((row) => row.opportunity_id));
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      company: row.organization_name,
      location: row.location,
      type: row.engagement_type,
      status: row.status === 'open' ? 'aberta' : 'encerrada',
      postedAt: formatDate(row.published_at ?? row.created_at),
      description: row.description,
      applicantsCount: row.application_count,
      isFavorite: favorites.has(row.id),
      isApplied: applications.has(row.id),
    }));
  },

  async listOpenOpportunities(): Promise<Opportunity[]> {
    return (await this.listOpportunities()).filter((opportunity) => opportunity.status === 'aberta');
  },

  async applyToOpportunity(id: string, coverLetter: string, portfolioUrl?: string): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) throw new Error('Entre na sua conta para se candidatar.');
    const letter = coverLetter.trim();
    if (letter.length < 20) throw new Error('A apresentação deve ter pelo menos 20 caracteres.');
    const { error } = await supabase.from('opportunity_applications').insert({
      opportunity_id: id,
      applicant_id: data.user.id,
      cover_letter: letter,
      portfolio_url: portfolioUrl?.trim() || null,
    });
    if (error?.code === '23505') throw new Error('Você já se candidatou a esta oportunidade.');
    if (error) throw new Error(`Não foi possível enviar a candidatura: ${error.message}`);
  },

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) throw new Error('Entre na sua conta para favoritar.');
    const query = supabase.from('opportunity_favorites');
    const { error } = isFavorite
      ? await query.delete().eq('opportunity_id', id).eq('user_id', data.user.id)
      : await query.insert({ opportunity_id: id, user_id: data.user.id });
    if (error) throw new Error(`Não foi possível atualizar o favorito: ${error.message}`);
  },
};
