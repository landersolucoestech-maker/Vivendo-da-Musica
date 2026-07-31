import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { beatService } from '@/modules/marketplace/services/beat.service';

export const useBeats = () => useQuery({
  queryKey: ['marketplace-beats'],
  queryFn: () => beatService.listBeats(),
});

export const useBeatDetail = (slug: string | undefined) => useQuery({
  queryKey: ['marketplace-beat-detail', slug],
  queryFn: () => beatService.getBeatDetailBundle(slug!),
  enabled: !!slug,
});

export const useProducerBeatDashboard = () => useQuery({
  queryKey: ['producer-beat-dashboard'],
  queryFn: () => beatService.getProducerDashboard(),
});

export const useRequestProducerPayout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { payoutMethodId: string; amountCents: number; currency: string }) =>
      beatService.requestProducerPayout(input.payoutMethodId, input.amountCents, input.currency),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['producer-beat-dashboard'] });
    },
  });
};
