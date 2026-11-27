# Device Hub — Entegrasyon Kılavuzu

Bu kılavuz modülün mevcut Game Hub projesine (gaming-environment-platform) eklenmesini anlatır.
Mevcut modüllere (Steam entegrasyonu dahil) dokunulmaz; yalnızca 3 noktaya birkaç satır eklenir.

> Modül gerçek Windows donanımında test edilmedi. Entegrasyondan sonra bölüm 8'deki manuel
> test listesini uygulayın.

## 1. Dosyaları kopyalayın

Zip içeriğini proje köküne, aynı klasör yapısıyla kopyalayın:

```
electron/main/device-hub/          → ana süreç
electron/preload/device-hub/       → preload API
src/shared/device-hub/             → ortak tipler, kanallar, window.deviceHub bildirimi
src/renderer/pages/DeviceHub/      → sayfa ve bileşenler
tests/device-hub/                  → birim testleri (SİMÜLE veri)
scripts/test-device-hub.mjs        → test çalıştırıcı
tsconfig.device-hub-test.json      → yalnızca testler için tsconfig
docs/DEVICE_HUB.md, docs/INTEGRATION.md
```

Bu projeye entegrasyonda test klasörü, test çalıştırıcısı ve test tsconfig'i eklenmedi; aşağıdaki
test komutları bu nedenle bu çalışma alanında henüz kullanılamaz.

Yeni npm bağımlılığı **yoktur**. `tsconfig.main.json` ve `tsconfig.renderer.json` mevcut `include`
desenleriyle (`electron/**/*.ts`, `src/shared/**/*.ts`, `src/renderer/**`) yeni dosyaları otomatik kapsar.
`src/shared/device-hub/global.d.ts` de `src/shared/**` altında olduğu için `window.deviceHub` tipi
renderer'da ek ayar gerekmeden tanınır.

## 2. Ana süreç — `electron/main/index.ts`

Ana pencere oluşturulduktan sonra ekleyin (mevcut kodunuzdaki değişken adlarına uyarlayın):

```ts
import { registerDeviceHub } from './device-hub/index.js'

// ... mevcut BrowserWindow oluşturma kodunuz:
// const mainWindow = new BrowserWindow({ ..., webPreferences: { preload, contextIsolation: true, nodeIntegration: false } })

const deviceHub = registerDeviceHub(mainWindow)
app.on('before-quit', () => deviceHub.dispose())
```

Notlar:
- `registerDeviceHub` IPC işleyicilerini kaydeder, PowerShell izleme sürecini başlatır ve pencere
  kapanınca kendini otomatik temizler (`disposeOnWindowClose: false` ile kapatılabilir).
- Tekrar çağrılırsa (ör. macOS tarzı pencere yeniden oluşturma) önceki örnek önce temizlenir.
- `contextIsolation: true` ve `nodeIntegration: false` olmalıdır. `sandbox: true` da desteklenir:
  derlenmiş preload yalnızca `electron` modülünü kullanır.
- Windows dışı platformlarda modül çökmez; izleme durumu "desteklenmiyor" olarak bildirilir.
- İsteğe bağlı seçenekler: `{ registry, storage, source, log, disposeOnWindowClose }`
  (bkz. `DEVICE_HUB.md` → "Yeni sağlayıcı ekleme").

## 3. Preload — `electron/preload/index.ts`

Mevcut `contextBridge.exposeInMainWorld(...)` çağrılarınızın yanına ekleyin:

```ts
import { exposeDeviceHubApi } from './device-hub/index.js'

exposeDeviceHubApi() // window.deviceHub
```

`window.deviceHub` yalnızca şu fonksiyonları içerir: `getDevices`, `getSummary`, `refresh`,
`getSettings`, `updateSettings`, `onDevicesChanged`, `onNotification` (son ikisi abonelikten çıkış
fonksiyonu döndürür). `contextIsolation` kapalıysa API güvenlik gereği sunulmaz.

## 4. Renderer — sayfa ve navigasyon

Sayfa bağımsız bir React bileşenidir, router'a bağımlı değildir:

```tsx
import { DeviceHubPage } from './pages/DeviceHub'
```

**React Router kullanıyorsanız:**

```tsx
<Route path="/devices" element={<DeviceHubPage />} />
```

**Basit durum tabanlı navigasyon kullanıyorsanız:**

```tsx
{activePage === 'devices' && <DeviceHubPage />}
// Menüye: <button onClick={() => setActivePage('devices')}>Cihazlar</button>
```

- Stil dosyası (`DeviceHub.css`) sayfa tarafından içe aktarılır ve `.dh-root` altında kapsamlıdır;
  mevcut temayı bozmaz. Temanızda `--app-bg`, `--app-surface`, `--app-text`, `--app-accent` gibi
  `--app-*` / `--color-*` değişkenleri varsa otomatik kullanılır, yoksa koyu yedek renkler devreye girer.
- Ürün görselleri isteğe bağlıdır:
  ```ts
  import { registerProductImage } from './pages/DeviceHub'
  import img from './assets/devices/blackshark.png'
  registerProductImage({ nameIncludes: 'BlackShark' }, img)
  ```
- CSP: Sayfa harici kaynak yüklemez; ikonlar satır içi SVG'dir. Mevcut bir CSP'de değişiklik gerekmez.

## 5. Otomatik testler

Modül arşivindeki simüle veri testleri bu projeye henüz eklenmedi. Manuel Windows donanım kontrolü
için aşağıdaki senaryolar kullanılabilir; gerçek cihaz sonuçları test edilene kadar doğrulanmış sayılmaz.

## 6. Ayarların saklanması

Ayarlar ve bilinen cihaz listesi `app.getPath('userData')` altında saklanır:
`device-hub-settings.json`, `device-hub-known-devices.json` (atomik yazma: geçici dosya + rename;
bozuk dosya yedeklenip varsayılana dönülür). SQLite katmanı eklendiğinde `KeyValueStorage`
arayüzünü uygulayan bir sınıf `registerDeviceHub(win, { storage })` ile verilebilir.

## 7. Doğrulama komutları

```bash
pnpm exec tsc --noEmit -p tsconfig.main.json
pnpm exec tsc --noEmit -p tsconfig.renderer.json
pnpm exec electron-vite build
```

## 8. Manuel Windows donanım test listesi

Uygulamayı `pnpm dev` ile başlatın, Cihazlar sayfasını açın. PowerShell komutları **normal kullanıcı**
olarak (yönetici değil) çalıştırılabilir ve yalnızca okuma yapar.

Yardımcı komutlar:

```powershell
# Bağlı çevre birimleri
Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -match '^(USB|HID|BTHENUM|BTHLE)' } |
  Select-Object Status, Class, FriendlyName, InstanceId | Format-Table -AutoSize

# Bluetooth pil değeri (Windows bildiriyorsa)
Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -match '^(BTHENUM|BTHLE)' } | ForEach-Object {
  $b = Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2' -ErrorAction SilentlyContinue
  if ($b.Data) { '{0} => %{1}' -f $_.FriendlyName, $b.Data }
}
```

| # | Senaryo | Adımlar | Beklenen sonuç |
|---|---|---|---|
| 1 | USB fare algılama | ATK Dragonfly A9'u kabloyla bağlayın. | Kart görünür: kategori "Fare", bağlantı "Kablolu USB", durum "Bağlı". Pil alanı gösterilmez veya kablolu modda "uygulanamaz". Marka ATK (VID 373B ise, "topluluk kaynağı" etiketiyle) veya genel ad. İlk komutta aynı VID/PID görülmeli. |
| 2 | Kablosuz fare algılama | Kabloyu çıkarıp 2.4G alıcıyı takın; ardından Bluetooth modunu deneyin. | 2.4G: bağlantı "Kablosuz (USB alıcı)", pil için "Pil bilgisi alınamıyor: Üretici HID pil protokolü doğrulanmadı…". BT: bağlantı "Bluetooth". |
| 3 | Kablolu klavye algılama | HAVIT KB884L'yi takın. | Kategori "Klavye", "Kablolu USB", pil alanı **yok**. Marka HAVIT ("topluluk kaynağı") veya genel ad; ad "Apple" içeriyorsa HAVIT olarak etiketlenmez. |
| 4 | Kablosuz kulaklık algılama | BlackShark V3 X dongle'ını takıp kulaklığı açın. | Tek kart (ses + HID arayüzleri birleştirilmiş), kategori "Kulaklık", marka Razer (VID). Aynı cihaz için birden fazla kart çıkmamalı. |
| 5 | Pil okuma | Fareyi veya kulaklığı Bluetooth ile eşleştirin; yardımcı komutla değer olup olmadığına bakın. | Komut bir yüzde döndürüyorsa kartta **aynı** yüzde ve kaynak "Windows Bluetooth" görünür (pil sorgulama aralığı içinde). Komut değer döndürmüyorsa kart yüzde göstermemeli. |
| 6 | Pil okunamama davranışı | Kulaklığı 2.4G dongle ile kullanın. | Kartta "Pil bilgisi alınamıyor: Razer bu cihaz için herkese açık bir pil API'si…" metni; hiçbir uydurma yüzde veya dolu çubuk yok. |
| 7 | USB çıkarma | Kablolu fareyi veya alıcıyı çıkarın. | ~2 sn içinde kart "Bağlı değil" olur, "Bağlantı kesildi" bildirimi (bildirim ayarı açıksa). Son bilinen pil varsa "eski" etiketiyle tarihli gösterilir. |
| 8 | Bluetooth bağlantı kesilmesi | BT cihazı kapatın (eşleşmeyi silmeden). | Kart "Bağlı değil" olur (Windows bağlantı özelliğine göre; olay gelmezse en geç yedek tarama aralığında). Bildirim bir kez gelir. |
| 9 | Yeniden bağlanma | 7. ve 8. adımlardaki cihazı tekrar bağlayın. | Kart aynı kimlikle "Bağlı" olur, "Yeniden bağlandı" bildirimi; "Yeni cihaz" bildirimi **gelmemeli**. |
| 10 | Düşük pil uyarısı | Ayarlardan düşük pil eşiğini, Windows'un bildirdiği mevcut değerin üzerine çıkarın (gerçek pil boşaltmaya gerek yok). | Bir kez "Düşük pil" bildirimi; özet şeridinde düşük pil sayısı artar. Aynı uyarı bekleme süresi (30 dk) içinde tekrarlanmaz. Pil okunamayan cihazlar için uyarı üretilmez. |
| 11 | Uygulama yeniden başlatma | Uygulamayı kapatıp açın. | Ayarlar korunur; bağlı cihazlar yeniden algılanır; daha önce görülen cihazlar için "Yeni cihaz" bildirimi gelmez. `%APPDATA%\<uygulama>\device-hub-settings.json` mevcut olmalı. |
| 12 | Uzun süreli kaynak kullanımı | Uygulamayı 1–2 saat açık bırakın; Görev Yöneticisi'nde Electron ve `powershell.exe` süreçlerini izleyin. | Yalnızca **bir** `powershell.exe` alt süreci; boştayken CPU ≈ %0; bellekte sürekli artış yok. Uygulama kapanınca `powershell.exe` süreci de kapanmalı. |

Sorun bildirirken şunları ekleyin: yardımcı komut çıktısı (InstanceId'ler), kartın detay panelindeki
bilgiler ve geliştirici konsolundaki `[DeviceHub]` günlük satırları.
