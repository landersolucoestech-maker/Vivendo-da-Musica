# ETAPA 2 — Inventário Completo da Arquitetura Real

Data: 2026-07-13 (America/Sao_Paulo)

## Status

**APROVADA COM ACHADOS REGISTRADOS**

Esta etapa apenas inventaria contratos e fluxos existentes. Nenhuma divergência foi corrigida.

## Dimensão do frontend

- 78 páginas.
- 83 componentes.
- 56 hooks.
- 19 services.
- 17 superfícies com formulário.
- 126 query keys e 23 invalidações explícitas do React Query.
- 33 páginas/componentes com loading, 45 com estado vazio e 47 com tratamento de erro.
- 6 consumidores de paginação e 13 consumidores de filtros/busca.
- `analytics`, `billing` e `students` contêm somente README e não possuem consumidores runtime; `modules-manager` e `enrollments` são componentes/hooks auxiliares já cobertos pelos fluxos de cursos.

## Rotas ativas

### Públicas

`/`, `/login`, `/matricule-se`, `/cadastro`, `/esqueceu-senha`, `/recuperar-senha`, `/redefinir-senha`, `/verificar-email`, `/verificado`, `/contato`, `/acesso-negado`, `/curso-em-breve`, `/pagamento-sucesso`, `/academia`, `/academia/:courseSlug`, `/academia/:courseSlug/aulas/:lessonSlug`, `/marketplace`, `/marketplace/beats`, `/marketplace/beats/:beatSlug`, `/marketplace/:productSlug`, `/carrinho`, `/checkout`, `/validar`, `/area-vip`, `/biblioteca-premium`, `/conteudos`, `/conteudos/:articleSlug`, `/eventos`, `/eventos/:eventSlug`, `/comunidade` e `/oportunidades`.

### Aluno autenticado

`/aula/:lessonId` exige matrícula. A área `/aluno` inclui dashboard, cursos, certificados, downloads, biblioteca, comunidade, oportunidades, eventos, pedidos, favoritos, perfil, configurações, notificações e suporte.

### Instrutor

`/instrutor`, `/instrutor/cursos`, criação/edição de curso, alunos/avaliações e relatórios. Aceita `instructor`, `admin` e `super_admin`.

### Produtor/vendedor

`/produtor`, `/produtor/beats`, `/produtor/produtos` e `/produtor/pedidos`. Aceita `producer`, `admin` e `super_admin`.

### Administração

`/admin` e superfícies para usuários, alunos, assinaturas, cursos, produtos, pedidos, cupons, conteúdo, eventos, certificados, comunidade, relatórios, observabilidade, configurações, integrações, financeiro, marketing, suporte, auditoria e segurança. Aceita `admin` e `super_admin`.

## Matriz ponta a ponta

| Módulo | Tela/Ação | Hook | Service | Operação Supabase | Edge Function/RPC | Tabela/Bucket | Migration principal | RLS | Situação |
|---|---|---|---|---|---|---|---|---|---|
| Auth/perfil | Cadastro, login, sessão, senha, perfil e avatar | `AuthProvider`, `useUserProfile`, `useAvatarUpload` | Auth direto | Auth + CRUD + Storage | — | `user_profiles`, `avatars` | migrations iniciais | Ativa | Real; bypass dev existe e será auditado na etapa própria |
| Cursos públicos | Catálogo, detalhe e conteúdo | hooks `useCourse*` | `academy.service`, `academyContent.service` | SELECT e Storage | — | `courses`, `course_modules`, `lessons`, `academy_*` | `multicourse_foundation`, `academy_content_cms` | Ativa | Real |
| Aulas/aluno | Acesso, player, arquivos e progresso | `useLessons`, `useLessonFiles`, `useUserProgress` | acesso direto + `studentCourseAccess.service` | SELECT/UPSERT + URL assinada | `get-signed-lesson-url` | `lessons`, `lesson_files`, `lesson_progress`, buckets de aula | foundation + hardening de arquivos | Ativa | Divergente: função local não publicada |
| Matrículas | Proteção de aula e cursos do aluno | `useEnrollment`, `useEnrolledCourses` | `studentCourses.service` | SELECT | triggers de matrícula | `enrollments`, `course_orders`, `course_order_items` | `course_payment_enrollments` | Ativa | Real |
| Certificados | Lista, download e validação pública | `useCertificates` | `certificates.service` | invoke | `get-course-certificate`, `validate-course-certificate` | `course_certificates` | `course_certificates` | Ativa | Funções remotas ativas |
| Checkout | Carrinho e criação de sessão | `useOrders` | `checkout.service` | invoke + leitura de pedidos | `create-beat-checkout`, `create-digital-product-checkout` | orders/items de beat/produto/curso | migrations financeiras | Ativa | Stripe sem credenciais para teste real |
| Beats | Catálogo, gestão, licenças, upload e publicação | `useBeats`, `useDownloads` | `marketplace.service` | CRUD + Storage + invoke/RPC | downloads, contrato, payout, saldo | `beats`, `beat_licenses`, `beat_deliveries`, buckets `beat-*` | `beat_marketplace` e hardenings | Ativa | Real; adapters tipados por casts |
| Produtos digitais | Catálogo, venda, arquivo e download | `useProducts`, `useProducerProducts` | `marketplace.service`, `producer.service` | CRUD + Storage + invoke | checkout/download digital | `seller_products`, files e orders digitais | `seller_digital_products` | Ativa | Real; adapters tipados por casts |
| Financeiro | Ledger, comissão, reconciliação e saque | hooks admin/produtor | `marketplace.service`, `admin.service` | SELECT + RPC/invoke | payout, balance, webhooks | ledger, accounts, payouts, reconciliation | migrations financeiras sequenciais | Ativa | Real; Stripe pendente |
| Dashboard do aluno | Atividades, notificações, favoritos, preferências e suporte | hooks `use*` do dashboard | `student.service` | CRUD | — | `student_*`, `support_*` | migrations de área do aluno | Ativa | Real |
| Instrutor | Cursos, currículo, audiência, reviews e receita | hooks `useInstructor*` | `instructor.service` | CRUD + Storage | triggers de publicação | courses/modules/lessons/files/reviews/orders | migrations de instrutor | Ativa | Real; adapters tipados por casts |
| Comunidade | Posts, grupos, comentários, likes, reports e moderação | `useCommunity` | `community.service` | CRUD + RPC | `moderate_community_report` | `community_*` | migrations de comunidade | Ativa | Real; adapters dinâmicos |
| Eventos | Catálogo, detalhe, inscrição, presença e certificado | `useEvents` | `events.service` | CRUD/RPC | triggers de capacidade/certificado | `events`, agenda, streams, registrations, certificates | migrations de eventos | Ativa | Real; adapters dinâmicos |
| Oportunidades | Lista, candidatura, favorito e portfólio | `useOpportunities` | `opportunities.service` | CRUD | triggers de candidatura/contagem | `opportunities`, applications, favorites, portfolios | `opportunities_foundation` | Ativa | Real; adapters dinâmicos |
| CMS | Artigos, blocos, mídia e revisões | `useArticles` + admin | `content.service`, `admin.service` | CRUD/Storage | trigger de revisão | `cms_*`, `cms-media` | `editorial_cms_foundation` | Ativa | Real; adapters dinâmicos |
| Admin | Controle, feature flags, marketing, auditoria e segurança | hooks `useAdmin*` | `admin.service`, `adminControl.service` | CRUD | funções administrativas | admin logs/settings/flags/marketing/integrations | `admin_control_plane` | Ativa | Parte real; assinaturas/VIP marcadas como mock |
| Observabilidade/API | Saúde, traces, métricas, alertas, rate limit e webhooks | `useObservability` | `observability.service` | CRUD + RPC | `api-v1` | `observability_*`, `api_*`, `webhook_receipts` | API/observability foundations | Ativa | API remota saudável |
| Biblioteca/VIP | Biblioteca premium, planos, benefícios, FAQ | `useLibrary`, `useVip` | `library.service` | Não identificada | — | — | — | — | Runtime marcado explicitamente como mock |

## Backend Supabase

### Edge Functions locais

`api-v1`, `create-beat-checkout`, `create-digital-product-checkout`, `get-beat-download-url`, `get-beat-license-contract`, `get-course-certificate`, `get-digital-product-download-url`, `get-signed-lesson-url`, `request-producer-payout`, `stripe-beat-webhook`, `stripe-digital-product-webhook` e `validate-course-certificate`.

Onze estão ativas remotamente. `get-signed-lesson-url` está ausente no remoto.

### API v1

- `GET /health`
- `GET /catalog/{resource}`
- `POST /webhooks/{provider}`

Possui paginação, envelope de erro, request/trace ID, rate limit, idempotência, HMAC para webhook, observabilidade e CORS configurado por `ALLOWED_ORIGINS`.

### Webhooks Stripe

Os dois webhooks exigem POST, assinatura `stripe-signature`, HMAC SHA-256, comparação resistente a timing e tolerância de 5 minutos. A persistência utiliza status condicionais/RPCs, mas o sandbox Stripe ainda não foi validado por ausência de credenciais.

## Banco remoto

- 79 tabelas públicas, todas com RLS.
- 1 view: `published_courses_preview`.
- 43 enums.
- 241 índices.
- 79 PKs, 115 FKs, 59 constraints unique e 718 checks.
- 54 funções públicas e 80 triggers.
- 187 políticas públicas e 27 políticas de Storage.
- 63 arquivos de migration locais versus 65 entradas no histórico remoto.

## Storage remoto

Públicos: `academy-images`, `academy-materials`, `academy-videos`, `avatars`, `beat-previews`, `cms-media`.

Privados: `beat-masters`, `beat-stems`, `lesson-projects`, `lesson-samples`, `seller-product-files`.

Todos, exceto `avatars`, possuem limite explícito; `avatars` e `seller-product-files` não possuem lista explícita de MIME types.

## Achados para etapas posteriores

1. Drift entre migrations locais e histórico remoto.
2. `get-signed-lesson-url` é consumida pelo frontend e existe localmente, mas não está publicada.
3. `published_courses_preview` não está marcada como `security_invoker` e recebeu grants amplos para `anon`/`authenticated`.
4. `update_updated_at_column` mantém EXECUTE para `PUBLIC`.
5. Há vários adapters `supabase.from as unknown as ... => any` devido a tipos Supabase incompletos.
6. Biblioteca/VIP e assinaturas administrativas usam query keys marcadas como `mock` em runtime.
7. `AdminSettingsPage` tem warning de dependência ausente em hook.
8. Stripe não possui credenciais para validação integrada.

## Critério de encerramento

Frontend, acesso a dados, backend Supabase, banco, Storage e fluxos ativos foram inventariados sem correções. Os achados não são declarados resolvidos e devem ser tratados nas etapas específicas, começando pelo inventário de contratos da ETAPA 3.
