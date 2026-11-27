// IPC argüman doğrulama (saf).
import { DEVICE_HUB_ALLOWED_INVOKE_CHANNELS, DEVICE_HUB_INVOKE_CHANNELS, type DeviceHubInvokeChannel } from '../../../../src/shared/device-hub/channels.js';

export function isAllowedChannel(channel: unknown): channel is DeviceHubInvokeChannel {
  return typeof channel === 'string' && (DEVICE_HUB_ALLOWED_INVOKE_CHANNELS as readonly string[]).includes(channel);
}

/** Kanal başına beklenen argüman sayısı. */
export function validateArgCount(channel: DeviceHubInvokeChannel, args: readonly unknown[]): string | null {
  const expected = channel === DEVICE_HUB_INVOKE_CHANNELS.updateSettings ? 1 : 0;
  return args.length === expected ? null : `${channel}: ${expected} argüman bekleniyordu, ${args.length} alındı.`;
}
