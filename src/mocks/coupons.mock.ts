import type { MockCoupon } from "@/modules/admin/types/coupon.types";

export const MOCK_COUPONS: MockCoupon[] = [
  { code: 'BEMVINDO10', discountLabel: '10%', validUntil: '31/12/2026', maxUses: 1000, used: 412, status: 'ativo' },
  { code: 'BLACKFRIDAY', discountLabel: '30%', validUntil: '30/11/2026', maxUses: 500, used: 0, status: 'ativo' },
  { code: 'LANCAMENTO2025', discountLabel: '15%', validUntil: '31/12/2025', maxUses: 200, used: 200, status: 'expirado' },
];
