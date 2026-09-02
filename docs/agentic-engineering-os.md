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

## Decisão de infraestrutura de hospedagem

- O provedor oficial de hospedagem do Vivendo da Música é **Hostinger**.
- O runtime de deploy deve usar `DeploymentProviderRegistry` e provider `hostinger`.
- O provider Hostinger suporta modos explícitos `vps-docker` e `web-app`; o modo real precisa ser configurado antes do primeiro deploy.
- Nenhum agente pode falar diretamente com o provedor de hospedagem; toda operação passa por policy, approval, idempotência, lease quando aplicável e evidence.
- O pipeline continua podendo produzir artefatos OCI no GHCR; o consumo/promoção desses artefatos pela Hostinger é responsabilidade do adapter de deploy aprovado.
- Provedores de hospedagem não aprovados são proibidos nas superfícies operacionais e verificados por `test:deployment-provider` dentro de `npm run quality`.

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

### 7. Deployment Provider Registry

Abstração única para hospedagem. Nenhum provider é usado implicitamente. O provider oficial é `hostinger`, com transporte explícito e fail-closed enquanto target/mode/credenciais não estiverem configurados.

### 8. Agents

Núcleo registrado:

- Engineering Orchestrator — coordena e decompõe trabalho.
- Product/Requirements Agent — requisitos, critérios de aceite e conflitos.
- Architecture Agent — contratos, boundaries e dependências.
- Frontend Agent — React, UX, acessibilidade e design system.
- Backend/API Agent — serviços, Edge Functions e contratos.
- Database Agent — PostgreSQL, migrations, RLS e integridade.
- Security Agent — threat modeling, secrets, RBAC e hardening.
- QA Agent — testes unitários, contratos, integração e E2E.
- Performance Agent — budgets, bundle, consultas e carga.
- Observability Agent — logs, métricas, tracing e SLOs.
- Release Agent — staging, promoção, rollback e evidências de release.
- Reviewer Agent — revisão independente antes do fechamento.

## Estado atual

Implementado:

- contratos e registry de agentes;
- runtime determinístico;
- policy engine deny-by-default;
- evidence store append-only com verificação de integridade;
- workflow state machine e workflow store;
- separation of duties;
- capability adapter registry fail-closed;
- idempotency store;
- approval receipts vinculados a workflow/agente/capability;
- leases/locks;
- retries, timeout e circuit breaker;
- delegation protocol;
- tool execution gateway;
- composition root único;
- 12 agentes especializados;
- `test:agentic` como quality gate explícito;
- `test:deployment-provider` como gate de política de hospedagem;
- `DeploymentProviderRegistry` e `HostingerDeploymentProvider`.

## Próxima sequência de implementação

1. Definir o modo Hostinger efetivamente contratado (`vps-docker` ou `web-app`) e o target correspondente.
2. Implementar transporte Hostinger real somente no backend/CI, nunca no bundle do frontend.
3. Registrar adapters reais de GitHub e Supabase no Tool Execution Gateway.
4. Persistir evidence/workflows fora da memória para execuções duráveis.
5. Ligar gates de release a evidências produzidas pelo CI.
6. Executar staging na Hostinger antes de qualquer promoção para produção.
7. Exercitar rollback real e registrar RPO/RTO operacional.

## Critério de pronto da camada agentic

A camada só será considerada pronta quando permissões forem deny-by-default, workflows forem determinísticos, operações sensíveis exigirem autorização apropriada, evidências forem obrigatórias, agentes especialistas estiverem registrados/versionados, testes cobrirem caminhos de sucesso e negação, deploy Hostinger estiver governado pelo runtime e nenhum agente puder burlar policy, gate, registry ou approval por prompt.
