import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const serviceSource = readFileSync(
  'src/modules/admin/services/adminCanonicalFinance.service.ts',
  'utf8',
);

describe('admin finance preview privacy', () => {
  it('does not query private ledger balances while auth bypass is active', () => {
    expect(serviceSource).toMatch(
      /isDevAuthBypassEnabled\s*\?\s*Promise\.resolve<Array<Record<string, unknown>>>\(\[\]\)\s*:\s*request<Array<Record<string, unknown>>>\([\s\S]*?ledger_account_balances/,
    );
  });

  it('keeps the private ledger query available for authenticated administration', () => {
    expect(serviceSource).toContain(
      'ledger_account_balances?select=account_code,balance_cents&limit=5000',
    );
  });
});
