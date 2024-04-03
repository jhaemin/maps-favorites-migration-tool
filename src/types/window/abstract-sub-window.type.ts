import { BrowserView } from 'electron';

import { MainWindow } from './main-window.type';

export abstract class AbstractSubWindow {
  public readonly view: BrowserView;
  constructor(
    protected readonly app: Electron.App,
    protected readonly main: MainWindow,
    preload?: string,
  ) {
    this.view = new BrowserView({ webPreferences: { preload } });
    main.addBrowserView(this.view);

    // this.view.webContents.openDevTools({ mode: 'detach' });
  }
}
