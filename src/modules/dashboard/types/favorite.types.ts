export type FavoriteTargetType = 'curso' | 'produto' | 'conteudo';

export interface Favorite {
  id: string;
  targetId: string;
  type: FavoriteTargetType;
  title: string;
  meta: string;
  href: string;
}
