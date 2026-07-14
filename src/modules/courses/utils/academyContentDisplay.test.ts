import { describe, expect, it } from 'vitest';
import { getAcademyContentCapabilities, getAcademyVideoFallbackLabel } from './academyContentDisplay';

describe('academy content display helpers', () => {
  it('detects published content with video, text and files', () => {
    const capabilities = getAcademyContentCapabilities({
      status: 'published',
      videoUrl: 'https://cdn.example.com/video.mp4',
      body: 'Conteudo escrito',
      attachments: [{
        id: 'att-1',
        contentId: 'content-1',
        name: 'Material.pdf',
        fileUrl: 'https://cdn.example.com/material.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        createdAt: '2026-06-27T00:00:00.000Z',
      }],
    });

    expect(capabilities).toEqual({
      hasVideo: true,
      hasWrittenContent: true,
      hasMaterials: true,
      isPublished: true,
    });
  });

  it('detects draft content without video or files', () => {
    const capabilities = getAcademyContentCapabilities({
      status: 'draft',
      videoUrl: null,
      body: '',
      attachments: [],
    });

    expect(capabilities).toEqual({
      hasVideo: false,
      hasWrittenContent: false,
      hasMaterials: false,
      isPublished: false,
    });
  });

  it('returns a video fallback label when no video exists', () => {
    expect(getAcademyVideoFallbackLabel({ videoUrl: null })).toMatch(/nao possui video/);
    expect(getAcademyVideoFallbackLabel({ videoUrl: 'https://cdn.example.com/video.webm' })).toBeNull();
  });
});
