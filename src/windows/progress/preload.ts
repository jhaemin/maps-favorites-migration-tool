import { contextBridge, ipcRenderer } from 'electron';
import 'reflect-metadata';

import { FailedFavoriteItem } from '../../types/favorite/favorite-item.type';
import { Context, ContextUpdateEvent } from '../../types/window/context.type';

let context: Context | null = null;
contextBridge.exposeInMainWorld('Progress', {
  set: (ctx: Context) => {
    context = ctx;
    window.dispatchEvent(new ContextUpdateEvent(ctx));
  },
  getContext: () => {
    return context;
  },
  resetContext: () => {
    ipcRenderer.send('reset');
  },
  import: () => {
    ipcRenderer.send('import');
  },
  export: () => {
    ipcRenderer.send('export');
  },
  view: (failedItem: FailedFavoriteItem) => {
    ipcRenderer.send('view', failedItem);
  },
});
