import axios, { AxiosRequestConfig } from 'axios';
import { contextBridge } from 'electron';
import 'reflect-metadata';

contextBridge.exposeInMainWorld('__Bridge', {
  fetch: <D = any>(config: AxiosRequestConfig<D>) => {
    return axios(config);
  },
});
