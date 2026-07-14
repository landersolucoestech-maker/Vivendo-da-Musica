export interface CommunityComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  author: string;
  role: string;
  timeAgo: string;
  createdAt: string;
  text: string;
  likes: number;
  comments: CommunityComment[];
  isLiked: boolean;
  groupName: string | null;
}

export interface CommunityGroup {
  id: string;
  slug: string;
  name: string;
  members: number;
  description: string;
  isMember: boolean;
  isOwner: boolean;
}

export type CommunityReportReason = "spam" | "harassment" | "hate" | "copyright" | "misinformation" | "other";

export interface CommunityReport {
  id: string;
  targetType: "post" | "comment" | "group" | "user";
  targetId: string;
  reason: CommunityReportReason;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
}

export interface CommunityMember {
  name: string;
  role: string;
  points: number;
}
