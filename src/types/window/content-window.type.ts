import { usleep } from '../../utils/timer';
import { AbstractSubWindow } from './abstract-sub-window.type';
import { MainWindow } from './main-window.type';

declare const CONTENT_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export class ContentWindow extends AbstractSubWindow {
  constructor(app: Electron.App, main: MainWindow) {
    super(app, main, CONTENT_WINDOW_PRELOAD_WEBPACK_ENTRY);
  }

  public async import() {
    const { context, source, progressView } = this.main;
    if (context.source.status !== 'PENDING') return;
    context.source.setWorking();
    progressView.updateContext();

    return source.import(this);
  }

  public export() {
    const { context, target, progressView } = this.main;
    if (context.target.status !== 'PENDING') return;
    context.target.setWorking();
    progressView.updateContext();

    return target.export(this, context, context.source.result);
  }

  async waitForPreload() {
    for (let i = 0; i < 10; i++) {
      const preloadIsLoaded = await this.view.webContents.executeJavaScript(
        //language=js
        `(__Bridge?.fetch ? true : false)`,
      );
      if (preloadIsLoaded) return true;
      await usleep(500);
    }
    return false;
  }

  private loadingElementId =
    '___LOADING_' +
    Math.random()
      .toString()
      .replace(/[^0-9]/g, '');

  async showLoading(msg?: string) {
    await this.view.webContents.executeJavaScript(
      //language=js
      `(function() {
        var div = document.querySelector('#${this.loadingElementId}');
        if (!div) {
          div = document.createElement('DIV');
          div.id = '${this.loadingElementId}';
          div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;' +
            'color:white;background-color:rgba(0,0,0,0.4);z-index:999999;' +
            'justify-content:center;align-items:center;text-align:center;font-size:32px;';
          document.body.append(div);
        }
        div.innerText = '${msg ?? '처리중'}';
        div.style.display = 'flex';
      })();`,
    );
  }

  async hideLoading() {
    await this.view.webContents.executeJavaScript(
      //language=js
      `(function() {
        var div = document.querySelector('#${this.loadingElementId}');
        if (div) div.style.display = 'none';
      })();`,
    );
  }
}
