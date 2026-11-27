# Device Hub Modülü

Game Hub için cihaz merkezi: bağlı fare, klavye, kulaklık, gamepad vb. çevre birimlerini
Windows PnP üzerinden algılar, bağlantı türünü ve durumunu gösterir. Pil bilgisini **yalnızca
Windows veya doğrulanmış bir kaynak gerçekten bildiriyorsa** gösterir.

> **Önemli:** Bu modül gerçek Windows donanımında **test edilmedi**. Bu projeye simüle veri testleri
> henüz eklenmedi. Gerçek donanım doğrulaması için `INTEGRATION.md` içindeki manuel test listesini kullanın.

## 1. Cihaz bazında yapılabilirlik değerlendirmesi

| Cihaz | Algılama | Bağlantı türü | Pil yüzdesi |
|---|---|---|---|
| ATK Dragonfly A9 (fare) | Evet (PnP/HID) | Evet: kablolu / 2.4G alıcı / Bluetooth | **Yalnızca Bluetooth'ta ve Windows bildirirse.** 2.4G ve kablolu modda hayır. |
| HAVIT KB884L (klavye) | Evet (PnP/HID) | Kablolu USB | Uygulanamaz (kablolu klavye, pil yok; arayüzde pil alanı gösterilmez) |
| Razer BlackShark V3 X HyperSpeed (kulaklık) | Evet (USB ses + HID, VID 1532) | 2.4G dongle / Bluetooth | **2.4G'de hayır.** Bluetooth'ta yalnızca Windows pil bildirirse. |

### ATK Dragonfly A9
- **Mümkün olan:** Cihazın USB alıcısı veya Bluetooth düğümü `Get-PnpDevice` ile görülür.
  VID `373B` topluluk kaynaklarında ATK olarak geçer; bilinen bazı PID'ler (`11B6`, `11D9`,
  `1264`, `11DC`) topluluk projesinden (github: NasirA1991/atk-control) alınmıştır ve arayüzde
  "topluluk kaynağı" güvenilirliğiyle işaretlenir — **resmi olarak doğrulanmamıştır.**
- **Bluetooth:** Fare BLE HID üzerinden standart Battery Service (GATT 0x180F) sunuyorsa Windows
  bunu `{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2` cihaz özelliğine yazar; modül bu değeri okur.
- **Mümkün olmayan:** 2.4G alıcı modunda pil, üreticiye özel HID raporlarıyla taşınır. Bu protokol
  ATK tarafından yayınlanmamıştır; topluluk tersine mühendisliği vardır ama doğrulanmamıştır ve
  cihaza veri göndermeyi gerektirir. Kurallar gereği (cihaza yazma yok, sahte veri yok) bu yol
  uygulanmadı. Neden metni: *"Üretici HID pil protokolü doğrulanmadı; Bluetooth bağlantısında
  Windows pil bilgisi denenir."*

### HAVIT KB884L
- HAVIT kendi USB VID'ini kullanmaz (OEM yonga). Topluluk kaynağında (github:
  emirhannaneli/havit-console) KB884L için `05AC:024F` raporlanmıştır. Bu kimlik Apple'ın VID'i
  olduğundan, cihaz adı "Apple" içeriyorsa HAVIT eşleşmesi **yapılmaz**.
- Kablolu klavye olduğu için pil bilgisi `null` (uygulanamaz) döner; kartta pil çubuğu çıkmaz.

### Razer BlackShark V3 X HyperSpeed
- VID `1532` Razer'a aittir (USB-IF), marka güvenilirliği "VID" olarak gösterilir.
- **2.4G HyperSpeed:** Pil bilgisi Razer'a özel HID komutlarıyla okunur. Razer bunun için herkese
  açık bir API veya belge yayınlamaz; Razer Synapse kapalı kaynaktır ve harici uygulamalara pil
  verisi sunmaz. Bu nedenle pil **okunmaz** ve açık bir Türkçe neden gösterilir.
- **Bluetooth:** Windows, Hands-Free (HFP) veya BLE pil bildirimi alırsa değeri okunur. Kulaklık
  bunu göndermezse zincir Razer sağlayıcısına düşer ve Razer'ın herkese açık pil API'si sunmadığını
  belirten neden gösterilir (marka sağlayıcısı olmayan cihazlarda genel neden: "Windows bu Bluetooth cihazı için pil değeri bildirmiyor…").

### Windows API'lerinin sınırları
- `Get-PnpDevice`/`Get-PnpDeviceProperty` yönetici izni gerektirmez; ancak yalnızca Windows'un
  bildiği özellikleri verir. Pil yüzdesi neredeyse yalnızca Bluetooth cihazlar için vardır.
- USB 2.4G alıcıların pil bilgisi Windows'a hiç ulaşmaz; üreticinin yazılımı kendi protokolüyle okur.
- Bazı Bluetooth cihazlar pil yüzdesini 10'luk adımlarla veya hiç bildirmez.

### Alternatifler (ileride)
- **.NET yardımcı süreci:** `Windows.Devices.Bluetooth` / `GattDeviceService` ile BLE Battery
  Service doğrudan okunabilir (yönetici izni gerekmez). `DeviceDiscoverySource` arayüzü uygulanarak
  PowerShell yerine takılabilir.
- **Üreticiye özel HID okuma:** Yalnızca protokol üretici belgesiyle veya güvenilir şekilde
  doğrulanırsa, salt okunur bir `DeviceProvider` olarak eklenebilir. Şu an hiçbiri eklenmedi.

## 2. Mimari

```
Renderer (React, Node yok)
  DeviceHubPage ── useDeviceHub ── window.deviceHub (preload, contextBridge)
                                        │  izinli IPC kanalları
Main süreç                              ▼
  ipc/handlers.ts  (gönderen + argüman doğrulama, refresh kısma)
        │
  DeviceHubService ──► DeviceMonitor (olay + debounce + yedek periyodik tarama)
        │          ──► BatteryService (periyodik, yalnızca bağlı cihazlar)
        │          ──► diff.ts (yeni / bağlandı / yeniden bağlandı / kesildi)
        │          ──► NotificationService (dedupe + histerezis, yerel bildirim)
        │          ──► SettingsStore ── KeyValueStorage (JsonFileStorage, atomik)
        ▼
  DeviceDiscoverySource: WindowsPnpProvider
        └─ PowerShellHost (tek uzun ömürlü powershell.exe, -EncodedCommand, shell:false)
             └─ Get-PnpDevice / Get-PnpDeviceProperty / Win32_DeviceChangeEvent
  ProviderRegistry: BluetoothBattery → marka (Razer, ATK, HAVIT) → Generic
```

### Dosya haritası
| Yol | Görev |
|---|---|
| `src/shared/device-hub/` | Ortak tipler, kanal sabitleri, API arayüzü, `window.deviceHub` bildirimi, özet/pil seviyesi yardımcıları |
| `electron/main/device-hub/index.ts` | `registerDeviceHub(mainWindow, options?)` → `{ service, dispose }` |
| `electron/main/device-hub/device-hub-service.ts` | Tarama, pil sorgulama, anlık görüntü, değişiklik yayını |
| `electron/main/device-hub/providers/windows/` | PowerShell betiği ve süreç yönetimi, InstanceId ayrıştırma, birleştirme, kategorilendirme |
| `electron/main/device-hub/providers/vendors/` | Marka sağlayıcıları |
| `electron/main/device-hub/brands/brand-table.ts` | VID → marka tablosu ve ürün ipuçları (güvenilirlik etiketli) |
| `electron/main/device-hub/battery/` | Pil okuma ve `BatteryInfo` üretimi |
| `electron/main/device-hub/events/` | Cihaz farkı ve izleme |
| `electron/main/device-hub/notifications/` | Bildirim tekilleştirme ve gönderme |
| `electron/main/device-hub/settings/` | Ayar doğrulama, depolama arayüzü, JSON dosya deposu |
| `electron/main/device-hub/ipc/` | IPC işleyicileri ve doğrulama |
| `electron/preload/device-hub/index.ts` | `exposeDeviceHubApi()` |
| `src/renderer/pages/DeviceHub/` | Sayfa, bileşenler, kapsamlı CSS |

### Veri akışı ve pil kuralları
- Pil yüzdesi yalnızca bir sağlayıcı `kind: 'available'` döndürürse gösterilir.
- Okunamıyorsa `dataAvailable: false` ve Türkçe `unavailableReason` döner; arayüz
  *"Pil bilgisi alınamıyor: &lt;neden&gt;"* gösterir.
- Kablolu cihazlarda `battery: null` → pil alanı hiç gösterilmez.
- Cihaz bağlantısı kesilirse son bilinen değer "eski (stale)" olarak işaretlenir ve tarihiyle gösterilir;
  güncel değermiş gibi sunulmaz, düşük pil hesabına katılmaz.
- Marka güvenilirliği: `vid` (resmi VID), `community` (topluluk kaynağı, doğrulanmadı), `name` (cihaz adından), `unknown`.

### Kaynak kullanımı
- Tek bir gizli `powershell.exe` süreci uygulama boyunca yaşar (her taramada yeni süreç açılmaz).
- Donanım değişikliği `Win32_DeviceChangeEvent` ile olay tabanlı izlenir; 1,5 sn debounce uygulanır.
  Yedek periyodik tarama varsayılan 60 sn'dir (yakın zamanda tarama yapıldıysa atlanır).
- Pil sorgulama varsayılan 60 sn; yalnızca bağlı cihazlar için (kablolu cihazlarda sağlayıcı hemen "uygulanamaz" döner, Bluetooth özellikleri yalnızca bağlı bir Bluetooth cihaz varsa okunur).
- Değişiklik yoksa renderer'a olay gönderilmez (imza karşılaştırması).
- PowerShell süreci çökerse geri çekilmeli yeniden başlatılır (2/5/15/60/120 sn), sonra izleme
  "kullanılamıyor" durumuna geçer.

### Güvenlik
- `contextIsolation` korunur; renderer'a yalnızca 5 invoke + 2 olay fonksiyonu sunulur.
- IPC: izinli kanal listesi, argüman sayısı ve içerik doğrulaması, yalnızca ana pencerenin ana
  çerçevesinden gelen istekler kabul edilir, `refresh` 2 sn kısıtlıdır.
- PowerShell `shell: false` ile, sabit sistem yolundan ve `-EncodedCommand` ile başlatılır; stdin'de
  yalnızca `scan|battery|ping <sayı>` biçimindeki komutlar kabul edilir. Kullanıcı girdisi betiğe aktarılmaz.
- Yönetici izni, sürücü kurulumu, firmware yazma veya cihaz ayarı değiştirme yoktur. Cihazlara veri gönderilmez.
- Yeni npm bağımlılığı yoktur (node-hid vb. kullanılmadı).

## 3. Yeni sağlayıcı (marka) ekleme

1. `DeviceProvider` arayüzünü uygulayın (`electron/main/device-hub/providers/types.ts`):

```ts
import type { BatteryReadResult, DeviceProvider } from '../types.js';
import type { MergedDevice } from '../windows/pnp-merge.js';

export class OrnekProvider implements DeviceProvider {
  readonly id = 'ornek';
  readonly displayName = 'Örnek Marka';
  readonly priority = 100;

  matches(device: MergedDevice): boolean {
    return device.vendorId === 'abcd';
  }

  async readBattery(device: MergedDevice): Promise<BatteryReadResult | null> {
    if (device.connectionType === 'wired-usb') return { kind: 'not-applicable' };
    // Değer asla tahmin edilmez. Doğrulanmış kaynak yoksa:
    return { kind: 'unavailable', reason: 'Üretici pil bilgisini herkese açık bir yolla sunmuyor.' };
  }
}
```

2. Kaydedin — ya `createDefaultRegistry()` içine ekleyin ya da dışarıdan verin:

```ts
import { registerDeviceHub, createDefaultRegistry } from './device-hub/index.js';
import { OrnekProvider } from './device-hub/providers/vendors/ornek-provider.js';

const registry = createDefaultRegistry();
registry.register(new OrnekProvider());
registerDeviceHub(mainWindow, { registry });
```

3. Gerekirse `brands/brand-table.ts` içindeki `VENDOR_TABLE` veya `PRODUCT_HINTS` listesine ekleyin
   (doğru güvenilirlik etiketiyle; topluluk kaynaklıysa `community` ve kaynak açıklaması).
4. `tests/device-hub/registry.test.ts` örneğine benzer bir birim testi ekleyin.

Pil zinciri: Bluetooth (Windows) sağlayıcısı önce denenir; değer yoksa eşleşen marka sağlayıcısı,
o da `null` dönerse genel sağlayıcı çalışır.

## 4. Bilinen sınırlamalar
- Gerçek Windows donanımında test edilmedi; PowerShell betiği yalnızca sözdizimi ve sahte
  cmdlet'lerle protokol açısından denendi.
- 2.4G alıcı üzerinden pil (ATK, Razer) okunmaz.
- Bazı cihazlar Windows'ta genel adlarla (ör. "HID uyumlu fare") görünür; model adı her zaman
  belirlenemeyebilir.
- Aynı alıcıya bağlı birden çok cihaz tek fiziksel cihaz olarak görünebilir.
- Windows PowerShell 5.1 ve `PnpDevice` modülü gereklidir (Windows 10/11'de varsayılan olarak bulunur).
- Ayarlar SQLite yerine `userData` içindeki JSON dosyalarında tutulur; `KeyValueStorage`
  arayüzü uygulanarak SQLite'a geçilebilir.
