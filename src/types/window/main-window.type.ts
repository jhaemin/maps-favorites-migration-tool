import { plainToInstance } from 'class-transformer';
import { BrowserWindow, ipcMain } from 'electron';

import { frameWindowOptions, progressViewOptions } from '../../config';
import { AbstractDriver } from '../../drivers/abstract.driver';
import { FailedFavoriteItem } from '../favorite/favorite-item.type';
import { ContentWindow } from './content-window.type';
import { Context, MapService } from './context.type';
import { ProgressWindow } from './progress-window.type';

export class MainWindow extends BrowserWindow {
  public readonly progressView: ProgressWindow;
  public readonly contentView: ContentWindow;

  private _context: Context = Context.blank();
  private _source?: AbstractDriver;
  private _target?: AbstractDriver;

  constructor(private readonly app: Electron.App) {
    super({
      ...frameWindowOptions,
    });

    // Progress
    this.progressView = new ProgressWindow(app, this);
    // Content
    this.contentView = new ContentWindow(app, this);

    // resize event
    const resized = () => this.resized();
    this.on('resize', resized);
    this.contentView.view.webContents.on('dom-ready', resized);
    resized();

    ipcMain
      .on('import', async () => {
        try {
          const folders = await this.contentView.import();
          this._context.source.setComplete(`${folders.length}개의 폴더 가져옴`, folders);
          this.progressView.updateContext();
        } catch (e) {
          this._context.source.setError(e.toString());
          this.progressView.updateContext();
          console.log(e);
        }
      })

      .on('export', async () => {
        try {
          const folders = await this.contentView.export();
          this._context.target.setComplete(`${folders.length}개의 폴더 저장함`, folders);
          this.progressView.updateContext();
        } catch (e) {
          this._context.target.setError(e.toString());
          this.progressView.updateContext();
          console.log(e);
        }
      })

      .on('view', async (e, item: FailedFavoriteItem) => {
        this.target.view(this.contentView, item);
      })

      .on('reset', async () => {
        this._context.reset();
        this.progressView.updateContext();
      });
  }

  public get context(): Context {
    return this._context;
  }

  public get source(): AbstractDriver | undefined {
    return this._source;
  }

  public get target(): AbstractDriver | undefined {
    return this._target;
  }

  init(source: AbstractDriver, target: AbstractDriver) {
    this._source = source;
    this._target = target;

    this._context.source = new MapService(source);
    this._context.target = new MapService(target);

    this.progressView.init();
  }

  private resized() {
    const size = this.getSize();
    const bound = { y: 0, height: size[1] };

    this.progressView?.view.setBounds({
      ...bound,
      x: 0,
      width: progressViewOptions.width,
    });

    this.contentView?.view.setBounds({
      ...bound,
      x: progressViewOptions.width,
      width: size[0] - progressViewOptions.width,
    });
  }
}
