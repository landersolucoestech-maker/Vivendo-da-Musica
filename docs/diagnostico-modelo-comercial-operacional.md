# Diagnóstico e proposta do modelo comercial e operacional

**Projeto:** Vivendo da Música  
**Branch analisada:** `dev`  
**Data de referência:** 3 de agosto de 2026  
**Status deste documento:** proposta para decisão; nenhuma regra comercial aqui descrita deve ser tratada como implementada antes da aprovação e da execução técnica correspondente.

## 1. Conclusão executiva

A plataforma já possui uma base funcional extensa: Academia, cursos, marketplace de produtos digitais, marketplace de beats e licenças, área de downloads, comunidade, oportunidades, portais de instrutor, produtor, afiliado e empresa, além de pedidos e estruturas financeiras parciais.

O problema principal não é a quantidade de módulos. O problema é que ainda não existe um **modelo comercial canônico** relacionando:

- identidade e perfis;
- produtos e ofertas;
- planos e assinaturas;
- compras avulsas e pacotes;
- permissões e direitos de acesso;
- taxas, comissões e repasses;
- cancelamentos, reembolsos e inadimplência;
- conteúdos, serviços, oportunidades e contratos.

Atualmente, coexistem três ideias incompatíveis:

1. cursos, beats e produtos vendidos de forma avulsa;
2. referências genéricas a um plano “Premium” sem assinatura real;
3. portais separados por um único papel de usuário, embora a jornada pretendida exija que a mesma pessoa possa aprender, vender, prestar serviços, divulgar produtos e trabalhar para empresas.

A proposta central é adotar um modelo híbrido e próprio:

- **conta gratuita universal**;
- **Clube VDM**, uma assinatura claramente delimitada;
- **cursos, formações, produtos digitais e licenças de beats vendidos separadamente**;
- **pacotes temáticos com prazo de acesso definido**;
- **marketplace de serviços com contratação protegida**;
- **planos empresariais para recrutamento e contratação**;
- **programa de afiliados configurado por oferta**;
- **uma camada central de direitos de acesso, pagamentos, divisão financeira e repasses**.

A expressão genérica **“Premium” deve ser eliminada** até que exista uma oferta real com nome, preço, benefícios, duração, regras de cancelamento e mecanismos de acesso implementados.

---

## 2. Diagnóstico do estado atual

## 2.1. Perfis são tratados como papéis exclusivos

O tipo `UserRole` define um único papel entre `student`, `instructor`, `producer`, `affiliate`, `company`, `admin` e `super_admin`. O roteamento também separa os portais por esse papel.

Isso conflita com a jornada real desejada. Um aluno pode se tornar produtor, instrutor, afiliado ou prestador de serviços sem deixar de ser aluno. Um produtor pode também ministrar cursos. Um afiliado pode comprar produtos. Uma pessoa pode administrar uma empresa e manter um perfil profissional individual.

### Reformulação necessária

- Uma conta representa uma pessoa.
- Toda pessoa possui capacidade de aluno/comprador.
- Instrutor, produtor e afiliado são **capacidades adicionais**.
- Empresa é uma **organização**, com membros e permissões próprias.
- A seleção feita no cadastro deve definir o ambiente inicial, não bloquear a ativação futura de outros ambientes.

## 2.2. “Premium” existe como nomenclatura, não como produto comercial

Foram encontradas as seguintes referências desconectadas:

- `PremiumLibraryPage.tsx` exibe “Conteúdo exclusivo para assinantes Premium”.
- `ContentArticleDetailPage.tsx` bloqueia visualmente artigos e direciona para `/area-vip`, embora essa rota não exista mais.
- `student_preferences.subscription_plan` aceita `free`, `premium` e `enterprise`.
- o painel do aluno exibe esse plano como uma preferência de conta;
- o serviço administrativo retorna zero assinantes, MRR igual a zero e nenhuma lista de planos ou assinaturas;
- a biblioteca utiliza dados mockados e declara que ainda não existe tabela `library_items`;
- a antiga página de assinaturas administrativas foi removida.

Não existem, de forma funcional e integrada:

- catálogo de planos;
- preços recorrentes;
- contrato de assinatura;
- ciclos de cobrança;
- renovação;
- inadimplência;
- cancelamento;
- período de carência;
- vínculo entre plano e conteúdo;
- direitos de acesso derivados da assinatura;
- histórico de alterações do plano.

Há ainda um problema de segurança conceitual: o serviço de artigos carrega o corpo completo do artigo e o bloqueio “Premium” é feito apenas na interface. Mesmo que o texto não seja mostrado, o conteúdo já foi entregue ao cliente. O acesso deve ser decidido no servidor, por direito de acesso válido.

### Decisão proposta

Eliminar o termo “Premium” genérico e substituir por classificações explícitas:

- conteúdo público;
- conteúdo gratuito para conta cadastrada;
- conteúdo do Clube VDM;
- conteúdo adquirido por compra avulsa;
- conteúdo incluído em pacote ou formação;
- material liberado manualmente por bolsa, convite ou parceria.

## 2.3. Cursos possuem preço, mas não possuem ofertas comerciais completas

O domínio de cursos possui:

- preço original;
- desconto;
- preço final;
- moeda;
- status e visibilidade;
- módulos, aulas e materiais;
- matrículas ativas;
- progresso e certificados.

O acesso atual depende de uma matrícula com status `active`. Isso é uma boa base técnica, mas não informa:

- por que a matrícula existe;
- por quanto tempo ela é válida;
- se veio de compra, assinatura, pacote, bolsa ou cortesia;
- qual oferta e versão de preço foram contratadas;
- qual política de reembolso foi aceita;
- se o curso está ou não incluído no Clube VDM;
- quanto pertence ao instrutor e quanto pertence à plataforma.

Os cursos demonstrativos apresentam preços finais entre aproximadamente R$ 297 e R$ 477, mas esses valores são seeds de desenvolvimento e não uma política comercial aprovada.

## 2.4. O checkout não representa pagamentos reais

Os checkouts de cursos, produtos digitais e beats são exclusivos do projeto de desenvolvimento. Eles:

- utilizam um aluno sintético fixo;
- usam credencial administrativa;
- criam o pedido diretamente como pago;
- liberam matrícula, licença ou entrega imediatamente;
- não recebem confirmação de um provedor real;
- não executam conciliação financeira;
- não calculam impostos, custo do meio de pagamento ou parcelamento;
- não geram lançamentos financeiros completos;
- não tratam chargeback de forma operacional;
- não fazem divisão real entre plataforma, criador, coprodutor e afiliado.

Os três tipos de pedido também permanecem separados em `course_orders`, `digital_product_orders` e `beat_orders`. Isso dificulta carrinho misto, cupons, relatórios, reembolsos e divisão financeira uniforme.

## 2.5. Produtos digitais possuem venda, mas não possuem economia do vendedor

O produtor consegue:

- cadastrar produto;
- enviar arquivo;
- definir preço;
- publicar ou arquivar;
- visualizar pedidos.

Entretanto:

- o produto pode ser publicado diretamente, sem revisão ou aprovação;
- não existe taxa de plataforma aplicada ao produto;
- o total bruto de vendas é apresentado como saldo disponível e elegível;
- comissão, prazo de liberação e mínimo de saque aparecem como zero;
- não existe carteira única de produtor reunindo produtos e beats;
- não existem versões, atualizações, termos de licença ou política específica por produto;
- não existe coprodução ou divisão de receita.

## 2.6. Beats são o domínio comercial mais desenvolvido, porém isolado

O marketplace de beats já possui:

- preview público;
- arquivos master e stems privados;
- licenças Básica, Premium, Unlimited e Exclusiva;
- preço, entregáveis, direitos de uso e limite de cópias;
- contrato de licença;
- entrega e prazo de download;
- carteira financeira do produtor;
- solicitação de repasse;
- taxa padrão de plataforma de 15%;
- mínimo de saque de R$ 50;
- atraso de liberação de 14 dias.

Os valores padrão criados pelo código são:

- Licença Básica: R$ 99;
- Licença Premium: R$ 199;
- Licença Exclusiva: R$ 1.499.

Esses valores também são demonstrativos. Além disso, “Licença Premium” não pode ser confundida com uma assinatura Premium da plataforma.

### Reformulação necessária

- renomear as licenças para reduzir ambiguidade, por exemplo: Start, Pro, Unlimited e Exclusiva;
- unificar a carteira de beats e produtos;
- aplicar a mesma lógica de taxas, reservas, reembolsos, chargebacks e repasses;
- tornar a venda exclusiva transacionalmente atômica;
- preservar os direitos de compradores de licenças não exclusivas anteriores;
- impedir novas vendas exclusivas ou incompatíveis após a exclusividade.

## 2.7. Instrutores não possuem modelo financeiro

O instrutor consegue criar e administrar cursos, módulos, aulas e materiais. Também consegue visualizar alunos e relatórios.

Não existe, porém:

- carteira do instrutor;
- participação por venda;
- contrato de publicação;
- coprodução;
- divisão entre vários instrutores;
- repasse;
- reserva de reembolso;
- remuneração por consumo em assinatura;
- critérios de aprovação do curso;
- processo de revisão de direitos autorais e qualidade.

Assim, o portal de instrutor está funcional academicamente, mas incompleto comercialmente.

## 2.8. Afiliados possuem estrutura funcional, mas as regras são inadequadas para produção

O afiliado possui:

- perfil;
- código e links;
- cliques e conversões;
- comissões;
- saldo;
- saques;
- materiais de divulgação.

A lógica atual usa uma única taxa global por afiliado. A comissão é calculada sobre o valor bruto total do pedido, aprovada imediatamente, disponibilizada imediatamente e somada ao saldo no momento do checkout.

Faltam:

- comissão por oferta;
- aceite do criador;
- janela de atribuição;
- regra de primeiro ou último clique;
- prevenção a autoindicação;
- validação antifraude;
- período de retenção por reembolso e chargeback;
- estorno automático da comissão;
- base de cálculo transparente;
- regra para pedidos com vários vendedores;
- aprovação manual ou automática do afiliado por produto.

O mínimo atual de saque de R$ 10 também é muito baixo para uma operação real e tende a aumentar custo operacional.

## 2.9. Empresas possuem recrutamento, mas não possuem produto comercial

O portal empresarial já possui:

- perfil da empresa;
- verificação;
- membros;
- oportunidades;
- candidatos;
- pipeline de seleção;
- mensagens;
- faixa salarial, modalidade e prazo.

Não existem:

- planos empresariais;
- limites de vagas;
- quantidade de membros por plano;
- cobrança recorrente;
- busca ativa de talentos;
- créditos de contato;
- destaque patrocinado;
- relatórios por plano;
- contratação de serviços;
- contrato, pagamento, entrega ou disputa.

Portanto, o portal empresarial é atualmente um ATS/recrutamento básico gratuito, sem modelo de monetização.

## 2.10. Oportunidades não são um marketplace de serviços

As oportunidades permitem divulgar vagas, colaborações, sincronização, editais e concursos, além de receber candidaturas.

Isso não resolve a contratação transacional de profissionais. Não foram encontrados domínios de:

- serviços cadastrados;
- orçamento;
- proposta;
- pedido de serviço;
- contrato;
- marcos de pagamento;
- custódia do valor;
- entrega;
- revisão;
- aceite;
- disputa;
- avaliação do prestador e do contratante.

Oportunidade profissional e contratação de serviço devem ser áreas relacionadas, mas distintas.

## 2.11. Administração financeira está fragmentada

O administrador consegue processar solicitações de repasse de produtores e saques de afiliados. Entretanto:

- não existem repasses de instrutores;
- o painel geral trata receita bruta de pedidos como saldo da plataforma;
- não existe ledger canônico;
- não existe separação entre receita da plataforma e valores de terceiros;
- não existe conciliação do provedor de pagamento;
- não existem impostos, notas fiscais, reservas, estornos e chargebacks consolidados;
- assinaturas, MRR e churn retornam zero;
- faturas e sessões financeiras permanecem vazias.

## 2.12. Cupons estão desconectados do checkout

O administrador visualiza cupons para cursos e produtos, mas os checkouts de cursos e produtos não aplicam cupom. O checkout de beat recebe campos de cupom no frontend, porém a função demonstrativa não processa esses campos.

Cupons precisam ser vinculados a ofertas específicas e aplicados antes do cálculo de taxas e comissões.

---

## 3. Referências de mercado e posicionamento próprio

As plataformas horizontais de infoprodutos normalmente reduzem a barreira de entrada, não cobram mensalidade inicial e monetizam por venda. Hotmart, Eduzz e Kiwify também combinam checkout, entrega, recorrência, afiliados e divisão de comissões.

Como referência de agosto de 2026:

- Hotmart informa taxa geral de 9,9% mais tarifa fixa por venda, com cobrança adicional para seu player em determinados produtos;
- Eduzz informa taxa diferente para venda direta e venda via afiliado, além de tarifas de saque e antecipação;
- Kiwify informa 8,99% mais tarifa fixa, sem mensalidade e com área de membros incluída;
- Academia de Beats trabalha com planos anuais e mensais que combinam cursos, comunidade, suporte, monitorias e oportunidades.

A Vivendo da Música não deve tentar ser apenas mais um checkout. Seu diferencial deve ser a jornada vertical:

**descobrir → aprender → praticar → criar portfólio → comprar ferramentas → contratar profissionais → vender produtos e serviços → divulgar → trabalhar com empresas.**

Isso justifica uma arquitetura própria, mas não justifica taxas obscuras. A proposta deve ser simples para o usuário e transparente para quem recebe valores.

---

## 4. Modelo de identidade, perfis e ambientes

## 4.1. Conta universal

Toda pessoa cria uma única conta e recebe acesso básico de aluno/comprador.

No cadastro, a seleção Aluno, Instrutor, Produtor, Afiliado ou Empresa define:

- onboarding inicial;
- campos exibidos;
- ambiente inicial;
- verificações necessárias.

Ela não deve impedir que a pessoa ative outro ambiente posteriormente.

## 4.2. Capacidades adicionais

### Aluno/comprador

Capacidade universal para:

- navegar;
- comprar;
- aprender;
- concluir projetos;
- montar perfil profissional;
- candidatar-se;
- contratar serviços;
- avaliar compras e prestadores.

### Instrutor

Ativação condicionada a:

- perfil profissional;
- aceite do contrato de instrutor;
- validação de identidade e dados de pagamento;
- análise de experiência ou amostra;
- aprovação administrativa.

### Produtor

Ativação condicionada a:

- perfil de vendedor;
- aceite do contrato de marketplace;
- identidade e dados fiscais/financeiros;
- declaração de titularidade dos materiais;
- revisão inicial de produtos e beats.

### Afiliado

Pode coexistir com qualquer perfil pessoal. Requer:

- aceite dos termos do programa;
- dados de pagamento;
- regras antifraude;
- aprovação quando a oferta exigir.

### Empresa

Empresa deve ser uma organização, não um papel pessoal exclusivo.

Uma pessoa cria ou ingressa em uma empresa e recebe uma função interna:

- proprietário;
- administrador;
- recrutador;
- gestor de projetos;
- financeiro;
- visualizador.

---

## 5. Catálogo comercial proposto

## 5.1. Conteúdos editoriais

Tipos de acesso:

- **Público:** acessível sem conta e indexável;
- **Conta gratuita:** exige cadastro, mas não pagamento;
- **Clube VDM:** exige assinatura ativa;
- **Vinculado a curso:** exige direito de acesso ao curso;
- **Vinculado a compra:** exige produto ou pacote adquirido.

O campo binário `is_premium` deve ser substituído por uma política explícita de acesso. O corpo protegido não pode ser enviado ao navegador sem direito válido.

## 5.2. Cursos avulsos

Cada curso pode ter várias ofertas, sem duplicar o conteúdo:

- preço integral;
- preço promocional com validade;
- parcelamento;
- pacote;
- acesso por Clube VDM;
- acesso por bolsa ou convite;
- oferta não listada para parceiros.

### Regra inicial recomendada

- acesso padrão por 12 meses;
- certificado mantido após o término do acesso;
- progresso preservado;
- atualizações incluídas durante o período;
- acesso vitalício somente quando declarado expressamente na oferta.

### Faixas recomendadas

- minicurso: R$ 39 a R$ 79;
- curso completo: R$ 197 a R$ 497;
- formação profissional: R$ 697 a R$ 1.497;
- mentoria ou acompanhamento: oferta separada, não escondida no curso.

## 5.3. Pacotes e formações

Pacote é uma oferta que concede direitos sobre vários recursos.

Exemplos iniciais:

- **Trilha Essencial de Produção:** três cursos, 12 meses, preço recomendado de R$ 297;
- **Formação Profissional VDM:** seis cursos, projetos avaliados e certificado de formação, 18 meses, preço recomendado de R$ 797;
- **Pacote Negócios da Música:** cursos de direitos, lançamento e carreira, 12 meses, preço recomendado de R$ 397.

Os nomes e componentes devem ser cadastrados no administrador. Não devem ser codificados diretamente nas páginas.

## 5.4. Clube VDM

A assinatura deve ter nome próprio e benefícios delimitados. Ela não deve significar “tudo liberado”.

### Conta Livre — R$ 0

Inclui:

- perfil;
- conteúdos públicos e gratuitos;
- previews de cursos e beats;
- comunidade pública;
- favoritos;
- oportunidades abertas;
- possibilidade de compras avulsas;
- perfil profissional básico.

### Clube VDM — R$ 49,90 por mês ou R$ 499 por ano

Inclui:

- catálogo rotativo de cursos próprios ou contratados pela VDM;
- biblioteca de materiais do Clube;
- grupos privados da comunidade;
- encontros coletivos e eventos definidos no calendário;
- trilhas guiadas;
- desconto de 10% em ofertas elegíveis da própria VDM;
- selo de membro ativo.

Não inclui automaticamente:

- todos os cursos de instrutores independentes;
- produtos digitais de terceiros;
- beats e licenças;
- serviços profissionais;
- mentorias individuais;
- oportunidades exclusivas pagas por empresas.

### Regra para conteúdo de terceiros no Clube

Na primeira versão, o Clube deve conter apenas conteúdo:

- produzido pela própria VDM; ou
- licenciado por contrato com valor fixo.

Somente em fase posterior deve existir remuneração por consumo. Nesse modelo, uma proposta possível é:

- receita líquida da assinatura após impostos, pagamento, reembolso e reserva;
- 30% para a operação VDM;
- 70% para um fundo de criadores;
- distribuição por consumo qualificado, conclusão e usuários únicos, com proteção antifraude.

Esse modelo exige ledger, métricas confiáveis e contrato específico; não deve ser lançado de forma improvisada.

## 5.5. Produtos digitais

Categorias atuais podem ser mantidas: presets, drum kits, MIDI, plugins, templates, projetos, ebooks e outros.

Cada produto precisa ter:

- versão;
- descrição de licença;
- compatibilidade;
- arquivos e tamanho;
- histórico de atualização;
- política de suporte;
- prazo de atualização;
- regras de uso comercial;
- oferta e preço próprios.

Faixas recomendadas:

- ebook/checklist: R$ 19 a R$ 79;
- preset/MIDI/template: R$ 29 a R$ 149;
- kit ou pack completo: R$ 79 a R$ 299;
- ferramenta de maior valor: definida por análise e suporte incluído.

## 5.6. Beats e licenças

Nomenclatura recomendada:

- **Start:** MP3, uso comercial limitado;
- **Pro:** MP3 e WAV, monetização e limites maiores;
- **Unlimited:** MP3, WAV e direitos ampliados;
- **Exclusiva:** WAV, stems e exclusividade definida por contrato.

Faixas recomendadas:

- Start: R$ 79 a R$ 129;
- Pro: R$ 179 a R$ 299;
- Unlimited: R$ 399 a R$ 799;
- Exclusiva: a partir de R$ 1.500 ou valor negociado.

O contrato deve registrar:

- obra e produtor;
- comprador;
- tipo de licença;
- direitos e restrições;
- entregáveis;
- limites;
- data;
- preço;
- situação da compra;
- efeito de reembolso ou chargeback.

## 5.7. Serviços profissionais

Deve ser criado um marketplace específico, separado das oportunidades.

Categorias iniciais:

- beat personalizado;
- produção musical;
- gravação e edição vocal;
- mixagem;
- masterização;
- composição e songwriting;
- design de capa;
- audiovisual;
- marketing musical;
- consultoria e mentoria;
- revisão de contrato ou documentação por profissional habilitado.

### Fluxo obrigatório

1. prestador publica serviço e pacotes;
2. cliente envia briefing;
3. prestador aceita ou envia proposta;
4. cliente paga;
5. valor fica reservado;
6. prestador entrega por marco;
7. cliente aprova, solicita revisão ou abre disputa;
8. após aceite ou prazo automático, valor é liberado;
9. ambas as partes avaliam a experiência.

### Pacotes de serviço

Cada serviço pode possuir:

- Básico;
- Profissional;
- Completo;
- orçamento personalizado.

Os nomes descrevem escopo do serviço, não nível da conta.

## 5.8. Oportunidades profissionais

Continuam gratuitas para candidatos.

Devem conter:

- emprego;
- freelancer;
- colaboração;
- sincronização;
- edital;
- concurso;
- estágio;
- contratação por projeto.

Quando uma oportunidade resultar em contratação transacional dentro da plataforma, ela pode gerar um pedido de serviço, mas candidatura e compra não são a mesma coisa.

---

## 6. Planos para criadores

Instrutor e produtor utilizam o mesmo modelo financeiro de criador, ainda que os módulos operacionais sejam diferentes.

## 6.1. Criador Livre — R$ 0 por mês

- cadastro e validação;
- até três cursos publicados;
- até dez produtos ou beats publicados;
- página pública;
- vendas e entregas;
- relatórios básicos;
- taxa VDM de 12% sobre o valor pago após desconto;
- custo do meio de pagamento exibido separadamente no extrato.

## 6.2. Criador Pro — R$ 79,90 por mês ou R$ 799 por ano

- limites ampliados;
- taxa VDM reduzida para 8%;
- relatórios avançados;
- cupons e campanhas próprias;
- afiliação personalizada;
- páginas e identidade comercial ampliadas;
- prioridade de análise;
- exportação financeira;
- membros colaboradores.

O custo do provedor de pagamento não pode ser fixado antes da contratação do PSP. Ele deve aparecer como linha própria e nunca ser escondido na taxa da plataforma.

### Validação econômica

A assinatura Pro só gera economia financeira quando a redução de quatro pontos percentuais superar a mensalidade. Com R$ 79,90, isso ocorre a partir de aproximadamente R$ 1.997,50 em vendas mensais, antes de outros benefícios. Essa informação deve ser transparente.

---

## 7. Planos para empresas

## 7.1. Empresa Livre — R$ 0

- perfil verificado;
- um membro;
- uma oportunidade ativa;
- até 20 candidaturas por oportunidade;
- pipeline básico;
- mensagens com candidatos inscritos;
- sem busca ativa de talentos.

## 7.2. Empresa Essencial — R$ 149 por mês ou R$ 1.490 por ano

- até cinco oportunidades ativas;
- três membros;
- pipeline completo;
- mensagens;
- busca básica de talentos;
- até 100 visualizações de perfis por mês;
- banco de favoritos;
- relatórios básicos.

## 7.3. Empresa Pro — R$ 399 por mês ou R$ 3.990 por ano

- até 20 oportunidades ativas;
- dez membros;
- busca avançada;
- filtros profissionais;
- bancos de talentos;
- marca empregadora;
- relatórios e exportação;
- prioridade de suporte;
- integração futura por API.

## 7.4. Empresa Enterprise

Preço sob proposta, com:

- múltiplas unidades;
- SSO futuro;
- limites personalizados;
- gestor de conta;
- SLA;
- integração;
- contrato e faturamento corporativo.

## 7.5. Complementos

- destaque de oportunidade por sete dias: recomendação inicial de R$ 99;
- pacote adicional de vagas: definido por volume;
- busca de talentos adicional: créditos claramente precificados;
- nenhuma oportunidade patrocinada pode parecer resultado orgânico.

---

## 8. Afiliados

## 8.1. Afiliação por oferta

Cada curso, pacote, produto, licença ou assinatura elegível possui um programa próprio:

- aberto;
- mediante aprovação;
- apenas por convite;
- desativado.

O criador define a comissão dentro dos limites permitidos. Faixas recomendadas:

- cursos e formações: 10% a 30%;
- produtos digitais: 10% a 25%;
- Clube VDM: valor fixo ou percentual da primeira cobrança, com regra separada para renovações;
- beats: 5% a 15%;
- serviços: sem afiliação na primeira versão.

## 8.2. Atribuição

Regra recomendada:

- último clique válido;
- janela de 30 dias;
- identificação por link e sessão;
- um afiliado por item, não apenas por pedido;
- autoindicação proibida;
- clique fraudulento ou compra com dados do próprio afiliado não gera comissão;
- cupom afiliado pode substituir a atribuição quando configurado.

## 8.3. Base de cálculo

Ordem proposta:

1. preço da oferta;
2. desconto e cupom;
3. impostos retidos e custo do pagamento;
4. taxa da plataforma;
5. comissão do afiliado sobre o saldo comercial da oferta;
6. divisão entre criador e coprodutores.

A tela deve mostrar uma simulação antes de publicar a oferta.

## 8.4. Disponibilidade e saque

- comissão inicia como pendente;
- só fica disponível após o prazo de reembolso e análise de risco;
- reembolso ou chargeback cancela a comissão;
- mínimo de saque recomendado: R$ 100;
- Pix ou transferência para conta verificada;
- prazo e eventual tarifa bancária informados antes da solicitação.

---

## 9. Pagamentos, divisão financeira e repasses

## 9.1. Pedido canônico

A plataforma deve convergir para:

- `orders`;
- `order_items`;
- `offers`;
- `payments`;
- `payment_attempts`;
- `refunds`;
- `chargebacks`;
- `entitlements`;
- `revenue_splits`;
- `ledger_entries`;
- `payout_accounts`;
- `payouts`.

As tabelas atuais podem ser migradas gradualmente, mas não devem continuar como três economias independentes.

## 9.2. Ledger

Cada evento financeiro cria lançamentos imutáveis:

- valor cobrado;
- desconto;
- imposto;
- custo de pagamento;
- receita da plataforma;
- valor do afiliado;
- valor do criador;
- valor do coprodutor;
- reserva;
- reembolso;
- chargeback;
- repasse.

Saldo não pode ser calculado apenas somando pedidos pagos.

## 9.3. Prazo de liberação

Proposta inicial:

- Pix: disponível após sete dias;
- cartão: disponível após 30 dias;
- vendas com risco elevado podem ter reserva adicional;
- novos vendedores podem manter 5% de reserva temporária por 60 dias;
- antecipação somente após contrato com provedor e precificação clara.

## 9.4. Coprodução

Cada oferta pode dividir o saldo do criador entre participantes:

- proprietário;
- instrutor;
- coprodutor;
- parceiro editorial.

O contrato possui percentual, validade, aceite e histórico. A soma deve ser validada e o proprietário deve conservar participação mínima definida pela plataforma.

---

## 10. Direitos de acesso

A matrícula deixa de ser a única fonte de verdade. Deve existir uma tabela central de direitos de acesso.

Cada direito registra:

- usuário ou organização;
- recurso;
- origem;
- início;
- término;
- situação;
- revogação;
- metadados da oferta.

Origens possíveis:

- compra;
- assinatura;
- pacote;
- bolsa;
- cortesia;
- acesso administrativo;
- licença;
- empresa;
- parceria.

Situações:

- ativo;
- agendado;
- suspenso;
- expirado;
- revogado;
- reembolsado.

### Matriz resumida

| Recurso | Regra de acesso |
|---|---|
| Artigo público | qualquer visitante |
| Artigo gratuito de conta | usuário autenticado |
| Artigo do Clube | assinatura ativa |
| Aula de preview | qualquer visitante |
| Curso comprado | direito da compra ainda válido |
| Curso do Clube | assinatura ativa e curso incluído no catálogo vigente |
| Pacote | direito do pacote e item associado |
| Produto digital | pedido pago não reembolsado |
| Beat | contrato de licença ativo |
| Arquivo privado | URL assinada após validação do direito |
| Serviço | partes do contrato e equipe autorizada |
| Recursos empresariais | plano da organização e permissão do membro |

---

## 11. Cancelamento, reembolso, inadimplência e revogação

As regras definitivas exigem revisão jurídica brasileira. Compras online possuem direito de arrependimento previsto no Código de Defesa do Consumidor, e a plataforma deve permitir solicitação clara e devolver integralmente os valores quando aplicável.

## 11.1. Compra avulsa

- solicitação de arrependimento em até sete dias, quando aplicável;
- estorno integral;
- direito de acesso passa para `reembolsado`;
- progresso permanece registrado, mas o conteúdo fica bloqueado;
- comissão de afiliado e saldo do criador são revertidos;
- histórico do pedido é preservado.

## 11.2. Assinatura

- cancelamento impede nova renovação;
- acesso permanece até o fim do período pago, salvo reembolso ou fraude;
- arrependimento da contratação inicial segue a regra legal aplicável;
- troca de plano ocorre no próximo ciclo ou com cálculo proporcional explícito;
- renovação recusada gera tentativas nos dias 0, 1, 3, 5 e 7;
- durante sete dias, estado de carência;
- após o prazo, assinatura e direitos ficam suspensos;
- pagamento posterior reativa o acesso sem perder progresso.

## 11.3. Beat e licença

- o direito legal de arrependimento deve ser respeitado quando aplicável;
- depois do prazo obrigatório, reembolso voluntário apenas para duplicidade, falha de entrega, arquivo defeituoso ou acordo entre as partes;
- reembolso revoga a licença;
- uso já realizado deve ser tratado no contrato e pela análise jurídica;
- venda exclusiva deve bloquear novas ofertas incompatíveis em uma única transação.

## 11.4. Produto digital

- reembolso revoga novas URLs de download;
- versões baixadas não podem ser tecnicamente recolhidas, por isso termos de uso e licença são essenciais;
- defeito ou arquivo incompatível deve permitir correção, substituição ou reembolso conforme a lei e a oferta.

## 11.5. Serviço

- antes do início: cancelamento integral conforme regras e lei;
- após início: cálculo por marcos aceitos, sem afastar direitos legais;
- valor de marco em disputa permanece reservado;
- evidências, arquivos e mensagens ficam preservados;
- decisão administrativa deve ser auditável.

## 11.6. Chargeback e fraude

- direito relacionado é suspenso imediatamente;
- valor do criador e afiliado fica reservado;
- entrega nova é bloqueada;
- caso favorável ao comprador, lançamentos são revertidos;
- reincidência gera revisão ou suspensão do vendedor.

---

## 12. Permissões por ambiente

## 12.1. Portal do Aluno

- compras, matrículas e assinatura;
- cursos e progresso;
- biblioteca conforme direitos;
- downloads e contratos;
- comunidade;
- projetos e portfólio;
- perfil profissional;
- contratação de serviços;
- candidaturas;
- pedidos, reembolsos e suporte.

## 12.2. Portal do Instrutor

- cursos, módulos, aulas e materiais;
- submissão para revisão;
- preços e ofertas permitidas;
- alunos e avaliações;
- suporte aos alunos;
- relatórios;
- afiliados por oferta;
- coprodução;
- carteira e repasses;
- serviços de mentoria ou aula particular.

## 12.3. Portal do Produtor

- beats, licenças e contratos;
- produtos digitais;
- serviços;
- arquivos e versões;
- pedidos;
- cupons;
- afiliados;
- carteira unificada;
- repasses;
- métricas e conversão.

## 12.4. Portal do Afiliado

- catálogo de programas;
- solicitações e convites;
- links e cupons;
- materiais;
- cliques, conversões e atribuição;
- comissões pendentes, disponíveis e revertidas;
- saques;
- regras de divulgação.

## 12.5. Portal da Empresa

- organização e membros;
- plano e cobrança;
- oportunidades;
- candidatos e pipeline;
- busca de talentos;
- mensagens;
- contratação de serviços;
- pedidos e contratos;
- marca empregadora;
- relatórios.

---

## 13. Funcionalidades a remover imediatamente

1. Texto “Conteúdo exclusivo para assinantes Premium”.
2. CTA para `/area-vip`, rota inexistente.
3. Nome “Biblioteca Premium” enquanto não houver plano real.
4. Campo de preferência `subscription_plan` como se representasse cobrança.
5. Exibição administrativa de plano “Gratuito” hardcoded.
6. Dados mockados de biblioteca, planos VIP, benefícios, depoimentos e FAQ.
7. Bloqueio de artigo apenas no frontend.
8. Comissão de afiliado aprovada e disponível imediatamente.
9. Saldo do produtor calculado a partir da receita bruta.
10. Taxas iguais a zero para produtos digitais.
11. Publicação direta de conteúdo comercial sem fluxo de revisão.
12. Uso simultâneo de “Premium” para assinatura e licença de beat.
13. Funcionalidades administrativas de cupom que não afetam o checkout.

---

## 14. Funcionalidades a reformular

1. papel exclusivo de usuário → capacidades múltiplas;
2. empresa como papel → organização com membros;
3. matrícula → direito de acesso com origem e validade;
4. curso com um preço → recurso com várias ofertas;
5. três pedidos independentes → pedido canônico;
6. carteiras fragmentadas → ledger e carteira por recebedor;
7. biblioteca genérica → catálogo com política de acesso;
8. afiliado global → programa por oferta;
9. oportunidade → recrutamento, sem confundir com serviço;
10. dashboard financeiro → receita, passivo, reserva, saldo e repasse separados;
11. licença exclusiva → bloqueio transacional e contrato completo;
12. termos estáticos → documentos versionados associados à oferta aceita.

---

## 15. Funcionalidades a implementar

### Camada comercial

- recursos;
- ofertas e preços versionados;
- pacotes;
- planos;
- assinaturas e ciclos;
- catálogo do Clube;
- direitos de acesso;
- promoções e cupons por oferta.

### Camada financeira

- pagamento real e webhooks;
- pedido canônico;
- ledger;
- splits;
- coprodução;
- reservas;
- reembolsos;
- chargebacks;
- carteiras;
- repasses para instrutor, produtor e afiliado;
- conciliação;
- relatórios fiscais e notas conforme definição contábil.

### Camada profissional

- capacidades múltiplas;
- perfil profissional;
- portfólio e projetos;
- marketplace de serviços;
- propostas, contratos, marcos, entregas e disputas;
- avaliações bilaterais.

### Camada empresarial

- planos;
- limites de uso;
- faturamento organizacional;
- membros e permissões;
- busca ativa de talentos;
- contratação de serviços.

### Governança

- KYC de recebedores;
- verificação de empresas;
- contratos versionados;
- moderação;
- auditoria;
- prevenção a fraude;
- revisão de direitos autorais;
- política de conteúdo e propriedade intelectual.

---

## 16. Arquitetura de dados recomendada

Entidades centrais:

- `accounts`;
- `account_capabilities`;
- `organizations`;
- `organization_members`;
- `resources`;
- `offers`;
- `offer_prices`;
- `bundles`;
- `bundle_items`;
- `plans`;
- `subscriptions`;
- `subscription_cycles`;
- `entitlements`;
- `orders`;
- `order_items`;
- `payments`;
- `payment_attempts`;
- `refunds`;
- `chargebacks`;
- `revenue_splits`;
- `ledger_accounts`;
- `ledger_entries`;
- `payout_accounts`;
- `payouts`;
- `affiliate_programs`;
- `affiliate_memberships`;
- `affiliate_attributions`;
- `affiliate_commissions`;
- `service_offers`;
- `service_orders`;
- `service_proposals`;
- `service_milestones`;
- `service_deliveries`;
- `service_disputes`.

O acesso ao conteúdo deve consultar `entitlements`; o financeiro deve consultar o ledger; a interface não deve inferir direitos a partir de textos ou preferências.

---

## 17. Ordem de implementação recomendada

## Fase 1 — decisões e limpeza

- aprovar nomenclaturas, preços e taxas;
- remover Premium, Área VIP e mocks comerciais;
- classificar todos os conteúdos;
- separar conta, capacidade e plano;
- congelar criação de novas regras comerciais isoladas.

## Fase 2 — núcleo comercial

- recursos, ofertas, pacotes e direitos de acesso;
- pedido canônico;
- pagamento real;
- webhooks idempotentes;
- reembolso e revogação;
- migração de cursos, produtos e beats.

Nesta fase, lançar apenas compras avulsas. Não lançar assinatura antes do núcleo estar estável.

## Fase 3 — economia de criadores

- carteiras de instrutor e produtor;
- taxa padrão;
- coprodução;
- ledger;
- reservas e repasses;
- afiliados por oferta com retenção e estorno.

## Fase 4 — serviços e empresas

- marketplace de serviços;
- custódia e marcos;
- disputas;
- planos empresariais;
- busca de talentos;
- contratação por organização.

## Fase 5 — Clube VDM

- assinatura real;
- cobrança recorrente;
- carência e inadimplência;
- catálogo próprio/contratado;
- comunidade e eventos do Clube;
- posteriormente, fundo de remuneração por consumo.

## Fase 6 — otimização

- Creator Pro;
- upsell, order bump e recuperação;
- campanhas avançadas;
- recomendação;
- internacionalização;
- APIs empresariais.

---

## 18. Decisões que precisam de aprovação antes do desenvolvimento

1. Nome final da assinatura: recomendação `Clube VDM`.
2. Preço: recomendação R$ 49,90 mensal e R$ 499 anual.
3. Conteúdo exato incluído no Clube.
4. Duração padrão do acesso a cursos avulsos.
5. Pacotes iniciais e composição.
6. Taxa Criador Livre: recomendação 12% mais custo real de pagamento.
7. Criador Pro: recomendação R$ 79,90 e taxa de 8%.
8. Taxa de serviços: recomendação 8% a 12% mais custo do pagamento.
9. Planos empresariais e limites.
10. Política de afiliação e faixa de comissão.
11. Regra de coprodução.
12. Prazos de liberação e reserva.
13. Provedor de pagamento.
14. Responsabilidade fiscal e emissão de notas.
15. Política jurídica de reembolso, licença e serviços.
16. Critérios para aprovação de instrutores, produtores e empresas.

---

## 19. Resultado final da varredura

A plataforma não deve ser apresentada atualmente como possuindo planos Premium, assinatura, carteira completa de criadores, contratação de serviços ou economia integrada. Esses elementos ainda não existem de forma real, mesmo quando seus nomes aparecem na interface.

A base mais aproveitável é:

- cursos, módulos, aulas, matrículas e progresso;
- produtos digitais e arquivos privados;
- beats, licenças, contratos e entregas;
- afiliados, desde que as regras financeiras sejam refeitas;
- empresas, oportunidades e candidatos;
- autenticação e portais separados, que deverão evoluir para capacidades múltiplas.

A estrutura proposta transforma esses módulos em uma única operação coerente. O ponto central não é criar mais páginas: é estabelecer uma fonte única de verdade para **o que está sendo vendido, quem pode acessar, quem recebe, quanto recebe, quando recebe e o que acontece quando a relação comercial muda**.
