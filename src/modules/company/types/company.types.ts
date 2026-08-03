export type CompanyApplicationStatus =
  | 'submitted'
  | 'reviewing'
  | 'shortlisted'
  | 'interview'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type CompanyOpportunityKind = 'job' | 'collab' | 'sync' | 'grant' | 'contest';
export type CompanyWorkMode = 'onsite' | 'hybrid' | 'remote';

export interface CompanyProfile {
  id: string;
  slug: string;
  displayName: string;
  legalName: string;
  description: string;
  websiteUrl: string;
  logoUrl: string;
  industry: string;
  city: string;
  state: string;
  country: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface CompanyCreditBalance {
  availableCredits: number;
  nextExpirationAt: string | null;
}

export interface JobCreditPack {
  id: string;
  code: string;
  name: string;
  description: string;
  creditQuantity: number;
  priceCents: number;
  currency: string;
  validityDays: number;
  active: boolean;
}

export interface CompanyCreditEvent {
  id: string;
  type: 'purchase' | 'consume' | 'expire' | 'refund' | 'adjustment';
  quantity: number;
  balanceAfter: number;
  reference: string;
  createdAt: string;
}

export interface CompanyOpportunity {
  id: string;
  title: string;
  kind: CompanyOpportunityKind;
  location: string;
  engagementType: string;
  status: 'open' | 'closed';
  description: string;
  requirements: string[];
  benefits: string[];
  salaryMinCents: number | null;
  salaryMaxCents: number | null;
  currency: string;
  workMode: CompanyWorkMode;
  applicationDeadline: string | null;
  applicationCount: number;
  publishedAt: string | null;
  postingExpiresAt: string | null;
  renewalCount: number;
  createdAt: string;
}

export interface CompanyOpportunityInput {
  id?: string;
  title: string;
  kind: CompanyOpportunityKind;
  location: string;
  engagementType: string;
  description: string;
  requirements: string[];
  benefits: string[];
  salaryMinCents: number | null;
  salaryMaxCents: number | null;
  workMode: CompanyWorkMode;
  applicationDeadline: string | null;
}

export interface CompanyCandidate {
  applicationId: string;
  opportunityId: string;
  opportunityTitle: string;
  applicantId: string;
  name: string;
  avatarUrl: string | null;
  headline: string;
  bio: string;
  city: string;
  state: string;
  experienceYears: number;
  skills: string[];
  preferredRoles: string[];
  portfolioUrl: string | null;
  resumeUrl: string | null;
  availability: string;
  coverLetter: string;
  applicationPortfolioUrl: string | null;
  status: CompanyApplicationStatus;
  recruiterNotes: string;
  appliedAt: string;
}

export interface CompanyMessage {
  id: string;
  senderId: string;
  senderType: 'candidate' | 'company';
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface CompanyConversation {
  applicationId: string;
  opportunityTitle: string;
  candidateName: string;
  candidateHeadline: string;
  status: CompanyApplicationStatus;
  messages: CompanyMessage[];
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface CompanyDashboardData {
  activeOpportunities: number;
  totalApplications: number;
  applicationsInReview: number;
  unreadMessages: number;
  recentOpportunities: CompanyOpportunity[];
  recentCandidates: CompanyCandidate[];
}
