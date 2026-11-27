import type { BatteryLevel } from './types.js';

/**
 * Yüzde → seviye eşlemesi (sabit):
 * 80–100 high, 50–79 medium, 20–49 low, 1–19 critical, diğer her şey unknown.
 * Şarj durumu bu fonksiyonu etkilemez.
 */
export function mapBatteryLevel(percentage: number | null | undefined): BatteryLevel {
  if (typeof percentage !== 'number' || !Number.isFinite(percentage)) return 'unknown';
  if (!Number.isInteger(percentage)) percentage = Math.round(percentage);
  if (percentage > 100 || percentage < 1) return 'unknown';
  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'medium';
  if (percentage >= 20) return 'low';
  return 'critical';
}

/** Ham değeri 0–100 tam sayıya doğrular; geçersizse null (asla tahmin yok). */
export function sanitizePercentage(raw: unknown): number | null {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= 0 && r <= 100 ? r : null;
}
