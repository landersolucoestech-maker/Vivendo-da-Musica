import { describe, expect, it } from 'vitest';

import { resolveSingleActiveCompanyId } from './companyContext.service';

describe('resolveSingleActiveCompanyId', () => {
  it('rejects accounts without an active company membership', () => {
    expect(() => resolveSingleActiveCompanyId([])).toThrow(
      'Esta conta ainda não está vinculada a uma empresa ativa.',
    );
  });

  it('returns the company when exactly one active membership exists', () => {
    expect(resolveSingleActiveCompanyId([{ company_id: 'company-1' }])).toBe('company-1');
  });

  it('fails closed when more than one active company membership exists', () => {
    expect(() =>
      resolveSingleActiveCompanyId([
        { company_id: 'company-1' },
        { company_id: 'company-2' },
      ]),
    ).toThrow('Mais de uma empresa ativa foi encontrada. Selecione uma empresa antes de continuar.');
  });
});
