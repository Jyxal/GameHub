import type { MonitorMode } from '../../../../src/shared/device-hub/types.js';
import type { MergedDevice } from './windows/pnp-merge.js';

/** Windows'un Bluetooth için bildirdiği pil okuması (konteyner veya MAC adresine göre). */
export interface BluetoothBatteryReading {
  percentage: number | null;
  connected: boolean | null;
}

export interface BatteryContext {
  /** Anahtar: ContainerId (küçük harf, süslü parantezli) veya "bt:AA:BB:.." */
  bluetooth: ReadonlyMap<string, BluetoothBatteryReading>;
  now: number;
}

export type BatteryReadResult =
  | { kind: 'available'; percentage: number; isCharging: boolean | null; source: string }
  | { kind: 'unavailable'; reason: string; source?: string }
  | { kind: 'not-applicable' };

/**
 * Marka/üretici sağlayıcısı. Yeni marka eklemek için bu arayüzü uygulayıp
 * `ProviderRegistry.register()` ile kaydetmek yeterlidir.
 */
export interface DeviceProvider {
  readonly id: string;
  readonly displayName: string;
  /** Birden fazla sağlayıcı eşleşirse yüksek olan kazanır. */
  readonly priority: number;
  matches(device: MergedDevice): boolean;
  /** İsteğe bağlı: model/kategori/donanım bilgisi zenginleştirme (salt okunur, cihaza yazmaz). */
  enrich?(device: MergedDevice): Partial<Pick<MergedDevice, 'model' | 'category' | 'hardwareInfo'>>;
  /**
   * Pil okuma. `null` dönerse zincirdeki bir sonraki sağlayıcıya geçilir.
   * Değer asla tahmin edilmemelidir: okunamıyorsa `unavailable` + Türkçe neden.
   */
  readBattery(device: MergedDevice, ctx: BatteryContext): Promise<BatteryReadResult | null>;
}

/** Cihaz keşif kaynağı (Windows PnP; ileride .NET yardımcı süreci). */
export interface DeviceDiscoverySource {
  readonly id: string;
  isSupported(): boolean;
  start(): void;
  enumerate(): Promise<MergedDevice[]>;
  readBluetoothBatteries(): Promise<Map<string, BluetoothBatteryReading>>;
  /** Donanım değişikliği bildirimi (olay tabanlı). Abonelikten çıkış fonksiyonu döner. */
  onHardwareChange(listener: () => void): () => void;
  monitorMode(): MonitorMode;
  dispose(): void;
}
