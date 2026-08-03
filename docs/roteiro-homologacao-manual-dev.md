# Roteiro de homologação manual — preview `dev`

Base do preview: `https://landersolucoestech-maker.github.io/Vivendo-da-Musica/`

Este roteiro existe para a revisão funcional, visual e textual do projeto antes da rodada específica de autenticação. O preview utiliza identidades demonstrativas de acordo com o prefixo da rota e não exige credenciais.

## Como registrar a revisão

Para cada item, classifique como:

- **Aprovado** — comportamento, texto e aparência corretos;
- **Ajustar** — funciona, mas precisa de alteração;
- **Falha** — ação não conclui, página quebra ou dados estão incorretos;
- **Não aplicável** — item deliberadamente fora do escopo atual.

Registre junto do apontamento:

1. rota completa;
2. resolução e dispositivo;
3. ação executada;
4. resultado esperado;
5. resultado observado;
6. captura de tela, quando visual;
7. texto exato da mensagem de erro, quando funcional.

## 1. Área pública

| Página | Rota | Verificações principais |
|---|---|---|
| Home | `/` | Cabeçalho, menu, hero, seções, CTAs, rodapé, ausência de conteúdo quebrado e responsividade. |
| Entrar | `/login` | Seleção prévia entre Aluno, Produtor, Instrutor, Empresa e Afiliado; não concluir autenticação nesta rodada. |
| Criar conta | `/matricule-se` | Mesma estrutura reutilizável, campos condicionais por perfil e ausência de formulário empresarial duplicado. |
| Cadastro empresarial legado | `/cadastro-empresa` | Redirecionamento para `/matricule-se?perfil=empresa`. |
| Academia | `/academia` | Cursos publicados, capas, preços, descontos, busca e filtros. |
| Curso | abrir qualquer curso da Academia | Capa, descrição, instrutor, módulos, aulas, métricas e avaliações. |
| Aula pública | abrir aula disponível em um curso | Player Vimeo, título, descrição e navegação curricular. |
| Marketplace | `/marketplace` | Produtos digitais, capas armazenadas, valores, filtros e acesso ao detalhe. |
| Produto | abrir qualquer produto | Capa, descrição, vendedor, avaliações, perguntas respondidas e ação de compra. |
| Beats | `/marketplace/beats` | Capas, previews, gêneros, produtores, BPM e licenças. |
| Beat | abrir qualquer beat | Player, informações técnicas, licenças, direitos e ação de compra. |
| Carrinho | `/carrinho` | Inclusão, remoção, quantidades aplicáveis, total e persistência após recarregar. |
| Checkout | `/checkout` | Resumo do pedido e conclusão demonstrativa sem movimentação financeira real. |
| Conteúdos | `/conteudos` | Lista, categorias, capas, textos e acesso ao artigo. |
| Artigo | abrir qualquer conteúdo | Corpo, mídia, materiais e hierarquia tipográfica. |
| Comunidade pública | `/comunidade` | Apresentação pública e CTA correto. |
| Biblioteca premium | `/biblioteca-premium` | Apresentação e diferenciação entre conteúdo público e área do aluno. |
| Oportunidades | `/oportunidades` | Vagas abertas, empresa, local, modalidade, descrição e contagem de candidaturas. |
| Contato | `/contato` | Campos, validações, envio demonstrativo e mensagens de retorno. |
| Validar certificado | `/validar` | Campo de código, estados vazio, válido e inválido quando houver dados. |
| Política de Privacidade | `/politica-de-privacidade` | Conteúdo integral, legibilidade e links. |
| Termos de Uso | `/termos-de-uso` | Conteúdo integral, legibilidade e links. |
| Rota inexistente | `/rota-inexistente-para-teste` | Página 404 sem quebra da aplicação. |

## 2. Portal do Aluno

| Página | Rota | Verificações principais |
|---|---|---|
| Visão geral | `/aluno` | Matrículas, progresso, atividades, atalhos e dados demonstrativos. |
| Meus cursos | `/aluno/meus-cursos` | Cursos matriculados e progresso individual. |
| Curso matriculado | abrir curso em `/aluno/meus-cursos` | Currículo, retomada e acesso às aulas. |
| Certificados | `/aluno/certificados` | Certificados emitidos, códigos e download/validação aplicável. |
| Downloads | `/aluno/downloads` | Produtos e beats comprados, contratos e arquivos temporários. |
| Rota legada de beats | `/aluno/beats` | Redirecionamento para `/aluno/downloads`, nunca para o portal do produtor. |
| Biblioteca | `/aluno/biblioteca-premium` | Conteúdos liberados e estados de acesso. |
| Comunidade | `/aluno/comunidade` | Feed, curtidas, comentários, grupos e denúncia em pop-up centralizado. |
| Oportunidades | `/aluno/oportunidades` | Favoritar, candidatar-se, perfil profissional e acompanhamento. |
| Pedidos | `/aluno/pedidos` | Cursos, produtos e beats, valores, estados e datas. |
| Favoritos | `/aluno/favoritos` | Itens salvos e navegação para os detalhes corretos. |
| Notificações | `/aluno/notificacoes` | Lista, leitura e estados vazios. |
| Suporte | `/aluno/suporte` | Abertura e histórico de chamados. |
| Perfil | `/aluno/perfil` | Dados pessoais e profissionais aplicáveis. |
| Configurações | `/aluno/configuracoes` | Preferências existentes e feedback de salvamento. |

## 3. Portal do Instrutor

| Página | Rota | Verificações principais |
|---|---|---|
| Dashboard | `/instrutor` | Indicadores, cursos e atividade. |
| Cursos | `/instrutor/cursos` | Listagem, estados, métricas e ações permitidas. |
| Alunos e avaliações | `/instrutor/alunos-avaliacoes` | Público matriculado, progresso e avaliações. |
| Relatórios | `/instrutor/relatorios` | Métricas demonstrativas, filtros e consistência com os cursos. |

## 4. Portal do Produtor

| Página | Rota | Verificações principais |
|---|---|---|
| Dashboard | `/produtor` | Produtos, beats, pedidos, receita e saldo. |
| Beats | `/produtor/beats` | Cadastro, edição, licenças, publicação e arquivos. |
| Produtos | `/produtor/produtos` | Cadastro, edição, preço, capa, arquivo e status. |
| Pedidos | `/produtor/pedidos` | Itens vendidos, compradores, valores e situação. |

## 5. Portal do Afiliado

| Página | Rota | Verificações principais |
|---|---|---|
| Dashboard | `/afiliado` | Indicadores, conversões, comissões e saldo. |
| Links | `/afiliado/links` | Criação e cópia de links. |
| Conversões | `/afiliado/conversoes` | Origem, produto, pedido, valor e estado. |
| Comissões | `/afiliado/comissoes` | Cálculo, situação e vínculo com conversões. |
| Saques | `/afiliado/saques` | Saldo elegível, solicitação e histórico. |
| Materiais | `/afiliado/materiais` | Peças disponíveis e acesso. |
| Perfil | `/afiliado/perfil` | Dados de divulgação e pagamento aplicáveis. |

## 6. Portal da Empresa

| Página | Rota | Verificações principais |
|---|---|---|
| Dashboard | `/empresa` | Oportunidades, candidaturas, processos e mensagens. |
| Oportunidades | `/empresa/oportunidades` | Criar, editar, encerrar, reabrir e excluir por pop-up centralizado. |
| Candidatos | `/empresa/candidatos` | Perfil, currículo, portfólio, habilidades, carta e pipeline. |
| Mensagens | `/empresa/mensagens` | Conversas vinculadas à candidatura e estado de leitura. |
| Perfil empresarial | `/empresa/perfil` | Dados institucionais, site, descrição e verificação. |

## 7. Administração

| Página | Rota | Verificações principais |
|---|---|---|
| Dashboard | `/admin` | Indicadores e atalhos. |
| Usuários | `/admin/usuarios` | Listagem, filtros, papéis e estados. |
| Alunos | `/admin/alunos` | Matrículas e progresso. |
| Cursos | `/admin/cursos` | Criar/editar curso, módulos, aulas e materiais em pop-ups centralizados. |
| Produtos | `/admin/produtos` | Gestão de produtos e estados. |
| Pedidos | `/admin/pedidos` | Pedidos dos três domínios e totais. |
| Cupons | `/admin/cupons` | Cadastro, validade, limites e estados. |
| Conteúdos | `/admin/conteudos` | CMS, publicação, mídia, materiais e exclusão centralizada. |
| Certificados | `/admin/certificados` | Emissão, consulta e revogação aplicável. |
| Comunidade | `/admin/comunidade` | Posts, grupos, denúncias e moderação por pop-up centralizado. |
| Relatórios | `/admin/relatorios` | Indicadores e filtros. |
| Observabilidade | `/admin/observabilidade` | Eventos, estado dos serviços e feedback de indisponibilidade. |
| Configurações | `/admin/configuracoes` | Dados gerais, feature flags e salvamento. |
| Integrações | `/admin/integracoes` | Integrações demonstrativas e estados. |
| Financeiro | `/admin/financeiro` | Receitas, repasses, saldos, pedidos e consistência de valores. |
| Marketing | `/admin/marketing` | Campanhas, leads e indicadores. |
| Suporte | `/admin/suporte` | Mensagens e chamados demonstrativos, mudança de status restrita aos dados de preview. |
| Auditoria | `/admin/auditoria` | Eventos e rastreabilidade. |
| Segurança | `/admin/seguranca` | Eventos, sessões/dispositivos demonstrativos e indicadores. |

## 8. Verificação transversal em todas as páginas

- Não apresentar animações `slide-in` ou `slide-out` em modais.
- Todos os modais, alertas e confirmações devem abrir centralizados.
- Nenhuma ação pode usar `window.alert`, `window.confirm` ou `window.prompt`.
- Não apresentar overflow horizontal em 390 × 844, 768 × 1024, 1440 × 900 e 1920 × 1080.
- Cabeçalhos, menus, sidebars e breadcrumbs devem indicar corretamente o portal atual.
- Links internos não devem trocar o usuário para outro portal.
- Botões devem possuir estado de carregamento e impedir duplo envio.
- Estados vazio, carregando, erro e sucesso devem ser compreensíveis.
- Valores monetários devem usar real brasileiro e centavos consistentes.
- Datas devem usar o padrão brasileiro.
- Textos devem estar em Português do Brasil e sem termos provisórios, lorem ipsum ou aparência de protótipo.
- Capas e imagens não podem estar quebradas.
- Vídeos e áudios devem possuir fallback de indisponibilidade.
- Operações destrutivas devem exigir confirmação centralizada.
- Ações demonstrativas não podem afetar ambientes de staging ou produção.

## 9. Limitações conhecidas desta homologação

- Autenticação real e configuração do Supabase Auth estão congeladas.
- O preview seleciona automaticamente a identidade demonstrativa pela rota.
- Checkouts são simuladores exclusivos do projeto `dev` e não movimentam dinheiro.
- Downloads demonstrativos podem materializar arquivos sintéticos para validar a entrega protegida.
- Conteúdos, cursos, produtos, beats, pedidos e oportunidades são dados demonstrativos.
- A liberação de produção permanece bloqueada enquanto existirem componentes exclusivos do ambiente demonstrativo.

## 10. Critério para encerrar a revisão

A revisão manual pode ser considerada concluída quando:

1. todas as páginas acima forem abertas em desktop e ao menos uma viewport móvel;
2. todas as ações principais forem executadas;
3. nenhum portal encaminhar para outro perfil indevidamente;
4. não houver modal lateral ou diálogo nativo;
5. os dados e textos forem aprovados pelo proprietário;
6. ajustes encontrados forem corrigidos e revalidados;
7. somente então for autorizada a rodada exclusiva de autenticação.
