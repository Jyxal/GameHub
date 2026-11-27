# Mimari ve Teknik Kararlar

## Süreç sınırları

```text
React renderer (UI, sandbox)
       │ typed, allowlisted API
       ▼
Preload (contextBridge; IPC kanallarını gizler)
       │ validated IPC
       ▼
Electron main process
  ├─ local services: games, hardware, performance, audio
  ├─ repositories / migrations ── SQLite in app userData
  └─ future Windows adapter ── restricted C#/.NET sidecar
```

- **Renderer:** React bileşenleri, sayfa durumu, sunum. Node.js, IPC, veritabanı veya ham dosya sistemi erişimi verilmez.
- **Preload:** `contextBridge` ile isimlendirilmiş ve dar kapsamlı metotlar sunar. Ham `ipcRenderer` hiçbir zaman dışarı açılmaz.
- **Main:** İş kuralları, IPC girdisi ve gönderen doğrulaması, SQLite, Windows servisleri ve izin kontrolleri.
- **Shared:** API sözleşmeleri ve tipler; süreçlere göre ayrılmış tsconfig'ler.

## Güvenlik tabanı

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`.
- Renderer yalnızca paket içindeki yerel UI'ı yükler. Geliştirmede Vite sunucusunun tam origin'i dışındaki gezinme engellenir; production'da renderer gezinmesi kapalıdır.
- Yeni pencere istekleri ve web izinleri varsayılan olarak reddedilir.
- CSP `script-src 'self'` ile kısıtlanır. Dış font veya CDN yoktur; ilk açılış çevrimdışı çalışabilir.
- IPC'de her kanal için sender ve parametre doğrulaması yapılır; yalnızca gereken işlevler allowlist'e eklenir.
- Renderer'dan kabuk komutu/serbest yol/serbest URL alan genel bir API sunulmaz.

## Veri ve SQLite

- SQLite bağlantısı yalnızca main process'te açılır; dosya `app.getPath('userData')` altında tutulur.
- Arayüz doğrudan SQL çalıştırmaz; tipli servis ve repository arayüzleri kullanır.
- Şema migration'larla ilerler; cihaz taraması ilk aşamada salt okunur olur.
- Veritabanı sürücüsü native Electron ABI uyumu ve paketleme adımıyla birlikte seçilip eklenecek. Bu iskelette henüz native modül kurulmaması Windows kurulumunu basit tutar.

## Gelecekte C#/.NET entegrasyonu

Donanım erişimi gerektiğinde, Electron main process sınırlı bir adaptör başlatır. C# yardımcı süreç sadece tanımlı JSON mesajlarını named pipe üzerinden alıp verir; renderer ile doğrudan konuşmaz, genel komut çalıştırmaz ve yükseltilmiş izin istemez. Mesaj şeması, zaman aşımı ve süreç kapatma davranışı ayrıca tanımlanır.

## Küçük teslim aşamaları

Her aşama bağımsız servis ve repository sözleşmesiyle UI'dan ayrılır. Önerilen sıra: (1) kabuk/gezinme, (2) salt okunur sistem envanteri, (3) oyun tarama ve yerel kitaplık, (4) profil verisi ve migration, (5) performans örnekleme, (6) ses/cihaz adaptörleri, (7) geri alınabilir otomasyon, (8) bulut/AI/topluluk.

Her modül için kabul ölçütü ve küçük birim testleri ilgili modül geliştirilirken eklenecek. Donanım ve otomasyon aşamalarında testler sahte adaptörlerle sistem değişikliği yapmadan çalıştırılacak.
