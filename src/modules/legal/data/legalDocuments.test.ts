import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { privacyDocumentGzipBase64 } from '@/modules/legal/data/privacyDocument';
import { termsDocumentGzipBase64 } from '@/modules/legal/data/termsDocument';

const decodeDocument = (encoded: string) => gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

describe('legal document sources', () => {
  it('preserves the complete privacy policy attachment', () => {
    const document = decodeDocument(privacyDocumentGzipBase64);

    expect(Buffer.byteLength(document, 'utf8')).toBe(38_706);
    expect(sha256(document)).toBe('296ea8df066ba29f038b49c341d07d8fbeedfc5c4e499f5f37fd34c301165a73');
    expect(document).toContain('# POLÍTICA DE PRIVACIDADE — VIVENDO DA MÚSICA');
    expect(document).toContain('## 22. Contato');
  });

  it('preserves the complete terms of use attachment', () => {
    const document = decodeDocument(termsDocumentGzipBase64);

    expect(Buffer.byteLength(document, 'utf8')).toBe(41_703);
    expect(sha256(document)).toBe('b8cdb58e47847d824b589953c8656be78539c2585188530b8592e65bc44c6890');
    expect(document).toContain('# TERMOS DE USO — VIVENDO DA MÚSICA');
    expect(document).toContain('## 40. Contato');
  });
});
