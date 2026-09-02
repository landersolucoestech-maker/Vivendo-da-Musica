# Vivendo da Música

Plataforma brasileira para formação, produtos e serviços digitais, licenciamento de beats, oportunidades profissionais e operação comercial para o mercado da música.

## Projeto

O **Vivendo da Música** é desenvolvido e mantido como produto próprio. Código, arquitetura, automações, infraestrutura, documentação, testes, releases e operações são definidos dentro deste repositório e dos serviços oficiais descritos abaixo.

O desenvolvimento ocorre no branch `dev`. A promoção para `main` depende de homologação, Quality Gates, evidências de release e ambiente de produção separado.

## Infraestrutura oficial

- **GitHub**: código-fonte, revisão, CI/CD, artifacts e governança de releases;
- **Supabase**: autenticação, PostgreSQL, Storage e Edge Functions;
- **Hostinger**: hospedagem oficial e destino de promoção dos releases da aplicação;
- **PostHog**: observabilidade e analytics de produto quando o transport correspondente estiver habilitado;
- **GHCR**: armazenamento dos artefatos OCI imutáveis promovidos pelo SHA aprovado;
- **Agentic Engineering OS**: camada própria de automação de engenharia, governada por runtime determinístico.

A aplicação não depende de plataformas geradoras, taggers de terceiros ou metadados de starter para build, desenvolvimento ou deploy. O CI possui um gate dedicado para impedir a reintrodução de branding ou dependências legadas.

## Principais domínios

- conta universal com capacidades acumuláveis: aluno, instrutor, produtor, afiliado, empresa e administração;
- Academia, cursos, módulos, aulas, progresso e certificados;
- videoaulas e materiais protegidos em storage privado;
- produtos digitais e arquivos de entrega privados;
- beats, licenças, contratos e arquivos master/stems;
- marketplace de serviços, pacotes, propostas, contratos, entregas, disputas e avaliações;
- oportunidades empresariais com consumo atômico de créditos;
- checkout, pagamentos, ajustes, divisão de receita, ledger e repasses;
- Portal do Administrador para parâmetros comerciais, conteúdo, operação, segurança e financeiro.

## Modelo comercial

O produto não possui mensalidades, assinaturas ou conteúdo Premium. A receita deriva de comissão configurável sobre vendas e contratações, venda avulsa de créditos empresariais e demais cobranças avulsas aprovadas e parametrizadas pelo Portal do Administrador.

Valores, percentuais, limites, pacotes e prazos comerciais de produção não devem ser hardcoded no frontend ou backend. As regras comerciais são parametrizadas e, quando aplicável, preservadas em snapshots imutáveis nos pedidos.

## Stack principal

- React 18 e TypeScript;
- Vite;
- React Router;
- TanStack Query;
- Tailwind CSS e componentes Radix/shadcn;
- Supabase Auth, PostgreSQL, Storage e Edge Functions;
- Vitest, Playwright e pgTAP;
- GitHub Actions;
- Docker/Nginx para o artefato de aplicação promovido à Hostinger.

## Agentic Engineering OS

A camada agentic não é uma coleção de prompts soltos. O runtime determinístico controla contratos, capabilities, policies, approvals, leases, idempotência, evidências, manifests de execução, workflows e revisão independente.

O núcleo registrado contém agentes especializados de Orquestração, Produto/Requisitos, Arquitetura, Frontend, Backend/API, Banco de Dados, Segurança, QA, Performance, Observabilidade, Release e Reviewer independente. Nenhum agente pode ampliar as próprias permissões ou executar diretamente um provider externo fora do gateway governado.

A especificação detalhada está em `docs/agentic-engineering-os.md`.

## Requisitos locais

- Node.js 24;
- npm;
- Docker para reconstrução local do Supabase e validação de containers;
- Supabase CLI;
- arquivo de ambiente apontando exclusivamente para o projeto de desenvolvimento.

## Execução local

```bash
npm ci
npm run dev
```

## Quality Gates

A validação consolidada é executada por:

```bash
npm run quality
```

Entre os gates obrigatórios estão:

```bash
npm run audit:high
npm run typecheck
npm run lint
npm run test:deployment-provider
npm run test:legacy-branding
npm run test:agentic
npm run test
npm run build
npm run test:performance
```

Para banco e migrations:

```bash
npx supabase start
npx supabase db reset
npx supabase db lint
npx supabase test db
```

## Ambientes

### Desenvolvimento

- branch GitHub: `dev`;
- dados sintéticos podem ser marcados com `is_demo=true`;
- preview pode usar bypass controlado exclusivamente para inspeção de desenvolvimento;
- pagamento demonstrativo é permitido apenas no ambiente Supabase de desenvolvimento.

### Homologação

- projeto Supabase separado;
- autenticação real habilitada;
- bypass, identidades sintéticas e provedor demonstrativo desabilitados;
- pagamentos em sandbox do provedor real;
- migrations, restauração e fluxos E2E validados antes da promoção.

### Produção

- hospedagem oficial: **Hostinger**;
- projeto Supabase exclusivo;
- `VITE_DISABLE_AUTH=false`;
- `VITE_USE_MOCK_DATA=false`;
- promoção por artifact/Imagem OCI imutável identificada pelo SHA aprovado;
- deploy governado pelo Release Agent, Execution Manifest, policies, approvals, leases e evidências aplicáveis;
- nenhum segredo no repositório ou no bundle do navegador;
- provedor de pagamento real e webhook assinado;
- domínio, e-mail transacional, monitoramento, backups e documentos jurídicos definitivos.

## Deploy

O pipeline de release valida o projeto, promove alterações permitidas do Supabase, produz/publica o artefato imutável e promove a versão aprovada para a **Hostinger**. O provider de hospedagem é acessado por adapter explícito; agentes não falam diretamente com o provider.

O deploy do Supabase usa GitHub Environments e credenciais mantidas como secrets do ambiente. A publicação das funções é executada pelo tooling do próprio repositório.

Nunca reutilize o projeto Supabase de desenvolvimento em produção e nunca faça promoção de release ignorando os gates definidos no repositório.

## Segurança

- RLS obrigatória em tabelas expostas;
- funções privilegiadas ficam no schema privado;
- wrappers públicos usam `SECURITY INVOKER` e verificações explícitas;
- secrets somente no servidor/CI autorizado;
- operações financeiras são idempotentes e auditáveis;
- ledger de dupla entrada deve permanecer balanceado;
- operações agentic são deny-by-default;
- operações privilegiadas/destrutivas exigem os controles definidos pelo runtime;
- release é bloqueado se detectar bypass, mocks, provider de hospedagem não aprovado ou branding/dependência legada.

## Documentação

Consulte `docs/` para arquitetura, auditorias, homologação, identidade visual, modelo comercial e procedimentos operacionais.