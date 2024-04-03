import { Coordinate, LatLng } from '../types/coordinate/coordinate.type';
import { FavoriteFolder } from '../types/favorite/favorite-folder.type';
import { FailedFavoriteItem } from '../types/favorite/favorite-item.type';
import { ContentWindow } from '../types/window/content-window.type';
import { Context } from '../types/window/context.type';
import { AbstractDriver } from './abstract.driver';

export class KakaoPlaceDriver extends AbstractDriver {
  public label(): string {
    return '카카오맵';
  }

  public async toLatLng(contentWindow: ContentWindow, coord: Coordinate): Promise<LatLng> {
    const latLng: [number, number] = await contentWindow.view.webContents.executeJavaScript(
      //language=js
      `(function() {
                    var __tmp = (new kakao.maps.Coords(${coord.x}, ${coord.y})).toLatLng();
                    return [__tmp.getLat(), __tmp.getLng()];
                  })();`,
    );
    return {
      lat: latLng[0],
      lng: latLng[1],
    };
  }
  public import(contentWindow: ContentWindow): Promise<FavoriteFolder[]> {
    let proc: ((e: any) => void) | null = null;
    return new Promise<FavoriteFolder[]>((resolve, reject) => {
      proc = async (e) => {
        const { webContents } = contentWindow.view;

        // 로그인 이후인지 체크
        if (webContents.getURL().match(/https?:\/\/map\.kakao\.com\//)) {
          await contentWindow.waitForPreload();

          // 프로필 이미지로 로그인 여부 체크
          const isLogin = await webContents.executeJavaScript(
            //language=js
            `((document.querySelector('#btnProfile')?.clientHeight ?? 0) > 0)`,
          );
          if (!isLogin) return reject('로그인이 필요합니다.');

          await contentWindow.showLoading();

          // 폴더 가져오기
          const srcFolderIds: number[] = [];
          const folders: FavoriteFolder[] = await webContents
            .executeJavaScript(
              //language=js
              `__Bridge.fetch({ url: '/folder/list.json?sort=CREATE_AT' }).then(r => r.data.result)`,
            )
            .then((r: KakaoFavoriteFolder[]) => {
              srcFolderIds.push(...r.map((item) => item.folderId));
              return r.map((item) => ({
                name: item.title,
                items: [],
              }));
            });
          if (folders.length <= 0) return reject('가져올 데이터가 없습니다.');

          // 아이템 가져오기
          await webContents
            .executeJavaScript(
              //language=js
              `__Bridge.fetch({ url: '/favorite/list.json?folderIds%5B%5D=${srcFolderIds.join('&folderIds%5B%5D=')}&type=M' }).then(r => r.data.result)`,
            )
            .then(async (r: KakaoFavoriteItem[]) => {
              for (const src of r) {
                const folderIdx = srcFolderIds.indexOf(src.folderId);
                if (folderIdx < 0) continue;
                const folder = folders[folderIdx];

                // 폴더에 아이템 추가
                folder.items.push({
                  name: src.display1,
                  address: src.display2,
                  description: src.memo,
                  latLng: await this.toLatLng(contentWindow, src),
                });
              }
            });

          resolve(folders);
        }
      };

      const loginUrl =
        'https://accounts.kakao.com/login/simple/?continue=https%3A%2F%2Fmap.kakao.com&talk_login=#simpleLogin';
      contentWindow.view.webContents.on('dom-ready', proc).loadURL(loginUrl);
    }).finally(async () => {
      await contentWindow.hideLoading();
      if (proc) contentWindow.view.webContents.off('dom-ready', proc);
    });
  }

  public export(contentWindow: ContentWindow, context: Context, from: FavoriteFolder[]): Promise<FavoriteFolder[]> {
    throw new Error('Method not implemented.');
  }

  public view(contentWindow: ContentWindow, item: FailedFavoriteItem<any>): void {
    throw new Error('Method not implemented.');
  }
}

interface KakaoFavoriteFolder {
  folderId: number;
  mapUserId: string;
  title: string;
  favoriteCount: number;
  status: string;
  nickName: string;
  folderType: string;
  profileStatus: string;
  profileImage: string;
  cp: boolean;
}

interface KakaoFavoriteItem {
  color: string;
  createdAt: string;
  display1: string;
  display2: string;
  favoriteType: string;
  folderId: number;
  home: boolean;
  icon: string;
  key: string;
  memo: string;
  seq: number;
  updatedAt: string;
  x: number;
  y: number;
}
