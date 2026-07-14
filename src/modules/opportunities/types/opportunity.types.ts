export interface Opportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  status: 'aberta' | 'encerrada';
  postedAt: string;
  description: string;
  applicantsCount: number;
  kind: 'job' | 'collab' | 'sync' | 'grant' | 'contest';
  isFavorite: boolean;
  isApplied: boolean;
}
