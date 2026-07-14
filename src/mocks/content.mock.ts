
export const MOCK_CONTENT_CATEGORIES = ['Todos', 'Produção', 'Carreira', 'Negócios', 'Tecnologia'] as const;

export const MOCK_ARTICLES = [
  {
    slug: 'como-comecar-na-producao-musical',
    title: 'Como começar na produção musical',
    category: 'Produção', tag: 'Iniciantes', level: 'Iniciante', readMinutes: 6, isPremium: false, isFeatured: true,
    excerpt: 'Um guia direto para quem está dando os primeiros passos na produção musical.',
    body: 'Comece escolhendo uma DAW gratuita, aprenda os fundamentos de teoria musical aplicada e produza uma faixa simples por semana. A consistência importa mais que o equipamento caro no início da jornada.',
    author: 'Equipe Vivendo da Música', publishedAt: '02/05/2026', relatedSlugs: ['guia-de-direitos-autorais', 'como-vender-beats-online'],
  },
  {
    slug: 'guia-de-direitos-autorais',
    title: 'Guia de direitos autorais para iniciantes',
    category: 'Negócios', tag: 'Direitos Autorais', level: 'Iniciante', readMinutes: 9, isPremium: false, isFeatured: false,
    excerpt: 'Entenda o básico sobre registro, distribuição e proteção da sua obra musical.',
    body: 'Registrar sua obra protege seus direitos patrimoniais e morais. Veja como funciona o registro na Biblioteca Nacional e como o ECAD distribui direitos de execução pública.',
    author: 'Equipe Vivendo da Música', publishedAt: '10/05/2026', relatedSlugs: ['como-comecar-na-producao-musical'],
  },
  {
    slug: 'mixagem-avancada-low-end',
    title: 'Mixagem avançada: dominando o low-end',
    category: 'Produção', tag: 'Mixagem', level: 'Avançado', readMinutes: 12, isPremium: true, isFeatured: true,
    excerpt: 'Técnicas profissionais para deixar o grave da sua mixagem mais limpo e potente.',
    body: 'O segredo do low-end limpo está no gerenciamento de fase entre kick e baixo, no uso criterioso de side-chain e na escolha certa de frequências de corte. Este artigo detalha um fluxo de trabalho testado em estúdio.',
    author: 'João Millen', publishedAt: '18/05/2026', relatedSlugs: ['como-vender-beats-online'],
  },
  {
    slug: 'como-vender-beats-online',
    title: 'Como vender beats online em 2026',
    category: 'Carreira', tag: 'Negócios', level: 'Intermediário', readMinutes: 8, isPremium: false, isFeatured: false,
    excerpt: 'As melhores plataformas e estratégias para transformar suas beats em renda.',
    body: 'Plataformas de licenciamento, redes sociais e parcerias diretas com artistas são os três pilares para monetizar beats de forma consistente em 2026.',
    author: 'Lucas Beats', publishedAt: '24/05/2026', relatedSlugs: ['guia-de-direitos-autorais'],
  },
  {
    slug: 'ia-na-producao-musical',
    title: 'O papel da IA na produção musical moderna',
    category: 'Tecnologia', tag: 'IA', level: 'Intermediário', readMinutes: 7, isPremium: true, isFeatured: true,
    excerpt: 'Como ferramentas de inteligência artificial estão mudando o fluxo de trabalho dos produtores.',
    body: 'Da geração de stems à masterização assistida, a IA já é parte do fluxo de muitos produtores profissionais. Veja como incorporá-la sem perder sua identidade criativa.',
    author: 'Equipe Vivendo da Música', publishedAt: '30/05/2026', relatedSlugs: ['como-comecar-na-producao-musical'],
  },
  {
    slug: 'home-studio-com-orcamento-baixo',
    title: 'Home studio com orçamento baixo: é possível?',
    category: 'Produção', tag: 'Home Studio', level: 'Iniciante', readMinutes: 5, isPremium: false, isFeatured: false,
    excerpt: 'Monte um espaço funcional de produção gastando menos do que você imagina.',
    body: 'Tratamento acústico caseiro, fones de referência e uma interface de áudio básica já permitem produções de qualidade. O segredo é priorizar o ambiente antes do equipamento.',
    author: 'Equipe Vivendo da Música', publishedAt: '03/06/2026', relatedSlugs: ['como-comecar-na-producao-musical'],
  },
  {
    slug: 'playlists-como-funciona-a-curadoria',
    title: 'Playlists: como funciona a curadoria editorial',
    category: 'Carreira', tag: 'Streaming', level: 'Intermediário', readMinutes: 6, isPremium: false, isFeatured: false,
    excerpt: 'Entenda como artistas independentes conseguem entrar em playlists editoriais.',
    body: 'Submissão antecipada via Spotify for Artists, consistência de lançamentos e engajamento real são fatores que pesam na curadoria editorial das plataformas.',
    author: 'Luan Teles', publishedAt: '07/06/2026', relatedSlugs: ['como-vender-beats-online'],
  },
  {
    slug: 'contratos-de-parceria-musical',
    title: 'Contratos de parceria musical: o que observar',
    category: 'Negócios', tag: 'Contratos', level: 'Avançado', readMinutes: 10, isPremium: true, isFeatured: false,
    excerpt: 'Pontos de atenção antes de assinar qualquer contrato de parceria.',
    body: 'Cláusulas de exclusividade, divisão de royalties e prazo de vigência são os pontos que mais geram conflito em contratos de parceria musical. Veja o que negociar.',
    author: 'Rafael Andrade', publishedAt: '12/06/2026', relatedSlugs: ['guia-de-direitos-autorais'],
  },
  {
    slug: 'masterizacao-em-casa-vale-a-pena',
    title: 'Masterização em casa: vale a pena?',
    category: 'Produção', tag: 'Masterização', level: 'Intermediário', readMinutes: 7, isPremium: false, isFeatured: false,
    excerpt: 'Os prós e contras de masterizar suas próprias faixas.',
    body: 'Masterizar em casa economiza dinheiro, mas exige monitoramento confiável e ouvido treinado. Veja quando vale a pena contratar um especialista.',
    author: 'Mariana Costa', publishedAt: '15/06/2026', relatedSlugs: ['mixagem-avancada-low-end'],
  },
  {
    slug: 'tendencias-da-musica-eletronica-2026',
    title: 'Tendências da música eletrônica em 2026',
    category: 'Tecnologia', tag: 'Tendências', level: 'Intermediário', readMinutes: 6, isPremium: false, isFeatured: false,
    excerpt: 'O que está moldando a produção eletrônica este ano.',
    body: 'Síntese granular, IA generativa e fusões com gêneros regionais estão entre as principais tendências da música eletrônica em 2026.',
    author: 'Equipe Vivendo da Música', publishedAt: '20/06/2026', relatedSlugs: ['ia-na-producao-musical'],
  },
];

export const getArticleBySlug = (slug: string) => MOCK_ARTICLES.find((a) => a.slug === slug);
export const getRelatedArticles = (article: ContentArticle) =>
  article.relatedSlugs.map((slug) => getArticleBySlug(slug)).filter((a): a is ContentArticle => Boolean(a));
