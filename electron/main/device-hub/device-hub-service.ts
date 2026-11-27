import { EventEmitter } from 'node:events';
import { computeSummary } from '../../../src/shared/device-hub/summary.js';
import type { DeviceHubSettings, DeviceHubSnapshot, DeviceHubStatus, DeviceInfo } from '../../../src/shared/device-hub/types.js';
import { BatteryService } from './battery/battery-service.js';
import { diffDevices, type DeviceEvent } from './events/diff.js';
import { DeviceMonitor, type ScanReason } from './events/device-monitor.js';
import type { NotificationService } from './notifications/notification-service.js';
import type { ProviderRegistry } from './providers/registry.js';
import type { DeviceDiscoverySource } from './providers/types.js';
import type { MergedDevice } from './providers/windows/pnp-merge.js';
import type { SettingsStore } from './settings/settings-store.js';
import type { ValidationResult } from './settings/validate.js';

export interface DeviceHubServiceEvents {
  changed: [snapshot: DeviceHubSnapshot];
}

/** Durum yöneticisi: tarama, fark, pil, bildirim ve ayarları bir araya getirir. */
export class DeviceHubService extends EventEmitter<DeviceHubServiceEvents> {
  private devices = new Map<string, DeviceInfo>();
  private merged = new Map<string, MergedDevice>();
  private known = new Set<string>();
  private knownDirty = false;
  private initialDone = false;
  private scanning: Promise<void> | null = null;
  private rescanRequested = false;
  private lastSignature = '';
  private disposed = false;
  private readonly pendingConnectionNotifications = new Map<string, { type: DeviceEvent['type']; connected: boolean; timer: NodeJS.Timeout }>();
  private static readonly CONNECTION_STABILITY_MS = 10_000;
  private readonly monitor: DeviceMonitor;
  private readonly battery: BatteryService;
  private status: DeviceHubStatus;

  constructor(
    private readonly source: DeviceDiscoverySource,
    private readonly registry: ProviderRegistry,
    private readonly settings: SettingsStore,
    private readonly notifications: NotificationService,
    private readonly log: (msg: string) => void = () => {},
  ) {
    super();
    this.status = { platformSupported: source.isSupported(), monitorMode: 'unavailable', lastScanAt: null, lastBatteryPollAt: null, lastError: null };
    this.monitor = new DeviceMonitor(source, (r) => void this.scan(r), () => this.settings.get().devicePollIntervalMs, 5_000);
    this.battery = new BatteryService(source, registry, log);
  }

  async start(): Promise<void> {
    await this.settings.load();
    this.known = await this.settings.loadKnownDevices();
    if (!this.source.isSupported()) {
      this.status.lastError = 'Device Hub cihaz algılama yalnızca Windows\'ta desteklenir.';
      this.emitIfChanged(true);
      return;
    }
    this.source.start();
    await this.scan('initial');
    this.monitor.start();
    this.battery.start(() => this.settings.get().batteryPollIntervalMs, () => void this.pollBatteries());
  }

  getSettings(): DeviceHubSettings {
    return this.settings.get();
  }

  async updateSettings(input: unknown): Promise<ValidationResult<DeviceHubSettings>> {
    const before = this.settings.get();
    const r = await this.settings.update(input);
    if (r.ok) {
      if (r.value.devicePollIntervalMs !== before.devicePollIntervalMs) this.monitor.reschedule();
      if (r.value.batteryPollIntervalMs !== before.batteryPollIntervalMs) {
        this.battery.start(() => this.settings.get().batteryPollIntervalMs, () => void this.pollBatteries());
      }
      this.emitIfChanged(true);
    }
    return r;
  }

  getSnapshot(): DeviceHubSnapshot {
    const devices = [...this.devices.values()].sort((a, b) => {
      if (a.connectionStatus !== b.connectionStatus) return a.connectionStatus === 'connected' ? -1 : 1;
      return a.displayName.localeCompare(b.displayName, 'tr');
    });
    this.status.monitorMode = this.source.monitorMode();
    return { devices, summary: computeSummary(devices, this.settings.get().lowBatteryThreshold, { ...this.status }) };
  }

  /** Elle yenileme: tarama + tüm pillerin okunması. */
  async refresh(): Promise<DeviceHubSnapshot> {
    if (this.source.isSupported()) {
      await this.scan('manual');
      await this.pollBatteries();
    }
    return this.getSnapshot();
  }

  /** Tek seferde bir tarama; tarama sırasında gelen istekler bir kez daha tarama yapar. */
  scan(reason: ScanReason): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.scanning) {
      this.rescanRequested = true;
      return this.scanning;
    }
    this.scanning = (async () => {
      do {
        this.rescanRequested = false;
        await this.runScan(reason);
      } while (this.rescanRequested && !this.disposed);
    })().finally(() => {
      this.scanning = null;
    });
    return this.scanning;
  }

  private async runScan(reason: ScanReason): Promise<void> {
    const now = Date.now();
    let scanned: MergedDevice[];
    try {
      scanned = (await this.source.enumerate()).map((d) => this.registry.enrich(d));
      this.status.lastError = null;
    } catch (err) {
      this.status.lastError = `Cihaz taraması başarısız: ${(err as Error).message}`;
      this.log(this.status.lastError);
      this.emitIfChanged();
      return;
    }
    if (this.disposed) return;
    this.monitor.markScanned(now);
    this.status.lastScanAt = now;

    const initial = !this.initialDone;
    const { devices, events } = diffDevices(this.devices, scanned, { initial, known: this.known, now });
    this.devices = devices;
    for (const d of scanned) this.merged.set(d.id, d);
    this.initialDone = true;

    for (const d of scanned) {
      if (d.connectionStatus === 'connected' && !this.known.has(d.id)) {
        this.known.add(d.id);
        this.knownDirty = true;
      }
    }
    if (this.knownDirty) {
      this.knownDirty = false;
      this.settings.saveKnownDevices(this.known).catch((err) => this.log(`Bilinen cihazlar kaydedilemedi: ${(err as Error).message}`));
    }

    for (const ev of events) {
      const dev = this.devices.get(ev.deviceId);
      if (!dev) continue;
      this.scheduleStableConnectionNotification(ev, dev.connectionStatus === 'connected');
    }

    // Yeni bağlanan cihazların pili hemen okunur (diğerleri periyodik sorguda).
    const needBattery = scanned.filter((d) => d.connectionStatus === 'connected' && (initial || events.some((e) => e.deviceId === d.id && e.type !== 'disconnected') || this.devices.get(d.id)?.battery === null));
    if (needBattery.length > 0) await this.applyBatteries(needBattery);
    this.emitIfChanged();
    if (reason === 'initial') this.log(`İlk tarama: ${this.devices.size} cihaz`);
  }

  async pollBatteries(): Promise<void> {
    if (this.disposed || !this.source.isSupported()) return;
    const connected = [...this.merged.values()].filter((d) => this.devices.get(d.id)?.connectionStatus === 'connected');
    await this.applyBatteries(connected);
    this.status.lastBatteryPollAt = Date.now();
    // Periyodik sorguda "son güncelleme" zamanı da yenilensin diye her zaman gönderilir.
    this.emitIfChanged(true);
  }

  private async applyBatteries(list: readonly MergedDevice[]): Promise<void> {
    const results = await this.battery.read(list);
    for (const [id, battery] of results) {
      const dev = this.devices.get(id);
      if (!dev || dev.connectionStatus !== 'connected') continue;
      const updated: DeviceInfo = { ...dev, battery };
      this.devices.set(id, updated);
      this.notifications.handleBattery(updated, battery);
    }
  }

  /** Bağlantı durumu 10 saniye aynı kalmadan bağlantı bildirimi gönderme. */
  private scheduleStableConnectionNotification(ev: DeviceEvent, connected: boolean): void {
    const pending = this.pendingConnectionNotifications.get(ev.deviceId);
    if (pending) clearTimeout(pending.timer);
    this.pendingConnectionNotifications.delete(ev.deviceId);

    const timer = setTimeout(() => {
      this.pendingConnectionNotifications.delete(ev.deviceId);
      if (this.disposed) return;
      const device = this.devices.get(ev.deviceId);
      if (device?.connectionStatus === (connected ? 'connected' : 'disconnected')) {
        this.notifications.handleDeviceEvent(ev, device);
      }
    }, DeviceHubService.CONNECTION_STABILITY_MS);
    this.pendingConnectionNotifications.set(ev.deviceId, { type: ev.type, connected, timer });
  }

  /** Yalnızca anlamlı bir değişiklik varsa renderer'a gönderir (zaman damgaları hariç). */
  private emitIfChanged(force = false): void {
    const snapshot = this.getSnapshot();
    const signature = JSON.stringify(snapshot.devices, (k, v) => (k === 'lastUpdated' || k === 'lastSeenConnected' ? undefined : v)) + JSON.stringify({ ...snapshot.summary.status, lastScanAt: 0, lastBatteryPollAt: 0 });
    if (!force && signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.emit('changed', snapshot);
  }

  dispose(): void {
    this.disposed = true;
    for (const pending of this.pendingConnectionNotifications.values()) clearTimeout(pending.timer);
    this.pendingConnectionNotifications.clear();
    this.monitor.dispose();
    this.battery.stop();
    this.source.dispose();
    this.removeAllListeners();
  }
}
