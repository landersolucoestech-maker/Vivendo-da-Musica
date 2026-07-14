export interface PremiumLibraryItem {
  id: string;
  title: string;
  type: 'Aula extra' | 'Material' | 'Template' | 'Preset' | 'Sample';
  category: string;
  description: string;
  isFavorite: boolean;
  isNew: boolean;
}
