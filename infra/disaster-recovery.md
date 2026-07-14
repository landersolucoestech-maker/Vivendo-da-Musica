# Runbook de Disaster Recovery

## Critério de acionamento

Acione o runbook somente para indisponibilidade prolongada, corrupção/perda de dados ou comprometimento confirmado. Registre responsável, horário, impacto e último deploy antes de qualquer ação.

## Sequência obrigatória

1. Congelar releases e revogar credenciais comprometidas.
2. Identificar o último SHA íntegro e o ponto de recuperação remoto.
3. Preservar logs, trilhas de auditoria e evidências.
4. Restaurar o backup/PITR em um novo projeto Supabase remoto isolado.
5. Aplicar somente migrações posteriores necessárias e executar `supabase/tests/database/platform_security.test.sql`.
6. Validar Auth, RLS, Storage privado, Edge Functions, webhooks, ledger e contratos imutáveis.
7. Executar os gates `quality` e `test:e2e` contra o ambiente restaurado.
8. Trocar DNS/runtime somente após aprovação humana registrada.
9. Monitorar métricas, erros e reconciliação financeira durante 24 horas.
10. Produzir post-mortem e rotacionar todos os segredos envolvidos.

## Proibições

- Não restaurar diretamente sobre produção sem ensaio remoto isolado.
- Não reutilizar service-role keys ou senhas potencialmente expostas.
- Não apagar logs, migrações ou registros financeiros para “corrigir” divergências.
- Não executar rollback destrutivo de schema; criar migração compensatória.
