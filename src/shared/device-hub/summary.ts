import type {
  DeviceFilter,
  DeviceHubStatus,
  DeviceHubSummary,
  DeviceInfo,
} from './types.js';

export function isWireless(d: DeviceInfo): boolean {
  return d.connectionType === 'bluetooth' || d.connectionType === 'wireless-usb';
}

/** Güncel (stale olmayan) ve okunabilir pil yüzdesi; yoksa null. */
export function currentBatteryPercentage(d: DeviceInfo): number | null {
  const b = d.battery;
  if (!b || !b.dataAvailable || b.stale || d.connectionStatus !== 'connected') return null;
  return b.percentage;
}

export function isLowBattery(d: DeviceInfo, lowThreshold: number): boolean {
  const p = currentBatteryPercentage(d);
  return p !== null && p <= lowThreshold;
}

const MAIN_CATEGORIES = new Set(['mouse', 'keyboard', 'headset', 'gamepad']);

export function matchesFilter(d: DeviceInfo, filter: DeviceFilter, lowThreshold: number): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'mouse':
    case 'keyboard':
    case 'headset':
    case 'gamepad':
      return d.category === filter;
    case 'other':
      return !MAIN_CATEGORIES.has(d.category);
    case 'wireless':
      return isWireless(d);
    case 'wired':
      return d.connectionType === 'wired-usb';
    case 'connected':
      return d.connectionStatus === 'connected';
    case 'disconnected':
      return d.connectionStatus === 'disconnected';
    case 'low-battery':
      return isLowBattery(d, lowThreshold);
    default:
      return false;
  }
}

export function computeSummary(
  devices: readonly DeviceInfo[],
  lowThreshold: number,
  status: DeviceHubStatus,
): DeviceHubSummary {
  const low = devices.filter((d) => isLowBattery(d, lowThreshold));
  return {
    total: devices.length,
    connected: devices.filter((d) => d.connectionStatus === 'connected').length,
    wireless: devices.filter(isWireless).length,
    wired: devices.filter((d) => d.connectionType === 'wired-usb').length,
    withBattery: devices.filter((d) => currentBatteryPercentage(d) !== null).length,
    lowBattery: low.length,
    lowBatteryDevices: low.map((d) => ({
      id: d.id,
      displayName: d.displayName,
      percentage: currentBatteryPercentage(d) as number,
    })),
    status,
  };
}
