import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import PublicLayout from '@/app/layouts/PublicLayout';
import { privacyDocumentGzipBase64 } from '@/modules/legal/data/privacyDocument';
import { termsDocumentGzipBase64 } from '@/modules/legal/data/termsDocument';
import { ROUTES } from '@/shared/constants/routes';

type LegalBlock =
  | { type: 'heading'; level: 2 | 3; text: string; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

interface LegalDocument {
  title: string;
  metadata: Array<{ label: string; value: string }>;
  blocks: LegalBlock[];
  sections: Array<{ id: string; text: string }>;
}

const INLINE_TOKEN_PATTERN = /(\*\*[^*]+\*\*|\[[A-ZÁÉÍÓÚÃÕÇ0-9 _./-]+\])/g;
const METADATA_PATTERN = /^\*\*([^*]+):\*\*\s*(.+)$/;
const PLACEHOLDER_PATTERN = /^\[[A-ZÁÉÍÓÚÃÕÇ0-9 _./-]+\]$/;

const decodeGzipBase64 = async (encoded: string) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador não oferece suporte à leitura do documento.');
  }

  const binary = window.atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const decompressedStream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));

  return new Response(decompressedStream).text();
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const renderInline = (value: string): ReactNode[] =>
  value
    .split(INLINE_TOKEN_PATTERN)
    .filter(Boolean)
    .map((token, index) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={`${token}-${index}`} className="font-semibold text-white">
            {token.slice(2, -2)}
          </strong>
        );
      }

      if (PLACEHOLDER_PATTERN.test(token)) {
        return (
          <span
            key={`${token}-${index}`}
            className="rounded border border-amber-400/35 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[0.82em] text-amber-200"
          >
            {token}
          </span>
        );
      }

      return <Fragment key={`${token}-${index}`}>{token}</Fragment>;
    });

const formatInlineList = (items: string[]) =>
  `${items.map((item) => item.replace(/[;.]$/, '')).join(', ')}.`;

const parseLegalDocument = (source: string): LegalDocument => {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const title = lines.shift()?.replace(/^#\s+/, '').trim() ?? 'Documento jurídico';
  const metadata: LegalDocument['metadata'] = [];
  const blocks: LegalBlock[] = [];
  const usedIds = new Map<string, number>();

  const uniqueId = (text: string) => {
    const base = slugify(text) || 'secao';
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  let index = 0;
  while (index < lines.length && !lines[index].startsWith('## ')) {
    const line = lines[index].trim();
    const metadataMatch = line.match(METADATA_PATTERN);

    if (metadataMatch) {
      metadata.push({ label: metadataMatch[1], value: metadataMatch[2] });
    }

    index += 1;
  }

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      const text = line.slice(3).trim();
      blocks.push({ type: 'heading', level: 2, text, id: uniqueId(text) });
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      const text = line.slice(4).trim();
      blocks.push({ type: 'heading', level: 3, text, id: uniqueId(text) });
      index += 1;
      continue;
    }

    if (line.startsWith('* ')) {
      const items: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith('* ')) {
        items.push(lines[index].trim().slice(2).trim());
        index += 1;
      }

      blocks.push({ type: 'list', items });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const current = lines[index].trim();

      if (!current || current.startsWith('## ') || current.startsWith('### ') || current.startsWith('* ')) {
        break;
      }

      if (paragraphLines.length > 0 && METADATA_PATTERN.test(current)) {
        break;
      }

      paragraphLines.push(current);
      index += 1;

      if (METADATA_PATTERN.test(current)) {
        break;
      }
    }

    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
    }
  }

  return {
    title,
    metadata,
    blocks,
    sections: blocks
      .filter(
        (block): block is Extract<LegalBlock, { type: 'heading' }> =>
          block.type === 'heading' && block.level === 2,
      )
      .map(({ id, text }) => ({ id, text })),
  };
};

const LegalDocumentPage = () => {
  const { pathname } = useLocation();
  const isTerms = pathname === ROUTES.termsOfUse;
  const encodedSource = isTerms ? termsDocumentGzipBase64 : privacyDocumentGzipBase64;
  const [source, setSource] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const document = useMemo(() => (source ? parseLegalDocument(source) : undefined), [source]);

  useEffect(() => {
    let isActive = true;

    setSource(undefined);
    setLoadError(undefined);

    void decodeGzipBase64(encodedSource)
      .then((decodedSource) => {
        if (isActive) {
          setSource(decodedSource);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar o documento.');
        }
      });

    return () => {
      isActive = false;
    };
  }, [encodedSource]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });

    if (document) {
      window.document.title = `${document.title} | Vivendo da Música`;
    }
  }, [document, pathname]);

  return (
    <PublicLayout>
      <section className="pb-16 pt-10 sm:pb-20 sm:pt-14">
        <div className="mx-auto w-full max-w-[1520px]">
          {!document && !loadError ? (
            <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.025]">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin text-primary" />
                Carregando documento jurídico...
              </div>
            </div>
          ) : loadError ? (
            <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-red-400/20 bg-red-400/5 px-6 text-center">
              <div className="max-w-lg">
                <AlertTriangle className="mx-auto size-8 text-red-300" />
                <h1 className="mt-4 font-display text-2xl font-bold text-white">Documento indisponível</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{loadError}</p>
              </div>
            </div>
          ) : (
            document && (
              <>
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] px-5 py-8 shadow-2xl shadow-black/20 sm:px-8 sm:py-10 lg:px-12">
                  <div className="flex max-w-4xl items-start gap-4">
                    <div className="hidden rounded-2xl border border-primary/25 bg-primary/10 p-3 text-primary sm:block">
                      {isTerms ? <FileText className="size-6" /> : <ShieldCheck className="size-6" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        Documento jurídico
                      </p>
                      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                        {document.title}
                      </h1>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {document.metadata.map((item) => (
                          <span
                            key={item.label}
                            className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-muted-foreground"
                          >
                            <strong className="font-semibold text-white">{item.label}:</strong> {item.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-8 xl:grid-cols-[18rem_minmax(0,1fr)]">
                  <aside className="hidden xl:block">
                    <nav
                      aria-label="Índice do documento"
                      className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.025] p-5"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white">
                        Neste documento
                      </p>
                      <ol className="mt-4 space-y-1.5">
                        {document.sections.map((section) => (
                          <li key={section.id}>
                            <a
                              href={`#${section.id}`}
                              className="block rounded-lg px-2.5 py-2 text-xs leading-5 text-muted-foreground transition hover:bg-primary/10 hover:text-white"
                            >
                              {section.text}
                            </a>
                          </li>
                        ))}
                      </ol>
                    </nav>
                  </aside>

                  <article className="min-w-0 rounded-3xl border border-white/10 bg-[#0a0a0a]/80 px-5 py-8 sm:px-8 lg:px-12">
                    <div className="space-y-5 text-[0.98rem] leading-7 text-muted-foreground">
                      {document.blocks.map((block, index) => {
                        if (block.type === 'heading') {
                          const Heading = block.level === 2 ? 'h2' : 'h3';

                          return (
                            <Heading
                              id={block.id}
                              key={`${block.id}-${index}`}
                              className={
                                block.level === 2
                                  ? 'scroll-mt-28 border-t border-white/10 pt-9 font-display text-2xl font-bold leading-tight text-white first:border-t-0 first:pt-0 sm:text-3xl'
                                  : 'scroll-mt-28 pt-4 font-display text-xl font-semibold leading-tight text-white'
                              }
                            >
                              {block.text}
                            </Heading>
                          );
                        }

                        if (block.type === 'list') {
                          const isTermsIntroductionList =
                            isTerms &&
                            block.items.length === 11 &&
                            block.items[0]?.toLowerCase().startsWith('oferta de cursos e conteúdos educacionais');

                          if (isTermsIntroductionList) {
                            return <p key={`inline-list-${index}`}>{renderInline(formatInlineList(block.items))}</p>;
                          }

                          return (
                            <ul key={`list-${index}`} className="space-y-2 pl-1">
                              {block.items.map((item, itemIndex) => (
                                <li key={`${item}-${itemIndex}`} className="flex gap-3">
                                  <span
                                    className="mt-[0.65rem] size-1.5 shrink-0 rounded-full bg-primary"
                                    aria-hidden="true"
                                  />
                                  <span>{renderInline(item)}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }

                        return <p key={`paragraph-${index}`}>{renderInline(block.text)}</p>;
                      })}
                    </div>

                    <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground">
                        Consulte também o outro documento jurídico da plataforma.
                      </p>
                      <Link
                        to={isTerms ? ROUTES.privacyPolicy : ROUTES.termsOfUse}
                        className="font-semibold text-primary transition hover:text-white"
                      >
                        {isTerms ? 'Política de Privacidade' : 'Termos de Uso'}
                      </Link>
                    </div>
                  </article>
                </div>
              </>
            )
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default LegalDocumentPage;
