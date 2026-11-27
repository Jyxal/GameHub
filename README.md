# Gaming Environment Platform

Windows için yerel öncelikli bir Gaming Hub. Oyun kütüphanesi, donanım, çevre birimleri, profiller ve performans araçlarını tek masaüstü uygulamasında bir araya getirmeyi hedefler. Bu ad geçici proje adıdır; marka adı ayrıca araştırılacaktır.

## Teknoloji

- Electron + React + TypeScript + Vite (`electron-vite`)
- Yerel veriler için SQLite (veri katmanı sonraki aşamada eklenecek)
- İleride Windows'a özgü donanım entegrasyonları için sınırlı C#/.NET yardımcı süreci

## Geliştirme ortamı

- Windows 10/11
- Node.js 22.12+ (Node 24 önerilir)
- pnpm
- Visual Studio Code; TypeScript desteği yerleşik, ESLint/Prettier uzantıları önerilir

## Başlatma

```powershell
pnpm install
pnpm dev
```

Tür denetimi ve dağıtım derlemesi:

```powershell
pnpm typecheck
pnpm build
```

Windows kurulum dosyası oluşturmak için:

```powershell
pnpm package:win
```

Çıktı `release/Gaming-Hub-0.1.0-Setup.exe` konumuna yazılır. Kurulum dosyasını bir kez
çalıştırıp masaüstü kısayolunu oluşturun; sonraki açılışlar uygulamanın kurulu kopyasından
yapılır ve portable paketin her açılışta kendini geçici klasöre çıkarması gerekmez.

## Mimari özeti

- `electron/main`: pencere, IPC doğrulaması, veritabanı ve Windows servisleri.
- `electron/preload`: Renderer'a yalnızca açıkça izin verilen API'leri sunan köprü.
- `src/renderer`: React arayüzü; Node.js ve dosya sistemi erişimi yok.
- `src/shared`: main/preload/renderer arasında paylaşılan API türleri.
- `docs/ARCHITECTURE.md`: güvenlik sınırları, veri akışı, SQLite ve .NET entegrasyon planı.

Temel işlevler çevrimdışı çalışacak. Hiçbir renderer uzak web içeriği yüklemeyecek; sistem değişikliği yapan entegrasyonlar açık kullanıcı eylemi, doğrulama ve geri alma sunacak.
