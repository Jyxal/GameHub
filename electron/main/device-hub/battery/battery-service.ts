import type { BatteryInfo } from '../../../../src/shared/device-hub/types.js';
import type { ProviderRegistry } from '../providers/registry.js';
import type { BluetoothBatteryReading, DeviceDiscoverySource } from '../providers/types.js';
import type { MergedDevice } from '../providers/windows/pnp-merge.js';
import { toBatteryInfo } from './battery-info.js';

/** Pil okuma ve periyodik sorgulama. Yalnızca bağlı cihazlar okunur. */
export class BatteryService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly source: DeviceDiscoverySource,
    private readonly registry: ProviderRegistry,
    private readonly log: (msg: string) => void = () => {},
  ) {}

  async read(devices: readonly MergedDevice[]): Promise<Map<string, BatteryInfo | null>> {
    const result = new Map<string, BatteryInfo | null>();
    const connected = devices.filter((d) => d.connectionStatus === 'connected');
    if (connected.length === 0) return result;
    let bluetooth: Map<string, BluetoothBatteryReading> = new Map();
    if (connected.some((d) => d.connectionType === 'bluetooth')) {
      try {
        bluetooth = await this.source.readBluetoothBatteries();
      } catch (err) {
        this.log(`Bluetooth pil okuması başarısız: ${(err as Error).message}`);
      }
    }
    const now = Date.now();
    for (const d of connected) {
      const r = await this.registry.readBattery(d, { bluetooth, now });
      result.set(d.id, toBatteryInfo(r, now));
    }
    return result;
  }

  start(getIntervalMs: () => number, onTick: () => void): void {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.timer = setTimeout(() => {
        onTick();
        loop();
      }, getIntervalMs());
    };
    this.stop(false);
    loop();
  }

  stop(final = true): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (final) this.running = false;
  }
}
