# Vivendo da Música

Plataforma brasileira para aprendizado, comercialização de produtos musicais, licenciamento de beats, contratação de serviços, programa de afiliados e oportunidades profissionais.

## Estado do projeto

O desenvolvimento ocorre exclusivamente no branch `dev`. A promoção para `main` depende de homologação, gates automatizados e configuração de um ambiente de produção separado.

O modelo comercial não possui mensalidades, assinaturas ou conteúdo Premium. A receita da plataforma deriva de:

- comissão configurável sobre vendas e contratações;
- venda avulsa de créditos para publicação de vagas empresariais;
- demais cobranças avulsas aprovadas e parametrizadas pelo Portal do Administrador.

Nenhum valor, percentual, limite, pacote ou prazo comercial de produção deve ser inserido diretamente no frontend ou backend. As regras são versionadas no banco e preservadas em snapshots imutáveis nos pedidos.

## Principais domínios

- conta universal com capacidades acumuláveis: aluno, instrutor, produtor, afiliado, empresa e administração;
- Academia, cursos, módulos, aulas, progresso e certificados;
- videoaulas enviadas diretamente do computador para storage privado;
- produtos digitais e arquivos de entrega privados;
- beats, licenças, contratos e arquivos master/stems;
- marketplace de serviços, pacotes, pedidos personalizados, propostas, contratos, entregas, disputas e avaliações;
- oportunidades empresariais com consumo atômico de créditos;
- checkout, pagamentos, ajustes, divisão de receita, ledger e repasses;
- Portal do Administrador para parâmetros comerciais, conteúdo, operação, segurança e financeiro.

## Stack

- React 18 e TypeScript;
- Vite;
- React Router;
- TanStack Query;
- Tailwind CSS e componentes Radix/shadcn;
- Supabase Auth, PostgreSQL, Storage e Edge Functions;
- Vitest, Playwright e pgTAP;
- GitHub Actions.

## Requisitos locais

- Node.js 24;
- npm;
- Docker, para reconstrução local do Supabase;
- Supabase CLI;
- arquivo de ambiente apontando exclusivamente para o projeto `dev`.

## Instalação

```bash
npm ci
npm run dev
```

## Gates obrigatórios

```bash
npm run audit:high
npm run typecheck
npm run lint
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
- dados sintéticos marcados com `is_demo=true`;
- preview pode usar bypass controlado para inspeção dos portais;
- pagamento demonstrativo permitido somente no projeto Supabase de desenvolvimento.

### Homologação

- projeto Supabase separado;
- autenticação real habilitada;
- bypass, identidades sintéticas e provedor demonstrativo desabilitados;
- pagamentos em sandbox do provedor real;
- migração e restauração testadas.

### Produção

- projeto Supabase exclusivo;
- `VITE_DISABLE_AUTH=false`;
- `VITE_USE_MOCK_DATA=false`;
- provedor de pagamento real e webhook assinado;
- nenhum segredo no repositório ou no bundle do navegador;
- domínio, e-mail transacional, monitoramento, backups e documentos jurídicos definitivos.

## Pagamentos

O checkout canônico cria pedidos e itens com snapshots comerciais. A confirmação ocorre exclusivamente após retorno autorizado do provedor.

O webhook de pagamento:

- valida assinatura;
- mantém idempotência pelo identificador do evento;
- confirma pagamentos;
- processa falhas, expiração, reembolso e chargeback;
- registra transações reversas, sem apagar o histórico original.

A função `payment-webhook` deve ser publicada com `--no-verify-jwt`, pois a chamada parte do provedor externo. Isso não a torna pública sem proteção: a assinatura do provedor é obrigatória.

## Storage protegido

Buckets privados incluem, entre outros:

- `lesson-videos`;
- materiais de aula;
- arquivos de produtos digitais;
- masters e stems de beats;
- `service-deliveries`.

Acesso é concedido por RLS, participação no domínio e URLs temporárias. Botões de download ou bloqueios do navegador não substituem autorização no servidor.

## Regras de interface

- sidebar permanentemente fixa e fora dos contêineres roláveis;
- scroll horizontal e vertical restrito ao componente que necessita de overflow, principalmente tabelas;
- Portal do Aluno usando o mesmo AppShell e a mesma largura útil dos demais portais;
- nenhum `max-width` estrutural exclusivo que reduza o Portal do Aluno.

## Deploy do Supabase

O workflow manual `Deploy Supabase` usa GitHub Environments e exige:

- `SUPABASE_ACCESS_TOKEN`;
- `SUPABASE_PROJECT_REF`;
- `SUPABASE_DB_PASSWORD`.

A publicação das funções é executada por:

```bash
node scripts/deploy-supabase-functions.mjs
```

Nunca reutilize o projeto de desenvolvimento em produção.

## Segurança

- RLS obrigatória em tabelas expostas;
- funções privilegiadas ficam no schema privado;
- wrappers públicos usam `SECURITY INVOKER` e verificações explícitas;
- secrets somente no servidor;
- operações financeiras são idempotentes e auditáveis;
- ledger de dupla entrada deve permanecer balanceado;
- release é bloqueado se detectar bypass, mocks ou referências ao ambiente `dev` em uma build de produção.

## Documentação complementar

Consulte a pasta `docs/` para auditoria, homologação manual, arquitetura comercial e procedimentos operacionais.
