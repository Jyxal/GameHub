import { useEffect, useState } from 'react'
import type { HardwareOverview } from '../../shared/electron-api'
import { DeviceHubPage } from '../pages/DeviceHub'

type Section = 'overview' | 'library' | 'hardware' | 'devices' | 'performance' | 'audio' | 'profiles' | 'community' | 'settings'
type IconName = 'grid' | 'gamepad' | 'cpu' | 'activity' | 'audio' | 'layers' | 'users' | 'settings' | 'search' | 'bell' | 'arrow' | 'plus' | 'spark' | 'disc' | 'headphones'

const navigation: { id: Section; label: string; icon: IconName; group: string }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: 'grid', group: 'merkez' },
  { id: 'library', label: 'Oyun Kütüphanesi', icon: 'gamepad', group: 'merkez' },
  { id: 'hardware', label: 'Donanım', icon: 'cpu', group: 'sistem' },
  { id: 'devices', label: 'Cihazlar', icon: 'headphones', group: 'sistem' },
  { id: 'performance', label: 'Performans', icon: 'activity', group: 'sistem' },
  { id: 'audio', label: 'Ses', icon: 'audio', group: 'sistem' },
  { id: 'profiles', label: 'Oyun Profilleri', icon: 'layers', group: 'oyuncu' },
  { id: 'community', label: 'Topluluk', icon: 'users', group: 'oyuncu' },
  { id: 'settings', label: 'Ayarlar', icon: 'settings', group: 'oyuncu' },
]

const iconPaths: Record<IconName, string> = {
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  gamepad: 'M6 11h4m-2-2v4m7-1h.01M18 10h.01M7 6h10a4 4 0 0 1 3.9 3.1l1 4.5A2.8 2.8 0 0 1 17 16l-2-2H9l-2 2a2.8 2.8 0 0 1-4.9-2.4l1-4.5A4 4 0 0 1 7 6z',
  cpu: 'M9 9h6v6H9z M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3M5 5h14v14H5z',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  audio: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5 11v1a7 7 0 0 0 14 0v-1m-7 8v3m-4 0h8',
  layers: 'm12 3 9 5-9 5-9-5 9-5z m-9 9 9 5 9-5m-18 5 9 5 9-5',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 10v-2a4 4 0 0 0-3-3.9m-1-11.9a4 4 0 0 1 0 7.8',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-5v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  search: 'm20 20-4.5-4.5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  plus: 'M12 5v14m-7-7h14',
  spark: 'm12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z',
  disc: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4m-6.4 6.4 5-5',
  headphones: 'M3 14v-3a9 9 0 0 1 18 0v3m-18 0v4a2 2 0 0 0 2 2h2v-8H5a2 2 0 0 0-2 2zm18 0v4a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2z',
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>
}

function App() {
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [appVersion, setAppVersion] = useState('0.1.0')
  const [hardware, setHardware] = useState<HardwareOverview | null>(null)
  const [isScanningHardware, setIsScanningHardware] = useState(false)
  const [hardwareScanError, setHardwareScanError] = useState<string | null>(null)
  const activePage = navigation.find((item) => item.id === activeSection)!
  const todayLabel = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date())
    .toLocaleUpperCase('tr-TR')

  useEffect(() => {
    window.gamingHub.getAppVersion().then(setAppVersion).catch(() => undefined)
  }, [])

  async function handleHardwareScan() {
    setIsScanningHardware(true)
    setHardwareScanError(null)
    try {
      const result = await window.gamingHub.scanHardware()
      setHardware(result)
    } catch (error) {
      setHardwareScanError(error instanceof Error ? error.message : 'Donanım taraması başarısız oldu.')
    } finally {
      setIsScanningHardware(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">G<span>.</span></div>
          <div><div className="brand-title">GAMING<span> HUB</span></div><div className="brand-caption">ENVIRONMENT PLATFORM</div></div>
        </div>

        <div className="sidebar-scroll">
          <div className="nav-group">
            <div className="nav-heading">MERKEZ</div>
            {navigation.filter((item) => item.group === 'merkez').map((item) => <NavItem key={item.id} item={item} active={activeSection === item.id} onClick={() => setActiveSection(item.id)} />)}
          </div>
          <div className="nav-group">
            <div className="nav-heading">SİSTEM</div>
            {navigation.filter((item) => item.group === 'sistem').map((item) => <NavItem key={item.id} item={item} active={activeSection === item.id} onClick={() => setActiveSection(item.id)} />)}
          </div>
          <div className="nav-group">
            <div className="nav-heading">OYUNCU</div>
            {navigation.filter((item) => item.group === 'oyuncu').map((item) => <NavItem key={item.id} item={item} active={activeSection === item.id} onClick={() => setActiveSection(item.id)} />)}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="offline-indicator"><span className="status-dot" /> Yerel mod <span className="offline-tag">ÇEVRİMDIŞI</span></div>
          <div className="profile-row"><div className="avatar">P</div><div className="profile-copy"><strong>Oyuncu Profili</strong><span>Bu bilgisayar</span></div><Icon name="settings" size={16} /></div>
          <div className="version-label">ÖN SÜRÜM · v{appVersion}</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>OYUN MERKEZİ</span><b>/</b>{activePage.label.toLocaleUpperCase('tr-TR')}</div>
          <div className="topbar-actions">
            <label className="search-box"><Icon name="search" size={16} /><input aria-label="Ara" placeholder="Oyun, cihaz veya ayar ara..." /><kbd>Ctrl K</kbd></label>
            <button className="icon-button" aria-label="Bildirimler"><Icon name="bell" size={17} /><i /></button>
            <div className="top-avatar">P</div>
          </div>
        </header>

        {activeSection === 'overview' ? (
          <Overview
            onNavigate={setActiveSection}
            todayLabel={todayLabel}
            hardware={hardware}
            isScanningHardware={isScanningHardware}
            hardwareScanError={hardwareScanError}
            onScanHardware={handleHardwareScan}
          />
        ) : activeSection === 'hardware' ? (
          <HardwarePage
            hardware={hardware}
            isScanning={isScanningHardware}
            error={hardwareScanError}
            onScan={handleHardwareScan}
          />
        ) : activeSection === 'devices' ? (
          <DeviceHubPage />
        ) : <SectionPlaceholder section={activePage} />}
      </main>
    </div>
  )
}

function NavItem({ item, active, onClick }: { item: (typeof navigation)[number]; active: boolean; onClick: () => void }) {
  return <button className={`nav-item${active ? ' active' : ''}`} onClick={onClick} title={item.label} aria-label={item.label}><Icon name={item.icon} size={17} /><span>{item.label}</span>{active && <span className="nav-active-mark" />}</button>
}

function Overview({
  onNavigate,
  todayLabel,
  hardware,
  isScanningHardware,
  hardwareScanError,
  onScanHardware,
}: {
  onNavigate: (section: Section) => void
  todayLabel: string
  hardware: HardwareOverview | null
  isScanningHardware: boolean
  hardwareScanError: string | null
  onScanHardware: () => void
}) {
  const memoryGiB = (bytes: number) => `${(bytes / 1024 ** 3).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} GB`
  const primaryGpu = hardware?.graphicsAdapters[0]

  return (
    <div className="page-content">
      <div className="page-heading-row">
        <div><div className="eyebrow">{todayLabel}</div><h1>Kontrol merkezi</h1><p className="page-subtitle">Oyun ortamın. Tek bakışta, tek yerden.</p></div>
        <button className="secondary-button" onClick={() => onNavigate('settings')}><Icon name="settings" size={16} /> Paneli düzenle</button>
      </div>

      <section className="hero-card">
        <div className="hero-glow" />
        <div className="hero-copy">
          <div className="hero-badge"><span className="status-dot" /> SİSTEM DURUMU <b>HAZIR</b></div>
          <h2>Oyun ortamın<br /><em>hazır olduğunda,</em><br />sen de hazırsın.</h2>
          <p>Donanımını tara, oyunlarını ekle ve kendi merkezini oluşturmaya başla.</p>
          <button className="primary-button" onClick={onScanHardware} disabled={isScanningHardware}>
            <Icon name={isScanningHardware ? 'activity' : 'cpu'} size={16} />
            {isScanningHardware ? 'Donanım taranıyor...' : 'Donanım taramasını yap'}
          </button>
          {hardwareScanError && <div className="scan-error" role="alert">{hardwareScanError}</div>}
        </div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core"><Icon name="gamepad" size={46} /></div><div className="orbit-node node-one"><Icon name="cpu" size={17} /></div><div className="orbit-node node-two"><Icon name="headphones" size={17} /></div><div className="orbit-node node-three"><Icon name="activity" size={17} /></div></div>
        <div className="hero-index">01 <span>/ 04</span></div>
      </section>

      <div className="section-title-row"><div><h2>Sistem özeti</h2><p>Bu bilgisayarda algılanan bileşenler</p></div><button className="text-button" onClick={() => onNavigate('hardware')}>Tüm sistemi gör <Icon name="arrow" size={14} /></button></div>
      <section className="metric-grid">
        <MetricCard icon="cpu" label="İŞLEMCİ" title={hardware?.processorName ?? (isScanningHardware ? 'Taranıyor...' : 'Taranmadı')} subtitle={hardware ? `${hardware.physicalCores} fiziksel çekirdek · ${hardware.logicalCores} mantıksal` : 'Donanım taraması bekleniyor'} accent="violet" />
        <MetricCard icon="activity" label="EKRAN KARTI" title={primaryGpu?.name ?? (isScanningHardware ? 'Taranıyor...' : 'Taranmadı')} subtitle={primaryGpu ? `${primaryGpu.vramMegabytes ? `${(primaryGpu.vramMegabytes / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} GB VRAM${hardware && hardware.graphicsAdapters.length > 1 ? ` · +${hardware.graphicsAdapters.length - 1}` : ''}` : 'Model algılandı'} · ${hardware?.graphicsAdapters.length} GPU` : 'Ekran kartı taraması bekleniyor'} accent="blue" />
        <MetricCard icon="layers" label="BELLEK" title={hardware ? memoryGiB(hardware.memoryTotalBytes) : '— GB'} subtitle={hardware ? `${memoryGiB(hardware.memoryUsedBytes)} kullanımda` : 'Kullanım verisi yok'} accent="teal" />
        <MetricCard icon="gamepad" label="OYUN KÜTÜPHANESİ" title="0 oyun" subtitle="Henüz oyun eklenmedi" accent="orange" />
      </section>

      <div className="lower-grid">
        <section className="panel quick-panel">
          <div className="panel-header"><div><h2>Hızlı başlangıç</h2><p>Merkezini adım adım kur</p></div><span className="step-count">0 / 3</span></div>
          <button className="quick-step" onClick={() => onNavigate('hardware')}><span className="step-icon"><Icon name="cpu" size={18} /></span><span className="step-copy"><strong>Donanımını tanı</strong><small>Sistem ve bağlı cihazları algıla</small></span><span className="step-arrow"><Icon name="arrow" size={16} /></span></button>
          <button className="quick-step" onClick={() => onNavigate('library')}><span className="step-icon"><Icon name="gamepad" size={18} /></span><span className="step-copy"><strong>Oyunlarını ekle</strong><small>Oyun platformlarını tara</small></span><span className="step-arrow"><Icon name="arrow" size={16} /></span></button>
          <button className="quick-step" onClick={() => onNavigate('profiles')}><span className="step-icon"><Icon name="layers" size={18} /></span><span className="step-copy"><strong>İlk profilini oluştur</strong><small>Oyun tercihlerini kaydet</small></span><span className="step-arrow"><Icon name="arrow" size={16} /></span></button>
        </section>

        <section className="panel performance-panel">
          <div className="panel-header"><div><h2>Canlı performans</h2><p>Gerçek zamanlı sistem kullanımı</p></div><span className="live-label"><i /> CANLI</span></div>
          <div className="performance-empty"><div className="empty-chart"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="chart-center"><Icon name="activity" size={23} /><strong>Henüz veri yok</strong><small>Performans izleme aşamasında eklenecek.</small></div></div>
          <div className="perf-legend"><span><i className="legend-cpu" /> CPU <b>—%</b></span><span><i className="legend-gpu" /> GPU <b>—%</b></span><span><i className="legend-ram" /> RAM <b>—%</b></span></div>
        </section>
      </div>

      <div className="privacy-note"><Icon name="spark" size={15} /><span>Gizlilik öncelikli</span><p>Sistem bilgilerin varsayılan olarak bu bilgisayarda kalır.</p><Icon name="arrow" size={14} /></div>
    </div>
  )
}

function HardwarePage({ hardware, isScanning, error, onScan }: {
  hardware: HardwareOverview | null
  isScanning: boolean
  error: string | null
  onScan: () => void
}) {
  const memoryTotal = hardware?.memoryTotalBytes ?? 0
  const memoryUsed = hardware?.memoryUsedBytes ?? 0
  const memoryPercent = memoryTotal > 0 ? Math.min(100, Math.round((memoryUsed / memoryTotal) * 100)) : 0
  const formatGiB = (bytes: number) => `${(bytes / 1024 ** 3).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} GB`

  return (
    <div className="page-content">
      <div className="page-heading-row">
        <div><div className="eyebrow">YEREL SİSTEM ENVANTERİ</div><h1>Donanım & Cihazlar</h1><p className="page-subtitle">Bilgisayar bileşenleri bu cihazda okunur; hiçbir yere gönderilmez.</p></div>
        <button className="secondary-button scan-button" onClick={onScan} disabled={isScanning}>
          <Icon name="cpu" size={16} /> {isScanning ? 'Taranıyor...' : hardware ? 'Yeniden tara' : 'Donanım taramasını yap'}
        </button>
      </div>
      {error && <div className="scan-error page-scan-error" role="alert">{error}</div>}
      {!hardware && !isScanning ? (
        <section className="panel hardware-empty-state">
          <div className="placeholder-icon"><Icon name="cpu" size={28} /></div>
          <h2>Donanım bilgileri henüz taranmadı</h2>
          <p>Tarama yalnızca bileşen adlarını, çekirdek sayılarını ve bellek miktarını okur.</p>
          <button className="primary-button" onClick={onScan}><Icon name="cpu" size={16} /> Donanım taramasını yap</button>
        </section>
      ) : (
        <>
          <div className="hardware-detail-grid">
            <MetricCard icon="cpu" label="İŞLEMCİ" title={hardware?.processorName ?? 'Taranıyor...'} subtitle={hardware ? `${hardware.physicalCores} fiziksel çekirdek · ${hardware.logicalCores} mantıksal` : 'Bilgiler okunuyor'} accent="violet" />
            <MetricCard icon="layers" label="BELLEK" title={hardware ? formatGiB(memoryTotal) : 'Taranıyor...'} subtitle={hardware ? `${formatGiB(memoryUsed)} kullanımda` : 'Bilgiler okunuyor'} accent="teal" />
          </div>
          {hardware && (
            <section className="panel memory-panel">
              <div className="panel-header"><div><h2>Bellek kullanımı</h2><p>Tarama anındaki yaklaşık sistem belleği</p></div><strong>{memoryPercent}%</strong></div>
              <div className="memory-track"><span style={{ width: `${memoryPercent}%` }} /></div>
              <div className="memory-labels"><span>{formatGiB(memoryUsed)} kullanımda</span><span>{formatGiB(memoryTotal)} toplam</span></div>
            </section>
          )}
          <section className="panel gpu-panel">
            <div className="panel-header"><div><h2>Ekran kartları</h2><p>Sistemde algılanan grafik bağdaştırıcıları</p></div><span className="step-count">{hardware?.graphicsAdapters.length ?? '…'}</span></div>
            {hardware?.graphicsAdapters.length ? hardware.graphicsAdapters.map((gpu, index) => (
              <div className="gpu-row" key={`${gpu.name}-${index}`}>
                <span className="step-icon"><Icon name="activity" size={18} /></span>
                <span className="step-copy"><strong>{gpu.name}</strong><small>{gpu.vramMegabytes ? `${(gpu.vramMegabytes / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} GB VRAM` : 'VRAM bilgisi sürücü tarafından verilmedi'}</small></span>
                <span className="gpu-index">GPU {index + 1}</span>
              </div>
            )) : hardware ? <div className="hardware-empty-copy">Ekran kartı modeli Windows tarafından alınamadı. İşlemci ve RAM bilgileri başarıyla tarandı.</div> : <div className="hardware-empty-copy">Ekran kartı bilgileri taranıyor...</div>}
          </section>
          {hardware && <div className="scan-timestamp">Son tarama: {new Date(hardware.scannedAt).toLocaleString('tr-TR')}</div>}
        </>
      )}
    </div>
  )
}

function MetricCard({ icon, label, title, subtitle, accent }: { icon: IconName; label: string; title: string; subtitle: string; accent: string }) {
  return <article className="metric-card"><div className={`metric-icon ${accent}`}><Icon name={icon} size={18} /></div><div className="metric-label">{label}</div><strong>{title}</strong><small>{subtitle}</small><div className={`metric-sparkline ${accent}`}><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
}

function SectionPlaceholder({ section }: { section: (typeof navigation)[number] }) {
  const descriptions: Record<Section, string> = {
    overview: '',
    library: 'Steam, Epic ve diğer mağazalardaki oyunlarını tek kütüphanede topla.',
    hardware: 'Donanımını, çevre birimlerini ve desteklenen cihaz özelliklerini görüntüle.',
    devices: 'Bağlı çevre birimlerini, bağlantı türünü ve Windows tarafından bildirilen pil seviyesini görüntüle.',
    performance: 'CPU, GPU, bellek ve oyun oturumlarının performansını izle.',
    audio: 'Ses giriş ve çıkışlarını, uygulama yönlendirmelerini ve profillerini yönet.',
    profiles: 'Oyunlara özel ayarlarını ve tercihlerini yerel profillerde sakla.',
    community: 'Paylaşılan profilleri keşfet ve kendi oyun ortamını paylaş.',
    settings: 'Uygulama tercihlerini, gizlilik seçeneklerini ve yerel verileri yönet.',
  }
  return <div className="placeholder-page"><div className="placeholder-icon"><Icon name={section.icon} size={28} /></div><div className="eyebrow">GAMING ENVIRONMENT PLATFORM</div><h1>{section.label}</h1><p>{descriptions[section.id]}</p><div className="coming-soon"><span className="status-dot" /> Bu modül geliştirme planında</div></div>
}

export default App
