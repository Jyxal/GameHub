# GameHub

Windows için yerel öncelikli oyun merkezi. Kapalı beta sürümü: **0.1.0-beta.1**.

## Geliştirme gereksinimleri

- Windows 10/11 x64
- Node.js 22.12 veya üstü
- pnpm (bu depoda tanımlı sürüm: `pnpm@11.25.0`)

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

## Derleme ve kontrol

```powershell
pnpm typecheck
pnpm build
pnpm package:win
```

Kurulum dosyası `release/GameHub-0.1.0-beta.1-Windows-x64-Setup.exe` yolunda oluşur. Kapalı beta kapsamı, temiz makine gereksinimleri, kurulum ve test adımları için [docs/CLOSED_BETA.md](docs/CLOSED_BETA.md) dosyasına bakın.

## Ürün durumu

Bu beta davetli test içindir; herkese açık sürüm veya otomatik güncelleme kanalı değildir. Uygulama simgesinde markalı ikon henüz sağlanmadığı için Electron'un varsayılan uygulama ikonu kullanılır. Kapalı beta öncesinde bunun bilinçli geçici seçim olduğunu dikkate alın.

## Mimari

- `electron/main`: pencere, IPC doğrulaması, donanım taraması ve Windows servisleri.
- `electron/preload`: renderer'a izin verilen API köprüsü.
- `src/renderer`: React arayüzü; Node.js ve dosya sistemi erişimi yok.
- `docs/ARCHITECTURE.md`: güvenlik sınırları ve veri akışı.
- `docs/DEVICE_HUB.md`: cihaz algılama, pil verisi ve teknik sınırlamalar.
