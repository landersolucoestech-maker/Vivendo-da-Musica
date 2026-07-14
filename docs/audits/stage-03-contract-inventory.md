# ETAPA 3 — Inventário dos Contratos

Data: 2026-07-13 (America/Sao_Paulo)

## Status

**APROVADA COM DIVERGÊNCIAS**

A etapa identifica contratos e divergências; nenhuma correção foi aplicada.

## Matriz de formulários e fluxos

| Fluxo | Campo no formulário | Schema/validação | Tipo/payload | Backend/Supabase | Coluna/Storage | Tipo SQL | Response/edição/reload | Divergência |
|---|---|---|---|---|---|---|---|---|
| Login | `email`, `password` | Zod; email válido e ambos obrigatórios | `{email,password}` | `auth.signInWithPassword` | `auth.users` | Auth | Sessão + perfil | Alinhado |
| Cadastro | `name`, `email`, `phone`, senha, confirmação, termos | Zod; trim, senha ≥8, confirmação e termos | metadata `full_name`, `phone` | `auth.signUp` | `auth.users.raw_user_meta_data` | JSONB | E-mail de verificação | `phone` não é promovido ao perfil; não há trigger em `auth.users` |
| Recuperar senha | `email` | Zod email | `{email,redirectTo}` | `resetPasswordForEmail` | Auth | Auth | Link de recuperação | Alinhado |
| Redefinir senha | senha e confirmação | Zod; ≥8 e igualdade | `{password}` | `auth.updateUser` | Auth | Auth | Estado concluído | Alinhado |
| Editar perfil | name, email, phone, bio, instagram, youtube, website | HTML/manual; sem Zod | mutation aceita apenas `full_name`, `avatar_url` | UPSERT `user_profiles` | somente `full_name`, `avatar_url` existem | text | Reload restaura somente nome/avatar/email Auth | Cinco campos editáveis nunca persistem; email é disabled |
| Avatar | arquivo `image/*`; UI diz 5 MB | validação no hook | `${userId}/avatar.ext` | remove/upload/getPublicUrl | bucket `avatars`, `avatar_url` | text | URL pública | Bucket não possui limite/MIME explícitos remotamente |
| Contato público | name, email, subject, message | HTML required; sem Zod | estado local | timeout artificial | nenhuma | — | formulário é limpo e exibe sucesso | Mock indevido: nenhuma mensagem é enviada/persistida |
| Curso admin | title, slug, description, price em centavos | HTML required; sem Zod | snake_case direto | INSERT/UPDATE `courses` | campos homônimos | text/int4 | Edição recarrega curso | Slug sem pattern no admin; preço aceita valores negativos na UI admin |
| Curso instrutor | title, slug, description, price em centavos | HTML min/pattern; sem Zod | camelCase convertido no service | INSERT/UPDATE `courses` | campos homônimos | text/int4 | Reload por ID | Alinhado por conversão explícita |
| Currículo | título módulo/aula, arquivos | trim/manual; sem Zod | title/orderIndex/file/kind | INSERT módulos/aulas + Storage | `course_modules`, `lessons`, `lesson_files` | uuid/text/int4 | Query invalidada | `lesson_files.lesson_id` é nullable no banco |
| Conteúdo academia | title, slug, subtitle, category, description, body, tags, mídia | required/manual; sem Zod | `AcademyContentInput` camelCase | mapper explícito para snake_case | `academy_contents`, attachments, buckets academy | text/text[]/int8/enum | Edição/reload mapeados | Contrato principal alinhado |
| Progresso | watched seconds/percentage/completed | cálculo no hook; sem schema | UPSERT | `lesson_progress` | percent/int4/bool | int4/bool nullable | Query invalidada | Colunas funcionais são nullable; tipos locais assumem presença |
| Certificado | código ou certificateId | código obrigatório/manual | body Edge Function | validate/get certificate | snapshots e code | uuid/text/timestamptz | DTO camelCase | Alinhado; emissão é trigger |
| Novo beat | title, genre, BPM, musicalKey, mood, description, preview/master/stems | HTML limites; sem Zod | mapper em `createBeat` | uploads + INSERT | `beats`, buckets beat | text/int4/enum | dashboard recarregado | Banco permite BPM/key/mood nullable, UI exige; arquivos exigidos na UI |
| Licença de beat | name, preço em reais, maxCopies, rights, deliverables, available | HTML/manual | reais ×100; linhas→arrays | UPDATE `beat_licenses` | JSONB/int4/bool | jsonb/int4 | reload dashboard | Sem schema para precisão/overflow; conversão é explícita |
| Produto digital | title, slug, productType, priceCents, description, arquivo | HTML min/pattern; cast de enum | `CreateSellerProductInput` | upload + INSERT produto/arquivo | `seller_products`, `seller_product_files` | text/int4/int8 | Query invalidada | `product_type/status` são text; bucket não restringe MIME |
| Produto admin legado | title, category, description, preço em reais | HTML/manual | reais ×100 | `createProduct`/`updateProduct` retornam sucesso artificial | nenhuma escrita | — | navega como se tivesse salvo | Mock indevido; existe contrato real distinto em `seller_products` |
| Checkout beat | licenseIds, cupom/afiliado opcionais | validação na Edge/RPC | body `licenseIds` | `create-beat-checkout` | orders/items/promotions | uuid/int4/enums | retorna URL Stripe | Stripe não validado; idempotência não explícita no cliente |
| Checkout produto | productIds | validação na Edge/RPC | body `productIds` | `create-digital-product-checkout` | digital orders/items | uuid/int4/text | retorna URL Stripe | Status do pedido é text, não enum |
| Saque | amountCents, payoutMethodId, idempotencyKey | validação Edge/RPC | body explícito | `request-producer-payout` | payout requests | int8/uuid/enum | dashboard financeiro | Alinhado; provedor real não validado |
| Comunidade/post | texto | trim e limites no service/banco | `{content}` | INSERT | `community_posts.content` | text | reload da lista | Sem schema Zod |
| Comunidade/grupo | name, description | manual | slug derivado | INSERT | `community_groups` | text/enums | reload | Slug é transformação explícita, sem schema |
| Comunidade/report | target, reason, details | union TS/manual | INSERT/RPC moderação | reports/actions | text/uuid/enum | lista/admin | `reason` e `target_type` são text no banco |
| Evento/inscrição | eventId | identidade da sessão | INSERT | registration | PK composta/enums | reload | Alinhado; capacidade por trigger |
| Evento/presença | eventId, userId | service admin | UPDATE | registration/certificate trigger | timestamptz/uuid | reload | Alinhado |
| Oportunidade/candidatura | id, coverLetter, portfolioUrl | manual | INSERT | application | text/uuid/enum | reload | Sem Zod/validação URL no frontend |
| Oportunidade/favorito | id/isFavorite | boolean | INSERT/DELETE | favorite | PK composta | reload | Alinhado |
| CMS/artigo | campos editoriais, SEO, relatedSlugs | admin service/manual | mapper explícito | CRUD documents/blocks/media | `cms_*` | text/jsonb/arrays/enums | reload | Tipos locais usam level fechado, banco usa text nullable |
| Admin/integração | nome/status | ação de toggle | busca por display name | UPDATE | `platform_integrations` | text/jsonb | reload | Identificação por display name, não key canônica |
| Admin/configuração | key/value | JSON manual | `{value,updated_by}` | UPDATE | `platform_settings` | jsonb | reload | Sem schema por key |
| Admin/usuários | leitura | — | `MockUser` | SELECT profiles | user_id/name/role | uuid/text/enum | tabela admin | E-mail é fabricado como `<uuid>@id.local` |
| Admin/faturas | leitura | — | array vazio | nenhuma | nenhuma | — | vazio artificial | Contrato não implementado |
| Admin/sessões | listar/revogar | — | array vazio/erro fixo | nenhuma | Auth sessions | — | UI sem operação real | Contrato não implementado |
| Admin/assinaturas | resumo/planos/lista | — | zeros/arrays vazios | nenhuma | tipo local cita `user_subscriptions` | inexistente remoto | vazio artificial | Contrato inexistente no banco remoto |
| Suporte autenticado | subject, message | HTML required + trim no service | `{subject,message}` | INSERT | `support_tickets` | text | query invalidada/reload | Real; sem schema Zod/limites no frontend |
| Biblioteca/VIP | planos, benefícios, FAQ e itens | tipos locais | dados estáticos | nenhuma | nenhuma | — | runtime mock | Contrato real inexistente |

## Tipos Supabase

| Item | Arquivo local | Schema remoto gerado | Divergência |
|---|---:|---:|---|
| Tabelas tipadas | 10 | 79 | 69 tabelas ausentes localmente |
| RPCs tipadas | 6 | 23 | 17 RPCs ausentes localmente |
| Tamanho aproximado | 18.414 caracteres | 117.386 caracteres | Arquivo local severamente defasado |

### Contratos locais inexistentes no remoto

- Tabela `user_subscriptions`.
- RPC `user_has_paid_access`.

### Efeito observado

Services de admin, comunidade, eventos, oportunidades, CMS, produtor, financeiro e marketplace usam `supabase.from as unknown as ...`, `any` ou adapters dinâmicos para contornar a ausência de tabelas e RPCs no tipo gerado local.

## Contratos de Edge Functions

| Função | Request ativo | Response esperada | Estado remoto | Divergência |
|---|---|---|---|---|
| `create-beat-checkout` | `licenseIds`, coupon/affiliate opcionais | `{url}` | Ativa | Stripe pendente |
| `create-digital-product-checkout` | `productIds` | `{url}` | Ativa | Stripe pendente |
| `get-beat-download-url` | deliveryId | signed URL | Ativa | — |
| `get-digital-product-download-url` | fileId | signed URL | Ativa | — |
| `get-beat-license-contract` | purchase/license ID | contrato/hash | Ativa | — |
| `request-producer-payout` | valor/método/idempotência | payout | Ativa | — |
| `get-course-certificate` | certificateId | certificado | Ativa | — |
| `validate-course-certificate` | code | validação pública | Ativa | — |
| `get-signed-lesson-url` | lessonFileId/type | signed URL | **Ausente** | Consumidor ativo quebrado remotamente |

## Divergências prioritárias

1. Tipos Supabase locais cobrem somente 10/79 tabelas e 6/23 RPCs.
2. Perfil exibe campos sem coluna/persistência e cadastro não cria perfil automaticamente.
3. `get-signed-lesson-url` é consumida, mas não está publicada.
4. Assinaturas/VIP/faturas/sessões administrativas não possuem contrato real.
5. Existem dados artificiais em runtime, inclusive e-mail administrativo derivado do UUID.
6. A maioria dos formulários de domínio não possui schema Zod, usando apenas validação HTML/manual.
7. Há divergências de nulabilidade em aulas/progresso e strings livres onde tipos locais assumem enums.
8. Stripe impede validação dos contratos externos e respostas reais de checkout/webhook.

## Decisão

Todos os formulários e fluxos runtime identificados na ETAPA 2 foram comparados até o recurso remoto correspondente ou classificados explicitamente como contrato ausente/mock. A ETAPA 3 está aprovada como inventário, não como correção. As divergências devem orientar a ETAPA 4 e, principalmente, a regeneração de tipos da ETAPA 6.
