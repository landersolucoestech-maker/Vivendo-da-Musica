import { useQuery } from "@tanstack/react-query";
import { communityService } from "@/modules/community/services/community.service";

export const useCommunityPosts = () => useQuery({ queryKey: ['community-posts'], queryFn: () => communityService.listPosts() });
export const useCommunityGroups = () => useQuery({ queryKey: ['community-groups'], queryFn: () => communityService.listGroups() });
export const useCommunityTopTopics = () => useQuery({ queryKey: ['community-top-topics'], queryFn: () => communityService.listTopTopics() });
export const useCommunityFeaturedMembers = () => useQuery({ queryKey: ['community-featured-members'], queryFn: () => communityService.listFeaturedMembers() });
export const useCommunityOnlineMembers = () => useQuery({ queryKey: ['community-online-members'], queryFn: () => communityService.listOnlineMembers() });
export const useCommunityReports = () => useQuery({ queryKey: ['community-reports'], queryFn: () => communityService.listReports() });
