export interface MockCoupon {
  code: string;
  discountLabel: string;
  validUntil: string;
  maxUses: number;
  used: number;
  status: 'ativo' | 'expirado';
}
