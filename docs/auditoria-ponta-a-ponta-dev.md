# Auditoria ponta a ponta — ambiente `dev`

Data de referência: 2 de agosto de 2026  
Repositório: `landersolucoestech-maker/Vivendo-da-Musica`  
Branch auditada: `dev`  
Projeto Supabase de desenvolvimento: `ywirfqvobfnunlcsnptm`

## Limite obrigatório

A autenticação está deliberadamente fora desta rodada. Não foram alterados:

- login, cadastro ou seleção do tipo de conta;
- confirmação e recuperação de e-mail ou senha;
- sessões, provedores e configurações do Supabase Auth;
- provisionamento de usuários, papéis ou rotas de autenticação;
- proteção contra senhas vazadas.

O preview `dev` continua utilizando o bypass já existente exclusivamente para permitir a inspeção dos portais. Esse comportamento não representa a configuração de produção.

## Critério de classificação

- **Conforme:** fluxo implementado, dados consistentes e cobertura automatizada aplicável.
- **Parcial:** funcional no ambiente demonstrativo, mas ainda depende de integração ou configuração de produção.
- **Não conforme:** falha funcional, inconsistência ou risco confirmado.
- **Excluído:** fora do escopo desta rodada por decisão expressa.

## Resultado por domínio

| Domínio | Situação | Evidência principal |
|---|---|---|
| Estrutura do frontend | Conforme | TypeScript, lint, build, testes unitários e performance executados nos quality gates. |
| Rotas públicas | Conforme | Auditoria automatizada de Home, Academia, Marketplace, Conteúdos, Comunidade, Biblioteca, Oportunidades, Contato e páginas legais. |
| Portais internos no preview | Conforme | Cobertura desktop e mobile para aluno, instrutor, produtor, afiliado, empresa e administrador. |
| Academia e cursos | Conforme no `dev` | Cursos publicados possuem módulos e aulas; métricas, avaliações e alunos são lidos do banco. |
| Player de aulas | Conforme no `dev` | URLs Vimeo são incorporadas por `iframe`; arquivos complementares possuem estados explícitos. |
| Marketplace de produtos | Conforme no `dev` | Capas, arquivos, avaliações e perguntas respondidas são carregados do Supabase. |
| Marketplace de beats | Conforme no `dev` | Beats publicados possuem capa, preview, licenças disponíveis, contratos e entregas coerentes. |
| Carrinho | Conforme | Estado validado e persistido no `localStorage`, incluindo recarregamento da página. |
| Checkout | Parcial | Fluxos demonstrativos criam pedidos pagos no projeto `dev`; integração real com processador de pagamento ainda não faz parte desta implementação. |
| Downloads digitais | Parcial | URLs assinadas e buckets privados estão configurados; registros demo podem materializar arquivos sintéticos no projeto de desenvolvimento. |
| Portal da empresa | Conforme no `dev` | Empresas, membros, oportunidades, candidatos, pipeline e mensagens possuem integridade referencial e cobertura de rota. |
| Portal do afiliado | Conforme no `dev` | Links, conversões, comissões, saques e histórico de eventos são consistentes. |
| Portal do produtor | Conforme no `dev` | Saldos, métodos, solicitações de repasse e histórico de eventos possuem validações de integridade. |
| Administração | Conforme para inspeção | Todas as rotas administrativas estão incluídas na auditoria de renderização e respostas da API. |
| Banco e migrations | Em validação final | Rebuild limpo, lint do banco e pgTAP são obrigatórios no workflow `Dev Quality`. |
| RLS e privilégios | Conforme no escopo não-auth | Todas as tabelas públicas possuem RLS; privilégios `TRUNCATE`, `REFERENCES` e `TRIGGER` foram removidos das funções de API. |
| Storage | Conforme | Buckets de entrega de cursos, produtos e beats são privados; imagens públicas permanecem separadas. |
| Autenticação | Excluído | Congelada até a revisão funcional completa pelo proprietário do projeto. |

## Correções realizadas durante a auditoria

1. Ampliação da verificação do preview para todas as rotas relevantes, com inspeção de erros JavaScript, falhas de assets, respostas HTTP, redirecionamentos indevidos e overflow horizontal.
2. Ampliação dos testes E2E para páginas públicas, todos os portais e viewports móveis representativos.
3. Correção de uma migration histórica que tentava remover uma função ainda vinculada a um trigger legado.
4. Reconciliação de licenças, pedidos, contratos e entregas de beats demonstrativos.
5. Correção de números de contrato para evitar colisões em itens gerados.
6. Reconciliação automática de contadores de candidaturas, membros, curtidas e conversões.
7. Inclusão de testes pgTAP para catálogo, pedidos, academia, empresas, afiliados, produtores, feedback e Storage.
8. Implementação de métricas reais de cursos a partir de matrículas e avaliações publicadas.
9. Implementação de avaliações e perguntas respondidas para produtos digitais.
10. Renderização das capas armazenadas em produtos e beats.
11. Persistência validada do carrinho entre recarregamentos.
12. Correção da incorporação de vídeos Vimeo nas aulas.
13. Separação entre imagens públicas e arquivos privados de entrega no Storage.
14. Remoção de privilégios de tabela incompatíveis com clientes PostgREST.

## Invariantes automatizadas

A suíte do banco verifica, entre outros pontos:

- curso publicado com módulo e aula publicada;
- produto publicado com arquivo de entrega;
- beat publicado com licença disponível;
- totais dos pedidos iguais à soma de seus itens;
- item de beat usando licença pertencente ao mesmo beat;
- item pago com contrato emitido e entrega associada;
- progresso acadêmico dentro do intervalo permitido;
- certificado associado a matrícula ativa;
- empresa com proprietário ativo;
- candidato e remetentes pertencentes ao processo seletivo;
- conversão, comissão e link pertencentes ao mesmo afiliado;
- saques e repasses com histórico de eventos;
- contadores derivados sincronizados com os registros canônicos;
- buckets de entrega privados e ausência de leitura anônima dos materiais protegidos.

## Limitações intencionais do ambiente demonstrativo

- O preview ignora autenticação para permitir inspeção direta dos portais.
- Os checkouts de cursos, produtos e beats são simuladores restritos ao projeto `dev`.
- Pedidos demonstrativos utilizam identidades sintéticas e não movimentam dinheiro real.
- Arquivos de demonstração podem ser materializados apenas para testar entrega e URL assinada.
- O conteúdo audiovisual demonstrativo utiliza uma fonte neutra de vídeo incorporado.
- Índices marcados como não utilizados pelo Advisor não foram removidos apenas com base no baixo volume do banco demonstrativo.

## Condição para encerrar esta auditoria

A rodada somente será considerada concluída quando, no mesmo commit da branch `dev`, forem aprovados:

1. lint;
2. typecheck;
3. testes unitários e de contrato;
4. build;
5. performance gate;
6. E2E completo;
7. rebuild local integral do Supabase;
8. lint do banco;
9. todos os testes pgTAP;
10. publicação e verificação do preview.

Após isso, o proprietário poderá revisar visualmente todo o sistema. A autenticação continuará congelada até autorização expressa para a próxima etapa.
