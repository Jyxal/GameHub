// Windows PnP InstanceId ayrıştırıcı (saf fonksiyonlar, Node/Electron bağımlılığı yok).
//
// Örnek biçimler:
//   USB\VID_1532&PID_0527\00000000001A
//   USB\VID_1532&PID_0527&MI_03\7&2A1B3C4D&0&0003
//   HID\VID_046D&PID_C539&MI_01&COL02\8&...
//   BTHENUM\DEV_A1B2C3D4E5F6\7&...
//   BTHENUM\{0000110B-0000-1000-8000-00805F9B34FB}_VID&000205AC_PID&024F\7&...
//   BTHLE\DEV_A1B2C3D4E5F6\7&...
//   BTHLEDEVICE\{00001812-...}_DEV_VID&02046D_PID&B023_REV&0007_A1B2C3D4E5F6\8&...
//   HID\{00001124-0000-1000-8000-00805F9B34FB}_VID&0002046D_PID&B342\9&...
//   HID\{00001812-0000-1000-8000-00805F9B34FB}_DEV_VID&02046D_PID&B023_REV&0007_...\9&...
//   SWD\MMDEVAPI\{0.0.0.00000000}.{GUID}   (ses çıkışı)  /  {0.0.1.00000000} (ses girişi)

export type BusKind = 'usb' | 'hid' | 'bthenum' | 'bthle' | 'mmdevapi' | 'other';

export type AudioFlow = 'render' | 'capture';

export interface ParsedInstanceId {
  raw: string;
  bus: BusKind;
  vendorId: string | null;
  productId: string | null;
  /** VID'in kaynağı: usb = USB-IF VID, bt-sig = Bluetooth SIG şirket kimliği */
  vidSource: 'usb' | 'bt-sig' | null;
  /** USB arayüz numarası (MI_xx) */
  interfaceNumber: number | null;
  /** HID koleksiyon numarası (COLxx) */
  collection: number | null;
  /** Gerçek cihaz seri numarası (yalnızca Windows tarafından üretilmemişse) */
  serialNumber: string | null;
  /** Bluetooth MAC adresi (DEV_xxxxxxxxxxxx) */
  bluetoothAddress: string | null;
  isBluetooth: boolean;
  isUsbRootHub: boolean;
  audioFlow: AudioFlow | null;
}

const BT_HID_SERVICE = /^\{0000(1124|1812)-0000-1000-8000-00805f9b34fb\}/i;

function hex4(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.toLowerCase();
  return /^[0-9a-f]{4}$/.test(s) ? s : null;
}

function formatMac(hex12: string): string {
  return hex12.toUpperCase().match(/.{2}/g)!.join(':');
}

export function parseInstanceId(instanceId: string): ParsedInstanceId {
  const raw = typeof instanceId === 'string' ? instanceId.trim() : '';
  const parts = raw.split('\\');
  const enumerator = (parts[0] ?? '').toUpperCase();
  const deviceId = parts[1] ?? '';
  const instance = parts.slice(2).join('\\');

  const result: ParsedInstanceId = {
    raw,
    bus: 'other',
    vendorId: null,
    productId: null,
    vidSource: null,
    interfaceNumber: null,
    collection: null,
    serialNumber: null,
    bluetoothAddress: null,
    isBluetooth: false,
    isUsbRootHub: false,
    audioFlow: null,
  };

  if (enumerator === 'USB') result.bus = 'usb';
  else if (enumerator === 'HID') result.bus = 'hid';
  else if (enumerator === 'BTHENUM') result.bus = 'bthenum';
  else if (enumerator === 'BTHLE' || enumerator === 'BTHLEDEVICE') result.bus = 'bthle';
  else if (enumerator === 'SWD' && deviceId.toUpperCase() === 'MMDEVAPI') result.bus = 'mmdevapi';

  if (result.bus === 'mmdevapi') {
    const flow = /^\{0\.0\.([01])\./.exec(instance);
    if (flow) result.audioFlow = flow[1] === '0' ? 'render' : 'capture';
    return result;
  }

  if (result.bus === 'usb' && /^ROOT_HUB/i.test(deviceId)) result.isUsbRootHub = true;

  // Klasik USB biçimi: VID_xxxx&PID_xxxx
  const usb = /VID_([0-9A-F]{4})&PID_([0-9A-F]{4})/i.exec(deviceId);
  if (usb) {
    result.vendorId = hex4(usb[1]);
    result.productId = hex4(usb[2]);
    result.vidSource = 'usb';
  }

  // Bluetooth Classic: _VID&0002xxxx_PID&xxxx (0001 = BT SIG, 0002 = USB-IF)
  const btClassic = /_VID&(000[12])([0-9A-F]{4})_PID&([0-9A-F]{4})/i.exec(deviceId);
  // Bluetooth LE: _DEV_VID&02xxxx_PID&xxxx (01 = BT SIG, 02 = USB-IF)
  const btLe = /_DEV_VID&(0[12])([0-9A-F]{4})_PID&([0-9A-F]{4})/i.exec(deviceId);
  const bt = btClassic ?? btLe;
  if (!usb && bt) {
    const isUsbIf = bt[1].endsWith('2');
    result.vendorId = hex4(bt[2]);
    result.productId = hex4(bt[3]);
    result.vidSource = isUsbIf ? 'usb' : 'bt-sig';
    result.isBluetooth = true;
  }

  const mi = /&MI_([0-9A-F]{2})/i.exec(deviceId);
  if (mi) result.interfaceNumber = parseInt(mi[1], 16);
  const col = /&COL([0-9A-F]{2})/i.exec(deviceId);
  if (col) result.collection = parseInt(col[1], 16);

  if (result.bus === 'bthenum' || result.bus === 'bthle') result.isBluetooth = true;
  if (result.bus === 'hid' && BT_HID_SERVICE.test(deviceId)) result.isBluetooth = true;

  const mac = /(?:^|[\\_&])DEV_([0-9A-F]{12})(?:$|[\\_&])/i.exec(deviceId);
  const macTail = /_([0-9A-F]{12})$/i.exec(deviceId);
  if (mac) result.bluetoothAddress = formatMac(mac[1]);
  else if (result.isBluetooth && macTail) result.bluetoothAddress = formatMac(macTail[1]);

  // USB seri numarası: yalnızca üst düğümde (MI_ yok) ve '&' içermiyorsa gerçektir.
  // '&' içeren değerler Windows'un konuma göre ürettiği kimliklerdir.
  if (result.bus === 'usb' && result.vendorId && result.interfaceNumber === null) {
    if (instance && !instance.includes('&') && !instance.includes('\\') && /^[\w.-]{1,128}$/.test(instance)) {
      result.serialNumber = instance;
    }
  }

  return result;
}
