import type { BatteryReadResult, DeviceProvider } from '../types.js';
import type { MergedDevice } from '../windows/pnp-merge.js';
import { BT_NO_VALUE_REASON } from './bluetooth-battery-provider.js';

/** Zincirin sonu: hiçbir marka sağlayıcısı eşleşmediğinde kullanılır. */
export class GenericProvider implements DeviceProvider {
  readonly id = 'generic';
  readonly displayName = 'Genel';
  readonly priority = 0;

  matches(): boolean {
    return true;
  }

  async readBattery(device: MergedDevice): Promise<BatteryReadResult | null> {
    if (device.connectionType === 'bluetooth') return { kind: 'unavailable', reason: BT_NO_VALUE_REASON };
    if (device.connectionType === 'wireless-usb') {
      return {
        kind: 'unavailable',
        reason: 'Bu kablosuz alıcı için doğrulanmış bir pil okuma yöntemi yok (üretici HID protokolü bilinmiyor).',
      };
    }
    if (device.hasBatteryHint) {
      return { kind: 'unavailable', reason: 'Cihazın pili var ancak kablolu bağlantıda pil durumu okunamıyor.' };
    }
    return { kind: 'not-applicable' };
  }
}
