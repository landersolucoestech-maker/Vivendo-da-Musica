# Roadmap de Desenvolvimento e Produção

## Estado das 22 etapas

| Etapa | Entrega | Estado |
|---:|---|---|
| 01 | Fundação do produto | Concluída |
| 02 | UX, UI e Design System | Concluída |
| 03 | Arquitetura geral | Concluída |
| 04 | Modelagem completa do banco | Concluída |
| 05 | Autenticação, RBAC e segurança | Concluída |
| 06 | Plataforma de cursos | Concluída |
| 07 | Marketplace musical | Concluída |
| 08 | Sistema de beats | Concluída |
| 09 | Financeiro | Concluída, ativação Stripe pendente de credenciais |
| 10 | Área do aluno | Concluída |
| 11 | Área do instrutor | Concluída |
| 12 | Área do produtor/vendedor | Concluída |
| 13 | Comunidade | Concluída |
| 14 | Eventos | Concluída |
| 15 | Oportunidades | Concluída |
| 16 | CMS | Concluída |
| 17 | Painel administrativo | Concluída |
| 18 | APIs | Concluída |
| 19 | Observabilidade | Concluída |
| 20 | Testes | Concluída |
| 21 | Infraestrutura | Concluída; configuração dos ambientes externos pendente |
| 22 | Roadmap de desenvolvimento | Concluída |

## Ordem de promoção e dependências

1. Configurar os GitHub Environments `staging` e `production` com os secrets e variables descritos em `infra/README.md`.
2. Criar ou confirmar projetos Supabase remotos separados para homologação e produção.
3. Executar `Remote Release` para `staging`; o workflow aplica qualidade, E2E, migrações, funções e imagem nessa ordem.
4. Executar smoke tests funcionais e financeiros em staging.
5. Configurar Stripe/Pix, webhooks e segredos diretamente no ambiente remoto quando as credenciais forem disponibilizadas.
6. Realizar compra de valor mínimo e conferir pedido, ledger, licença/download, reembolso e conciliação.
7. Validar restauração remota isolada e registrar RPO/RTO medidos.
8. Aprovar a release e executar `Remote Release` para `production`.
9. Promover no runtime remoto a imagem identificada pelo SHA aprovado.
10. Monitorar saúde, erros, filas, webhooks, pagamentos e auditoria por 24 horas.

Produção depende da aprovação de staging. Financeiro depende das credenciais Stripe. Downloads licenciados dependem de pedido pago e webhook idempotente. Publicação de conteúdo depende de RBAC e moderação. Rollback de aplicação depende de uma tag SHA previamente saudável.

## Roadmap técnico e funcional

### Release 1 — Ativação controlada

- Configurar ambientes externos, domínio, DNS, TLS e imagem remota.
- Cadastrar conteúdo real mínimo: curso, produto, beat, evento e oportunidade.
- Ativar autenticação, e-mail transacional e recuperação de senha.
- Validar jornadas de aluno, instrutor, produtor e administrador.
- Ativar Stripe somente após credenciais e webhooks de staging estarem validados.

### Release 2 — Operação assistida

- Iniciar beta fechado e acompanhar funil, erros e suporte.
- Ajustar busca, recomendações, catálogo e onboarding com dados reais.
- Validar repasses, chargebacks, reembolsos e conciliação financeira.
- Exercitar moderação de comunidade, CMS, eventos e oportunidades.

### Release 3 — Escala e Enterprise

- Medir cache/CDN, filas e workers sob carga representativa.
- Definir SLOs por jornada e alertas com responsáveis de plantão.
- Evoluir multi-organização, relatórios avançados, contratos corporativos e integrações.
- Revisar retenção, exportação de dados, LGPD e trilhas de auditoria.

## Roadmaps especializados

| Área | Próxima evolução após ativação |
|---|---|
| UX/UI | Testes com usuários, métricas de tarefa, acessibilidade WCAG e refinamento mobile |
| Banco | Índices guiados por métricas, retenção, PITR e ensaio mensal de restore remoto |
| APIs | Consumidores externos, contratos versionados, quotas e portal de documentação |
| Infraestrutura | Runtime remoto, domínio, WAF/CDN, promoção imutável e rotação automatizada de secrets |
| Testes | Jornadas autenticadas, fixtures remotas isoladas, carga financeira e chaos/DR |

## Critérios de aceite por release

- Nenhum erro em typecheck ou lint; avisos precisam estar registrados e não podem crescer.
- Todos os testes unitários, de contrato, segurança, banco e E2E aprovados com execução sequencial.
- Auditoria npm sem vulnerabilidade alta ou crítica.
- Build reproduzível e nenhum chunk acima de 500 KiB sem justificativa aprovada.
- Migrações aplicadas primeiro em staging e nunca alteradas após aplicação.
- RLS ativa em dados privados; funções privilegiadas sem execução pública indevida.
- Webhooks idempotentes e assinados; ledger balanceado; contratos/licenças imutáveis.
- Downloads privados entregues apenas por URL assinada de curta duração.
- Logs não contêm tokens, senhas, dados de cartão ou service-role keys.
- Health checks, métricas e alertas operacionais antes de receber tráfego.

## Gates de produção

| Gate | Evidência | Bloqueia produção |
|---|---|---:|
| Qualidade | Workflow `Quality Gates` verde | Sim |
| Segurança | npm audit, RLS/RPC e advisor revisados | Sim |
| Banco | Migrações e testes SQL aprovados em staging | Sim |
| E2E | Jornadas públicas e protegidas aprovadas | Sim |
| Financeiro | Credenciais, webhook, compra, estorno e conciliação validados | Sim para vendas |
| Backup/DR | Restore remoto ensaiado e RPO/RTO registrados | Sim |
| Observabilidade | Health, logs, métricas e alertas ativos | Sim |
| Aprovação | Responsável de produto e responsável técnico | Sim |

## Checklist final

### Já entregue

- [x] Produto e arquitetura definidos.
- [x] Design system e superfícies funcionais implementados.
- [x] Banco remoto versionado, RLS/RBAC e auditoria implementados.
- [x] Cursos, marketplace, beats, áreas privadas, comunidade, eventos, oportunidades e CMS implementados.
- [x] Financeiro, ledger, licenças, contratos, downloads e conciliação implementados.
- [x] API v1 e observabilidade remota implementadas.
- [x] Gates sequenciais: 20 testes automatizados e 4 E2E aprovados.
- [x] Auditoria de dependências com 0 vulnerabilidades.
- [x] CI/CD, Docker de deploy, rollback e disaster recovery definidos.

### Necessário antes de produção

- [ ] Criar/proteger GitHub Environments e preencher variables/secrets.
- [ ] Confirmar projetos Supabase remotos separados de staging e produção.
- [ ] Configurar runtime remoto do frontend, domínio, DNS e TLS.
- [ ] Habilitar backups/PITR conforme o plano contratado e testar restore remoto.
- [ ] Configurar provedor de e-mail e validar entregabilidade.
- [ ] Inserir credenciais Stripe/Pix e registrar endpoints de webhook.
- [ ] Executar teste financeiro completo em staging.
- [ ] Executar revisão LGPD, termos, privacidade e contratos com responsáveis legais.
- [ ] Cadastrar conteúdo real e aprovar revisão editorial.
- [ ] Obter aprovação humana de produto e engenharia para produção.

## Definição de encerramento

As 22 etapas de implementação e preparação estão encerradas. A plataforma só é considerada pronta para receber vendas reais quando todos os itens “Necessário antes de produção” estiverem marcados, especialmente credenciais financeiras, restore remoto e aprovação de release.
