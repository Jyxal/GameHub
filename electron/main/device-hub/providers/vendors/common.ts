import type { BatteryContext, BluetoothBatteryReading } from '../types.js';
import type { MergedDevice } from '../windows/pnp-merge.js';

export const BT_BATTERY_SOURCE = 'Windows Bluetooth (DEVPKEY_Bluetooth_Battery)';

export function lookupBluetoothReading(device: MergedDevice, ctx: BatteryContext): BluetoothBatteryReading | null {
  if (device.containerId) {
    const r = ctx.bluetooth.get(device.containerId);
    if (r) return r;
  }
  if (device.bluetoothAddress) {
    const r = ctx.bluetooth.get(`bt:${device.bluetoothAddress}`);
    if (r) return r;
  }
  return null;
}

export function hasVendor(device: MergedDevice, vids: readonly string[], brand: string): boolean {
  return (device.vendorId !== null && vids.includes(device.vendorId)) || (device.brand ?? '').toLowerCase().startsWith(brand.toLowerCase());
}
