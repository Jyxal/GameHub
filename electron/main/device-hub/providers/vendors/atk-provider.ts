import type { BatteryReadResult, DeviceProvider } from '../types.js';
import type { MergedDevice } from '../windows/pnp-merge.js';
import { hasVendor } from './common.js';

/**
 * ATK (ör. Dragonfly A9): cihaz tanıma. Topluluk projeleri (atk-control vb.) bazı HID
 * raporlarını tersine mühendislikle çözmüş olsa da bu protokol resmi olarak belgelenmemiş
 * ve bu projede doğrulanmamıştır; cihaza rapor gönderilmez (ayar değiştirme/firmware riski yok).
 */
export class AtkProvider implements DeviceProvider {
  readonly id = 'atk';
  readonly displayName = 'ATK';
  readonly priority = 100;

  matches(device: MergedDevice): boolean {
    return hasVendor(device, ['373b', '3554'], 'atk');
  }

  async readBattery(device: MergedDevice): Promise<BatteryReadResult | null> {
    if (device.connectionType === 'wired-usb') {
      // Kablolu modda fare şarj olur; ancak yüzde/şarj durumu okunamaz.
      return {
        kind: 'unavailable',
        reason: 'Kablolu modda ATK pil/şarj durumu okunamıyor: üretici HID pil protokolü doğrulanmadı.',
      };
    }
    return {
      kind: 'unavailable',
      reason: 'Üretici HID pil protokolü doğrulanmadı; Bluetooth bağlantısında Windows pil bilgisi denenir.',
    };
  }
}
