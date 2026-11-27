// Bildirim tekrarını önleme (saf mantık).

/** Aynı anahtar için bekleme süresi dolmadan ikinci bildirimi engeller. */
export class NotificationDeduper {
  private readonly lastSent = new Map<string, number>();

  constructor(private readonly maxEntries = 500) {}

  shouldSend(key: string, cooldownMs: number, now: number): boolean {
    const last = this.lastSent.get(key);
    if (last !== undefined && now - last < cooldownMs) return false;
    this.lastSent.delete(key);
    this.lastSent.set(key, now);
    if (this.lastSent.size > this.maxEntries) {
      const oldest = this.lastSent.keys().next().value;
      if (oldest !== undefined) this.lastSent.delete(oldest);
    }
    return true;
  }

  clear(key: string): void {
    this.lastSent.delete(key);
  }
}

export type BatteryAlert = 'low' | 'critical';

/**
 * Pil uyarısı "bölüm" takibi: eşik aşıldığında bir kez uyarır; pil eşik + histerezis
 * üstüne çıkana (veya şarja takılana) kadar aynı uyarı tekrar edilmez.
 */
export class BatteryAlertTracker {
  private readonly state = new Map<string, { low: boolean; critical: boolean }>();

  constructor(private readonly hysteresis = 5) {}

  evaluate(deviceId: string, percentage: number | null, isCharging: boolean | null, lowThreshold: number, criticalThreshold: number): BatteryAlert | null {
    const st = this.state.get(deviceId) ?? { low: false, critical: false };
    if (percentage === null) return null;
    if (isCharging === true) {
      this.state.set(deviceId, { low: false, critical: false });
      return null;
    }
    if (percentage > lowThreshold + this.hysteresis) st.low = false;
    if (percentage > criticalThreshold + this.hysteresis) st.critical = false;

    let alert: BatteryAlert | null = null;
    if (percentage <= criticalThreshold && !st.critical) {
      st.critical = true;
      st.low = true;
      alert = 'critical';
    } else if (percentage <= lowThreshold && !st.low) {
      st.low = true;
      alert = 'low';
    }
    this.state.set(deviceId, st);
    return alert;
  }

  forget(deviceId: string): void {
    this.state.delete(deviceId);
  }
}
