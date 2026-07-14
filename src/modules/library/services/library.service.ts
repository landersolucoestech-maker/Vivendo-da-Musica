import { MOCK_LIBRARY_ITEMS, MOCK_LIBRARY_TYPES, MOCK_LIBRARY_CATEGORIES } from "@/mocks/library.mock";
import { MOCK_VIP_PLANS, MOCK_VIP_BENEFITS, MOCK_VIP_TESTIMONIALS, MOCK_VIP_FAQ } from "@/mocks/vip.mock";
import type { PremiumLibraryItem } from "@/modules/library/types/library.types";

/** library.service — TODO(backend): no `library_items` table yet; Premium
 * subscription plans live in Stripe once configured, this is the mock
 * placeholder for both the catalog and the VIP marketing content. */
export const libraryService = {
  async listItems(): Promise<PremiumLibraryItem[]> {
    return MOCK_LIBRARY_ITEMS;
  },

  async listTypes(): Promise<readonly string[]> {
    return MOCK_LIBRARY_TYPES;
  },

  async listCategories(): Promise<readonly string[]> {
    return MOCK_LIBRARY_CATEGORIES;
  },

  async listVipPlans() { return MOCK_VIP_PLANS; },
  async listVipBenefits() { return MOCK_VIP_BENEFITS; },
  async listVipTestimonials() { return MOCK_VIP_TESTIMONIALS; },
  async listVipFaq() { return MOCK_VIP_FAQ; },
};
