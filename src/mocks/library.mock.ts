import type { PremiumLibraryItem } from "@/modules/library/types/library.types";

export const MOCK_LIBRARY_TYPES = ['Todos', 'Aula extra', 'Material', 'Template', 'Preset', 'Sample'] as const;
export const MOCK_LIBRARY_CATEGORIES = [
  'Produção Musical', 'Mixagem', 'Masterização', 'Beatmaking', 'Home Studio',
  'Marketing Musical', 'Distribuição', 'IA para Música', 'Negócios da Música',
] as const;

interface SeedTopic {
  type: PremiumLibraryItem['type'];
  category: string;
  topics: string[];
}

const SEED_TOPICS: SeedTopic[] = [
  { type: 'Aula extra', category: 'Produção Musical', topics: ['Composição avançada', 'Arranjo de cordas', 'Produção colaborativa remota', 'Fluxo de trabalho criativo', 'Sound design para pop'] },
  { type: 'Aula extra', category: 'Mixagem', topics: ['Mixagem de bateria acústica', 'Mixagem vocal avançada', 'Automação criativa', 'Mix bus processing'] },
  { type: 'Aula extra', category: 'Masterização', topics: ['Masterização para vinil', 'Loudness para podcasts', 'Masterização em lote'] },
  { type: 'Aula extra', category: 'Beatmaking', topics: ['Beatmaking lo-fi', 'Drill patterns avançados', 'Construção de hooks'] },
  { type: 'Material', category: 'Produção Musical', topics: ['Checklist de pré-produção', 'Guia de gain staging', 'Mapa de frequências', 'Glossário de produção'] },
  { type: 'Material', category: 'Marketing Musical', topics: ['Calendário de lançamento', 'Planilha de métricas', 'Roteiro de reels'] },
  { type: 'Material', category: 'Negócios da Música', topics: ['Modelo de orçamento', 'Planilha de royalties'] },
  { type: 'Template', category: 'Produção Musical', topics: ['Template de Trap', 'Template de Pop', 'Template de Funk', 'Template de Lo-Fi'] },
  { type: 'Template', category: 'Beatmaking', topics: ['Template de Drill', 'Template de Boom Bap'] },
  { type: 'Template', category: 'Home Studio', topics: ['Template de gravação vocal', 'Template de podcast'] },
  { type: 'Preset', category: 'Mixagem', topics: ['Preset de compressão vocal', 'Preset de bus de bateria', 'Preset de saturação'] },
  { type: 'Preset', category: 'Masterização', topics: ['Preset de limitador', 'Preset de EQ de master'] },
  { type: 'Preset', category: 'Beatmaking', topics: ['Preset de Serum para trap', 'Preset de Analog Lab'] },
  { type: 'Sample', category: 'Beatmaking', topics: ['Pack de 808s', 'Pack de hi-hats', 'Pack de vocal chops', 'Pack de percussão'] },
  { type: 'Sample', category: 'Produção Musical', topics: ['Pack de pads atmosféricos', 'Pack de texturas'] },
  { type: 'Sample', category: 'IA para Música', topics: ['Pack de vozes sintéticas', 'Pack de loops gerados por IA'] },
  { type: 'Material', category: 'Distribuição', topics: ['Checklist de distribuição', 'Guia de metadados'] },
];

const buildLibrary = (): PremiumLibraryItem[] => {
  const items: PremiumLibraryItem[] = [];
  let counter = 1;
  for (const seed of SEED_TOPICS) {
    seed.topics.forEach((topic, i) => {
      // Each topic gets a "Vol." series of 2-3 to push volume into the hundreds.
      const volumes = (i % 3) + 2;
      for (let v = 1; v <= volumes; v++) {
        items.push({
          id: `lib-${counter}`,
          title: volumes > 1 ? `${topic} Vol.${v}` : topic,
          type: seed.type,
          category: seed.category,
          description: `${seed.type} sobre "${topic.toLowerCase()}" para assinantes Premium.`,
          isFavorite: counter % 11 === 0,
          isNew: counter % 17 === 0,
        });
        counter += 1;
      }
    });
  }
  return items;
};

export const MOCK_LIBRARY_ITEMS: PremiumLibraryItem[] = buildLibrary();
