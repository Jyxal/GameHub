// Device Hub — preload köprüsü. Renderer'a yalnızca tipli, minimal bir API sunar;
// ipcRenderer veya Node API'leri asla doğrudan açılmaz.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { DeviceHubApi } from '../../../src/shared/device-hub/api.js';
import { DEVICE_HUB_EVENT_CHANNELS, DEVICE_HUB_INVOKE_CHANNELS } from '../../../src/shared/device-hub/channels.js';
import type { DeviceHubNotification, DeviceHubSettingsPatch, DeviceHubSnapshot } from '../../../src/shared/device-hub/types.js';

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  if (typeof callback !== 'function') throw new TypeError('callback bir fonksiyon olmalı');
  const listener = (_event: IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

export const deviceHubApi: DeviceHubApi = {
  getDevices: () => ipcRenderer.invoke(DEVICE_HUB_INVOKE_CHANNELS.getDevices),
  getSummary: () => ipcRenderer.invoke(DEVICE_HUB_INVOKE_CHANNELS.getSummary),
  refresh: () => ipcRenderer.invoke(DEVICE_HUB_INVOKE_CHANNELS.refresh),
  getSettings: () => ipcRenderer.invoke(DEVICE_HUB_INVOKE_CHANNELS.getSettings),
  updateSettings: (patch: DeviceHubSettingsPatch) => ipcRenderer.invoke(DEVICE_HUB_INVOKE_CHANNELS.updateSettings, patch),
  onDevicesChanged: (cb) => subscribe<DeviceHubSnapshot>(DEVICE_HUB_EVENT_CHANNELS.devicesChanged, cb),
  onNotification: (cb) => subscribe<DeviceHubNotification>(DEVICE_HUB_EVENT_CHANNELS.notification, cb),
};

/** contextIsolation açıkken `window.deviceHub` olarak sunar. */
export function exposeDeviceHubApi(): void {
  if (!process.contextIsolated) {
    console.warn('[DeviceHub] contextIsolation kapalı; API güvenlik nedeniyle sunulmadı.');
    return;
  }
  contextBridge.exposeInMainWorld('deviceHub', deviceHubApi);
}
