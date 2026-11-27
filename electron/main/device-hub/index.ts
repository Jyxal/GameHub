// Device Hub — ana süreç giriş noktası.
// Kullanım (electron/main/index.ts):
//   import { registerDeviceHub } from './device-hub/index.js'
//   const deviceHub = registerDeviceHub(mainWindow)
//   app.on('before-quit', () => deviceHub.dispose())
import { app, Notification, powerMonitor, type BrowserWindow } from 'electron';
import type { DeviceHubNotification } from '../../../src/shared/device-hub/types.js';
import { DeviceHubService } from './device-hub-service.js';
import { registerDeviceHubIpc } from './ipc/handlers.js';
import { NotificationService } from './notifications/notification-service.js';
import { createDefaultRegistry, type ProviderRegistry } from './providers/registry.js';
import type { DeviceDiscoverySource } from './providers/types.js';
import { WindowsPnpProvider } from './providers/windows/windows-pnp-provider.js';
import { SettingsStore } from './settings/settings-store.js';
import { JsonFileStorage, type KeyValueStorage } from './settings/storage.js';

export interface DeviceHubOptions {
  /** Varsayılan: userData içinde JSON dosyaları */
  storage?: KeyValueStorage;
  /** Ek marka sağlayıcıları kaydetmek için */
  registry?: ProviderRegistry;
  /** Varsayılan: WindowsPnpProvider */
  source?: DeviceDiscoverySource;
  /** Pencere kapanınca otomatik dispose (varsayılan: true) */
  disposeOnWindowClose?: boolean;
  log?: (msg: string) => void;
}

export interface DeviceHubHandle {
  readonly service: DeviceHubService;
  dispose(): void;
}

let active: DeviceHubHandle | null = null;

export function registerDeviceHub(mainWindow: BrowserWindow, options: DeviceHubOptions = {}): DeviceHubHandle {
  if (active) active.dispose();
  const log = options.log ?? ((msg: string) => console.info(`[DeviceHub] ${msg}`));
  const storage = options.storage ?? new JsonFileStorage(app.getPath('userData'));
  const settings = new SettingsStore(storage);
  const registry = options.registry ?? createDefaultRegistry();
  const source = options.source ?? new WindowsPnpProvider(log);

  // IPC kanalı servis oluşturulmadan önce lazım; bildirim yönlendirmesi geç bağlanır.
  let forward: (n: DeviceHubNotification) => void = () => {};
  const notifications = new NotificationService(
    () => settings.get(),
    (title, body) => {
      if (Notification.isSupported()) new Notification({ title, body }).show();
    },
    (n) => forward(n),
  );
  const service = new DeviceHubService(source, registry, settings, notifications, log);
  const ipc = registerDeviceHubIpc(mainWindow, service);
  forward = (n) => ipc.sendNotification(n);
  service.on('changed', (s) => ipc.sendSnapshot(s));

  const onResume = () => void service.refresh();
  powerMonitor.on('resume', onResume);

  let disposed = false;
  const onClosed = () => handle.dispose();
  const handle: DeviceHubHandle = {
    service,
    dispose() {
      if (disposed) return;
      disposed = true;
      powerMonitor.off('resume', onResume);
      if (!mainWindow.isDestroyed()) mainWindow.off('closed', onClosed);
      ipc.dispose();
      service.dispose();
      if (active === handle) active = null;
    },
  };
  if (options.disposeOnWindowClose !== false) mainWindow.once('closed', onClosed);

  service.start().catch((err) => log(`Başlatma hatası: ${(err as Error).message}`));
  active = handle;
  return handle;
}

export type { DeviceProvider, DeviceDiscoverySource, BatteryReadResult } from './providers/types.js';
export { ProviderRegistry, createDefaultRegistry } from './providers/registry.js';
