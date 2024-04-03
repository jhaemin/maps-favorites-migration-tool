import { Coordinate, LatLng } from '../types/coordinate/coordinate.type';
import { FavoriteFolder } from '../types/favorite/favorite-folder.type';
import { FailedFavoriteItem } from '../types/favorite/favorite-item.type';
import { ContentWindow } from '../types/window/content-window.type';
import { Context } from '../types/window/context.type';

export abstract class AbstractDriver {
  // 다른 projection인 경우 override 할 것
  public async toLatLng(contentWindow: ContentWindow, coord: Coordinate): Promise<LatLng> {
    return {
      lat: coord.y,
      lng: coord.x,
    };
  }

  public abstract label(): string;
  public abstract import(contentWindow: ContentWindow): Promise<FavoriteFolder[]>;
  public abstract export(
    contentWindow: ContentWindow,
    context: Context,
    from: FavoriteFolder[],
  ): Promise<FavoriteFolder[]>;
  public abstract view<T>(contentWindow: ContentWindow, item: FailedFavoriteItem<T>): void;
}
