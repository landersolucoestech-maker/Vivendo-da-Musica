# ETAPA 1 — Preservação do Estado Inicial

Data: 2026-07-13 (America/Sao_Paulo)

## Status

**BLOQUEADA**

O baseline técnico executa, porém a etapa não pode ser aprovada porque a cópia fornecida não contém metadados Git e existe divergência comprovada entre o estado versionado local e o projeto Supabase remoto.

## Estado inicial

- Raiz: `C:\Users\deyvi\Downloads\vivendo-da-musica-main`
- Git: indisponível; a raiz não é um repositório Git, portanto branch, commit e conjunto confiável de arquivos modificados não podem ser registrados.
- Node: `v24.15.0`
- npm/npx: `11.12.1`
- Supabase CLI: `2.109.1`
- Projeto Supabase configurado: `ehaehioqaqvyfgcetylh`
- URL configurada: host corresponde ao project ref.
- Chave pública: presente, 46 caracteres, aceita pelo health check remoto; valor não registrado.
- API remota: `healthy`, versão `1`.

## Variáveis identificadas sem valores

Presentes no `.env`:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_DEV_BYPASS_AUTH`

Consumidas pelo frontend, mas não presentes no `.env`:

- `VITE_APP_URL` — possui fallback local no código.
- `VITE_STRIPE_PUBLISHABLE_KEY` — opcional enquanto Stripe não for ativado.

Secrets consumidos pelas Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `ALLOWED_ORIGINS`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `SITE_URL`
- `RATE_LIMIT_SALT`

Os valores dos secrets remotos não foram lidos nem expostos.

## Scripts disponíveis

`dev`, `build`, `build:dev`, `lint`, `preview`, `typecheck`, `test`, `test:unit`, `test:security`, `test:contracts`, `test:e2e`, `test:performance` e `quality`.

## Inventário Supabase inicial

- Migrations locais: 63.
- Histórico de migrations remoto: 65 entradas.
- Intervalo remoto: `20250622140030` a `20260713234919`.
- Edge Functions locais: 12.
- Edge Functions remotas ativas: 11.
- Função local não encontrada no remoto: `get-signed-lesson-url`.
- Buckets remotos: 11.
- Funções no schema `public`: 54.
- Triggers de usuário no schema `public`: 80.
- Políticas: 187 no schema `public` e 27 no schema `storage`.
- Tabelas públicas com RLS desabilitada: nenhuma.

Buckets remotos:

- Públicos: `academy-images`, `academy-materials`, `academy-videos`, `avatars`, `beat-previews`, `cms-media`.
- Privados: `beat-masters`, `beat-stems`, `lesson-projects`, `lesson-samples`, `seller-product-files`.

## Comandos obrigatórios executados

| Ordem | Comando | Código | Resultado |
|---:|---|---:|---|
| 1 | `npm install` | 0 | Dependências atualizadas, 0 vulnerabilidades, lockfile inalterado |
| 2 | `npm run typecheck` | 0 | TypeScript aprovado |
| 3 | `npm run lint` | 0 | 0 erros e 11 warnings |
| 4 | `npm run test` | 0 | 6 arquivos e 20 testes aprovados |
| 5 | `npm run build` | 0 | Build aprovado, 2.590 módulos transformados |
| 6 | `npm run test:e2e` | 0 | 4 testes aprovados, 1 worker |
| 7 | `npm run test:performance` | 0 | 220 chunks; maior chunk 374 KiB |

## Erros e ocorrências durante a coleta

1. A primeira coleta combinada expirou após 30 segundos enquanto aguardava a CLI Supabase. A consulta foi isolada e `npx supabase --version` concluiu com código 0.
2. Os comandos Git retornaram código 1: `fatal: not a git repository`.
3. A primeira tentativa de validação HTTP usou indevidamente `$Host`, variável reservada do PowerShell. A saída foi descartada e a consulta corrigida comprovou correspondência do project ref.
4. `/rest/v1/` retornou 401. Como o acesso anônimo ao OpenAPI mudou na plataforma, essa resposta não foi usada para invalidar a chave. O health check real da API v1 aceitou a chave e retornou `healthy`.
5. Uma tentativa de busca com expressão regular falhou por quoting do PowerShell; a busca corrigida foi executada em seguida.

## Problemas identificados

1. Ausência completa de `.git`, impedindo preservar branch, commit e dirty state.
2. Drift entre migrations locais (63 arquivos) e histórico remoto (65 entradas), inclusive versões/nomenclaturas diferentes.
3. `get-signed-lesson-url` existe localmente, mas não está publicada no projeto remoto.
4. Lint apresenta 11 warnings; `AdminSettingsPage.tsx` possui dependência ausente em `useEffect` e requer auditoria funcional posterior.
5. Browserslist/caniuse-lite está 22 meses desatualizado.
6. Vite recomenda trocar `@vitejs/plugin-react-swc` por `@vitejs/plugin-react` quando plugins SWC não são usados.
7. A mudança recente da Data API exige verificar grants explícitos nas etapas de contrato/RLS.

## Arquivos afetados

- `package-lock.json`: hash SHA-256 permaneceu `A3E26C4E870EA161671EA8EB7557D7EB8DAF293CD7CFDF8CE0526F68EF876F89` antes e depois de `npm install`.
- `dist/`: regenerado por `npm run build` (artefato ignorado).
- `docs/audits/stage-01-initial-state.md`: relatório criado após a conclusão do baseline.
- Nenhum arquivo de aplicação, migration ou Edge Function foi corrigido.

## Bloqueadores e riscos remanescentes

- É necessária uma cópia com `.git` ou referência externa confiável de branch/commit para cumprir integralmente a preservação do estado.
- O drift de migrations deve ser compreendido antes de qualquer alteração de schema.
- A função remota ausente não deve ser publicada sem primeiro identificar consumidores e contrato.
- Stripe continua sem credenciais por decisão explícita; fluxos financeiros reais não podem ser validados ainda.

## Critérios de aceite e decisão

- Baseline de dependências, tipos, lint, testes, build, E2E e performance: atendido.
- Configuração, conectividade, chave pública e inventário remoto inicial: atendido.
- Preservação de branch, commit e arquivos modificados: **não atendido**.
- Equivalência mínima entre migrations/Edge Functions locais e remotas: **não atendida**.

**Decisão:** ETAPA 1 BLOQUEADA. Não iniciar a ETAPA 2 até receber/restaurar os metadados Git e autorizar como tratar o drift local/remoto.
