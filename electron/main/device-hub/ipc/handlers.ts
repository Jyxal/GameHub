import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { DEVICE_HUB_EVENT_CHANNELS, DEVICE_HUB_INVOKE_CHANNELS, type DeviceHubInvokeChannel } from '../../../../src/shared/device-hub/channels.js';
import type { DeviceHubNotification, DeviceHubSnapshot } from '../../../../src/shared/device-hub/types.js';
import type { DeviceHubService } from '../device-hub-service.js';
import { isAllowedChannel, validateArgCount } from './validate.js';

const REFRESH_MIN_INTERVAL_MS = 2_000;

export interface DeviceHubIpc {
  sendSnapshot(snapshot: DeviceHubSnapshot): void;
  sendNotification(n: DeviceHubNotification): void;
  dispose(): void;
}

/** Yalnızca ana pencerenin ana çerçevesinden gelen istekler kabul edilir. */
function isTrustedSender(event: IpcMainInvokeEvent, win: BrowserWindow): boolean {
  if (win.isDestroyed()) return false;
  if (event.sender.id !== win.webContents.id) return false;
  const frame = event.senderFrame;
  return !!frame && frame.parent === null;
}

export function registerDeviceHubIpc(win: BrowserWindow, service: DeviceHubService): DeviceHubIpc {
  let lastRefresh = 0;
  let refreshInFlight: Promise<DeviceHubSnapshot> | null = null;

  const handlers: Record<DeviceHubInvokeChannel, (args: unknown[]) => Promise<unknown> | unknown> = {
    [DEVICE_HUB_INVOKE_CHANNELS.getDevices]: () => service.getSnapshot().devices,
    [DEVICE_HUB_INVOKE_CHANNELS.getSummary]: () => service.getSnapshot().summary,
    [DEVICE_HUB_INVOKE_CHANNELS.getSettings]: () => service.getSettings(),
    [DEVICE_HUB_INVOKE_CHANNELS.refresh]: () => {
      const now = Date.now();
      if (refreshInFlight) return refreshInFlight;
      if (now - lastRefresh < REFRESH_MIN_INTERVAL_MS) return service.getSnapshot();
      lastRefresh = now;
      refreshInFlight = service.refresh().finally(() => (refreshInFlight = null));
      return refreshInFlight;
    },
    [DEVICE_HUB_INVOKE_CHANNELS.updateSettings]: async (args) => {
      const r = await service.updateSettings(args[0]);
      if (!r.ok) throw new Error(r.error);
      return r.value;
    },
  };

  const registered: string[] = [];
  for (const channel of Object.keys(handlers)) {
    if (!isAllowedChannel(channel)) continue;
    ipcMain.handle(channel, async (event, ...args: unknown[]) => {
      if (!isTrustedSender(event, win)) throw new Error('Yetkisiz IPC isteği');
      const argError = validateArgCount(channel, args);
      if (argError) throw new Error(argError);
      return handlers[channel](args);
    });
    registered.push(channel);
  }

  const send = (channel: string, payload: unknown) => {
    if (win.isDestroyed() || win.webContents.isDestroyed()) return;
    win.webContents.send(channel, payload);
  };

  return {
    sendSnapshot: (s) => send(DEVICE_HUB_EVENT_CHANNELS.devicesChanged, s),
    sendNotification: (n) => send(DEVICE_HUB_EVENT_CHANNELS.notification, n),
    dispose: () => registered.forEach((c) => ipcMain.removeHandler(c)),
  };
}
