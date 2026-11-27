# GameHub 0.1.0-beta.1 — Kapalı Beta

Bu paket yalnızca davetli, küçük bir test grubuna dağıtılmak içindir. Bu depo yapılandırması GitHub Release yayımlamaz, otomatik güncelleme kurmaz ve telemetri göndermez. Installer imzalanmamıştır; Windows SmartScreen uyarısı görülebilir. Testçilere dosyayı yalnızca doğrudan ve güvenilir özel kanaldan verin.

## Dağıtım dosyası

`release/GameHub-0.1.0-beta.1-Windows-x64-Setup.exe`

Paket Windows x64 NSIS kurucusudur. Başlat menüsü ve masaüstü kısayolu oluşturur, kurulum konumunun seçilmesine izin verir. Kurulum ekranı yönetici izni isterse beta testinde yükseltmeyin; bunu rapor edin ve kurulumu iptal edin. Uygulama ikonu için marka varlığı depoda bulunmadığından Electron'un varsayılan ikonu kullanılır; marka ikonu yerine geçici olduğu testçilere bildirilmelidir.

## Temiz Windows makinesi ve izinler

- Windows 10/11 x64 gerekir; yalnızca geliştirici makinesinde build almak, başka bilgisayarda çalıştığını kanıtlamaz.
- Uygulama çalışırken yönetici izni veya sürücü kurulumu gerektirmez; NSIS kurulum davranışı farklı Windows hesap/politikalarında test edilmelidir. Yönetici onayı isteyen kurulum testini iptal edin ve bildirin.
- Cihaz merkezi Windows PowerShell 5.1'i, `Get-PnpDevice` / `Get-PnpDeviceProperty` komutlarını ve PnPDevice modülünü kullanır. Varsayılan PowerShell yürütme ilkesi çağrıya özel `Bypass` ile aşılır; sistem ilkesi değiştirilmez. Kurum ilkeleri PowerShell'i engelliyorsa cihaz algılama çalışmayabilir.
- Donanım görünürlüğü Windows'un bildirdiği PnP/HID/Bluetooth bilgileriyle sınırlıdır. Özel 2.4 GHz alıcıların pil seviyesi çoğunlukla alınamaz; Bluetooth pil bilgisi de yalnızca cihaz ve Windows bildirirse gösterilir. Değer uydurulmaz.
- Gerçek Windows donanımındaki cihaz algılama ve pil testi hâlâ gereklidir. Uygulama izin istemlerini varsayılan olarak reddeder; uzak içerik ve yeni pencere açılışı engellenir.
- Ürün imzalanmadığı ve temiz makine testi tamamlanmadığı için bu beta güvenlik/uyumluluk sertifikası sayılmaz. Testçiler SmartScreen/antivirüs uyarısını beklemeli, kurum politikalarını aşmaya çalışmamalıdır.

## Testçi adımları

1. Windows x64 makinede installer dosyasını özel dağıtım kanalından alın. Dosyayı çalıştırmadan önce göndereni ve sürüm adını doğrulayın.
2. Kurulumu kullanıcı hesabınız altında tamamlayın; özel bir klasör seçebilirsiniz. Yönetici parolası istenirse devam etmeyin ve rapor edin.
3. Başlat menüsünden **GameHub**'ı açın. Açılış, pencere görünümü ve sürümün `0.1.0-beta.1` olduğunu doğrulayın.
4. **Donanım** bölümünde taramayı çalıştırın; işlemci, bellek ve ekran kartı bilgisini makinenizle karşılaştırın.
5. **Cihazlar** bölümünde yenileme yapın; bağlı/kesik cihazları ve bağlantı türlerini kontrol edin. Bilinen bir Bluetooth pil verisi varsa karşılaştırın. Alınamayan pil değeri beklenen bir sınırlama olabilir.
6. Uygulamayı kapatıp yeniden açın; tercihlerinizin korunup korunmadığını kontrol edin.
7. Hata oluşursa saat, adımlar ve hata metnini not edin. Tanılama kaydı: `%APPDATA%\GameHub\logs\gamehub.log`. Dosyayı paylaşmadan önce kişisel bilgi veya cihaz adı içerip içermediğini inceleyin; yalnızca davet eden kişiye gönderin.
8. Kaldırmak için Windows **Ayarlar > Uygulamalar > Yüklü uygulamalar > GameHub > Kaldır** yolunu kullanın. Kaldırma sonrası uygulama kısayollarının ve kurulum klasörünün gittiğini doğrulayın. Kullanıcı verisi ve loglar ayrıca kalabilir; gerekirse önce yedekleyip `%APPDATA%\GameHub` klasörünü kendiniz kaldırın.

## Yayın öncesi kontrol listesi

- [ ] `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build` başarılı.
- [ ] `pnpm package:win` beklenen x64 kurulum dosyasını oluşturdu. Betik NSIS çıktısını ASCII geçici klasörde üretir ve `release/` içine kopyalar.
- [ ] Paket temiz bir Windows 10/11 x64 makineye kuruldu ve başlatıldı.
- [ ] Donanım taraması ve mümkün olan gerçek cihaz algılama/pil kontrolleri tamamlandı.
- [ ] Log yolu ve uninstall davranışı test edildi.
- [ ] Paket içeriği ve Git değişiklikleri gözden geçirildi; sır, `.env`, kullanıcı verisi, makineye özgü yol ve derleme çıktısı yok. Depoda test scripti tanımlı değil; typecheck/build/package kontrolleri ayrı çalıştırılır.
- [ ] Installer için SHA-256 özeti özel kanalda dosyayla birlikte paylaşıldı.
- [ ] Testçilere imzasız beta ve bilinen sınırlamalar bildirildi.

## Hata bildirimi şablonu

- GameHub sürümü:
- Windows sürümü ve sistem türü (x64):
- Cihaz/model (ilgiliyse):
- Beklenen sonuç:
- Gerçekleşen sonuç:
- Yeniden oluşturma adımları:
- Hata metni veya ekran görüntüsü:
- İlgili log satırları (kişisel bilgileri temizleyin):
- Sorun her seferinde oluyor mu?:
- Ek notlar:

