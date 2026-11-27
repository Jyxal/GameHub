import type { BatteryReadResult, DeviceProvider } from '../types.js';
import type { MergedDevice } from '../windows/pnp-merge.js';
import { hasVendor } from './common.js';

/**
 * Razer: cihaz tanıma. Razer, pil bilgisi için herkese açık bir API veya belgelenmiş
 * HID protokolü yayınlamaz (Razer Synapse kapalı kaynaktır, harici uygulamalara pil
 * verisi sunmaz). Bu nedenle 2.4 GHz HyperSpeed bağlantısında pil okunmaz;
 * Bluetooth bağlantısında Windows pil özelliği zincirde önce denenir.
 */
export class RazerProvider implements DeviceProvider {
  readonly id = 'razer';
  readonly displayName = 'Razer';
  readonly priority = 100;

  matches(device: MergedDevice): boolean {
    return hasVendor(device, ['1532'], 'razer');
  }

  enrich(device: MergedDevice): Partial<Pick<MergedDevice, 'model' | 'category' | 'hardwareInfo'>> {
    if (/hyperspeed/i.test(device.displayName) && device.connectionType === 'wireless-usb') {
      return { hardwareInfo: { ...device.hardwareInfo, 'Razer bağlantısı': 'HyperSpeed 2.4 GHz alıcı' } };
    }
    return {};
  }

  async readBattery(device: MergedDevice): Promise<BatteryReadResult | null> {
    if (device.connectionType === 'wired-usb') return { kind: 'not-applicable' };
    return {
      kind: 'unavailable',
      reason:
        'Razer bu cihaz için herkese açık bir pil API\'si veya doğrulanmış HID pil protokolü sunmuyor (Razer Synapse kapalı kaynak). Bluetooth bağlantısında Windows pil bilgisi denenir.',
    };
  }
}
