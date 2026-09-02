# Agentic Engineering OS — Vivendo da Música

## Objetivo

Construir uma camada agentic de engenharia governada por um runtime determinístico. O modelo pode investigar, planejar, implementar e revisar, mas não decide sozinho se uma operação é autorizada, se um gate foi satisfeito, se uma evidência existe ou se uma ação destrutiva pode prosseguir.

## Princípios obrigatórios

1. Deny by default: capability não declarada é bloqueada.
2. Contratos executáveis: agentes, riscos, capabilities e limites são validados em runtime.
3. Separação entre decisão probabilística e autorização determinística.
4. Operações privilegiadas ou destrutivas exigem aprovação humana quando o contrato assim determinar.
5. Nenhum agente pode declarar a si mesmo aprovado, concluir gate sem evidência ou ampliar as próprias permissões.
6. Toda execução deve possuir correlation id, trilha de evidência e resultado verificável.
7. Registry é a fonte de verdade dos agentes habilitados.
8. Especialistas recebem apenas o contexto e as capacidades necessárias para a tarefa.
9. Mudanças de produção continuam subordinadas aos Quality Gates e gates de release existentes.
10. Falhas de resolução, autorização, política ou evidência encerram a execução de forma segura.

## Camadas

### 1. Contracts

Schemas e tipos para AgentContract, ExecutionRequest, Risk, Capability, Evidence, GateDecision e ExecutionResult.

### 2. Registry

Registro explícito e versionado dos agentes habilitados. Duplicidade, agente ausente ou agente desabilitado falham fechado.

### 3. Deterministic Runtime

Responsável por admissão, autorização, limites, políticas, aprovação humana, lifecycle da execução e composição de gates. O runtime não delega decisões de segurança ao LLM.

### 4. Policy Engine

Regras para leitura, escrita, dados sensíveis, banco, infraestrutura, finanças, produção e operações destrutivas. Policies devem ser determinísticas e testáveis.

### 5. Evidence Store

Registra inputs, decisões de gates, artefatos, diffs, testes, logs relevantes e resultados. Um workflow não pode ser concluído sem as evidências obrigatórias.

### 6. Workflow Engine

Máquina de estados explícita para investigate -> plan -> approve -> execute -> verify -> close. Transições inválidas são rejeitadas.

### 7. Agents

Primeiro núcleo planejado:

- Engineering Orchestrator — coordena e decompõe trabalho.
- Architecture Agent — contratos, boundaries e dependências.
- Frontend Agent — React, UX, acessibilidade e design system.
- Backend/API Agent — serviços, Edge Functions e contratos.
- Database Agent — PostgreSQL, migrations, RLS e integridade.
- Security Agent — threat modeling, secrets, RBAC e hardening.
- QA Agent — testes unitários, contratos, integração e E2E.
- Performance Agent — budgets, bundle, consultas e carga.
- Observability Agent — logs, métricas, tracing e SLOs.
- Release Agent — staging, promoção, rollback e evidências de release.
- Product/Requirements Agent — requisitos, critérios de aceite e conflitos.
- Reviewer Agent — revisão independente antes do fechamento.

## Estado atual

Implementado na primeira fundação:

- `src/agentic/contracts/agentContract.ts`
- `src/agentic/registry/agentRegistry.ts`
- `src/agentic/registry/defaultAgentRegistry.ts`
- `src/agentic/runtime/deterministicAgentRuntime.ts`
- `src/agentic/runtime/deterministicAgentRuntime.test.ts`
- `src/agentic/agents/engineeringOrchestrator.agent.ts`

## Próxima sequência de implementação

1. Evidence contracts e append-only execution journal.
2. Policy engine com precedência deny > approval > allow.
3. Workflow state machine e invariantes de transição.
4. Capability adapters para GitHub, Supabase, CI e observabilidade.
5. Architecture, Security, Database, Frontend, Backend e QA agents.
6. Reviewer independente e separation of duties.
7. Budget de steps, timeout, retries e circuit breaker.
8. Idempotência e replay seguro de workflows.
9. Persistência auditável das execuções.
10. Integração dos gates agentic ao CI existente.

## Critério de pronto da camada agentic

A camada só será considerada pronta quando permissões forem deny-by-default, workflows forem determinísticos, operações sensíveis exigirem autorização apropriada, evidências forem obrigatórias, agentes especialistas estiverem registrados/versionados, testes cobrirem caminhos de sucesso e negação, e nenhum agente puder burlar policy, gate, registry ou approval por prompt.
