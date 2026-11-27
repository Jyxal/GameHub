# Ürün Özeti

## Vizyon

Oyuncunun bilgisayarındaki oyun deneyimini oluşturan donanım, çevre birimi, oyun, ayar, performans ve ses araçlarını tek bir Windows masaüstü platformunda görüntüleyip yönetmek. İlk sürüm yerel ve çevrimdışı kullanılmalı; AI, bulut, hesap ve topluluk özellikleri ileride isteğe bağlı eklenmeli.

## Modüller

- **Donanım ve çevre birimleri:** CPU, GPU, RAM, anakart, depolama, monitör, klavye, mouse, kulaklık ve mikrofon bilgileri; model bazında destek durumu.
- **Oyun kütüphanesi:** Kurulu oyunları algılama, kurulum yolu/sürüm/başlatma seçenekleri ve oyun başına profil.
- **Oyun profilleri:** Grafik, kontrol, DPI/hassasiyet, ekran, ses ve performans tercihlerini yerel saklama; desteklenen oyunlarda uygulama.
- **Performans:** CPU/GPU/RAM kullanımı, sıcaklık, güç, FPS ve oyun oturumu ölçümleri.
- **Ses:** Giriş/çıkış aygıtları, uygulama bazlı yönlendirme ve oyun başına ses tercihleri.
- **Otomasyon:** Oyun açılış/kapanışında profil uygulama ve geri alma; çakışma tespiti ve kullanıcı onaylı öneriler.
- **AI asistanı (ileriki aşama):** Sistem ve oyun verilerini açıklama/öneri; bulut kullanımı isteğe bağlı ve açık rızaya bağlı.
- **Topluluk (ileriki aşama):** Oyuncu profilleri, paylaşılabilir ayarlar, sistem karşılaştırması ve topluluk profillerini keşfetme.

## İlkeler

- Windows masaüstü: Electron + React + TypeScript + Vite.
- Yerel SQLite depolama; temel işlevlerde ağ bağlantısı zorunlu değil.
- Renderer yalnızca UI; sistem erişimi main process içindeki servisler üzerinden.
- İlk envanter/izleme salt okunur; sistem ayarı değiştiren işler sonraki aşama.
- Desteklenmeyen cihaz/özellik varmış gibi gösterilmez.
- Ücretsiz temel yerel özellikler; ileride isteğe bağlı premium AI/bulut/gelişmiş analiz.

## Aşamalı hedefler

1. Güvenli masaüstü kabuğu ve temel gezinme
2. Donanım envanteri
3. Oyun kütüphanesi ve yerel profiller
4. Performans ölçümü
5. Ses ve seçilmiş ekipman entegrasyonları
6. Güvenli otomasyon
7. İsteğe bağlı AI, bulut ve topluluk

## Çalışma adı

Gaming Environment Platform. Nihai marka adı daha sonra kullanım ve marka çakışmaları araştırılarak seçilecek.
