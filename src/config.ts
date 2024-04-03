import { BrowserWindowConstructorOptions } from 'electron';

export const frameWindowOptions: BrowserWindowConstructorOptions = {
  width: 1400,
  height: 1000,
  minWidth: 800,
  minHeight: 600,
  resizable: true,
  backgroundColor: '#eee',
};

export const progressViewOptions = {
  width: 300,
};
