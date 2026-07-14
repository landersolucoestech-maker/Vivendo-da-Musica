import { useQuery } from "@tanstack/react-query";
import { opportunitiesService } from "@/modules/opportunities/services/opportunities.service";

export const useOpportunities = () => useQuery({ queryKey: ['opportunities'], queryFn: () => opportunitiesService.listOpportunities() });
export const useOpenOpportunities = () => useQuery({ queryKey: ['opportunities-open'], queryFn: () => opportunitiesService.listOpenOpportunities() });
