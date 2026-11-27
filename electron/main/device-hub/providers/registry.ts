import type { BatteryContext, BatteryReadResult, DeviceProvider } from './types.js';
import type { MergedDevice } from './windows/pnp-merge.js';
import { AtkProvider } from './vendors/atk-provider.js';
import { BluetoothBatteryProvider } from './vendors/bluetooth-battery-provider.js';
import { GenericProvider } from './vendors/generic-provider.js';
import { HavitProvider } from './vendors/havit-provider.js';
import { RazerProvider } from './vendors/razer-provider.js';

/**
 * Sağlayıcı kaydı. Pil zinciri: Bluetooth (Windows) → marka sağlayıcısı → genel.
 * Bir sağlayıcının hatası diğerlerini etkilemez.
 */
export class ProviderRegistry {
  private readonly vendors: DeviceProvider[] = [];
  private readonly bluetooth = new BluetoothBatteryProvider();
  private readonly fallback = new GenericProvider();

  register(provider: DeviceProvider): void {
    if (this.vendors.some((p) => p.id === provider.id)) throw new Error(`Sağlayıcı zaten kayıtlı: ${provider.id}`);
    this.vendors.push(provider);
    this.vendors.sort((a, b) => b.priority - a.priority);
  }

  list(): readonly DeviceProvider[] {
    return this.vendors;
  }

  resolveVendor(device: MergedDevice): DeviceProvider {
    for (const p of this.vendors) {
      try {
        if (p.matches(device)) return p;
      } catch {
        /* hatalı sağlayıcı atlanır */
      }
    }
    return this.fallback;
  }

  /** Eşleşen sağlayıcının zenginleştirmesini uygular ve providerId'yi ayarlar. */
  enrich(device: MergedDevice): MergedDevice {
    const vendor = this.resolveVendor(device);
    let extra: Partial<MergedDevice> = {};
    try {
      extra = vendor.enrich?.(device) ?? {};
    } catch {
      extra = {};
    }
    return { ...device, ...extra, providerId: vendor.id };
  }

  async readBattery(device: MergedDevice, ctx: BatteryContext): Promise<BatteryReadResult> {
    const chain: DeviceProvider[] = [this.bluetooth, this.resolveVendor(device), this.fallback];
    for (const p of chain) {
      try {
        const r = await p.readBattery(device, ctx);
        if (r) return r;
      } catch (err) {
        return { kind: 'unavailable', reason: `Pil okunurken hata oluştu (${p.displayName}): ${(err as Error).message}` };
      }
    }
    return { kind: 'not-applicable' };
  }
}

export function createDefaultRegistry(): ProviderRegistry {
  const r = new ProviderRegistry();
  r.register(new RazerProvider());
  r.register(new AtkProvider());
  r.register(new HavitProvider());
  return r;
}
