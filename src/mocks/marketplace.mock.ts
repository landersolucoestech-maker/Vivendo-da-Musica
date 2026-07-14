import type { Product, ProductReview, ProductQA, ProductLicense } from "@/modules/marketplace/types/product";

export const MOCK_PRODUCT_CATEGORIES = [
  'Sample Packs', 'Drum Kits', 'Presets', 'Templates',
  'MIDI Packs', 'Contratos', 'E-books', 'Plugins',
] as const;

const PALETTE: [string, string][] = [
  ['#7C3AED', '#312E81'], ['#1E293B', '#0F172A'], ['#A855F7', '#581C87'],
  ['#DB2777', '#4C1D95'], ['#0EA5E9', '#1E3A8A'], ['#334155', '#0F172A'],
  ['#F59E0B', '#7C2D12'], ['#8B5CF6', '#1E1B4B'], ['#16A34A', '#14532D'],
  ['#22D3EE', '#0E7490'], ['#EAB308', '#713F12'], ['#64748B', '#1E293B'],
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'mock-1', slug: 'trap-essentials-sample-pack', title: 'Trap Essentials Sample Pack', category: 'Sample Packs', priceCents: 4990, currency: 'BRL', gradientFrom: PALETTE[0][0], gradientTo: PALETTE[0][1] },
  { id: 'mock-2', slug: 'drill-drum-kit-vol-1', title: 'Drill Drum Kit Vol.1', category: 'Drum Kits', priceCents: 3990, currency: 'BRL', gradientFrom: PALETTE[1][0], gradientTo: PALETTE[1][1] },
  { id: 'mock-3', slug: 'analog-lab-bank', title: 'Analog Lab Bank', category: 'Presets', priceCents: 2990, currency: 'BRL', gradientFrom: PALETTE[2][0], gradientTo: PALETTE[2][1] },
  { id: 'mock-4', slug: 'future-bass-template', title: 'Future Bass Template', category: 'Templates', priceCents: 5990, currency: 'BRL', gradientFrom: PALETTE[3][0], gradientTo: PALETTE[3][1] },
  { id: 'mock-5', slug: 'midi-chord-pack', title: 'MIDI Chord Pack', category: 'MIDI Packs', priceCents: 2990, currency: 'BRL', gradientFrom: PALETTE[4][0], gradientTo: PALETTE[4][1] },
  { id: 'mock-6', slug: 'contrato-de-participacao', title: 'Contrato de Participação', category: 'Contratos', priceCents: 1990, currency: 'BRL', gradientFrom: PALETTE[5][0], gradientTo: PALETTE[5][1] },
  { id: 'mock-7', slug: 'guia-completo-de-distribuicao', title: 'Guia Completo de Distribuição', category: 'E-books', priceCents: 3990, currency: 'BRL', gradientFrom: PALETTE[6][0], gradientTo: PALETTE[6][1] },
  { id: 'mock-8', slug: 'vocal-chain-preset', title: 'Vocal Chain Preset', category: 'Plugins', priceCents: 2490, currency: 'BRL', gradientFrom: PALETTE[7][0], gradientTo: PALETTE[7][1] },
  { id: 'mock-9', slug: 'funk-essentials-sample-pack', title: 'Funk Essentials Sample Pack', category: 'Sample Packs', priceCents: 4490, currency: 'BRL', gradientFrom: PALETTE[8][0], gradientTo: PALETTE[8][1] },
  { id: 'mock-10', slug: 'boom-bap-drum-kit', title: 'Boom Bap Drum Kit', category: 'Drum Kits', priceCents: 3490, currency: 'BRL', gradientFrom: PALETTE[9][0], gradientTo: PALETTE[9][1] },
  { id: 'mock-11', slug: 'serum-bass-bank', title: 'Serum Bass Bank', category: 'Presets', priceCents: 3290, currency: 'BRL', gradientFrom: PALETTE[10][0], gradientTo: PALETTE[10][1] },
  { id: 'mock-12', slug: 'lofi-chillhop-template', title: 'Lo-Fi Chillhop Template', category: 'Templates', priceCents: 4990, currency: 'BRL', gradientFrom: PALETTE[11][0], gradientTo: PALETTE[11][1] },
  { id: 'mock-13', slug: 'midi-melody-pack-vol-2', title: 'MIDI Melody Pack Vol.2', category: 'MIDI Packs', priceCents: 2790, currency: 'BRL', gradientFrom: PALETTE[0][0], gradientTo: PALETTE[1][1] },
  { id: 'mock-14', slug: 'contrato-de-distribuicao-digital', title: 'Contrato de Distribuição Digital', category: 'Contratos', priceCents: 2490, currency: 'BRL', gradientFrom: PALETTE[2][0], gradientTo: PALETTE[3][1] },
  { id: 'mock-15', slug: 'guia-de-marketing-para-artistas', title: 'Guia de Marketing para Artistas', category: 'E-books', priceCents: 3490, currency: 'BRL', gradientFrom: PALETTE[4][0], gradientTo: PALETTE[5][1] },
  { id: 'mock-16', slug: 'mixing-chain-plugin-presets', title: 'Mixing Chain Plugin Presets', category: 'Plugins', priceCents: 2990, currency: 'BRL', gradientFrom: PALETTE[6][0], gradientTo: PALETTE[7][1] },
  { id: 'mock-17', slug: 'afrobeat-sample-pack', title: 'Afrobeat Sample Pack', category: 'Sample Packs', priceCents: 4790, originalPriceCents: 6990, currency: 'BRL', gradientFrom: PALETTE[8][0], gradientTo: PALETTE[9][1] },
  { id: 'mock-18', slug: 'reggaeton-drum-kit', title: 'Reggaetón Drum Kit', category: 'Drum Kits', priceCents: 3790, originalPriceCents: 4990, currency: 'BRL', gradientFrom: PALETTE[10][0], gradientTo: PALETTE[11][1] },
  { id: 'mock-19', slug: 'analog-pads-preset-bank', title: 'Analog Pads Preset Bank', category: 'Presets', priceCents: 2690, currency: 'BRL', gradientFrom: PALETTE[0][0], gradientTo: PALETTE[2][1] },
  { id: 'mock-20', slug: 'edm-festival-template', title: 'EDM Festival Template', category: 'Templates', priceCents: 6490, originalPriceCents: 8990, currency: 'BRL', gradientFrom: PALETTE[1][0], gradientTo: PALETTE[4][1] },
  { id: 'mock-21', slug: 'midi-trap-melodies', title: 'MIDI Trap Melodies', category: 'MIDI Packs', priceCents: 2490, currency: 'BRL', gradientFrom: PALETTE[3][0], gradientTo: PALETTE[6][1] },
  { id: 'mock-22', slug: 'contrato-de-licenciamento-de-beat', title: 'Contrato de Licenciamento de Beat', category: 'Contratos', priceCents: 1790, currency: 'BRL', gradientFrom: PALETTE[5][0], gradientTo: PALETTE[8][1] },
  { id: 'mock-23', slug: 'guia-de-home-studio-em-apartamento', title: 'Guia de Home Studio em Apartamento', category: 'E-books', priceCents: 2990, currency: 'BRL', gradientFrom: PALETTE[7][0], gradientTo: PALETTE[10][1] },
  { id: 'mock-24', slug: 'mastering-chain-plugin-presets', title: 'Mastering Chain Plugin Presets', category: 'Plugins', priceCents: 3290, currency: 'BRL', gradientFrom: PALETTE[9][0], gradientTo: PALETTE[0][1] },
];

export const MOCK_PRODUCT_LICENSE: Record<string, ProductLicense> = {
  'trap-essentials-sample-pack': 'Padrão', 'drill-drum-kit-vol-1': 'Padrão', 'analog-lab-bank': 'Estendida',
  'future-bass-template': 'Padrão', 'midi-chord-pack': 'Padrão', 'contrato-de-participacao': 'Exclusiva',
  'guia-completo-de-distribuicao': 'Padrão', 'vocal-chain-preset': 'Estendida',
};

export const MOCK_PRODUCT_INCLUDED_FILES: Record<string, string[]> = {
  'trap-essentials-sample-pack': ['200 samples WAV 24-bit', '40 loops de melodia', '30 one-shots de 808', 'Licença de uso comercial (PDF)'],
  'drill-drum-kit-vol-1': ['60 kicks', '40 snares', '30 hi-hats', 'Projeto Ableton de exemplo'],
  'analog-lab-bank': ['80 presets para Analog Lab', 'Manual de instalação (PDF)'],
  'future-bass-template': ['Projeto Ableton Live completo', 'Stems separados', 'Lista de plugins usados'],
  'midi-chord-pack': ['120 progressões em MIDI', 'Compatível com qualquer DAW'],
  'contrato-de-participacao': ['Modelo de contrato (DOCX)', 'Modelo de contrato (PDF)', 'Guia de preenchimento'],
  'guia-completo-de-distribuicao': ['E-book em PDF (64 páginas)', 'Checklist de lançamento'],
  'vocal-chain-preset': ['Presets para Waves', 'Presets para FabFilter', 'Guia de configuração'],
};

export const MOCK_PRODUCT_DESCRIPTIONS: Record<string, string> = {
  'trap-essentials-sample-pack': 'Mais de 200 samples de trap prontos para usar: kicks, 808s, hi-hats e loops melódicos.',
  'drill-drum-kit-vol-1': 'Kit de bateria drill com kicks pesados, snares secos e percussões originais.',
  'analog-lab-bank': 'Banco de presets para Analog Lab com sons analógicos quentes para produções modernas.',
  'future-bass-template': 'Projeto completo de future bass para Ableton Live, pronto para customizar.',
  'midi-chord-pack': 'Progressões de acordes em MIDI para acelerar sua composição.',
  'contrato-de-participacao': 'Modelo de contrato de participação em obra musical, revisado para uso profissional.',
  'guia-completo-de-distribuicao': 'E-book com o passo a passo para distribuir sua música em todas as plataformas.',
  'vocal-chain-preset': 'Cadeia de efeitos de voz pronta para plugins populares de mixagem.',
  'funk-essentials-sample-pack': 'Samples essenciais de funk para produções autênticas e modernas.',
  'boom-bap-drum-kit': 'Kit de bateria boom bap com textura analógica e groove old-school.',
  'serum-bass-bank': 'Bancos de graves para Serum, prontos para trap, dubstep e bass music.',
  'lofi-chillhop-template': 'Template completo de lo-fi chillhop, do beat ao master.',
  'midi-melody-pack-vol-2': 'Segunda edição do pack de melodias em MIDI, com mais variedade de escalas.',
  'contrato-de-distribuicao-digital': 'Modelo de contrato para acordos de distribuição digital com selos e distribuidoras.',
  'guia-de-marketing-para-artistas': 'E-book com estratégias práticas de marketing para artistas independentes.',
  'mixing-chain-plugin-presets': 'Presets de cadeia de mixagem para os plugins mais usados do mercado.',
  'afrobeat-sample-pack': 'Samples autênticos de afrobeat, gravados com percussionistas reais.',
  'reggaeton-drum-kit': 'Kit de bateria reggaetón com o dembow clássico e variações modernas.',
  'analog-pads-preset-bank': 'Pads analógicos quentes para camas harmônicas e atmosferas.',
  'edm-festival-template': 'Template de EDM estilo festival, pronto para customizar o drop.',
  'midi-trap-melodies': 'Melodias de trap em MIDI para acelerar sua criação de beats.',
  'contrato-de-licenciamento-de-beat': 'Modelo de contrato para licenciamento de beats a outros artistas.',
  'guia-de-home-studio-em-apartamento': 'E-book com soluções práticas para montar estúdio em espaços pequenos.',
  'mastering-chain-plugin-presets': 'Presets de cadeia de masterização para finalizar suas faixas com qualidade.',
};

export const MOCK_PRODUCT_REVIEWS: Record<string, ProductReview[]> = {
  'trap-essentials-sample-pack': [
    { author: 'Lucas Beats', rating: 5, comment: 'Samples de altíssima qualidade, uso em quase toda produção.' },
    { author: 'Ana Oliveira', rating: 4, comment: 'Muito bom, só queria mais variações de hi-hat.' },
  ],
  'drill-drum-kit-vol-1': [{ author: 'Pedro Santos', rating: 5, comment: 'Os kicks são extremamente pesados, perfeito para drill.' }],
  'analog-lab-bank': [{ author: 'João Millen', rating: 5, comment: 'Sons quentes, uso direto em várias produções.' }],
};

export const MOCK_PRODUCT_QA: Record<string, ProductQA[]> = {
  'trap-essentials-sample-pack': [
    { question: 'Os samples são royalty-free?', answer: 'Sim, uso comercial liberado sem necessidade de créditos.', author: 'Equipe Vivendo da Música' },
    { question: 'Funciona em qualquer DAW?', answer: 'Sim, os arquivos são WAV, compatíveis com qualquer DAW.', author: 'Equipe Vivendo da Música' },
  ],
  'drill-drum-kit-vol-1': [{ question: 'Tem versão para Maschine?', answer: 'Os arquivos são WAV padrão, importáveis em qualquer sampler.', author: 'Equipe Vivendo da Música' }],
};

export const getProductBySlug = (slug: string) => MOCK_PRODUCTS.find((p) => p.slug === slug);
export const getRelatedProducts = (product: Product, limit = 4) =>
  MOCK_PRODUCTS.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, limit);
