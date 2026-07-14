import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { observabilityService } from "@/modules/admin/services/observability.service";

export const useObservability = () => useQuery({ queryKey: ["admin-observability"], queryFn: () => observabilityService.getSnapshot(), refetchInterval: 60_000 });
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id: string) => observabilityService.acknowledgeAlert(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-observability"] }) });
};
