import type {
  BatteryInfo,
  DeviceCategory,
  DeviceHubNotification,
  DeviceHubNotificationType,
  DeviceHubSettings,
  DeviceInfo,
} from '../../../../src/shared/device-hub/types.js';
import type { DeviceEvent } from '../events/diff.js';
import { BatteryAlertTracker, NotificationDeduper } from './dedupe.js';

const MINUTE = 60_000;
const COOLDOWN_MS: Record<DeviceHubNotificationType, number> = {
  'low-battery': 30 * MINUTE,
  'critical-battery': 15 * MINUTE,
  disconnected: 5 * MINUTE,
  reconnected: 5 * MINUTE,
  'new-device': 10 * MINUTE,
  'battery-unavailable': 24 * 60 * MINUTE,
};

const CATEGORY_TR: Record<DeviceCategory, string> = {
  mouse: 'fare',
  keyboard: 'klavye',
  headset: 'kulaklık',
  microphone: 'mikrofon',
  gamepad: 'oyun kumandası',
  joystick: 'joystick',
  webcam: 'web kamerası',
  speaker: 'hoparlör',
  usb: 'USB cihaz',
  bluetooth: 'Bluetooth cihaz',
  'wireless-receiver': 'kablosuz alıcı',
  other: 'cihaz',
};

export type NativeNotifier = (title: string, body: string) => void;

/**
 * Bildirim servisi: kullanıcı tercihleri + tekrar engelleme.
 * Yerel (Windows) bildirim ve renderer bildirimi enjekte edilen fonksiyonlarla gönderilir.
 */
export class NotificationService {
  private readonly deduper = new NotificationDeduper();
  private readonly battery = new BatteryAlertTracker();

  constructor(
    private readonly getSettings: () => DeviceHubSettings,
    private readonly showNative: NativeNotifier,
    private readonly forwardToRenderer: (n: DeviceHubNotification) => void,
    private readonly now: () => number = Date.now,
  ) {}

  private enabled(type: DeviceHubNotificationType): boolean {
    const n = this.getSettings().notifications;
    switch (type) {
      case 'low-battery':
        return n.lowBattery;
      case 'critical-battery':
        return n.criticalBattery;
      case 'disconnected':
        return n.deviceDisconnected;
      case 'reconnected':
        return n.deviceReconnected;
      case 'new-device':
        return n.newDevice;
      case 'battery-unavailable':
        return n.batteryUnavailable;
    }
  }

  /** Gönderildiyse true döner. */
  notify(type: DeviceHubNotificationType, device: DeviceInfo, title: string, body: string): boolean {
    if (!this.enabled(type)) return false;
    const now = this.now();
    if (!this.deduper.shouldSend(`${type}:${device.id}`, COOLDOWN_MS[type], now)) return false;
    const n: DeviceHubNotification = { type, deviceId: device.id, title, body, timestamp: now };
    try {
      this.showNative(title, body);
    } catch {
      /* yerel bildirim başarısız olsa bile renderer bilgilendirilir */
    }
    this.forwardToRenderer(n);
    return true;
  }

  handleDeviceEvent(ev: DeviceEvent, device: DeviceInfo): void {
    const name = device.displayName;
    switch (ev.type) {
      case 'new':
        this.notify('new-device', device, 'Yeni cihaz algılandı', `${name} (${CATEGORY_TR[device.category]}) bağlandı.`);
        break;
      case 'connected':
        this.notify('reconnected', device, 'Cihaz bağlandı', `${name} bağlandı.`);
        break;
      case 'reconnected':
        this.notify('reconnected', device, 'Cihaz yeniden bağlandı', `${name} yeniden bağlandı.`);
        break;
      case 'disconnected':
        this.battery.forget(device.id);
        this.notify('disconnected', device, 'Cihaz bağlantısı kesildi', `${name} bağlantısı kesildi.`);
        break;
    }
  }

  handleBattery(device: DeviceInfo, battery: BatteryInfo | null): void {
    if (!battery || battery.stale || device.connectionStatus !== 'connected') return;
    if (!battery.dataAvailable) {
      if (battery.unavailableReason) {
        this.notify('battery-unavailable', device, 'Pil bilgisi alınamıyor', `${device.displayName}: ${battery.unavailableReason}`);
      }
      return;
    }
    const s = this.getSettings();
    const alert = this.battery.evaluate(device.id, battery.percentage, battery.isCharging, s.lowBatteryThreshold, s.criticalBatteryThreshold);
    if (alert === 'critical') {
      this.notify('critical-battery', device, `Kritik pil: ${device.displayName}`, `Pil seviyesi %${battery.percentage}. Lütfen şarj edin.`);
    } else if (alert === 'low') {
      this.notify('low-battery', device, `Düşük pil: ${device.displayName}`, `Pil seviyesi %${battery.percentage}.`);
    }
  }
}
