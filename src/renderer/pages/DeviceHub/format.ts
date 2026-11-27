import type {
  BatteryLevel,
  BrandConfidence,
  ConnectionStatus,
  ConnectionType,
  DeviceCategory,
  DeviceFilter,
  MonitorMode,
} from '../../../shared/device-hub/types';

export const CATEGORY_LABEL: Record<DeviceCategory, string> = {
  mouse: 'Fare',
  keyboard: 'Klavye',
  headset: 'Kulaklık',
  microphone: 'Mikrofon',
  gamepad: 'Oyun kumandası',
  joystick: 'Joystick',
  webcam: 'Web kamerası',
  speaker: 'Hoparlör',
  usb: 'USB cihaz',
  bluetooth: 'Bluetooth cihaz',
  'wireless-receiver': 'Kablosuz alıcı',
  other: 'Diğer',
};

export const CONNECTION_LABEL: Record<ConnectionType, string> = {
  'wired-usb': 'Kablolu USB',
  'wireless-usb': 'Kablosuz (USB alıcı)',
  bluetooth: 'Bluetooth',
  unknown: 'Bilinmiyor',
};

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: 'Bağlı',
  disconnected: 'Bağlı değil',
};

export const LEVEL_LABEL: Record<BatteryLevel, string> = {
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
  critical: 'Kritik',
  unknown: 'Bilinmiyor',
};

export const BRAND_CONFIDENCE_LABEL: Record<BrandConfidence, string> = {
  vid: 'USB üretici kimliği (VID)',
  community: 'Topluluk kaynaklı kimlik (doğrulanmadı)',
  name: 'Cihaz adından',
  unknown: 'Tanınmadı',
};

export const MONITOR_LABEL: Record<MonitorMode, string> = {
  event: 'Canlı (olay tabanlı)',
  polling: 'Periyodik tarama',
  unavailable: 'Kullanılamıyor',
};

export const FILTER_LABEL: Record<DeviceFilter, string> = {
  all: 'Tümü',
  mouse: 'Fare',
  keyboard: 'Klavye',
  headset: 'Kulaklık',
  gamepad: 'Kumanda',
  other: 'Diğer',
  wireless: 'Kablosuz',
  wired: 'Kablolu',
  connected: 'Bağlı',
  disconnected: 'Bağlı değil',
  'low-battery': 'Düşük pil',
};

const timeFmt = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'medium' });

export function formatTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  return timeFmt.format(new Date(ts));
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  return dateTimeFmt.format(new Date(ts));
}

export function formatRelative(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'az önce';
  if (s < 60) return `${s} sn önce`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} sa önce`;
  return formatDateTime(ts);
}

export function formatVidPid(vid: string | null, pid: string | null): string {
  if (!vid && !pid) return '—';
  return `${(vid ?? '????').toUpperCase()}:${(pid ?? '????').toUpperCase()}`;
}
