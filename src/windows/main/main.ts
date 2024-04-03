import { BrowserWindow, app } from 'electron';
import 'reflect-metadata';

import { KakaoPlaceDriver } from '../../drivers/kakao-place.driver';
import { NaverMapDriver } from '../../drivers/naver-map.driver';
import { MainWindow } from '../../types/window/main-window.type';

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: MainWindow | null = null;

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new MainWindow(app);

  mainWindow.init(new KakaoPlaceDriver(), new NaverMapDriver());
};

app
  .on('ready', createWindow)
  .on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  })
  .on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
