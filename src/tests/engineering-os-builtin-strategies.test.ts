import { describe, expect, it, vi } from 'vitest';
import {
  qualityCertificationStrategy,
  repositoryInventoryStrategy,
} from '../../scripts/engineering-os/builtin-strategies.mjs';

describe('Engineering OS builtin strategies', () => {
  it('builds repository inventory only from observed file fingerprints', async () => {
    const callTool = vi.fn(async ({ input }) => ({
      result: { path: input.path, fingerprint: `fp:${input.path}` },
    }));
    const result = await repositoryInventoryStrategy({
      input: { metadata: { inventoryPaths: ['package.json', 'src/App.tsx'] } },
      callTool,
    });

    expect(result.output.files).toEqual([
      { path: 'package.json', fingerprint: 'fp:package.json' },
      { path: 'src/App.tsx', fingerprint: 'fp:src/App.tsx' },
    ]);
    expect(result.evidence[0]).toMatchObject({ kind: 'artifact', result: 'passed' });
    expect(callTool).toHaveBeenCalledTimes(2);
  });

  it('fails quality certification when any allowlisted command fails', async () => {
    const callTool = vi.fn(async ({ input }) => ({
      result: {
        passed: input.command !== 'test',
        fingerprint: `fp:${input.command}`,
      },
    }));

    await expect(qualityCertificationStrategy({
      run: { id: 'run-quality' },
      input: { metadata: { qualityCommands: ['typecheck', 'test', 'build'] } },
      callTool,
    })).rejects.toThrow(/Quality command failed: test/);
    expect(callTool).toHaveBeenCalledTimes(2);
  });
});
