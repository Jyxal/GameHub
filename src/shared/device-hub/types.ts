// ─────────────────────────────────────────────────────────────────────────────
// Game Hub – Device Hub: Paylaşılan Tipler
// main, preload ve renderer tarafından kullanılır. Node.js / DOM API'si yok.
// ─────────────────────────────────────────────────────────────────────────────

export type DeviceCategory =
  | 'mouse'
  | 'keyboard'
  | 'headset'
  | 'microphone'
  | 'gamepad'
  | 'joystick'
  | 'webcam'
  | 'speaker'
  | 'usb'
  | 'bluetooth'
  | 'wireless-receiver'
  | 'other';

export type ConnectionType = 'wired-usb' | 'wireless-usb' | 'bluetooth' | 'unknown';

export type ConnectionStatus = 'connected' | 'disconnected';

/** Yüzdeye göre seviye. Şarj durumu ayrı tutulur (BatteryInfo.isCharging). */
export type BatteryLevel = 'high' | 'medium' | 'low' | 'critical' | 'unknown';

/**
 * Marka eşleşmesinin güvenilirliği:
 * - vid: USB-IF'e kayıtlı üretici VID'i ile eşleşti
 * - community: topluluk kaynaklı (doğrulanmamış) VID/PID tablosu ile eşleşti
 * - name: yalnızca cihaz adındaki anahtar kelime ile eşleşti
 * - unknown: eşleşme yok
 */
export type BrandConfidence = 'vid' | 'community' | 'name' | 'unknown';

// ─── Pil ─────────────────────────────────────────────────────────────────────

export interface BatteryInfo {
  /** 0–100 arası yüzde; veri alınamazsa null. Asla tahmin edilmez. */
  percentage: number | null;
  level: BatteryLevel;
  /** Şarj durumu; bilinmiyorsa null */
  isCharging: boolean | null;
  /** Son okuma denemesi zamanı (Unix ms) */
  lastUpdated: number;
  dataAvailable: boolean;
  /** dataAvailable=false ise neden alınamadığını açıklar (Türkçe) */
  unavailableReason?: string;
  /** Pil verisinin kaynağı (ör. "Windows Bluetooth (DEVPKEY_Bluetooth_Battery)") */
  source?: string;
  /** Cihaz bağlı değilse true: değer güncel değildir */
  stale?: boolean;
  /** stale=true iken son bilinen yüzde (yalnızca bilgi amaçlı) */
  lastKnownPercentage?: number | null;
  /** stale=true iken son bilinen değerin zamanı */
  lastKnownAt?: number | null;
}

// ─── Cihaz ───────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  /** Kararlı benzersiz kimlik (gruplama anahtarının hash'i) */
  id: string;
  brand: string | null;
  brandConfidence: BrandConfidence;
  model: string | null;
  /** Windows FriendlyName / USB ürün dizgesi veya türetilmiş görüntüleme adı */
  displayName: string;
  manufacturer: string | null;
  /** USB Vendor ID (küçük harf hex, örn. "1532") */
  vendorId: string | null;
  /** USB Product ID (küçük harf hex) */
  productId: string | null;
  serialNumber: string | null;
  category: DeviceCategory;
  connectionType: ConnectionType;
  connectionStatus: ConnectionStatus;
  /**
   * null        = pil göstergesi uygulanmaz (ör. kablolu klavye)
   * BatteryInfo = pil okunmaya çalışıldı (dataAvailable ile sonucu belirtilir)
   */
  battery: BatteryInfo | null;
  /** Eşleşen sağlayıcı kimliği (ör. "razer", "atk", "havit", "generic") */
  providerId: string;
  hardwareInfo: Record<string, string>;
  /** Bu oturumda ilk görülme zamanı (Unix ms) */
  firstSeen: number;
  /** Son durum güncelleme zamanı (Unix ms) */
  lastUpdated: number;
  /** Son bağlı görülme zamanı (Unix ms) */
  lastSeenConnected: number;
}

// ─── Özet ────────────────────────────────────────────────────────────────────

export type MonitorMode = 'event' | 'polling' | 'unavailable';

export interface DeviceHubStatus {
  platformSupported: boolean;
  monitorMode: MonitorMode;
  lastScanAt: number | null;
  lastBatteryPollAt: number | null;
  lastError: string | null;
}

export interface DeviceHubSummary {
  total: number;
  connected: number;
  wireless: number;
  wired: number;
  withBattery: number;
  lowBattery: number;
  lowBatteryDevices: Array<{ id: string; displayName: string; percentage: number }>;
  status: DeviceHubStatus;
}

export interface DeviceHubSnapshot {
  devices: DeviceInfo[];
  summary: DeviceHubSummary;
}

// ─── Bildirimler ─────────────────────────────────────────────────────────────

export type DeviceHubNotificationType =
  | 'low-battery'
  | 'critical-battery'
  | 'disconnected'
  | 'reconnected'
  | 'new-device'
  | 'battery-unavailable';

export interface DeviceHubNotification {
  type: DeviceHubNotificationType;
  deviceId: string;
  title: string;
  body: string;
  timestamp: number;
}

// ─── Ayarlar ─────────────────────────────────────────────────────────────────

export interface DeviceHubNotificationSettings {
  lowBattery: boolean;
  criticalBattery: boolean;
  deviceDisconnected: boolean;
  deviceReconnected: boolean;
  newDevice: boolean;
  batteryUnavailable: boolean;
}

export interface DeviceHubSettings {
  /** Düşük pil bildirim eşiği % (yüzde <= eşik). Varsayılan: 20 */
  lowBatteryThreshold: number;
  /** Kritik pil bildirim eşiği % (yüzde <= eşik). Varsayılan: 10 */
  criticalBatteryThreshold: number;
  /** Pil sorgulama aralığı ms. Varsayılan: 60_000 */
  batteryPollIntervalMs: number;
  /** Cihaz listesi yedek tarama aralığı ms. Varsayılan: 8_000 */
  devicePollIntervalMs: number;
  notifications: DeviceHubNotificationSettings;
}

export type DeviceHubSettingsPatch = Partial<Omit<DeviceHubSettings, 'notifications'>> & {
  notifications?: Partial<DeviceHubNotificationSettings>;
};

export const DEFAULT_DEVICE_HUB_SETTINGS: DeviceHubSettings = {
  lowBatteryThreshold: 20,
  criticalBatteryThreshold: 10,
  batteryPollIntervalMs: 60_000,
  devicePollIntervalMs: 8_000,
  notifications: {
    lowBattery: true,
    criticalBattery: true,
    deviceDisconnected: true,
    deviceReconnected: true,
    newDevice: true,
    batteryUnavailable: false,
  },
};

export const SETTINGS_LIMITS = {
  thresholdMin: 1,
  thresholdMax: 100,
  batteryPollMinMs: 15_000,
  batteryPollMaxMs: 30 * 60_000,
  devicePollMinMs: 3_000,
  devicePollMaxMs: 5 * 60_000,
} as const;

// ─── Filtre ──────────────────────────────────────────────────────────────────

export type DeviceFilter =
  | 'all'
  | 'mouse'
  | 'keyboard'
  | 'headset'
  | 'gamepad'
  | 'other'
  | 'wireless'
  | 'wired'
  | 'connected'
  | 'disconnected'
  | 'low-battery';

export const DEVICE_FILTERS: readonly DeviceFilter[] = [
  'all',
  'mouse',
  'keyboard',
  'headset',
  'gamepad',
  'other',
  'wireless',
  'wired',
  'connected',
  'disconnected',
  'low-battery',
];
