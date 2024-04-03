import { LatLng } from '../coordinate/coordinate.type';

export interface FavoriteItem {
  name: string;
  address?: string;
  description?: string;
  latLng: LatLng;
}

export interface FailedFavoriteItem<T = any> extends FavoriteItem {
  message?: string;
  data?: T;
}
