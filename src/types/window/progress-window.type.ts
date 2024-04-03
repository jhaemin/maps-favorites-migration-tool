import { AbstractSubWindow } from './abstract-sub-window.type';
import { MainWindow } from './main-window.type';

declare const PROGRESS_WINDOW_WEBPACK_ENTRY: string;
declare const PROGRESS_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export class ProgressWindow extends AbstractSubWindow {
  private _ready = false;
  constructor(app: Electron.App, main: MainWindow) {
    super(app, main, PROGRESS_WINDOW_PRELOAD_WEBPACK_ENTRY);

    this.view.webContents.loadURL(PROGRESS_WINDOW_WEBPACK_ENTRY);
    this.view.webContents.on('dom-ready', () => {
      this._ready = true;
      this.init();
    });
  }

  public init() {
    if (!this._ready || !this.main.source || !this.main.target) return;

    this.updateContext();
  }

  public updateContext() {
    this.view.webContents.executeJavaScript(`Progress.set(${JSON.stringify(this.main.context)})`);
  }
}
