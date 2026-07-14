import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";

export const useBeats = () => {
  return useQuery({
    queryKey: ["marketplace-beats"],
    queryFn: () => marketplaceService.listBeats(),
  });
};

export const useBeatDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["marketplace-beat-detail", slug],
    queryFn: () => marketplaceService.getBeatDetailBundle(slug!),
    enabled: !!slug,
  });
};

export const useProducerBeatDashboard = () => {
  return useQuery({
    queryKey: ["producer-beat-dashboard"],
    queryFn: () => marketplaceService.getProducerBeatDashboard(),
  });
};

export const useRequestProducerPayout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { payoutMethodId: string; amountCents: number; currency: string }) =>
      marketplaceService.requestProducerPayout(input.payoutMethodId, input.amountCents, input.currency),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["producer-beat-dashboard"] }),
  });
};
