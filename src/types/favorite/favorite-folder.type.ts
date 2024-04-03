import { FavoriteItem } from './favorite-item.type';

export interface FavoriteFolder {
  name: string;
  description?: string;
  color?: string;
  items: FavoriteItem[];
}
