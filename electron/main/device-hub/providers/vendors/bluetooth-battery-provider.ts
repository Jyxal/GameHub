import type { BatteryContext, BatteryReadResult, DeviceProvider } from '../types.js';
import type { MergedDevice } from '../windows/pnp-merge.js';
import { BT_BATTERY_SOURCE, lookupBluetoothReading } from './common.js';

/**
 * Genel Bluetooth pil sağlayıcısı: Windows'un PnP özelliği
 * DEVPKEY_Bluetooth_Battery ({104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2) değerini kullanır.
 * Yalnızca Windows'un gerçekten bildirdiği değer döner. Değer yoksa zincirde sonraki
 * sağlayıcıya (marka sağlayıcısı) geçilir; o da yoksa açık bir neden verilir.
 */
export class BluetoothBatteryProvider implements DeviceProvider {
  readonly id = 'bluetooth-battery';
  readonly displayName = 'Windows Bluetooth pil';
  readonly priority = 1000;

  matches(device: MergedDevice): boolean {
    return device.connectionType === 'bluetooth';
  }

  async readBattery(device: MergedDevice, ctx: BatteryContext): Promise<BatteryReadResult | null> {
    if (device.connectionType !== 'bluetooth') return null;
    const reading = lookupBluetoothReading(device, ctx);
    if (reading && reading.percentage !== null) {
      // Windows bu özellikte şarj durumunu bildirmez → isCharging: null
      return { kind: 'available', percentage: reading.percentage, isCharging: null, source: BT_BATTERY_SOURCE };
    }
    return null;
  }
}

export const BT_NO_VALUE_REASON =
  'Windows bu Bluetooth cihazı için pil değeri bildirmiyor (DEVPKEY_Bluetooth_Battery yok). Cihaz veya sürücü Bluetooth pil hizmetini desteklemiyor olabilir.';
