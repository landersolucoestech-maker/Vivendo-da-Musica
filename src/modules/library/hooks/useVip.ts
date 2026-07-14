import { useQuery } from "@tanstack/react-query";
import { libraryService } from "@/modules/library/services/library.service";

export const useVipPlans = () => useQuery({ queryKey: ['vip-plans', 'mock'], queryFn: () => libraryService.listVipPlans() });
export const useVipBenefits = () => useQuery({ queryKey: ['vip-benefits', 'mock'], queryFn: () => libraryService.listVipBenefits() });
export const useVipTestimonials = () => useQuery({ queryKey: ['vip-testimonials', 'mock'], queryFn: () => libraryService.listVipTestimonials() });
export const useVipFaq = () => useQuery({ queryKey: ['vip-faq', 'mock'], queryFn: () => libraryService.listVipFaq() });
