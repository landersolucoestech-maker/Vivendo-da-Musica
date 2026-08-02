const STORAGE_KEY = 'vdm_affiliate_referral_slug';
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,79}$/;

export const setAffiliateReferralSlug = (slug: string) => {
  const normalized = slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(normalized)) return;
  sessionStorage.setItem(STORAGE_KEY, normalized);
};

export const getAffiliateReferralSlug = (): string | null => {
  const value = sessionStorage.getItem(STORAGE_KEY)?.trim().toLowerCase() ?? '';
  return SLUG_PATTERN.test(value) ? value : null;
};

export const clearAffiliateReferralSlug = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};
