// Marka tanıma tablosu (saf veri + fonksiyonlar).
//
// Güven seviyeleri:
//   'vid'       → USB-IF'e kayıtlı ve yaygın olarak bilinen üretici VID'leri (usb.ids).
//   'community' → topluluk projelerinden derlenen, bu projede DOĞRULANMAMIŞ kimlikler.
// Hiçbir PID uydurulmamıştır; kaynağı belirsiz PID'ler eklenmemiştir.

import type { BrandConfidence, ConnectionType, DeviceCategory } from '../../../../src/shared/device-hub/types.js';

export interface VendorEntry {
  brand: string;
  confidence: Extract<BrandConfidence, 'vid' | 'community'>;
  note?: string;
}

export const VENDOR_TABLE: Readonly<Record<string, VendorEntry>> = {
  '1532': { brand: 'Razer', confidence: 'vid' },
  '046d': { brand: 'Logitech', confidence: 'vid' },
  '1038': { brand: 'SteelSeries', confidence: 'vid' },
  '1b1c': { brand: 'Corsair', confidence: 'vid' },
  '0951': { brand: 'HyperX (Kingston)', confidence: 'vid' },
  '03f0': { brand: 'HyperX (HP)', confidence: 'vid', note: '03f0 HP VID\'idir; 2021 sonrası HyperX ürünleri bunu kullanır.' },
  '0b05': { brand: 'ASUS', confidence: 'vid' },
  '0db0': { brand: 'MSI', confidence: 'vid' },
  '1462': { brand: 'MSI', confidence: 'community', note: '1462 MSI\'ın PCI VID\'idir; USB çevre birimlerinde kullanımı doğrulanmadı.' },
  '045e': { brand: 'Microsoft (Xbox)', confidence: 'vid' },
  '054c': { brand: 'Sony', confidence: 'vid' },
  '057e': { brand: 'Nintendo', confidence: 'vid' },
  '28de': { brand: 'Valve', confidence: 'vid' },
  '044f': { brand: 'Thrustmaster', confidence: 'vid' },
  '1e7d': { brand: 'ROCCAT', confidence: 'vid' },
  '2516': { brand: 'Cooler Master', confidence: 'vid' },
  '0fd9': { brand: 'Elgato', confidence: 'vid' },
  '2dc8': { brand: '8BitDo', confidence: 'vid' },
  '05ac': { brand: 'Apple', confidence: 'vid' },
  '258a': { brand: 'SINOWEALTH (OEM: Glorious vb.)', confidence: 'community', note: 'OEM yonga üreticisi; marka cihaz adından çıkarılır.' },
  '373b': { brand: 'ATK', confidence: 'community', note: 'ATK/VXE topluluk sürücülerinde (atk-control vb.) görülen VID.' },
  '3554': { brand: 'ATK / VXE', confidence: 'community', note: 'Bazı eski ATK/VXE modellerinde raporlanan VID.' },
};

export interface ProductHint {
  vendorId: string;
  productId: string;
  brand: string;
  model: string;
  category?: DeviceCategory;
  connection?: Exclude<ConnectionType, 'unknown' | 'bluetooth'>;
  /** USB alıcısı (dongle) mı? */
  isReceiver?: boolean;
  /** Cihazın pili var mı (kablolu modda bile)? */
  hasBattery?: boolean;
  confidence: Extract<BrandConfidence, 'vid' | 'community'>;
  /** Eşleşmeyi geçersiz kılan ad anahtar kelimeleri (VID çakışmaları için) */
  unlessNameMatches?: RegExp;
  source: string;
}

/** Yalnızca kaynağı belirtilebilen ürün kimlikleri. Hepsi 'community' = doğrulanmadı. */
export const PRODUCT_HINTS: readonly ProductHint[] = [
  { vendorId: '373b', productId: '11b6', brand: 'ATK', model: 'A9 Ultimate (kablolu mod)', category: 'mouse', connection: 'wired-usb', hasBattery: true, confidence: 'community', source: 'github.com/NasirA1991/atk-control' },
  { vendorId: '373b', productId: '11d9', brand: 'ATK', model: 'A9 Ultimate 8K alıcı', category: 'mouse', connection: 'wireless-usb', isReceiver: true, hasBattery: true, confidence: 'community', source: 'github.com/NasirA1991/atk-control' },
  { vendorId: '373b', productId: '1264', brand: 'ATK', model: 'Dragonfly A9 Pro Max 2.0 (kablolu mod)', category: 'mouse', connection: 'wired-usb', hasBattery: true, confidence: 'community', source: 'github.com/NasirA1991/atk-control' },
  { vendorId: '373b', productId: '11dc', brand: 'ATK', model: 'Dragonfly A9 Pro Max 2.0 8K alıcı', category: 'mouse', connection: 'wireless-usb', isReceiver: true, hasBattery: true, confidence: 'community', source: 'github.com/NasirA1991/atk-control' },
  // KB884L'nin OEM tarafından Apple VID/PID'si (05ac:024f) ile geldiği topluluk kaynağında raporlanmış.
  // Gerçek Apple Aluminium klavyeler de bu kimliği kullandığından ad "apple" içeriyorsa eşleşme yapılmaz.
  { vendorId: '05ac', productId: '024f', brand: 'HAVIT', model: 'KB884L', category: 'keyboard', connection: 'wired-usb', hasBattery: false, confidence: 'community', unlessNameMatches: /apple/i, source: 'github.com/emirhannaneli/havit-console' },
  { vendorId: '046d', productId: 'c52b', brand: 'Logitech', model: 'Unifying alıcı', category: 'wireless-receiver', connection: 'wireless-usb', isReceiver: true, confidence: 'community', source: 'usb.ids' },
  { vendorId: '046d', productId: 'c534', brand: 'Logitech', model: 'Nano alıcı', category: 'wireless-receiver', connection: 'wireless-usb', isReceiver: true, confidence: 'community', source: 'usb.ids' },
  { vendorId: '046d', productId: 'c539', brand: 'Logitech', model: 'Lightspeed alıcı', category: 'wireless-receiver', connection: 'wireless-usb', isReceiver: true, confidence: 'community', source: 'usb.ids' },
  { vendorId: '046d', productId: 'c548', brand: 'Logitech', model: 'Bolt alıcı', category: 'wireless-receiver', connection: 'wireless-usb', isReceiver: true, confidence: 'community', source: 'usb.ids' },
];

export interface NameRule {
  pattern: RegExp;
  brand: string;
  model?: string;
  category?: DeviceCategory;
}

/** Ad anahtar kelimeleri — VID bilinmediğinde veya OEM yongası kullanıldığında. */
export const NAME_RULES: readonly NameRule[] = [
  { pattern: /blackshark\s*v3\s*x\s*hyperspeed/i, brand: 'Razer', model: 'BlackShark V3 X HyperSpeed', category: 'headset' },
  { pattern: /blackshark/i, brand: 'Razer', category: 'headset' },
  { pattern: /razer/i, brand: 'Razer' },
  { pattern: /dragonfly\s*a9|\batk[\s_-]*a9\b/i, brand: 'ATK', model: 'Dragonfly A9', category: 'mouse' },
  { pattern: /\batk\b/i, brand: 'ATK' },
  { pattern: /\bkb\s*884\s*l?\b/i, brand: 'HAVIT', model: 'KB884L', category: 'keyboard' },
  { pattern: /havit/i, brand: 'HAVIT' },
  { pattern: /logitech|\blogi\b/i, brand: 'Logitech' },
  { pattern: /steelseries|arctis/i, brand: 'SteelSeries' },
  { pattern: /corsair/i, brand: 'Corsair' },
  { pattern: /hyperx/i, brand: 'HyperX' },
  { pattern: /\brog\b|asus/i, brand: 'ASUS' },
  { pattern: /\bmsi\b/i, brand: 'MSI' },
  { pattern: /glorious/i, brand: 'Glorious' },
  { pattern: /xbox/i, brand: 'Microsoft (Xbox)', category: 'gamepad' },
  { pattern: /dualsense|dualshock|wireless controller/i, brand: 'Sony', category: 'gamepad' },
];

export interface BrandMatch {
  brand: string | null;
  model: string | null;
  confidence: BrandConfidence;
  category: DeviceCategory | null;
  hint: ProductHint | null;
  note: string | null;
}

export function findProductHint(vendorId: string | null, productId: string | null, names: readonly string[]): ProductHint | null {
  if (!vendorId || !productId) return null;
  const hint = PRODUCT_HINTS.find((h) => h.vendorId === vendorId && h.productId === productId) ?? null;
  if (hint?.unlessNameMatches && names.some((n) => hint.unlessNameMatches!.test(n))) return null;
  return hint;
}

export function matchBrand(vendorId: string | null, productId: string | null, names: readonly string[]): BrandMatch {
  const hint = findProductHint(vendorId, productId, names);
  if (hint) {
    return { brand: hint.brand, model: hint.model, confidence: hint.confidence, category: hint.category ?? null, hint, note: `Kaynak: ${hint.source} (doğrulanmadı)` };
  }
  const nameRule = NAME_RULES.find((r) => names.some((n) => r.pattern.test(n))) ?? null;
  const vendor = vendorId ? VENDOR_TABLE[vendorId] : undefined;
  if (vendor && vendor.confidence === 'vid') {
    // Kayıtlı VID markayı belirler; model ve kategori ad kuralından gelebilir.
    const sameBrand = nameRule && nameRule.brand.split(' ')[0] === vendor.brand.split(' ')[0];
    return {
      brand: vendor.brand,
      model: sameBrand ? nameRule!.model ?? null : null,
      confidence: 'vid',
      category: sameBrand ? nameRule!.category ?? null : null,
      hint: null,
      note: vendor.note ?? null,
    };
  }
  if (nameRule) {
    return { brand: nameRule.brand, model: nameRule.model ?? null, confidence: 'name', category: nameRule.category ?? null, hint: null, note: null };
  }
  if (vendor) {
    return { brand: vendor.brand, model: null, confidence: 'community', category: null, hint: null, note: vendor.note ?? null };
  }
  return { brand: null, model: null, confidence: 'unknown', category: null, hint: null, note: null };
}
