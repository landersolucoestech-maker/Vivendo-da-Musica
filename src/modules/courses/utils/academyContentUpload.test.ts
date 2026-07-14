import { describe, expect, it } from 'vitest';
import { validateAcademyUpload } from './academyContentUpload';

describe('validateAcademyUpload', () => {
  it('accepts a valid academy video', () => {
    expect(validateAcademyUpload({ type: 'video/mp4', size: 10 * 1024 * 1024 }, 'video')).toBeNull();
  });

  it('rejects an invalid video mime type', () => {
    expect(validateAcademyUpload({ type: 'video/x-msvideo', size: 10 }, 'video')).toMatch(/Tipo de arquivo/);
  });

  it('rejects an image above the configured size', () => {
    expect(validateAcademyUpload({ type: 'image/png', size: 11 * 1024 * 1024 }, 'image')).toMatch(/tamanho maximo/);
  });

  it('accepts valid downloadable materials', () => {
    expect(validateAcademyUpload({ type: 'application/pdf', size: 2 * 1024 * 1024 }, 'material')).toBeNull();
    expect(validateAcademyUpload({ type: 'application/zip', size: 2 * 1024 * 1024 }, 'material')).toBeNull();
  });
});
