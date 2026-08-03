import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import type {
  CompanyApplicationStatus,
  CompanyCandidate,
  CompanyConversation,
  CompanyCreditBalance,
  CompanyCreditEvent,
  CompanyDashboardData,
  CompanyMessage,
  CompanyOpportunity,
  CompanyOpportunityInput,
  CompanyProfile,
  JobCreditPack,
} from '@/modules/company/types/company.types';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

const table = supabase.from as unknown as (name: string) => any;

interface CompanyContext {
  userId: string;
  companyId: string;
  profile: CompanyProfile;
}

interface BasicProfileRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CandidateProfileRow {
  user_id: string;
  headline: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  experience_years: number;
  skills: string[];
  preferred_roles: string[];
  portfolio_url: string | null;
  resume_url: string | null;
  availability: string;
}

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error && !isDevAuthBypassEnabled) {
    throw new Error('Entre com uma conta empresarial para acessar este portal.');
  }
  return getEffectiveUserId(data.user?.id ?? null);
};

const getAuthorizationHeaders = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error && !isDevAuthBypassEnabled) throw new Error(error.message);
  const token = data.session?.access_token ?? env.supabasePublishableKey;
  return {
    apikey: env.supabasePublishableKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const callRpc = async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: await getAuthorizationHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(payload?.message ?? payload?.error ?? 'Não foi possível concluir a operação.');
  }

  return response.json() as Promise<T>;
};

const mapProfile = (row: any): CompanyProfile => ({
  id: row.id,
  slug: row.slug,
  displayName: row.display_name,
  legalName: row.legal_name ?? '',
  description: row.description ?? '',
  websiteUrl: row.website_url ?? '',
  logoUrl: row.logo_url ?? '',
  industry: row.industry ?? '',
  city: row.city ?? '',
  state: row.state ?? '',
  country: row.country ?? 'Brasil',
  verificationStatus: row.verification_status,
});

const mapOpportunity = (row: any): CompanyOpportunity => ({
  id: row.id,
  title: row.title,
  kind: row.kind,
  location: row.location,
  engagementType: row.engagement_type,
  status: row.status,
  description: row.description,
  requirements: row.requirements ?? [],
  benefits: row.benefits ?? [],
  salaryMinCents: row.salary_min_cents,
  salaryMaxCents: row.salary_max_cents,
  currency: row.currency,
  workMode: row.work_mode,
  applicationDeadline: row.application_deadline,
  applicationCount: row.application_count,
  publishedAt: row.published_at,
  postingExpiresAt: row.posting_expires_at ?? null,
  renewalCount: Number(row.renewal_count ?? 0),
  createdAt: row.created_at,
});

const loadContext = async (): Promise<CompanyContext> => {
  const userId = await getUserId();
  const { data: member, error: memberError } = await table('company_members')
    .select('company_id, member_role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (memberError) throw new Error(`Não foi possível identificar a empresa: ${memberError.message}`);
  if (!member) throw new Error('Esta conta ainda não está vinculada a uma empresa ativa.');

  const { data: profile, error: profileError } = await table('company_profiles')
    .select('id, slug, display_name, legal_name, description, website_url, logo_url, industry, city, state, country, verification_status')
    .eq('id', member.company_id)
    .single();
  if (profileError) throw new Error(`Não foi possível carregar o perfil empresarial: ${profileError.message}`);
  return { userId, companyId: member.company_id, profile: mapProfile(profile) };
};

const listOpportunitiesForContext = async (context: CompanyContext): Promise<CompanyOpportunity[]> => {
  const { data, error } = await table('opportunities')
    .select('id, title, kind, location, engagement_type, status, description, requirements, benefits, salary_min_cents, salary_max_cents, currency, work_mode, application_deadline, application_count, published_at, posting_expires_at, renewal_count, created_at')
    .eq('company_id', context.companyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Não foi possível carregar as oportunidades: ${error.message}`);
  return (data ?? []).map(mapOpportunity);
};

const listCandidatesForContext = async (context: CompanyContext): Promise<CompanyCandidate[]> => {
  const opportunities = await listOpportunitiesForContext(context);
  const opportunityIds = opportunities.map((item) => item.id);
  if (!opportunityIds.length) return [];

  const { data: applications, error: applicationsError } = await table('opportunity_applications')
    .select('id, opportunity_id, applicant_id, cover_letter, portfolio_url, status, recruiter_notes, created_at')
    .in('opportunity_id', opportunityIds)
    .order('created_at', { ascending: false });
  if (applicationsError) throw new Error(`Não foi possível carregar as candidaturas: ${applicationsError.message}`);

  const applicantIds = [...new Set((applications ?? []).map((item: any) => item.applicant_id))];
  if (!applicantIds.length) return [];

  const [{ data: profiles, error: profilesError }, { data: candidateProfiles, error: candidateProfilesError }] = await Promise.all([
    table('user_profiles').select('user_id, full_name, avatar_url').in('user_id', applicantIds),
    table('candidate_profiles')
      .select('user_id, headline, bio, city, state, experience_years, skills, preferred_roles, portfolio_url, resume_url, availability')
      .in('user_id', applicantIds),
  ]);
  if (profilesError) throw new Error(`Não foi possível carregar os candidatos: ${profilesError.message}`);
  if (candidateProfilesError) throw new Error(`Não foi possível carregar os perfis profissionais: ${candidateProfilesError.message}`);

  const opportunityNames = new Map(opportunities.map((item) => [item.id, item.title] as const));
  const basicProfiles = new Map<string, BasicProfileRow>(
    ((profiles ?? []) as BasicProfileRow[]).map((item) => [item.user_id, item] as const),
  );
  const professionalProfiles = new Map<string, CandidateProfileRow>(
    ((candidateProfiles ?? []) as CandidateProfileRow[]).map((item) => [item.user_id, item] as const),
  );

  return (applications ?? []).map((application: any) => {
    const basic = basicProfiles.get(application.applicant_id);
    const professional = professionalProfiles.get(application.applicant_id);
    return {
      applicationId: application.id,
      opportunityId: application.opportunity_id,
      opportunityTitle: opportunityNames.get(application.opportunity_id) ?? 'Oportunidade',
      applicantId: application.applicant_id,
      name: basic?.full_name ?? 'Candidato sem nome',
      avatarUrl: basic?.avatar_url ?? null,
      headline: professional?.headline ?? 'Perfil profissional não preenchido',
      bio: professional?.bio ?? '',
      city: professional?.city ?? '',
      state: professional?.state ?? '',
      experienceYears: professional?.experience_years ?? 0,
      skills: professional?.skills ?? [],
      preferredRoles: professional?.preferred_roles ?? [],
      portfolioUrl: professional?.portfolio_url ?? null,
      resumeUrl: professional?.resume_url ?? null,
      availability: professional?.availability ?? 'open',
      coverLetter: application.cover_letter,
      applicationPortfolioUrl: application.portfolio_url,
      status: application.status,
      recruiterNotes: application.recruiter_notes ?? '',
      appliedAt: application.created_at,
    } satisfies CompanyCandidate;
  });
};

const listMessages = async (applicationIds: string[]): Promise<Map<string, CompanyMessage[]>> => {
  if (!applicationIds.length) return new Map();
  const { data, error } = await table('opportunity_application_messages')
    .select('id, application_id, sender_id, sender_type, body, read_at, created_at')
    .in('application_id', applicationIds)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Não foi possível carregar as mensagens: ${error.message}`);

  const grouped = new Map<string, CompanyMessage[]>();
  for (const row of data ?? []) {
    const messages = grouped.get(row.application_id) ?? [];
    messages.push({
      id: row.id,
      senderId: row.sender_id,
      senderType: row.sender_type,
      body: row.body,
      readAt: row.read_at,
      createdAt: row.created_at,
    });
    grouped.set(row.application_id, messages);
  }
  return grouped;
};

export const companyService = {
  async getProfile(): Promise<CompanyProfile> {
    return (await loadContext()).profile;
  },

  async saveProfile(profile: Omit<CompanyProfile, 'id' | 'slug' | 'verificationStatus'>): Promise<void> {
    const context = await loadContext();
    const { error } = await table('company_profiles').update({
      display_name: profile.displayName.trim(),
      legal_name: profile.legalName.trim() || null,
      description: profile.description.trim() || null,
      website_url: profile.websiteUrl.trim() || null,
      logo_url: profile.logoUrl.trim() || null,
      industry: profile.industry.trim() || null,
      city: profile.city.trim() || null,
      state: profile.state.trim() || null,
      country: profile.country.trim() || 'Brasil',
    }).eq('id', context.companyId);
    if (error) throw new Error(`Não foi possível salvar o perfil: ${error.message}`);
  },

  async listCreditPacks(): Promise<JobCreditPack[]> {
    const { data, error } = await table('job_credit_packs')
      .select('id, code, name, description, credit_quantity, price_cents, currency, validity_days, active')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error) throw new Error(`Não foi possível carregar os pacotes de vagas: ${error.message}`);
    return (data ?? []).map((pack: any) => ({
      id: pack.id,
      code: pack.code,
      name: pack.name,
      description: pack.description ?? '',
      creditQuantity: pack.credit_quantity,
      priceCents: pack.price_cents,
      currency: pack.currency,
      validityDays: pack.validity_days,
      active: pack.active,
    }));
  },

  async getCreditBalance(): Promise<CompanyCreditBalance> {
    const context = await loadContext();
    const { data, error } = await table('company_credit_balances')
      .select('available_credits, next_expiration_at')
      .eq('company_id', context.companyId)
      .maybeSingle();
    if (error) throw new Error(`Não foi possível carregar o saldo de vagas: ${error.message}`);
    return {
      availableCredits: Number(data?.available_credits ?? 0),
      nextExpirationAt: data?.next_expiration_at ?? null,
    };
  },

  async listCreditEvents(): Promise<CompanyCreditEvent[]> {
    const context = await loadContext();
    const { data, error } = await table('company_credit_events')
      .select('id, event_type, quantity, balance_after, reference, created_at')
      .eq('company_id', context.companyId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(`Não foi possível carregar o histórico de créditos: ${error.message}`);
    return (data ?? []).map((event: any) => ({
      id: event.id,
      type: event.event_type,
      quantity: event.quantity,
      balanceAfter: event.balance_after,
      reference: event.reference ?? '',
      createdAt: event.created_at,
    }));
  },

  async listOpportunities(): Promise<CompanyOpportunity[]> {
    return listOpportunitiesForContext(await loadContext());
  },

  async saveOpportunity(input: CompanyOpportunityInput): Promise<void> {
    const context = await loadContext();
    const normalizedRequirements = input.requirements.map((item) => item.trim()).filter(Boolean);
    const normalizedBenefits = input.benefits.map((item) => item.trim()).filter(Boolean);

    if (input.id) {
      const { error } = await table('opportunities').update({
        title: input.title.trim(),
        kind: input.kind,
        location: input.location.trim(),
        engagement_type: input.engagementType.trim(),
        description: input.description.trim(),
        requirements: normalizedRequirements,
        benefits: normalizedBenefits,
        salary_min_cents: input.salaryMinCents,
        salary_max_cents: input.salaryMaxCents,
        currency: 'BRL',
        work_mode: input.workMode,
        application_deadline: input.applicationDeadline || null,
      }).eq('id', input.id).eq('company_id', context.companyId);
      if (error) throw new Error(`Não foi possível atualizar a oportunidade: ${error.message}`);
      return;
    }

    await callRpc<CompanyOpportunity>('publish_company_opportunity_with_credit', {
      target_company_id: context.companyId,
      target_kind: input.kind,
      target_title: input.title.trim(),
      target_location: input.location.trim(),
      target_engagement_type: input.engagementType.trim(),
      target_work_mode: input.workMode,
      target_description: input.description.trim(),
      target_requirements: normalizedRequirements,
      target_benefits: normalizedBenefits,
      target_salary_min_cents: input.salaryMinCents,
      target_salary_max_cents: input.salaryMaxCents,
      target_currency: 'BRL',
      target_application_deadline: input.applicationDeadline || null,
    });
  },

  async setOpportunityStatus(id: string, status: 'open' | 'closed'): Promise<void> {
    const context = await loadContext();
    if (status === 'open') {
      await callRpc<CompanyOpportunity>('renew_company_opportunity_with_credit', {
        target_opportunity_id: id,
      });
      return;
    }

    const { error } = await table('opportunities')
      .update({ status: 'closed' })
      .eq('id', id)
      .eq('company_id', context.companyId);
    if (error) throw new Error(`Não foi possível encerrar a oportunidade: ${error.message}`);
  },

  async deleteOpportunity(id: string): Promise<void> {
    const context = await loadContext();
    const { error } = await table('opportunities').delete().eq('id', id).eq('company_id', context.companyId);
    if (error) throw new Error(`Não foi possível excluir a oportunidade: ${error.message}`);
  },

  async listCandidates(): Promise<CompanyCandidate[]> {
    return listCandidatesForContext(await loadContext());
  },

  async updateApplication(
    applicationId: string,
    status: CompanyApplicationStatus,
    recruiterNotes: string,
    response?: string,
  ): Promise<void> {
    const context = await loadContext();
    const decided = status === 'approved' || status === 'rejected';
    const { error } = await table('opportunity_applications').update({
      status,
      recruiter_notes: recruiterNotes.trim() || null,
      reviewed_at: status === 'submitted' ? null : new Date().toISOString(),
      decided_at: decided ? new Date().toISOString() : null,
    }).eq('id', applicationId);
    if (error) throw new Error(`Não foi possível atualizar a candidatura: ${error.message}`);

    if (response?.trim()) {
      const { error: messageError } = await table('opportunity_application_messages').insert({
        application_id: applicationId,
        sender_id: context.userId,
        sender_type: 'company',
        body: response.trim(),
      });
      if (messageError) throw new Error(`A etapa foi atualizada, mas a resposta não foi enviada: ${messageError.message}`);
    }
  },

  async listConversations(): Promise<CompanyConversation[]> {
    const context = await loadContext();
    const candidates = await listCandidatesForContext(context);
    const messagesByApplication = await listMessages(candidates.map((item) => item.applicationId));
    return candidates
      .map((candidate) => {
        const messages = messagesByApplication.get(candidate.applicationId) ?? [];
        return {
          applicationId: candidate.applicationId,
          opportunityTitle: candidate.opportunityTitle,
          candidateName: candidate.name,
          candidateHeadline: candidate.headline,
          status: candidate.status,
          messages,
          lastMessageAt: messages.at(-1)?.createdAt ?? null,
          unreadCount: messages.filter((message) => message.senderType === 'candidate' && !message.readAt).length,
        } satisfies CompanyConversation;
      })
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
  },

  async sendMessage(applicationId: string, body: string): Promise<void> {
    const context = await loadContext();
    const { error } = await table('opportunity_application_messages').insert({
      application_id: applicationId,
      sender_id: context.userId,
      sender_type: 'company',
      body: body.trim(),
    });
    if (error) throw new Error(`Não foi possível enviar a mensagem: ${error.message}`);
  },

  async markConversationRead(applicationId: string): Promise<void> {
    const { error } = await table('opportunity_application_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('application_id', applicationId)
      .eq('sender_type', 'candidate')
      .is('read_at', null);
    if (error) throw new Error(`Não foi possível marcar a conversa como lida: ${error.message}`);
  },

  async getDashboard(): Promise<CompanyDashboardData> {
    const context = await loadContext();
    const [opportunities, candidates] = await Promise.all([
      listOpportunitiesForContext(context),
      listCandidatesForContext(context),
    ]);
    const messages = await listMessages(candidates.map((item) => item.applicationId));
    return {
      activeOpportunities: opportunities.filter((item) => item.status === 'open').length,
      totalApplications: candidates.length,
      applicationsInReview: candidates.filter((item) => ['reviewing', 'shortlisted', 'interview'].includes(item.status)).length,
      unreadMessages: [...messages.values()].flat().filter((message) => message.senderType === 'candidate' && !message.readAt).length,
      recentOpportunities: opportunities.slice(0, 4),
      recentCandidates: candidates.slice(0, 5),
    };
  },
};
