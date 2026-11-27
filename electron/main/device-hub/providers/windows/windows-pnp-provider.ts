import type { MonitorMode } from '../../../../../src/shared/device-hub/types.js';
import { sanitizePercentage } from '../../../../../src/shared/device-hub/battery-level.js';
import type { BluetoothBatteryReading, DeviceDiscoverySource } from '../types.js';
import { parseInstanceId } from './instance-id.js';
import { mergePnpEntries, type MergedDevice, type RawPnpEntry } from './pnp-merge.js';
import { PowerShellHost } from './powershell-host.js';

interface RawBatteryEntry {
  i: string;
  ct?: string | null;
  bb?: number | null;
  bc?: boolean | null;
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return [v]; // PowerShell tek öğeli diziyi nesneye çevirebilir
  return [];
}

export function buildBluetoothBatteryMap(raw: unknown): Map<string, BluetoothBatteryReading> {
  const map = new Map<string, BluetoothBatteryReading>();
  const put = (key: string, r: BluetoothBatteryReading) => {
    const prev = map.get(key);
    map.set(key, {
      percentage: r.percentage ?? prev?.percentage ?? null,
      connected: r.connected === true || prev?.connected === true ? true : r.connected ?? prev?.connected ?? null,
    });
  };
  for (const item of asArray(raw)) {
    if (!item || typeof item !== 'object') continue;
    const e = item as RawBatteryEntry;
    if (typeof e.i !== 'string') continue;
    const reading: BluetoothBatteryReading = {
      percentage: sanitizePercentage(e.bb ?? null),
      connected: typeof e.bc === 'boolean' ? e.bc : null,
    };
    if (typeof e.ct === 'string' && e.ct) {
      const c = e.ct.trim().toLowerCase();
      put(c.startsWith('{') ? c : `{${c}}`, reading);
    }
    const mac = parseInstanceId(e.i).bluetoothAddress;
    if (mac) put(`bt:${mac}`, reading);
  }
  return map;
}

/**
 * Windows PnP keşif kaynağı: tek bir uzun ömürlü PowerShell süreci üzerinden
 * Get-PnpDevice / Get-PnpDeviceProperty (yönetici izni gerekmez).
 */
export class WindowsPnpProvider implements DeviceDiscoverySource {
  readonly id = 'windows-pnp';
  private readonly host: PowerShellHost;
  private unavailable = false;

  constructor(log: (msg: string) => void = () => {}) {
    this.host = new PowerShellHost(log);
    this.host.on('unavailable', () => (this.unavailable = true));
    this.host.on('ready', () => (this.unavailable = false));
  }

  isSupported(): boolean {
    return process.platform === 'win32';
  }

  start(): void {
    if (this.isSupported()) this.host.start();
  }

  async enumerate(): Promise<MergedDevice[]> {
    if (!this.isSupported()) return [];
    const data = await this.host.request('scan');
    const entries = asArray(data).filter((e): e is RawPnpEntry => !!e && typeof (e as RawPnpEntry).i === 'string');
    return mergePnpEntries(entries, Date.now());
  }

  async readBluetoothBatteries(): Promise<Map<string, BluetoothBatteryReading>> {
    if (!this.isSupported()) return new Map();
    return buildBluetoothBatteryMap(await this.host.request('battery'));
  }

  onHardwareChange(listener: () => void): () => void {
    this.host.on('change', listener);
    return () => this.host.off('change', listener);
  }

  monitorMode(): MonitorMode {
    if (!this.isSupported() || this.unavailable) return 'unavailable';
    return this.host.watcherActive ? 'event' : 'polling';
  }

  dispose(): void {
    this.host.dispose();
  }
}
