# Auditoria exaustiva de CRUD, modais e operação da plataforma

Data de referência: 4 de agosto de 2026  
Repositório: `landersolucoestech-maker/Vivendo-da-Musica`  
Branch: `dev`  
Supabase DEV: `ywirfqvobfnunlcsnptm`

## 1. Objetivo

Esta auditoria verifica, de forma estrutural e funcional:

1. onde a plataforma cria, edita, visualiza, publica, arquiva, cancela ou exclui registros;
2. se formulários operacionais são apresentados em popup centralizado;
3. se existe ação explícita de `Visualizar` para registros que podem ser criados ou editados;
4. se algum componente ainda utiliza abertura lateral, `slide-in`, `slide-out` ou `SheetContent side=...`;
5. como frontend, banco, Storage, autenticação, checkout, entregas e portais se conectam;
6. o que está funcional no ambiente `dev` e o que ainda é obrigatório antes de produção.

A auditoria não considera login, recuperação de senha, checkout, contato, validação de certificado e configuração do próprio perfil como CRUDs de gestão. Esses fluxos continuam sendo páginas próprias porque representam jornadas completas, e não edição contextual de registros em uma listagem.

## 2. Regra obrigatória de interface

Para todas as áreas operacionais:

- `Criar`, `Novo`, `Cadastrar`, `Solicitar` e ações equivalentes abrem popup centralizado;
- `Editar`, `Alterar`, `Substituir` e ações equivalentes abrem popup centralizado;
- `Visualizar`, `Ver` ou `Detalhes` abre popup centralizado e somente leitura;
- confirmações destrutivas usam `AlertDialog` centralizado;
- menus móveis que utilizam o primitive `Sheet` também são apresentados como popup, sem painel lateral;
- não são permitidas animações direcionais `slide-in` ou `slide-out`;
- páginas de listagem mostram resumo, filtros, métricas e ações, mas não formulários operacionais completos.

Os primitives globais `Dialog`, `AlertDialog` e `Sheet` utilizam `position: fixed`, centro da viewport, overlay, rolagem interna e transição limitada a `fade + zoom`.

## 3. Método automatizado

O script `scripts/audit-platform-crud-flows.mjs` é executado pelos gates `npm test` e `npm run quality`.

Ele percorre todo o diretório `src` e verifica:

- tags `<form>` e sua posição em relação a `DialogContent`, `AlertDialogContent` ou `SheetContent`;
- componentes delegados com nomes `*Form` e `*Editor`;
- componentes que encapsulam internamente o próprio popup;
- páginas operacionais com ação de criação, edição ou solicitação sem ação explícita de visualização;
- classes `slide-in-from-*` e `slide-out-to-*` em componentes modais;
- uso de `SheetContent side=...`;
- declarações de rota nos dois pontos de entrada da aplicação.

A primeira execução completa inspecionou 366 arquivos e 187 declarações de rota e encontrou 11 violações reais. Depois da remoção de arquivos obsoletos e da consolidação de fluxos, a árvore passou a conter 364 arquivos auditáveis.

## 4. Problemas encontrados e correções

### 4.1 Cursos — administrador e instrutor

Problema anterior:

- rotas legadas de criação e edição renderizavam formulário diretamente como página;
- existia um editor de currículo duplicado e embutido na página do instrutor.

Correção:

- `AdminCoursesPage` e `InstructorCoursesPage` reutilizam `CourseManagementDialog`;
- os modos são `create`, `view` e `edit`;
- módulos, aulas e materiais são manipulados no mesmo popup;
- rotas legadas continuam válidas, mas apenas abrem automaticamente o popup correspondente;
- o editor inline duplicado foi removido.

### 4.2 Conteúdos da Academia

Problema anterior:

- `AcademyContentForm` era renderizado em um card direto na página;
- não havia visualização somente leitura.

Correção:

- criação e edição usam popup;
- `Visualizar` mostra título, slug, categoria, status, descrição, corpo, vídeo e anexos;
- exclusão continua protegida por confirmação destrutiva centralizada.

### 4.3 Produtos administrativos

Problema anterior:

- o componente de gestão suportava somente criação e edição;
- a tabela não oferecia `Visualizar`.

Correção:

- `ProductManagementDialog` possui modos `create`, `view` e `edit`;
- o modo `view` é somente leitura;
- a tabela administrativa possui ações explícitas de visualização e edição.

### 4.4 Produtos digitais do produtor

Problema anterior:

- o formulário de criação ocupava permanentemente parte da página;
- não existiam visualização e edição completas;
- o serviço não carregava descrição e metadados dos arquivos.

Correção:

- a página contém somente cabeçalho, métricas/listagem e ações;
- criação, visualização e edição usam popup;
- o modo de visualização mostra dados comerciais e arquivos privados;
- a edição permite substituir o arquivo entregue;
- o serviço passa a carregar descrição, nome, MIME type, tamanho, data e caminho privado;
- downloads do produtor são emitidos por URL assinada temporária.

### 4.5 Oportunidades da empresa

Problema anterior:

- criação e edição já usavam popup, mas o card exibia detalhes sem modo `Visualizar` dedicado.

Correção:

- o card apresenta resumo;
- `Visualizar` abre descrição, requisitos, benefícios, faixa de valor, prazos, candidatos, publicação e renovações;
- edição permanece em popup;
- exclusão usa confirmação destrutiva;
- renovação continua consumindo crédito quando aplicável.

### 4.6 Central de suporte

Problema anterior:

- abertura de ticket era um formulário permanente na página;
- tickets não possuíam modal de consulta.

Correção:

- `Nova solicitação` abre popup;
- `Visualizar` mostra protocolo, assunto, mensagem, solicitante, prioridade, data e status;
- a página exibe somente histórico resumido e perguntas frequentes.

### 4.7 Solicitações de serviço do aluno

Problema anterior:

- a criação já usava popup, mas briefing e propostas eram expostos integralmente no card;
- cancelamento não possuía confirmação dedicada.

Correção:

- cards mostram somente resumo;
- `Visualizar` abre briefing completo, orçamento, data e todas as propostas;
- aceite e redirecionamento ao checkout permanecem no popup de visualização;
- cancelamento usa `AlertDialog`.

### 4.8 Financeiro do instrutor

Problema anterior:

- solicitação de repasse era um bloco de formulário dentro da página;
- o histórico não possuía visualização detalhada.

Correção:

- `Solicitar repasse` abre popup;
- histórico possui ação `Visualizar`;
- detalhes apresentam valor, status, solicitação, processamento e identificador.

### 4.9 Portal do afiliado

Problema anterior:

- solicitação de saque era formulário embutido;
- histórico não possuía visualização detalhada.

Correção:

- `Solicitar saque` abre popup;
- cada saque possui `Visualizar`;
- saldo, método, data, status e identificador são exibidos em modo somente leitura.

### 4.10 Portal do produtor — catálogo de serviços

Problema anterior:

- havia uma página de catálogo de serviços não solicitada e sem rota válida no escopo final.

Correção:

- a página obsoleta foi removida;
- não há item de menu, constante de rota ou tela funcional de catálogo de serviços no Portal do Produtor.

### 4.11 Beats e contratos de licenciamento

Estado atual:

- publicação de beat usa popup;
- edição de beat usa popup;
- edição de cada licença é um componente que encapsula seu próprio popup;
- cada licença aceita upload, substituição, download e remoção de contrato PDF, DOC ou DOCX de até 20 MB;
- contratos são armazenados no bucket privado `beat-license-contracts`;
- o comprador recebe prioritariamente o contrato enviado pelo produtor;
- geração automática de PDF permanece apenas como contingência quando não existe documento enviado.

## 5. Como a plataforma funciona atualmente

### 5.1 Camada de apresentação

- React 18, TypeScript e Vite;
- React Router para páginas públicas e áreas protegidas;
- TanStack Query para leitura, invalidação e sincronização de estado remoto;
- primitives Radix para diálogos, alertas, selects, accordions e demais controles;
- layouts separados para aluno, instrutor, produtor, afiliado, empresa e administrador;
- cabeçalho fixo e rolagem interna independente do conteúdo e da sidebar.

### 5.2 Autenticação e autorização

A arquitetura prevê:

1. Supabase Auth identifica o usuário;
2. `AuthProvider` carrega sessão e perfil;
3. `ProtectedRoute` bloqueia usuários sem sessão;
4. `RoleGuard` restringe portais por papel;
5. RLS valida novamente a operação no banco e no Storage.

No preview `dev`, o bypass de autenticação continua ativo para permitir inspeção direta com identidades sintéticas. Isso não representa o comportamento autorizado para produção.

### 5.3 Persistência e APIs

- páginas e componentes chamam hooks de domínio;
- hooks chamam services específicos;
- services utilizam Supabase PostgREST, RPCs, Storage e Edge Functions;
- mutações invalidam as queries afetadas;
- o frontend nunca deve ser a única camada de autorização;
- regras de propriedade e papel são aplicadas por RLS, funções auxiliares e políticas de bucket.

### 5.4 Academia

Fluxo operacional:

1. administrador ou instrutor cria curso em popup;
2. curso começa como rascunho;
3. módulos e aulas são adicionados no editor modal;
4. vídeos e materiais são vinculados;
5. publicação libera o curso no catálogo;
6. matrícula ativa permite acesso às aulas;
7. progresso é persistido por usuário e aula;
8. certificado depende das regras de conclusão e da matrícula correspondente.

### 5.5 Marketplace de produtos digitais

Fluxo operacional:

1. administrador ou produtor cadastra metadados e arquivo;
2. arquivo privado é salvo no bucket correspondente;
3. produto é publicado após revisão;
4. comprador adiciona ao carrinho e conclui checkout;
5. pedido pago cria direito de entrega;
6. download usa URL assinada temporária;
7. reembolso ou disputa deve gerar ajuste financeiro sem apagar o histórico.

### 5.6 Marketplace de beats

Fluxo operacional:

1. produtor envia preview, master e stems opcionais;
2. sistema cria licenças a partir dos modelos ativos;
3. produtor ajusta preço, direitos, entregáveis e contrato de cada licença;
4. beat publicado aparece no marketplace;
5. checkout preserva snapshots do beat, licença, preço e comprador;
6. pagamento aprovado emite compra de licença, contrato e entrega;
7. master/stems são liberados por URL assinada;
8. venda exclusiva bloqueia novas licenças incompatíveis;
9. eventos de view, play e checkout alimentam métricas;
10. receita gera lançamentos financeiros e saldo do produtor.

### 5.7 Serviços

Fluxo do aluno:

1. aluno cria solicitação em popup;
2. prestadores habilitados enviam propostas;
3. aluno visualiza briefing e propostas no popup;
4. proposta aceita gera oferta canônica;
5. checkout cria contratação;
6. marcos, entregas, revisão, aceite, disputa e ajustes pertencem ao domínio do contrato de serviço.

O catálogo próprio de serviços do produtor não faz parte do escopo atual do Portal do Produtor.

### 5.8 Oportunidades e empresas

1. empresa possui carteira de créditos;
2. nova publicação consome crédito;
3. edição não consome crédito;
4. renovação pode consumir novo crédito;
5. candidatos aplicam a partir do portal profissional;
6. empresa acompanha pipeline, perfil, mensagens e status;
7. exclusão não devolve automaticamente o crédito consumido.

### 5.9 Afiliados

1. links identificam origem da indicação;
2. conversão aprovada gera comissão;
3. comissão passa pelos estados de disponibilidade;
4. saldo disponível pode ser solicitado em popup;
5. pedido de saque entra no fluxo financeiro e preserva histórico de eventos.

### 5.10 Financeiro e ledger

A plataforma possui estruturas canônicas para:

- pedido e itens de pedido;
- ofertas e snapshots comerciais;
- pagamentos e fulfillment;
- saldos por beneficiário;
- solicitações de repasse;
- ajustes, reembolsos, chargebacks e disputas;
- eventos financeiros imutáveis ou auditáveis.

O objetivo é evitar que totais históricos sejam recalculados usando preços atuais ou que eventos sejam sobrescritos.

### 5.11 Storage e downloads

Buckets públicos são reservados a conteúdo realmente público, como imagens e previews autorizados. Masters, stems, produtos, contratos, vídeos privados, materiais e entregas permanecem privados.

O acesso ocorre por:

- política de propriedade para uploads e manutenção;
- verificação de compra, matrícula ou participação;
- URL assinada com prazo curto;
- Edge Function quando a entrega exige regra adicional ou auditoria.

## 6. Estado por ambiente

| Área | DEV atual | Produção necessária |
|---|---|---|
| Interface e portais | Funcional para homologação | revisão visual/textual final |
| CRUD em popup | regra implementada e auditada | manter gate obrigatório |
| Banco e RLS | migrations e políticas no projeto DEV | aplicar em staging e produção com revisão |
| Auth | bypass no preview | sessão real, MFA/políticas e revisão de papéis |
| Checkout | simulação restrita ao DEV | processador real, webhooks e idempotência operacional |
| Downloads | URLs assinadas e arquivos demonstrativos | arquivos definitivos e política de retenção |
| Financeiro | estrutura de saldos, ledger e repasses | conciliação real, provider de payout e operação administrativa |
| E-mail/notificações | estrutura de dados | provider, templates, fila e observabilidade |
| Observabilidade | páginas e eventos técnicos disponíveis | alertas, retenção, métricas e resposta a incidentes |
| Segurança | RLS, buckets privados e gates | pentest, secrets finais, rate limiting e revisão auth |

## 7. Pendências reais antes de produção

1. remover o bypass de autenticação e executar homologação completa com usuários reais de cada papel;
2. revisar criação, convite, mudança e remoção de papéis e capacidades;
3. integrar processador real de pagamentos e webhooks assinados;
4. implementar conciliação, reembolso, chargeback e payout reais;
5. substituir todos os arquivos sintéticos e dados demonstrativos;
6. configurar e-mails transacionais e notificações assíncronas;
7. executar pentest e revisão independente de RLS, Storage e Edge Functions;
8. atualizar o React Router em rodada controlada e remover a exceção temporária do advisory;
9. configurar ambientes separados de staging e produção, com secrets próprios;
10. executar migração e validação do tenant inicial;
11. definir backups, retenção, restauração e plano de resposta a incidentes;
12. revisar termos, privacidade, contratos, DPA, SLA e políticas comerciais;
13. concluir homologação funcional, visual, responsiva e de acessibilidade pelo proprietário.

## 8. Critério de conclusão

A plataforma somente pode ser considerada pronta para produção quando:

- todos os gates de frontend e banco estiverem verdes no mesmo commit;
- a auditoria de CRUD/modais retornar zero violações;
- nenhum ambiente produtivo utilizar bypass, identidade sintética ou checkout demonstrativo;
- pagamentos, webhooks, entregas e repasses forem testados ponta a ponta em staging;
- autenticação e autorização forem auditadas separadamente;
- pentest e revisão de dados pessoais forem concluídos;
- o proprietário aprovar a homologação manual final.

## 9. Conclusão

A arquitetura possui os principais domínios necessários para uma plataforma de educação e negócios musicais: Academia, conteúdos, marketplace, beats, serviços, oportunidades, comunidade, afiliados, empresas, finanças, suporte e administração.

A rodada de 4 de agosto de 2026 corrige a inconsistência de apresentação dos CRUDs e transforma a regra de popup em uma invariante automatizada. O ambiente `dev` continua sendo um ambiente de homologação demonstrativa, não uma declaração de prontidão para produção.
