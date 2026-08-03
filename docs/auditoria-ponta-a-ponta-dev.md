# Auditoria ponta a ponta — ambiente `dev`

Data de referência: 2 de agosto de 2026  
Repositório: `landersolucoestech-maker/Vivendo-da-Musica`  
Branch auditada: `dev`  
Projeto Supabase de desenvolvimento: `ywirfqvobfnunlcsnptm`

## Resultado executivo

A auditoria está **concluída no escopo não relacionado à autenticação**.

Foram aprovados no mesmo estado funcional da branch `dev`:

- lint, typecheck, testes unitários e de contrato;
- build e performance gate;
- rebuild integral do banco a partir do histórico de migrations;
- lint do banco;
- todos os testes pgTAP;
- build e publicação do preview;
- 92 testes E2E não relacionados à autenticação, cobrindo páginas públicas, portais internos, desktop, mobile, player, marketplace, checkout e rota 404.

O workflow geral de E2E permanece com uma única falha conhecida: o teste que exige redirecionamento de uma rota administrativa para o login. A execução do preview define `VITE_DISABLE_AUTH=true`, portanto esse teste contradiz deliberadamente a configuração usada para inspeção dos portais. Ele foi mantido intacto porque autenticação está congelada por decisão expressa do proprietário.

## Limite obrigatório

A autenticação ficou integralmente fora desta rodada. Não foram alterados:

- login, cadastro ou seleção do tipo de conta;
- confirmação e recuperação de e-mail ou senha;
- sessões, provedores e configurações do Supabase Auth;
- rotas protegidas, guardas, redirecionamentos ou autorização por papel;
- testes de autenticação;
- variáveis que ativam ou desativam autenticação;
- provisionamento de usuários ou proteção contra senhas vazadas.

O preview `dev` continua utilizando o bypass que já existia exclusivamente para permitir inspeção direta dos portais. Esse comportamento não representa a configuração de produção.

## Critério de classificação

- **Conforme:** fluxo implementado, dados consistentes e cobertura automatizada aplicável.
- **Parcial:** funcional no ambiente demonstrativo, mas ainda depende de integração ou configuração de produção.
- **Não conforme:** falha funcional, inconsistência ou risco confirmado.
- **Excluído:** fora do escopo desta rodada por decisão expressa.

## Resultado por domínio

| Domínio | Situação | Evidência principal |
|---|---|---|
| Estrutura do frontend | Conforme | TypeScript, lint, build, testes unitários e performance aprovados. |
| Rotas públicas | Conforme | Home, Academia, aulas, Marketplace, Conteúdos, Comunidade, Biblioteca, Oportunidades, Contato, páginas legais e rota 404 validadas. |
| Portais internos no preview | Conforme | Aluno, instrutor, produtor, afiliado, empresa e administrador validados em desktop e mobile. |
| Academia e cursos | Conforme no `dev` | Cursos publicados possuem miniatura, módulos e aulas publicadas; avaliações, métricas e matrículas são lidas do banco. |
| Player de aulas | Conforme no `dev` | Rotas públicas resolvem slugs persistidos e URLs Vimeo são incorporadas por `iframe`. |
| Portal do aluno | Conforme no `dev` | O detalhe do curso usa matrícula, curso, módulos, aulas e progresso reais do Supabase, sem fallback de conteúdo mockado. |
| Marketplace de produtos | Conforme no `dev` | Capas, arquivos, avaliações e perguntas respondidas são carregados do Supabase. |
| Marketplace de beats | Conforme no `dev` | Beats publicados possuem capa, preview, licenças, eventos, itens de pedido, contratos e entregas coerentes. |
| Carrinho | Conforme | Estado validado e persistido no `localStorage`, incluindo recarregamento da página. |
| Checkout | Parcial | Fluxos demonstrativos criam pedidos pagos no projeto `dev`; processador real de pagamentos permanece pendente. |
| Downloads digitais | Parcial | Buckets privados e URLs assinadas estão configurados; arquivos definitivos de produção ainda dependem do conteúdo real. |
| Portal da empresa | Conforme no `dev` | Empresas, membros, oportunidades, candidatos, pipeline e mensagens possuem integridade referencial e cobertura de rota. |
| Portal do afiliado | Conforme no `dev` | Links, conversões, comissões, saques e histórico de eventos são consistentes. |
| Portal do produtor | Conforme no `dev` | Saldos, métodos, solicitações de repasse e histórico de eventos possuem validações de integridade. |
| Administração | Conforme para inspeção | Todas as rotas renderizam sem falhas de API; suporte usa RPCs isoladas que operam somente sobre registros demonstrativos. |
| Banco e migrations | Conforme | Rebuild limpo, lint e todos os testes pgTAP aprovados no workflow `Dev Quality`. |
| RLS e privilégios | Conforme no escopo não-auth | Tabelas públicas possuem RLS e operações demonstrativas expostas ao preview são limitadas a registros `is_demo=true`. |
| Storage | Conforme | Buckets de entrega são privados; imagens públicas permanecem separadas dos arquivos protegidos. |
| Autenticação | Excluído | Congelada até autorização expressa para uma rodada própria. |

## Correções realizadas durante a auditoria

1. Ampliação da auditoria para páginas públicas, todos os portais e viewports móveis, verificando erros JavaScript, falhas HTTP, assets quebrados, redirecionamentos indevidos e overflow horizontal.
2. Reconciliação do histórico de migrations para que um banco vazio seja reconstruído de forma determinística.
3. Correção do teste de integridade de conteúdos da academia, que consultava uma coluna inexistente.
4. Inclusão de reconciliação final para miniaturas, módulos e aulas ausentes em cursos demonstrativos publicados.
5. Materialização determinística dos itens de pedidos de beats, preservando compatibilidade com colunas legadas e atuais.
6. Emissão coerente de compras de licença e metadados de entrega para todos os pedidos pagos demonstrativos.
7. Correção dos totais dos pedidos de beats para corresponderem à soma dos itens.
8. Correção do registro de eventos de beats para respeitar o contrato atual da tabela `beat_events`.
9. Correção da rota pública de aulas para resolver curso e aula pelos slugs persistidos no banco.
10. Remoção do fallback mockado no detalhe do curso do aluno durante o bypass de desenvolvimento.
11. Correção da incorporação de vídeos Vimeo nas aulas.
12. Implementação de métricas reais de cursos a partir de matrículas e avaliações publicadas.
13. Implementação de avaliações e perguntas respondidas para produtos digitais.
14. Renderização das capas armazenadas em produtos e beats.
15. Persistência validada do carrinho entre recarregamentos.
16. Reconciliação de contadores derivados de candidaturas, membros, curtidas e conversões.
17. Separação entre imagens públicas e arquivos privados de entrega no Storage.
18. Remoção de privilégios de tabela incompatíveis com clientes PostgREST.
19. Criação de RPCs específicas para o suporte do preview, limitadas a mensagens demonstrativas e sem acesso aos registros reais.
20. Criação de teste E2E independente para a página 404, evitando que sua cobertura dependa da execução do teste de autenticação congelado.

## Invariantes automatizadas

A suíte do banco confirma, entre outros pontos:

- curso publicado com miniatura, módulo e aula publicada;
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

## Evidência da execução final não-auth

A execução E2E auditada apresentou:

- **92 testes aprovados**;
- **1 teste não executado**, duplicado após o teste de autenticação dentro do mesmo arquivo serial;
- **1 falha**, exclusivamente no teste de proteção administrativa que espera redirecionamento para `/login` enquanto o ambiente está com autenticação desativada;
- teste independente da rota desconhecida aprovado;
- todas as páginas públicas, todos os portais internos e todos os casos móveis aprovados;
- aula pública, Vimeo, detalhe de beat, eventos de beat, curso do aluno e suporte administrativo aprovados.

A falha remanescente não foi mascarada, removida nem ajustada. Ela está documentada e pertence integralmente ao escopo de autenticação congelado.

## Limitações intencionais do ambiente demonstrativo

- O preview ignora autenticação para permitir inspeção direta dos portais.
- Checkouts de cursos, produtos e beats são simuladores restritos ao projeto `dev`.
- Pedidos demonstrativos utilizam identidades sintéticas e não movimentam dinheiro real.
- Arquivos de demonstração podem ser materializados apenas para testar entrega e URL assinada.
- O conteúdo audiovisual demonstrativo utiliza uma fonte neutra de vídeo incorporado.
- Índices marcados como não utilizados pelo Advisor não foram removidos apenas com base no baixo volume do banco demonstrativo.

## Encerramento

A implementação não relacionada à autenticação está pronta para revisão visual no preview `dev`.

A próxima rodada de autenticação deve ser iniciada somente após autorização expressa e deverá tratar, em conjunto, configuração do ambiente, guardas de rota, papéis, sessões e testes E2E correspondentes. Até lá, nenhuma dessas partes deve ser alterada.
