// Ayar doğrulama (saf fonksiyonlar). Renderer'dan gelen her veri güvenilmez kabul edilir.
import {
  DEFAULT_DEVICE_HUB_SETTINGS,
  SETTINGS_LIMITS,
  type DeviceHubNotificationSettings,
  type DeviceHubSettings,
  type DeviceHubSettingsPatch,
} from '../../../../src/shared/device-hub/types.js';

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const NUMBER_KEYS = ['lowBatteryThreshold', 'criticalBatteryThreshold', 'batteryPollIntervalMs', 'devicePollIntervalMs'] as const;
const NOTIFICATION_KEYS = Object.keys(DEFAULT_DEVICE_HUB_SETTINGS.notifications) as Array<keyof DeviceHubNotificationSettings>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function rangeFor(key: (typeof NUMBER_KEYS)[number]): [number, number] {
  switch (key) {
    case 'lowBatteryThreshold':
    case 'criticalBatteryThreshold':
      return [SETTINGS_LIMITS.thresholdMin, SETTINGS_LIMITS.thresholdMax];
    case 'batteryPollIntervalMs':
      return [SETTINGS_LIMITS.batteryPollMinMs, SETTINGS_LIMITS.batteryPollMaxMs];
    case 'devicePollIntervalMs':
      return [SETTINGS_LIMITS.devicePollMinMs, SETTINGS_LIMITS.devicePollMaxMs];
  }
}

export function validateSettingsPatch(input: unknown): ValidationResult<DeviceHubSettingsPatch> {
  if (!isPlainObject(input)) return { ok: false, error: 'Ayarlar bir nesne olmalı.' };
  const patch: DeviceHubSettingsPatch = {};
  for (const [key, value] of Object.entries(input)) {
    if ((NUMBER_KEYS as readonly string[]).includes(key)) {
      const k = key as (typeof NUMBER_KEYS)[number];
      const [min, max] = rangeFor(k);
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
        return { ok: false, error: `${key} ${min}–${max} aralığında tam sayı olmalı.` };
      }
      patch[k] = value;
    } else if (key === 'notifications') {
      if (!isPlainObject(value)) return { ok: false, error: 'notifications bir nesne olmalı.' };
      const n: Partial<DeviceHubNotificationSettings> = {};
      for (const [nk, nv] of Object.entries(value)) {
        if (!(NOTIFICATION_KEYS as string[]).includes(nk)) return { ok: false, error: `Bilinmeyen bildirim ayarı: ${nk}` };
        if (typeof nv !== 'boolean') return { ok: false, error: `${nk} true/false olmalı.` };
        n[nk as keyof DeviceHubNotificationSettings] = nv;
      }
      patch.notifications = n;
    } else {
      return { ok: false, error: `Bilinmeyen ayar: ${key}` };
    }
  }
  return { ok: true, value: patch };
}

export function applySettingsPatch(current: DeviceHubSettings, patch: DeviceHubSettingsPatch): ValidationResult<DeviceHubSettings> {
  const next: DeviceHubSettings = {
    ...current,
    ...patch,
    notifications: { ...current.notifications, ...(patch.notifications ?? {}) },
  };
  if (next.criticalBatteryThreshold >= next.lowBatteryThreshold) {
    return { ok: false, error: 'Kritik pil eşiği, düşük pil eşiğinden küçük olmalı.' };
  }
  return { ok: true, value: next };
}

/** Diskten okunan (bozuk olabilecek) veriyi alan alan doğrular; geçersiz alanlar varsayılana döner. */
export function normalizeStoredSettings(raw: unknown): DeviceHubSettings {
  const base: DeviceHubSettings = structuredCloneSettings(DEFAULT_DEVICE_HUB_SETTINGS);
  if (!isPlainObject(raw)) return base;
  for (const key of NUMBER_KEYS) {
    const r = validateSettingsPatch({ [key]: raw[key] });
    if (r.ok && r.value[key] !== undefined) base[key] = r.value[key]!;
  }
  if (isPlainObject(raw.notifications)) {
    for (const nk of NOTIFICATION_KEYS) {
      const v = raw.notifications[nk];
      if (typeof v === 'boolean') base.notifications[nk] = v;
    }
  }
  if (base.criticalBatteryThreshold >= base.lowBatteryThreshold) {
    base.lowBatteryThreshold = DEFAULT_DEVICE_HUB_SETTINGS.lowBatteryThreshold;
    base.criticalBatteryThreshold = DEFAULT_DEVICE_HUB_SETTINGS.criticalBatteryThreshold;
  }
  return base;
}

function structuredCloneSettings(s: DeviceHubSettings): DeviceHubSettings {
  return { ...s, notifications: { ...s.notifications } };
}
