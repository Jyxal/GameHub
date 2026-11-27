// Ham PnP düğümlerini fiziksel cihazlara birleştirir (saf fonksiyon).
import type { ConnectionStatus, ConnectionType, DeviceInfo } from '../../../../../src/shared/device-hub/types.js';
import { matchBrand } from '../../brands/brand-table.js';
import { fnv1a } from '../../util/hash.js';
import { categorize, categoryFromKeywords, isGenericName, type CategorizeNode } from './categorize.js';
import { parseInstanceId, type ParsedInstanceId } from './instance-id.js';

/** PowerShell taramasından gelen kısa alan adlı ham kayıt. */
export interface RawPnpEntry {
  /** InstanceId */
  i: string;
  /** FriendlyName */
  n?: string | null;
  /** PnP sınıfı (Class) */
  c?: string | null;
  /** Manufacturer */
  m?: string | null;
  /** Status (OK, Error, Degraded, Unknown) */
  s?: string | null;
  /** DEVPKEY_Device_ContainerId */
  ct?: string | null;
  /** DEVPKEY_Device_BusReportedDeviceDesc (USB ürün dizgesi) */
  bd?: string | null;
  /** Bluetooth bağlı mı ({83DA6326-97A6-4088-9453-A1923F573B29} 15) */
  bc?: boolean | null;
}

/** Bilgisayarın kendisini temsil eden konteyner: dahili/sistem cihazları. */
export const INTERNAL_CONTAINER = '{00000000-0000-0000-ffff-ffffffffffff}';
const NULL_CONTAINER = '{00000000-0000-0000-0000-000000000000}';

const SYSTEM_NAME =
  /root hub|host controller|ana denetleyici|kök hub|usb hub|generic usb hub|genel usb hub|bluetooth (radio|adapter|radyo|bağdaştırıcı)|wireless bluetooth|enumerator|numaralandırıcı|rfcomm|bluetooth device \(personal area network\)|kişisel alan ağı|microsoft bluetooth le enumerator|avrcp transport|hands-free|handsfree|ble mouse transport/i;

const RECEIVER_NAME = /receiver|dongle|alıcı|unifying|lightspeed|hyperspeed|\bbolt\b|2\.4\s*g|wireless|kablosuz/i;

export interface ParsedNode extends CategorizeNode {
  entry: RawPnpEntry;
  container: string | null;
  status: string;
}

function normContainer(ct: string | null | undefined): string | null {
  if (!ct || typeof ct !== 'string') return null;
  const c = ct.trim().toLowerCase();
  const withBraces = c.startsWith('{') ? c : `{${c}}`;
  if (!/^\{[0-9a-f-]{36}\}$/.test(withBraces) || withBraces === NULL_CONTAINER) return null;
  return withBraces;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function isSystemNode(n: ParsedNode): boolean {
  if (n.parsed.isUsbRootHub) return true;
  if (n.container === INTERNAL_CONTAINER) return true;
  const cls = n.pnpClass.toLowerCase();
  if (cls === 'usb' && SYSTEM_NAME.test(n.name)) return true;
  // USB üzerindeki Bluetooth radyosu (bağdaştırıcı) bir çevre birimi değildir.
  if (cls === 'bluetooth' && n.parsed.bus === 'usb') return true;
  if (SYSTEM_NAME.test(n.name) && !n.parsed.vendorId) return true;
  return false;
}

export function groupKeyFor(n: ParsedNode): string {
  if (n.container) return `ct:${n.container}`;
  const p = n.parsed;
  if (p.vendorId && p.productId) return `vp:${p.vendorId}:${p.productId}:${p.serialNumber ?? ''}`;
  if (p.bluetoothAddress) return `bt:${p.bluetoothAddress}`;
  return `id:${p.raw.toLowerCase()}`;
}

function pickVidPid(nodes: readonly ParsedNode[]): { vid: string | null; pid: string | null; serial: string | null } {
  // Önce USB-IF kaynaklı VID'ler: USB üst düğümü > HID > Bluetooth
  const order = (p: ParsedInstanceId) => (p.bus === 'usb' && p.interfaceNumber === null ? 0 : p.bus === 'usb' ? 1 : p.bus === 'hid' ? 2 : 3);
  const withVid = nodes
    .map((n) => n.parsed)
    .filter((p) => p.vendorId && p.productId && p.vidSource === 'usb' && p.vendorId !== '0000')
    .sort((a, b) => order(a) - order(b));
  const best = withVid[0];
  const serial = nodes.map((n) => n.parsed.serialNumber).find((s) => !!s) ?? null;
  return { vid: best?.vendorId ?? null, pid: best?.productId ?? null, serial };
}

function pickDisplayName(nodes: readonly ParsedNode[]): string | null {
  const btDev = nodes.find((n) => n.parsed.isBluetooth && n.parsed.bluetoothAddress && /^(bthenum|bthle)$/.test(n.parsed.bus) && !isGenericName(n.name));
  if (btDev) return btDev.name;
  const busDesc = nodes.map((n) => str(n.entry.bd)).find((d) => d && !isGenericName(d));
  if (busDesc) return busDesc;
  // Ses uç noktası: "Headset Earphone (Razer BlackShark V3 X HyperSpeed)" → parantez içi
  for (const n of nodes) {
    if (n.parsed.bus !== 'mmdevapi') continue;
    const m = /\(([^()]+)\)\s*$/.exec(n.name);
    if (m && !isGenericName(m[1])) return m[1].trim();
  }
  const named = nodes.find((n) => n.parsed.bus !== 'mmdevapi' && !isGenericName(n.name));
  return named?.name ?? null;
}

function detectConnection(nodes: readonly ParsedNode[], isReceiverHint: boolean | undefined, hintConn: ConnectionType | undefined): ConnectionType {
  if (nodes.some((n) => n.parsed.isBluetooth)) return 'bluetooth';
  if (!nodes.some((n) => n.parsed.bus === 'usb' || n.parsed.bus === 'hid')) return 'unknown';
  if (hintConn) return hintConn;
  if (isReceiverHint) return 'wireless-usb';
  const names = nodes.flatMap((n) => [n.name, str(n.entry.bd)]).filter((x) => x && !isGenericName(x));
  return names.some((x) => RECEIVER_NAME.test(x)) ? 'wireless-usb' : 'wired-usb';
}

function detectStatus(nodes: readonly ParsedNode[], connection: ConnectionType): ConnectionStatus {
  if (connection === 'bluetooth') {
    const flags = nodes.map((n) => n.entry.bc).filter((b): b is boolean => typeof b === 'boolean');
    if (flags.length > 0) return flags.some(Boolean) ? 'connected' : 'disconnected';
    // Bağlantı özelliği yoksa: işlev düğümlerinden (HID/ses) biri çalışıyorsa bağlı kabul edilir.
    const fn = nodes.filter((n) => n.parsed.bus === 'hid' || n.parsed.bus === 'mmdevapi');
    return fn.some((n) => n.status === 'ok') ? 'connected' : 'disconnected';
  }
  // USB: tarama yalnızca mevcut (present) düğümleri döndürür.
  return nodes.some((n) => n.status === 'ok' || n.status === '') ? 'connected' : 'disconnected';
}

export function parseNodes(entries: readonly RawPnpEntry[]): ParsedNode[] {
  const out: ParsedNode[] = [];
  for (const e of entries) {
    if (!e || typeof e.i !== 'string' || e.i.length === 0 || e.i.length > 512) continue;
    out.push({
      entry: e,
      parsed: parseInstanceId(e.i),
      pnpClass: str(e.c),
      name: str(e.n),
      container: normContainer(e.ct),
      status: str(e.s).toLowerCase(),
    });
  }
  return out;
}

export interface MergedDevice extends Omit<DeviceInfo, 'battery' | 'firstSeen' | 'lastSeenConnected'> {
  /** Pil sorgusu için Bluetooth konteyner/adres eşlemesi */
  groupKey: string;
  containerId: string | null;
  bluetoothAddress: string | null;
  isReceiver: boolean;
  /** Ürün ipucuna göre pil var mı (bilinmiyorsa undefined) */
  hasBatteryHint: boolean | undefined;
}

/**
 * Ham PnP girdilerini fiziksel cihazlara dönüştürür.
 * Aynı konteyner (ContainerId) veya aynı VID/PID/seri altındaki arayüzler tek cihaz olur.
 */
export function mergePnpEntries(entries: readonly RawPnpEntry[], now: number): MergedDevice[] {
  const nodes = parseNodes(entries).filter((n) => !isSystemNode(n));
  const groups = new Map<string, ParsedNode[]>();
  for (const n of nodes) {
    const key = groupKeyFor(n);
    const list = groups.get(key);
    if (list) list.push(n);
    else groups.set(key, [n]);
  }

  const devices: MergedDevice[] = [];
  for (const [key, group] of groups) {
    // Yalnızca ses uç noktası olan gruplar (ör. monitör hoparlörü) çevre birimi listesine alınmaz.
    if (group.every((n) => n.parsed.bus === 'mmdevapi')) continue;
    // VID'siz, Bluetooth olmayan ve anlamlı adı olmayan gruplar atlanır.
    const { vid, pid, serial } = pickVidPid(group);
    const isBt = group.some((n) => n.parsed.isBluetooth);
    const displayName = pickDisplayName(group);
    if (!vid && !isBt && !displayName) continue;

    const names = group.flatMap((n) => [n.name, str(n.entry.bd)]).filter(Boolean);
    const brand = matchBrand(vid, pid, names);
    const category = categorize(group, brand.category ?? (categoryFromKeywords(displayName ? [displayName] : []) || null));
    const connectionType = detectConnection(group, brand.hint?.isReceiver, brand.hint?.connection);
    const connectionStatus = detectStatus(group, connectionType);
    const manufacturer = group.map((n) => str(n.entry.m)).find((m) => m && !/^\(?(standard|standart|microsoft|generic)/i.test(m)) ?? null;
    const bluetoothAddress = group.map((n) => n.parsed.bluetoothAddress).find((a) => !!a) ?? null;
    const containerId = group.find((n) => n.container)?.container ?? null;

    const fallbackName = [brand.brand, brand.model].filter(Boolean).join(' ') || (vid && pid ? `USB cihaz ${vid}:${pid}` : 'Bilinmeyen cihaz');
    const hardwareInfo: Record<string, string> = {
      'Arayüz sayısı': String(group.length),
      'Windows sınıfları': [...new Set(group.map((n) => n.pnpClass).filter(Boolean))].join(', ') || '-',
      'Ana InstanceId': (group.find((n) => n.parsed.bus === 'usb' && n.parsed.interfaceNumber === null) ?? group[0]).parsed.raw,
    };
    if (containerId) hardwareInfo['ContainerId'] = containerId;
    if (bluetoothAddress) hardwareInfo['Bluetooth adresi'] = bluetoothAddress;
    if (brand.note) hardwareInfo['Marka notu'] = brand.note;
    if (brand.hint?.isReceiver) hardwareInfo['Bağlantı'] = 'USB kablosuz alıcı (dongle)';

    devices.push({
      id: `dev-${fnv1a(key)}`,
      groupKey: key,
      containerId,
      bluetoothAddress,
      isReceiver: !!brand.hint?.isReceiver || (connectionType === 'wireless-usb'),
      hasBatteryHint: brand.hint?.hasBattery,
      brand: brand.brand,
      brandConfidence: brand.confidence,
      model: brand.model,
      displayName: displayName ?? fallbackName,
      manufacturer,
      vendorId: vid,
      productId: pid,
      serialNumber: serial,
      category,
      connectionType,
      connectionStatus,
      providerId: 'generic',
      hardwareInfo,
      lastUpdated: now,
    });
  }
  return devices.sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));
}
