// Pil sonucu → BatteryInfo dönüşümü ve bayat (stale) işaretleme (saf fonksiyonlar).
import { mapBatteryLevel, sanitizePercentage } from '../../../../src/shared/device-hub/battery-level.js';
import type { BatteryInfo } from '../../../../src/shared/device-hub/types.js';
import type { BatteryReadResult } from '../providers/types.js';

export const DISCONNECTED_REASON = 'Cihaz bağlı değil; pil değeri güncel değil.';

export function toBatteryInfo(result: BatteryReadResult, now: number): BatteryInfo | null {
  switch (result.kind) {
    case 'not-applicable':
      return null;
    case 'available': {
      const pct = sanitizePercentage(result.percentage);
      if (pct === null) {
        return { percentage: null, level: 'unknown', isCharging: null, lastUpdated: now, dataAvailable: false, unavailableReason: 'Geçersiz pil değeri alındı (0–100 dışında).', source: result.source };
      }
      return { percentage: pct, level: mapBatteryLevel(pct), isCharging: result.isCharging, lastUpdated: now, dataAvailable: true, source: result.source };
    }
    case 'unavailable':
      return { percentage: null, level: 'unknown', isCharging: null, lastUpdated: now, dataAvailable: false, unavailableReason: result.reason, source: result.source };
  }
}

/** Bağlantısı kesilen cihazın pilini güncel değer gibi göstermemek için bayat işaretler. */
export function markBatteryStale(battery: BatteryInfo | null, now: number): BatteryInfo | null {
  if (!battery) return null;
  if (battery.stale) return battery;
  return {
    percentage: null,
    level: 'unknown',
    isCharging: null,
    lastUpdated: now,
    dataAvailable: false,
    unavailableReason: DISCONNECTED_REASON,
    source: battery.source,
    stale: true,
    lastKnownPercentage: battery.dataAvailable ? battery.percentage : null,
    lastKnownAt: battery.dataAvailable ? battery.lastUpdated : null,
  };
}
