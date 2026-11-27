import type {
  DeviceHubNotification,
  DeviceHubSettings,
  DeviceHubSettingsPatch,
  DeviceHubSnapshot,
  DeviceHubSummary,
  DeviceInfo,
} from './types.js';

/** Preload tarafından `window.deviceHub` olarak sunulan API. */
export interface DeviceHubApi {
  getDevices(): Promise<DeviceInfo[]>;
  getSummary(): Promise<DeviceHubSummary>;
  /** Anında yeniden tarama + pil okuması ister. */
  refresh(): Promise<DeviceHubSnapshot>;
  getSettings(): Promise<DeviceHubSettings>;
  updateSettings(patch: DeviceHubSettingsPatch): Promise<DeviceHubSettings>;
  /** Abonelikten çıkmak için dönen fonksiyonu çağırın. */
  onDevicesChanged(callback: (snapshot: DeviceHubSnapshot) => void): () => void;
  onNotification(callback: (notification: DeviceHubNotification) => void): () => void;
}
