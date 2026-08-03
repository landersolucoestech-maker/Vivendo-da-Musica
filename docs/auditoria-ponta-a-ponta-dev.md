# Auditoria ponta a ponta — ambiente `dev`

Data de referência: 3 de agosto de 2026  
Repositório: `landersolucoestech-maker/Vivendo-da-Musica`  
Branch auditada: `dev`  
Projeto Supabase de desenvolvimento: `ywirfqvobfnunlcsnptm`

## Resultado executivo

A auditoria está **concluída no escopo não relacionado à autenticação**.

Foram aprovados no mesmo estado funcional da branch `dev`:

- lint, typecheck, testes unitários, de contrato e de segurança;
- build e performance gate;
- rebuild integral do banco a partir do histórico de migrations;
- lint do banco;
- todos os testes pgTAP;
- build do preview e status de publicação aprovado;
- **97 testes E2E do preview**, cobrindo páginas públicas, todos os portais, desktop, mobile, player, marketplace, checkout, pop-ups, redirecionamentos legados e rota 404;
- **1 teste E2E separado do guarda de autenticação**, executado com o bypass desativado e aprovado sem modificar a autenticação.

Não há falha funcional conhecida nos fluxos auditados. O preview hospedado permanece configurado para inspeção direta dos portais com identidades demonstrativas.

## Limite obrigatório

A implementação da autenticação ficou integralmente fora desta rodada. Não foram alterados:

- login, cadastro ou seleção do tipo de conta;
- confirmação e recuperação de e-mail ou senha;
- sessões, provedores e configurações do Supabase Auth;
- guardas de rota, papéis ou regras de autorização;
- provisionamento de usuários;
- proteção contra senhas vazadas.

A suíte foi apenas separada por contexto: os fluxos demonstrativos são testados com o bypass do preview ativo, enquanto o redirecionamento de rota protegida é testado isoladamente com o bypass desativado.

## Critério de classificação

- **Conforme:** fluxo implementado, dados consistentes e cobertura automatizada aplicável.
- **Parcial:** funcional no ambiente demonstrativo, mas ainda depende de integração ou configuração de produção.
- **Não conforme:** falha funcional, inconsistência ou risco confirmado.
- **Excluído:** fora do escopo desta rodada por decisão expressa.

## Resultado por domínio

| Domínio | Situação | Evidência principal |
|---|---|---|
| Estrutura do frontend | Conforme | TypeScript, lint, build, testes unitários, contratos, segurança e performance aprovados. |
| Rotas públicas | Conforme | Home, Academia, aulas, Marketplace, Conteúdos, Comunidade, Biblioteca, Oportunidades, Contato, páginas legais e rota 404 validadas. |
| Portais internos no preview | Conforme | Aluno, instrutor, produtor, afiliado, empresa e administrador validados em desktop e mobile. |
| Academia e cursos | Conforme no `dev` | Cursos publicados possuem miniatura, módulos e aulas publicadas; avaliações, métricas e matrículas são lidas do banco. |
| Player de aulas | Conforme no `dev` | Rotas públicas resolvem slugs persistidos e URLs Vimeo são incorporadas por `iframe`. |
| Portal do aluno | Conforme no `dev` | Detalhe do curso usa matrícula, curso, módulos, aulas e progresso reais do Supabase, sem fallback de conteúdo mockado. |
| Marketplace de produtos | Conforme no `dev` | Capas, arquivos, avaliações e perguntas respondidas são carregados do Supabase. |
| Marketplace de beats | Conforme no `dev` | Beats publicados possuem capa, preview, licenças, eventos, itens de pedido, contratos e entregas coerentes. |
| Carrinho | Conforme | Estado validado e persistido no `localStorage`, incluindo recarregamento da página. |
| Checkout | Parcial | Fluxos demonstrativos criam pedidos pagos no projeto `dev`; processador real de pagamentos permanece pendente. |
| Downloads digitais | Parcial | Buckets privados e URLs assinadas estão configurados; arquivos definitivos de produção ainda dependem do conteúdo real. |
| Portal da empresa | Conforme no `dev` | Empresas, membros, oportunidades, candidatos, pipeline e mensagens possuem integridade referencial e cobertura de rota. |
| Portal do afiliado | Conforme no `dev` | Links, conversões, comissões, saques e histórico de eventos são consistentes. |
| Portal do produtor | Conforme no `dev` | Saldos, métodos, solicitações de repasse e histórico de eventos possuem validações de integridade. |
| Administração | Conforme para inspeção | Todas as rotas renderizam; cursos, conteúdos, comunidade, suporte e demais módulos foram exercitados. |
| Pop-ups e confirmações | Conforme | Dialog, AlertDialog e Sheet permanecem centralizados; animações direcionais e diálogos nativos do navegador são bloqueados por teste. |
| Banco e migrations | Conforme | Rebuild limpo, lint e todos os testes pgTAP aprovados no workflow `Dev Quality`. |
| Integridade dos dados | Conforme | Consultas remotas retornaram zero violações nos domínios acadêmico, comercial, empresarial, afiliado e financeiro. |
| RLS e privilégios | Conforme no escopo não-auth | Todas as tabelas públicas possuem RLS e políticas; operações do preview são limitadas aos registros demonstrativos aplicáveis. |
| Storage | Conforme | Buckets de entrega são privados; imagens públicas não podem ser enumeradas por política ampla em `storage.objects`. |
| Edge Functions demonstrativas | Conforme ao objetivo do `dev` | Checkout e download validam projeto, origem, formato dos dados e idempotência; não representam pagamentos reais. |
| CI e release | Conforme ao estágio atual | Workflows usam actions compatíveis com runtime Node.js 24; preview e guarda de autenticação são testados separadamente; produção continua bloqueada por gate enquanto houver componentes exclusivos do `dev`. |
| Autenticação | Excluído | Congelada até autorização expressa para uma rodada própria. |

## Correções realizadas durante a auditoria

1. Ampliação da suíte para páginas públicas, todos os portais e viewports móveis, verificando erros JavaScript, falhas HTTP, assets quebrados, redirecionamentos indevidos e overflow horizontal.
2. Separação dos testes E2E do preview e do guarda de autenticação, evitando configurações contraditórias sem modificar o código de autenticação.
3. Reconciliação do histórico de migrations para reconstrução determinística de um banco vazio.
4. Correção do teste de integridade de conteúdos da academia que consultava uma coluna inexistente.
5. Reconciliação final para miniaturas, módulos e aulas ausentes em cursos demonstrativos publicados.
6. Materialização determinística dos itens de pedidos de beats, preservando compatibilidade com estruturas legadas e atuais.
7. Emissão coerente de compras de licença e metadados de entrega para todos os pedidos pagos demonstrativos.
8. Correção dos totais dos pedidos de beats para corresponderem à soma dos itens.
9. Correção do registro de eventos de beats para respeitar o contrato atual da tabela `beat_events`.
10. Correção da rota pública de aulas para resolver curso e aula pelos slugs persistidos no banco.
11. Remoção do fallback mockado no detalhe do curso do aluno durante o bypass de desenvolvimento.
12. Correção da incorporação de vídeos Vimeo nas aulas.
13. Implementação de métricas reais de cursos a partir de matrículas e avaliações publicadas.
14. Implementação de avaliações e perguntas respondidas para produtos digitais.
15. Renderização das capas armazenadas em produtos e beats.
16. Persistência validada do carrinho entre recarregamentos.
17. Reconciliação de contadores derivados de candidaturas, membros, curtidas e conversões.
18. Separação entre imagens públicas e arquivos privados de entrega no Storage.
19. Remoção da política que permitia enumerar anonimamente todas as imagens da Academia por `storage.objects`, preservando a entrega direta do bucket público.
20. Conversão das RPCs de suporte do preview para `SECURITY INVOKER`, com RLS restrita a mensagens `is_demo=true` e permissão anônima somente nas colunas de status necessárias.
21. Eliminação de `window.confirm` e `window.prompt` nos módulos de empresa, cursos, conteúdos e comunidade.
22. Conversão das confirmações destrutivas e justificativas de moderação em pop-ups centralizados e acessíveis.
23. Criação de regras automatizadas que impedem `slide-in`, `slide-out`, diálogos nativos e componentes de modal fora do centro da viewport.
24. Correção de dependências instáveis em hooks administrativos que poderiam causar rerenderizações e avisos desnecessários.
25. Criação de teste contratual para preservar o acesso unificado por Aluno, Produtor, Instrutor, Empresa e Afiliado.
26. Correção da rota legada `/aluno/beats`, que encaminhava o aluno ao portal do produtor; ela agora termina em `/aluno/downloads`.
27. Ampliação do verificador publicado no GitHub Pages para validar redirecionamentos esperados, incluindo a rota legada do aluno.
28. Migração dos workflows para versões de actions compatíveis com runtime Node.js 24.
29. Separação da validação de release por ambiente: staging demonstrativo, staging com autenticação e produção possuem comandos distintos.
30. Criação de testes que comprovam que produção permanece bloqueada com projeto Supabase `dev`, bypass, mocks ou componentes demonstrativos exclusivos.
31. Fortalecimento da exceção temporária do advisory do React Router: o gate agora bloqueia a build caso qualquer API, pacote ou runtime RSC apareça no projeto.
32. Criação de roteiro completo de homologação manual para revisão funcional, visual e textual pelo proprietário.

## Invariantes automatizadas e verificadas

A suíte do banco e as consultas remotas confirmam, entre outros pontos:

- curso publicado com miniatura, módulo e aula publicada;
- produto publicado com arquivo de entrega;
- beat publicado com licença disponível;
- totais dos pedidos iguais à soma de seus itens;
- item de beat usando licença pertencente ao mesmo beat;
- item pago com contrato emitido e entrega associada;
- progresso acadêmico dentro do intervalo permitido;
- certificado associado a matrícula ativa;
- empresa com proprietário ativo;
- candidatura associada a perfil profissional existente;
- remetentes pertencentes ao processo seletivo correspondente;
- conversão, comissão e link pertencentes ao mesmo afiliado;
- solicitações de repasse vinculadas a método do próprio produtor;
- contadores derivados sincronizados com registros canônicos;
- buckets de entrega privados;
- ausência de leitura anônima dos materiais protegidos;
- ausência de função pública `SECURITY DEFINER` executável por `anon`;
- ausência de tabela pública sem RLS ou sem política;
- suporte do preview restrito a registros demonstrativos;
- ausência de APIs e runtime React Server Components na SPA;
- impossibilidade de liberar produção com configurações exclusivas do ambiente demonstrativo.

## Evidência da execução final

A execução final apresentou:

- **97 de 97 testes E2E do preview aprovados** em aproximadamente 1,9 minuto;
- **1 de 1 teste E2E do guarda de autenticação aprovado** em execução separada;
- lint, typecheck, testes unitários, contratos e segurança aprovados;
- gate de dependências aprovado, incluindo comprovação de ausência de runtime RSC;
- build e performance gate aprovados;
- rebuild completo do banco aprovado;
- lint do banco aprovado;
- todos os testes pgTAP aprovados;
- build do preview e status de publicação aprovados.

Foram testados explicitamente:

- 19 rotas públicas e seus conteúdos principais;
- 54 rotas de aluno, instrutor, produtor, afiliado, empresa e administração;
- rota legada `/aluno/beats` e seu destino correto;
- 9 cenários móveis representativos;
- fluxo de checkout de produto demonstrativo;
- player Vimeo e rotas de aula;
- métricas de curso, avaliações e perguntas de produto;
- três cenários de centralização de pop-up, incluindo confirmação destrutiva;
- página 404;
- proteção de rota administrativa sem bypass.

## Limitações e pendências deliberadas

- O preview ignora autenticação para permitir inspeção direta dos portais.
- Checkouts de cursos, produtos e beats são simuladores restritos ao projeto `dev`.
- Pedidos demonstrativos utilizam identidades sintéticas e não movimentam dinheiro real.
- Arquivos de demonstração podem ser materializados apenas para testar entrega e URL assinada.
- O conteúdo audiovisual demonstrativo utiliza fonte neutra incorporada.
- O Supabase Security Advisor mantém apenas o alerta de proteção contra senhas vazadas desativada, pertencente ao escopo de autenticação congelado.
- O `npm audit` identifica um advisory alto do React Router e sua dependência indireta. O gate admite somente esse advisory de APIs RSC enquanto comprovar que a SPA não importa APIs, pacotes nem runtime RSC; qualquer utilização futura bloqueia a build. A atualização principal do React Router permanece para uma rodada controlada antes da produção.
- O banco demonstrativo possui índices ainda sem utilização observada. Eles não foram removidos apenas com base no baixo volume e curto histórico de consultas do ambiente `dev`.

## Conclusão

O projeto está apto para **revisão funcional e visual completa no preview `dev`**, dentro do escopo demonstrativo e sem autenticação real.

A autenticação permanece bloqueada para alteração até a conclusão da revisão do proprietário. Antes de produção ainda serão obrigatórios: processador real de pagamentos, arquivos definitivos, configuração final dos ambientes, atualização principal controlada do React Router e a rodada exclusiva de autenticação e autorização.
