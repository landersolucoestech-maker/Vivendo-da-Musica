# Agentic Engineering OS — Vivendo da Música

## Objetivo

Construir uma camada agentic de engenharia governada por um runtime determinístico. O modelo pode investigar, planejar, implementar e revisar, mas não decide sozinho se uma operação é autorizada, se um gate foi satisfeito, se uma evidência existe ou se uma ação destrutiva pode prosseguir.

## Princípios obrigatórios

1. Deny by default: capability não declarada é bloqueada.
2. Contratos executáveis: agentes, Skills, riscos, capabilities e limites são validados em runtime.
3. Toda capability declarada por um agente deve ser governada por exatamente uma Skill habilitada e versionada.
4. Capability sem Skill, Skill ambígua ou risco não autorizado pela Skill falha fechado.
5. Separação entre decisão probabilística e autorização determinística.
6. Operações privilegiadas ou destrutivas exigem aprovação humana quando o contrato assim determinar.
7. Nenhum agente pode declarar a si mesmo aprovado, concluir gate sem evidência ou ampliar as próprias permissões.
8. Toda execução deve possuir correlation id, trilha de evidência e resultado verificável.
9. Registries são fontes de verdade dos agentes, Skills, adapters e providers habilitados.
10. Especialistas recebem apenas o contexto e as capacidades necessárias para a tarefa.
11. Mudanças de produção continuam subordinadas aos Quality Gates e gates de release existentes.
12. Falhas de resolução, autorização, Skill, política ou evidência encerram a execução de forma segura.

## Decisão de infraestrutura de hospedagem

- O provedor oficial de hospedagem do Vivendo da Música é **Hostinger**.
- O runtime de deploy deve usar `DeploymentProviderRegistry` e provider `hostinger`.
- O provider Hostinger suporta modos explícitos `vps-docker` e `web-app`; o modo real precisa ser configurado antes do primeiro deploy.
- Nenhum agente pode falar diretamente com o provedor de hospedagem; toda operação passa por Skill, policy, approval, idempotência, lease quando aplicável e evidence.
- O pipeline continua podendo produzir artefatos OCI no GHCR; o consumo/promoção desses artefatos pela Hostinger é responsabilidade do adapter de deploy aprovado.
- Provedores de hospedagem não aprovados são proibidos nas superfícies operacionais e verificados por `test:deployment-provider` dentro de `npm run quality`.

## Camadas

### 1. Contracts

Schemas e tipos para AgentContract, SkillContract, ExecutionRequest, Risk, Capability, Evidence, GateDecision e ExecutionResult.

### 2. Agent Registry

Registro explícito e versionado dos agentes habilitados. Duplicidade, agente ausente ou agente desabilitado falham fechado.

### 3. Skill Registry

Registro explícito e versionado das Skills executáveis. Cada Skill governa um ou mais namespaces de capability, declara riscos permitidos e as evidências requeridas pelo domínio. A resolução é determinística: zero ou múltiplas Skills para uma capability são estados inválidos e bloqueiam a execução.

Skills registradas:

- Repository Engineering — `repo.*`.
- Architecture and Contracts — `architecture.*`, `contracts.*`.
- Requirements and Planning — `requirements.*`, `product.*`, `implementation.*`, `acceptance.*`, `risk.*`.
- Frontend Engineering — `frontend.*`, `ui.*`, `ux.*`, `accessibility.*`.
- Backend and API Engineering — `backend.*`, `api.*`.
- Database Engineering — `database.*`.
- Security Engineering — `security.*`.
- Quality Assurance — `tests.*`, `quality.*`.
- Performance Engineering — `performance.*`.
- Observability Engineering — `observability.*`, `telemetry.*`.
- Evidence Governance — `evidence.*`.
- Release and Deployment — `release.*`, `deploy.*`, `rollback.*`.
- Independent Review — `review.*`, `verification.*`.

### 4. Deterministic Runtime

Responsável por admissão, autorização, resolução de Skill, limites, políticas, aprovação humana, lifecycle da execução e composição de gates. O runtime não delega decisões de segurança ao LLM.

A admissão mínima segue a ordem: contrato do agente -> capability declarada -> capability não negada -> Skill única e habilitada -> risco permitido pela Skill -> aprovação humana quando obrigatória -> policies -> execução governada.

### 5. Policy Engine

Regras para leitura, escrita, dados sensíveis, banco, infraestrutura, finanças, produção e operações destrutivas. Policies devem ser determinísticas e testáveis.

### 6. Evidence Store

Registra inputs, decisões de gates, artefatos, diffs, testes, logs relevantes e resultados. Um workflow não pode ser concluído sem as evidências obrigatórias. Checkpoints duráveis possuem persistência server-side e digest criptográfico independente no PostgreSQL.

### 7. Workflow Engine

Máquina de estados explícita para investigate -> plan -> approve -> execute -> verify -> close. Transições inválidas são rejeitadas.

### 8. Deployment Provider Registry

Abstração única para hospedagem. Nenhum provider é usado implicitamente. O provider oficial é `hostinger`, com transporte explícito e fail-closed enquanto target/mode/credenciais não estiverem configurados.

### 9. Agents

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
- `SkillContract` e Skill Registry deny-by-default;
- 13 Skills de engenharia versionadas;
- cobertura constitucional agente-capability-Skill com teste de completude;
- rejeição de capability sem Skill, Skill ambígua e risco não autorizado;
- runtime determinístico;
- policy engine deny-by-default;
- evidence store append-only com verificação de integridade;
- persistência durável de audit checkpoints com SHA-256 calculado pelo PostgreSQL;
- workflow state machine e workflow store;
- separation of duties;
- capability adapter registry fail-closed;
- idempotency store;
- approval receipts vinculados a workflow/agente/capability;
- leases/locks;
- retries, timeout e circuit breaker;
- delegation protocol;
- tool execution gateway;
- composition root único com registries selados;
- 12 agentes especializados;
- `test:agentic` como quality gate explícito;
- `test:deployment-provider` como gate de política de hospedagem;
- `DeploymentProviderRegistry` e `HostingerDeploymentProvider`.

## Próxima sequência de implementação

1. Manter cobertura total entre capabilities dos agentes e Skills como invariant de CI.
2. Conectar `requiredEvidence` das Skills aos gates de conclusão do workflow, não apenas à metadata do contrato.
3. Persistir/recuperar workflow state fora da memória para execuções duráveis.
4. Ligar gates de release a evidências produzidas pelo CI.
5. Definir o modo Hostinger efetivamente contratado (`vps-docker` ou `web-app`) e o target correspondente.
6. Implementar transporte Hostinger real somente no backend/CI, nunca no bundle do frontend.
7. Executar staging na Hostinger antes de qualquer promoção para produção.
8. Exercitar rollback real e registrar RPO/RTO operacional.

## Critério de pronto da camada agentic

A camada só será considerada pronta quando permissões forem deny-by-default, todas as capabilities forem governadas por exatamente uma Skill válida, workflows forem determinísticos, operações sensíveis exigirem autorização apropriada, evidências forem obrigatórias e vinculadas às Skills, agentes especialistas e Skills estiverem registrados/versionados, testes cobrirem caminhos de sucesso e negação, deploy Hostinger estiver governado pelo runtime e nenhum agente puder burlar Skill, policy, gate, registry, evidence ou approval por prompt.
