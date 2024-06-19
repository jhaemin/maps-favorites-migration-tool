import { FavoriteFolder } from '../types/favorite/favorite-folder.type';
import { FailedFavoriteItem, FavoriteItem } from '../types/favorite/favorite-item.type';
import { ContentWindow } from '../types/window/content-window.type';
import { Context } from '../types/window/context.type';
import { AbstractDriver } from './abstract.driver';
import { usleep } from '../utils/timer';

export class GoogleMapDriver extends AbstractDriver {
  private static readonly entryURL = 'https://www.google.com/maps/@/data=!4m2!10m1!1e1?entry=ttu';

  public label(): string {
    return '구글맵';
  }

  public async import(contentWindow: ContentWindow): Promise<FavoriteFolder[]> {
    let proc: ((e: unknown) => void) | null = null;
    return new Promise<FavoriteFolder[]>((resolve, reject) => {
      proc = async (e) => {
        const { webContents } = contentWindow.view;

        // 프로필 이미지로 로그인 여부 체크
        await contentWindow.waitForPreload();
        await usleep(2000);
        const isLogin = await webContents.executeJavaScript(
          //language=js
          `Boolean(document.querySelector('img.gb_p'))`,
        );
        if (!isLogin) return reject('로그인이 필요합니다.');

        await contentWindow.showLoading();

        // 폴더 가져오기
        const folderResponse = await webContents.executeJavaScript(
          //language-js
          `__Bridge.fetch({
            method: 'GET',
            url: 'https://www.google.com/locationhistory/preview/mas?authuser=0&hl=ko&gl=kr&pb=!2m3!1s_jFyZufrE6LJ0-kPrue66As!7e81!15i17409!7m1!1i50!12m1!1i50!15m1!1i50!23m1!1i50!24m1!1i50!38m1!1i50',
            withCredentials: true,
          }).then(r => r.data);`,
        )
        const parsedFolderList: unknown[] = this.parseResponse(folderResponse)[29][0]
        const folderList = parsedFolderList.map((listItem: any[]) => ({
          id: listItem[0][1],
          name: listItem[1],
        })).filter(item => item.id); // 속한 아이템 개수가 0개면 id가 없기에, 필터링
        if (folderList.length <= 0) return reject('가져올 데이터가 없습니다.');

        const folders: FavoriteFolder[] = [];
        // 아이템 가져오기
        for (const folder of folderList) {
          const itemsResponse = await webContents.executeJavaScript(
            //language-js
            `__Bridge.fetch({
              method: 'GET',
              url: 'https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=ko&gl=kr&pb=!1m4!1s${folder.id}!2e2!3m1!1e1!2e2!3e2!4i500!6m3!1sYityZrG1NOvg2roPxLGTiAg!7e81!28e2!16b1',
            }).then(r => r.data);`,
          )
          const parsedItems: unknown[] = this.parseResponse(itemsResponse)[0][8] || [];
          const items = parsedItems.map((item: any[]) => {
            const favoriteItem: FavoriteItem = {
              name: item[2],
              description: item[3],
              latLng: { lat: item[1][5][2], lng: item[1][5][3] },
            }
            return favoriteItem;
          });
          folders.push({ name: folder.name, items });
        }
        resolve(folders.filter(folder => folder.items.length));
      };

      contentWindow.view.webContents.on('dom-ready', proc).loadURL(GoogleMapDriver.entryURL);
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

  private parseResponse(responseText: string) {
    return JSON.parse(responseText.replace(")]}'\n", ''))
  }
}