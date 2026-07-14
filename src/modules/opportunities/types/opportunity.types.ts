export interface MockOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Freelance' | 'Meio período' | 'Pontual' | 'Projeto';
  status: 'aberta' | 'encerrada';
  postedAt: string;
  description: string;
  applicantsCount: number;
  kind: 'job' | 'collab' | 'sync' | 'grant' | 'contest';
  isFavorite: boolean;
  isApplied: boolean;
}
