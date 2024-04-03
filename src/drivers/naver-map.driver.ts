import { findBestMatch } from 'string-similarity';

import { FavoriteFolder } from '../types/favorite/favorite-folder.type';
import { FailedFavoriteItem } from '../types/favorite/favorite-item.type';
import { ContentWindow } from '../types/window/content-window.type';
import { Context } from '../types/window/context.type';
import { usleep } from '../utils/timer';
import { AbstractDriver } from './abstract.driver';

export class NaverMapDriver extends AbstractDriver {
  public label(): string {
    return '네이버지도';
  }
  public import(contentWindow: ContentWindow): Promise<FavoriteFolder[]> {
    throw new Error('Method not implemented.');
  }

  public export(contentWindow: ContentWindow, context: Context, from: FavoriteFolder[]): Promise<FavoriteFolder[]> {
    let proc: ((e: any) => void) | null = null;
    return new Promise<FavoriteFolder[]>((resolve, reject) => {
      proc = async (e) => {
        const { webContents } = contentWindow.view;

        // 로그인 이후인지 체크
        if (webContents.getURL().match(/https?:\/\/map\.naver\.com\//)) {
          await contentWindow.waitForPreload();

          // 프로필 이미지로 로그인 여부 체크
          const isLogin = await webContents.executeJavaScript(
            //language=js
            `((document.querySelector('#gnb_my')?.clientHeight ?? 0) > 0)`,
          );
          if (!isLogin) return reject('로그인이 필요합니다.');

          await contentWindow.showLoading();

          const result: FavoriteFolder[] = [];
          for (const srcFolder of from) {
            // 폴더 생성
            const postData = { name: '[복사]' + srcFolder.name, colorCode: '1', isPublished: false };
            const folder: NaverFavoriteFolder = await webContents.executeJavaScript(
              //language=js
              `__Bridge.fetch({
                method: 'POST',
                url: 'https://pages.map.naver.com/save-widget/api/maps-bookmark/folders/new',
                withCredentials: true,
                data: ${JSON.stringify(postData)}
              }).then(r => r.data);`,
            );
            if (!folder) return reject(`${srcFolder.name} 폴더 생성 실패`);
            result.push({ name: folder.name, items: [] });

            for (const srcItem of srcFolder.items) {
              await usleep(500);

              // place 검색
              // https://map.naver.com/p/api/entry/addressInfo?lng=127.77770299999989&lat=36.16769449999979&address= -> place
              const addressInfo: NaverAddressInfo = await webContents.executeJavaScript(
                //language=js
                `__Bridge.fetch({ url: '/p/api/entry/addressInfo?lng=${srcItem.latLng.lng}&lat=${srcItem.latLng.lat}&address=${encodeURIComponent((srcItem.address ?? '') + ' ' + srcItem.name)}' }).then(r => r.data);`,
              );
              if ((addressInfo?.place?.count ?? 0) <= 0) continue;

              const score = findBestMatch(
                srcItem.name,
                addressInfo.place.list.map((p) => p.name),
              );
              const place = addressInfo.place.list[score.bestMatchIndex];

              //
              // 저장
              // https://pages.map.naver.com/save-widget/api/maps-bookmark/bookmarks/place?t=1711039585290
              // {"type":"place","name":"잠실종합운동장","address":"서울 송파구 올림픽로 25","px":127.073626,"py":37.5148021,"sid":"11622958","displayName":"","memo":"","url":"","folderIds":[103879073]}
              const postData: CreateNaverFavoriteItemDto = {
                type: 'place',
                name: srcItem.name,
                address: place.address,
                px: place.x,
                py: place.y,
                sid: place.id,
                displayName: '',
                memo: srcItem.description ?? '',
                url: '',
                folderIds: [folder.folderId],
              };

              const item: NaverFavoriteItem | NaverError = await webContents.executeJavaScript(
                //language=js
                `__Bridge.fetch({
                    method: 'POST',
                    url: 'https://pages.map.naver.com/save-widget/api/maps-bookmark/bookmarks/place',
                    withCredentials: true,
                    data: ${JSON.stringify(postData)}
                  })
                  .then(r => r.data)
                  .catch(e => e.response?.data);`,
              );
              if (!item || 'displayMessage' in item) {
                //error
                context.target.addFailedItem({
                  ...srcItem,
                  message: item && 'displayMessage' in item ? item.displayMessage : '',
                  data: postData,
                });
              }
            }

            await usleep(500);
          }

          resolve(result);
        }
      };

      const loginUrl = 'https://nid.naver.com/nidlogin.login';
      // referrer 추가해서 로그인 화면으로 이동
      contentWindow.view.webContents
        .on('dom-ready', proc)
        .loadURL(loginUrl, { httpReferrer: 'https://map.naver.com/' });
    }).finally(async () => {
      await contentWindow.hideLoading();
      if (proc) contentWindow.view.webContents.off('dom-ready', proc);
    });
  }

  public view<CreateNaverFavoriteItemDto>(contentWindow: ContentWindow, item: FailedFavoriteItem): void {
    contentWindow.view.webContents.loadURL(`https://map.naver.com/p/entry/place/${item.data.sid}`);
  }
}

interface NaverFavoriteFolder {
  folderId: number;
  name: string;
  memo: string | null;
  externalLink: string | null;
  userId: string;
  colorCode: string;
  iconId: string;
  markerColor: string;
  lastUseTime: number;
  creationTime: number;
  shouldOverlay: boolean;
  bookmarkCount: number;
  userIdNo: string;
  folderType: string;
  shareId: string;
  followCount: number;
  viewCount: number;
  publicationStatus: number;
  isDefaultFolder: boolean;
}

interface NaverFavoriteItem {
  bookmarkId: number;
  name: string;
  displayName: string;
  px: number;
  py: number;
  type: string;
  useTime: number;
  lastUpdateTime: number;
  creationTime: number;
  order: number;
  sid: string;
  address: string;
  memo: string;
  url: string;
  mcid: string;
  mcidName: string;
  rcode: string;
  cidPath: string[];
  available: boolean;
  folderMappings: {
    folderId: number;
    creationTime: number;
  }[];
  placeInfo: any;
  isIndoor: boolean;
}

interface CreateNaverFavoriteItemDto {
  type: 'place';
  name: string;
  address: string;
  px: number | string;
  py: number | string;
  sid: string;
  displayName: string;
  memo: string;
  url: string;
  folderIds: number[];
}

interface NaverError {
  statusCode: string;
  apiErrorCode: number;
  apiErrorMessage: string;
  displayMessage: string;
}

interface NaverAddressInfo {
  address: {
    isRoadAddress: boolean;
    isJibunAddress: boolean;
    address: string;
    shortAddress: string[];
    mappedAddress: string[];
    mappedShortAddress: string[][];
    zipCode: string;
    buildName: string;
    rCode: string;
    x: string;
    y: string;
  };
  place?: {
    count: number;
    totalCount: number;
    list: {
      index: string;
      rank: string;
      id: string;
      name: string;
      tel: string;
      isCallLink: boolean;
      virtualTel: string;
      virtualTelDisplay: string;
      ppc: string;
      category: string[];
      categoryPath: string[][];
      rcode: string;
      address: string;
      roadAddress: string;
      abbrAddress: string;
      shortAddress: string[];
      display: string;
      telDisplay: string;
      reviewCount: number;
      placeReviewCount: number;
      ktCallMd: string;
      coupon: string;
      thumUrl?: string;
      thumUrls: string[];
      type: string;
      isSite: string;
      posExact: string;
      x: string;
      y: string;
      itemLevel: string;
      isAdultBusiness: boolean;
      streetPanorama: InnerCoord;
      skyPanorama: InnerCoord;
      homePage: string;
      description: string;
      entranceCoords: {
        car: EntranceCoord[];
        walk: EntranceCoord[];
      };
      isPollingPlace: boolean;
      bizhourInfo: string;
      menuInfo?: string;
      hasCardBenefit: boolean;
      menuExist: string;
      hasNaverBooking: boolean;
      naverBookingUrl: string;
      hasNaverSmartOrder: boolean;
      hasBroadcastInfo: boolean;
      hasNPay: boolean;
      carWash: string;
      distance: string;
      marker: string;
      markerSelected: string;
      markerId: string;
      evChargerVendor?: string;
      evChargerPublic: string;
      evChargerParking: string;
    }[];
  };
}

interface InnerCoord {
  id: string;
  pan: string;
  tilt: string;
  lng: string;
  lat: string;
  fov: string;
}

interface EntranceCoord {
  rep: boolean;
  x: number;
  y: number;
}
