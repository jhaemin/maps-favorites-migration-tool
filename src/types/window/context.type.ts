import { Type } from 'class-transformer';

import { AbstractDriver } from '../../drivers/abstract.driver';
import { FavoriteFolder } from '../favorite/favorite-folder.type';
import { FailedFavoriteItem } from '../favorite/favorite-item.type';

export class MapService {
  public readonly name: string;
  private _status: 'PENDING' | 'WORKING' | 'COMPLETE';
  private _error?: string;
  private _progress: string[] = [];
  private _result?: FavoriteFolder[];
  private _failed?: FailedFavoriteItem[];

  constructor(driver?: AbstractDriver) {
    this.name = driver?.label();
    this._status = 'PENDING';
  }

  get status(): 'PENDING' | 'WORKING' | 'COMPLETE' {
    return this._status;
  }

  get error(): string | undefined {
    return this._error;
  }

  get progress(): string[] {
    return this._progress;
  }

  get result(): FavoriteFolder[] | undefined {
    return this._result;
  }

  get failed(): FailedFavoriteItem[] | undefined {
    return this._failed;
  }

  addFailedItem(item: FailedFavoriteItem) {
    this._failed = [...(this._failed ?? []), item];
  }

  setComplete(log: string, folders: FavoriteFolder[]) {
    this._status = 'COMPLETE';
    this._progress.push(log);
    this._result = folders;
    delete this._error;
  }

  reset() {
    this._status = 'PENDING';
    this._progress = [];
    delete this._result;
    delete this._error;
    delete this._failed;
  }

  setError(msg: string) {
    this.reset();
    this._error = msg;
  }

  setWorking() {
    this.reset();
    this._status = 'WORKING';
  }
}

export class Context {
  @Type(() => MapService)
  public source?: MapService;
  @Type(() => MapService)
  public target?: MapService;

  constructor(source?: MapService, target?: MapService) {
    this.source = source;
    this.target = target;
  }

  reset() {
    this.source?.reset();
    this.target?.reset();
  }

  static blank(): Context {
    return new Context();
  }
}

export class ContextUpdateEvent extends Event {
  constructor(public readonly context: Context) {
    super('context-update');
  }
}
