// Cihaz kategorisi sezgisel kuralları (saf fonksiyon).
import type { DeviceCategory } from '../../../../../src/shared/device-hub/types.js';
import type { ParsedInstanceId } from './instance-id.js';

export interface CategorizeNode {
  pnpClass: string;
  name: string;
  parsed: ParsedInstanceId;
}

/** Windows'un genel (bilgi taşımayan) cihaz adları — İngilizce ve Türkçe. */
const GENERIC_NAME =
  /^(hid[- ]?(compliant|uyumlu)|hid klavye|hid keyboard|usb (input|giriş|composite|bileşik)|usb root hub|generic usb|genel usb|usb audio device|usb ses aygıtı|bluetooth (le )?(generic|genel)|microsoft bluetooth|standard system devices|(input|giriş) (device|aygıtı)|(keyboard|mouse|klavye|fare)$)/i;

export function isGenericName(name: string): boolean {
  const n = name.trim();
  return n === '' || GENERIC_NAME.test(n);
}

interface KeywordRule {
  re: RegExp;
  category: DeviceCategory;
}

// Sıra önemlidir: "Headset Microphone" → headset, "Keyboard and Mouse Receiver" → receiver.
const KEYWORD_RULES: readonly KeywordRule[] = [
  { re: /headset|headphone|earphone|kulaklık|blackshark|kraken|arctis|\bcloud\b/i, category: 'headset' },
  { re: /webcam|web cam|camera|kamera|brio|\bc9[0-9]{2}\b/i, category: 'webcam' },
  { re: /microphone|mikrofon|\bmic\b|seiren|quadcast|yeti/i, category: 'microphone' },
  { re: /speaker|hoparlör/i, category: 'speaker' },
  { re: /joystick|flight stick|hotas/i, category: 'joystick' },
  { re: /gamepad|game ?controller|oyun denetleyicisi|xbox|dualsense|dualshock|wireless controller/i, category: 'gamepad' },
  { re: /receiver|dongle|alıcı|unifying|lightspeed|\bbolt\b/i, category: 'wireless-receiver' },
  { re: /keyboard|klavye/i, category: 'keyboard' },
  { re: /\bmouse\b|\bfare\b/i, category: 'mouse' },
];

export function categoryFromKeywords(names: readonly string[]): DeviceCategory | null {
  const meaningful = names.filter((n) => !isGenericName(n));
  for (const rule of KEYWORD_RULES) {
    if (meaningful.some((n) => rule.re.test(n))) return rule.category;
  }
  return null;
}

function ifaceRank(p: ParsedInstanceId): number {
  return (p.interfaceNumber ?? 0) * 256 + (p.collection ?? 0);
}

/**
 * Kategori önceliği:
 * 1) Marka/ürün ipucu (hintCategory)
 * 2) Anlamlı adlardaki anahtar kelimeler
 * 3) Windows sınıfları: kamera, ses uç noktaları (çıkış+giriş = kulaklık), oyun denetleyicisi
 * 4) Fare/klavye: ikisi birden varsa en düşük arayüz numaralı (birincil) düğüm belirler
 */
export function categorize(nodes: readonly CategorizeNode[], hintCategory: DeviceCategory | null): DeviceCategory {
  if (hintCategory) return hintCategory;

  const kw = categoryFromKeywords(nodes.map((n) => n.name));
  // Alıcı anahtar kelimesi tek başına belirleyici değil: aşağıdaki sınıf bilgisine de bakılır.
  if (kw && kw !== 'wireless-receiver') return kw;

  const classes = new Set(nodes.map((n) => n.pnpClass.toLowerCase()));
  if (classes.has('camera') || classes.has('image')) return 'webcam';
  if (classes.has('xnacomposite') || classes.has('xboxcomposite')) return 'gamepad';
  if (nodes.some((n) => /game controller|oyun denetleyicisi/i.test(n.name))) return 'gamepad';

  const render = nodes.some((n) => n.parsed.audioFlow === 'render');
  const capture = nodes.some((n) => n.parsed.audioFlow === 'capture');
  const hasMedia = classes.has('media') || classes.has('audioendpoint');
  if (render && capture) return 'headset';

  const mice = nodes.filter((n) => n.pnpClass.toLowerCase() === 'mouse');
  const kbds = nodes.filter((n) => n.pnpClass.toLowerCase() === 'keyboard');
  if (kw === 'wireless-receiver' && mice.length > 0 && kbds.length > 0) return 'wireless-receiver';
  if (mice.length > 0 && kbds.length === 0) return 'mouse';
  if (kbds.length > 0 && mice.length === 0) return 'keyboard';
  if (mice.length > 0 && kbds.length > 0) {
    const firstMouse = Math.min(...mice.map((n) => ifaceRank(n.parsed)));
    const firstKbd = Math.min(...kbds.map((n) => ifaceRank(n.parsed)));
    return firstMouse <= firstKbd ? 'mouse' : 'keyboard';
  }

  if (render) return 'speaker';
  if (capture) return 'microphone';
  if (hasMedia) return 'headset';
  if (kw === 'wireless-receiver') return 'wireless-receiver';
  if (nodes.some((n) => n.parsed.isBluetooth)) return 'bluetooth';
  if (nodes.some((n) => n.parsed.bus === 'usb')) return 'usb';
  return 'other';
}
