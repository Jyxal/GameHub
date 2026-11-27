import type { BatteryReadResult, DeviceProvider } from '../types.js';
import type { MergedDevice } from '../windows/pnp-merge.js';

/**
 * HAVIT: cihaz tanıma. HAVIT kendi USB VID'ini kullanmaz (OEM yongaları; KB884L için
 * topluluk kaynağında 05ac:024f raporlanmış). KB884L kablolu bir klavyedir → pil yok (null).
 */
export class HavitProvider implements DeviceProvider {
  readonly id = 'havit';
  readonly displayName = 'HAVIT';
  readonly priority = 100;

  matches(device: MergedDevice): boolean {
    return (device.brand ?? '').toUpperCase() === 'HAVIT';
  }

  async readBattery(device: MergedDevice): Promise<BatteryReadResult | null> {
    if (device.connectionType === 'wired-usb' || /kb\s*884/i.test(device.model ?? '')) return { kind: 'not-applicable' };
    return {
      kind: 'unavailable',
      reason: 'HAVIT için doğrulanmış bir HID pil protokolü yok; Bluetooth bağlantısında Windows pil bilgisi denenir.',
    };
  }
}
