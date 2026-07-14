import { useQuery } from "@tanstack/react-query";
import { certificatesService } from "@/modules/certificates/services/certificates.service";

export const useCertificates = () => {
  return useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesService.listCertificates(),
  });
};

export const useRecentCertificates = (limit = 2) => {
  return useQuery({
    queryKey: ['certificates-recent', limit],
    queryFn: () => certificatesService.listRecentCertificates(limit),
  });
};
