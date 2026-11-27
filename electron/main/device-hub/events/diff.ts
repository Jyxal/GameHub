// Cihaz listesi farkı → olaylar (saf fonksiyon).
import type { DeviceInfo } from '../../../../src/shared/device-hub/types.js';
import { markBatteryStale } from '../battery/battery-info.js';

export type DeviceEventType = 'new' | 'connected' | 'reconnected' | 'disconnected';

export interface DeviceEvent {
  type: DeviceEventType;
  deviceId: string;
}

export type ScannedDevice = Omit<DeviceInfo, 'battery' | 'firstSeen' | 'lastSeenConnected'>;

export interface DiffOptions {
  /** Oturumdaki ilk tarama: olay üretilmez (uygulama yeniden başlatıldığında bildirim seli olmaz). */
  initial: boolean;
  /** Daha önceki oturumlarda görülmüş cihaz kimlikleri */
  known: ReadonlySet<string>;
  now: number;
}

export interface DiffResult {
  devices: Map<string, DeviceInfo>;
  events: DeviceEvent[];
}

export function diffDevices(prev: ReadonlyMap<string, DeviceInfo>, scanned: readonly ScannedDevice[], opts: DiffOptions): DiffResult {
  const { now, initial, known } = opts;
  const devices = new Map<string, DeviceInfo>();
  const events: DeviceEvent[] = [];
  const seen = new Set<string>();

  for (const s of scanned) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    const before = prev.get(s.id);
    const connected = s.connectionStatus === 'connected';
    const battery = before ? (connected ? before.battery : markBatteryStale(before.battery, now)) : null;
    devices.set(s.id, {
      ...s,
      battery,
      firstSeen: before?.firstSeen ?? now,
      lastSeenConnected: connected ? now : before?.lastSeenConnected ?? 0,
      lastUpdated: now,
    });
    if (initial) continue;
    if (!before) {
      if (connected) events.push({ type: known.has(s.id) ? 'connected' : 'new', deviceId: s.id });
    } else if (before.connectionStatus === 'disconnected' && connected) {
      events.push({ type: 'reconnected', deviceId: s.id });
    } else if (before.connectionStatus === 'connected' && !connected) {
      events.push({ type: 'disconnected', deviceId: s.id });
    }
  }

  // Taramada görünmeyen cihazlar: bağlantı kesildi olarak tutulur, pil bayat işaretlenir.
  for (const [id, before] of prev) {
    if (seen.has(id)) continue;
    if (before.connectionStatus === 'connected') {
      devices.set(id, { ...before, connectionStatus: 'disconnected', battery: markBatteryStale(before.battery, now), lastUpdated: now });
      if (!initial) events.push({ type: 'disconnected', deviceId: id });
    } else {
      devices.set(id, before);
    }
  }
  return { devices, events };
}
