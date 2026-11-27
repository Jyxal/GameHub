// Device Hub IPC kanal adları. Main tarafı yalnızca bu listedeki kanalları dinler.

export const DEVICE_HUB_INVOKE_CHANNELS = {
  getDevices: 'device-hub:get-devices',
  getSummary: 'device-hub:get-summary',
  refresh: 'device-hub:refresh',
  getSettings: 'device-hub:get-settings',
  updateSettings: 'device-hub:update-settings',
} as const;

export const DEVICE_HUB_EVENT_CHANNELS = {
  devicesChanged: 'device-hub:devices-changed',
  notification: 'device-hub:notification',
} as const;

export type DeviceHubInvokeChannel =
  (typeof DEVICE_HUB_INVOKE_CHANNELS)[keyof typeof DEVICE_HUB_INVOKE_CHANNELS];
export type DeviceHubEventChannel =
  (typeof DEVICE_HUB_EVENT_CHANNELS)[keyof typeof DEVICE_HUB_EVENT_CHANNELS];

export const DEVICE_HUB_ALLOWED_INVOKE_CHANNELS: readonly DeviceHubInvokeChannel[] =
  Object.values(DEVICE_HUB_INVOKE_CHANNELS);
