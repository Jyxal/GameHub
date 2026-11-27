import type { DeviceDiscoverySource } from '../providers/types.js';

export type ScanReason = 'initial' | 'event' | 'poll' | 'manual' | 'resume';
export type HardwareChangeKind = 'arrival' | 'removal' | 'other';

/**
 * Cihaz izleyici: olay tabanlı (Win32_DeviceChangeEvent) + debounced tetikleme,
 * yedek olarak periyodik tarama. Olay ile yakın zamanda tarama yapıldıysa
 * periyodik tarama atlanır (gereksiz CPU kullanımı önlenir).
 */
export class DeviceMonitor {
  private debounceTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private unsubscribe: (() => void) | null = null;
  private lastScanAt = 0;
  private running = false;

  constructor(
    private readonly source: DeviceDiscoverySource,
    private readonly requestScan: (reason: ScanReason, hardwareChange?: HardwareChangeKind) => void,
    private readonly getPollIntervalMs: () => number,
    private readonly debounceMs = 1_500,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.unsubscribe = this.source.onHardwareChange((kind) => this.onHardwareChange(kind));
    this.schedulePoll();
  }

  /** Tarama yapıldığında hizmet tarafından çağrılır. */
  markScanned(at: number): void {
    this.lastScanAt = at;
  }

  private onHardwareChange(kind: HardwareChangeKind): void {
    if (!this.running) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.requestScan('event', kind);
    }, this.debounceMs);
  }

  private schedulePoll(): void {
    if (!this.running) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    const interval = this.getPollIntervalMs();
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      if (Date.now() - this.lastScanAt >= interval / 2) this.requestScan('poll');
      this.schedulePoll();
    }, interval);
  }

  /** Ayar değişince aralığı yeniden uygular. */
  reschedule(): void {
    this.schedulePoll();
  }

  dispose(): void {
    this.running = false;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
