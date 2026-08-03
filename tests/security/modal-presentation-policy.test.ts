import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const sourceRoot = resolve(projectRoot, 'src');

const listSourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listSourceFiles(path) : [path];
  })
  .filter((path) => ['.ts', '.tsx', '.css'].includes(extname(path)));

const readProjectFile = (path: string) => readFileSync(resolve(projectRoot, path), 'utf8');
const CENTERED_POSITION = /left-1\/2[^'"\n]*top-1\/2|top-1\/2[^'"\n]*left-1\/2/;
const CENTERED_TRANSLATION = /-translate-x-1\/2[^'"\n]*-translate-y-1\/2|-translate-y-1\/2[^'"\n]*-translate-x-1\/2/;
const FORBIDDEN_SLIDE_BEHAVIOR = /slide-(?:in|out)(?:-from|-to)?|translate-[xy]-(?:full|\[100%\])/i;
const NATIVE_BROWSER_DIALOG = /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/;

describe('política de apresentação dos modais', () => {
  it.each([
    'src/shared/components/ui/dialog.tsx',
    'src/shared/components/ui/alert-dialog.tsx',
    'src/shared/components/ui/sheet.tsx',
  ])('%s mantém o conteúdo centralizado na viewport', (path) => {
    const source = readProjectFile(path);

    expect(source).toMatch(CENTERED_POSITION);
    expect(source).toMatch(CENTERED_TRANSLATION);
    expect(source).toContain('zoom-in-95');
    expect(source).toContain('zoom-out-95');
    expect(source).not.toMatch(FORBIDDEN_SLIDE_BEHAVIOR);
  });

  it('não permite animações ou transições direcionais em implementações de modal', () => {
    const violations = listSourceFiles(sourceRoot)
      .filter((path) => /(dialog|modal|sheet|drawer)/i.test(relative(sourceRoot, path)))
      .flatMap((path) => {
        const source = readFileSync(path, 'utf8');
        return FORBIDDEN_SLIDE_BEHAVIOR.test(source)
          ? [relative(projectRoot, path)]
          : [];
      });

    expect(violations).toEqual([]);
  });

  it('não usa alertas, confirmações ou prompts nativos do navegador', () => {
    const violations = listSourceFiles(sourceRoot).flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return NATIVE_BROWSER_DIALOG.test(source)
        ? [relative(projectRoot, path)]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
