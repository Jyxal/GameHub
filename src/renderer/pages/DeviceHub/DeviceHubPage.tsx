import { useMemo, useState, type JSX } from 'react';
import { matchesFilter } from '../../../shared/device-hub/summary';
import { DEVICE_FILTERS, type DeviceFilter } from '../../../shared/device-hub/types';
import { DeviceCard } from './components/DeviceCard';
import { DeviceDetailPanel } from './components/DeviceDetailPanel';
import { FilterBar } from './components/FilterBar';
import { SettingsPanel } from './components/SettingsPanel';
import { SummaryStrip } from './components/SummaryStrip';
import { formatTime, MONITOR_LABEL } from './format';
import { useDeviceHub } from './useDeviceHub';
import './DeviceHub.css';

export function DeviceHubPage(): JSX.Element {
  const hub = useDeviceHub();
  const [filter, setFilter] = useState<DeviceFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const devices = hub.snapshot?.devices ?? [];
  const lowThreshold = hub.settings?.lowBatteryThreshold ?? 20;

  const counts = useMemo(() => {
    const c = {} as Record<DeviceFilter, number>;
    for (const f of DEVICE_FILTERS) c[f] = devices.filter((d) => matchesFilter(d, f, lowThreshold)).length;
    return c;
  }, [devices, lowThreshold]);

  const visible = useMemo(() => devices.filter((d) => matchesFilter(d, filter, lowThreshold)), [devices, filter, lowThreshold]);
  const selected = selectedId ? devices.find((d) => d.id === selectedId) ?? null : null;
  const status = hub.snapshot?.summary.status;

  return (
    <div className="dh-root">
      <header className="dh-header">
        <div>
          <h1 className="dh-title">Cihazlar</h1>
          <p className="dh-subtitle">
            {status
              ? `İzleme: ${MONITOR_LABEL[status.monitorMode]} · Son tarama: ${formatTime(status.lastScanAt)} · Son pil okuması: ${formatTime(status.lastBatteryPollAt)}`
              : 'Bağlı çevre birimleri, bağlantı ve pil durumu'}
          </p>
        </div>
        <div className="dh-header__actions">
          <button type="button" className="dh-btn" onClick={() => setShowSettings((s) => !s)} disabled={!hub.settings} aria-expanded={showSettings}>
            Ayarlar
          </button>
          <button type="button" className="dh-btn dh-btn--primary" onClick={() => void hub.refresh()} disabled={!hub.available || hub.refreshing}>
            {hub.refreshing ? 'Yenileniyor…' : 'Yenile'}
          </button>
        </div>
      </header>

      {hub.error && <p className="dh-alert dh-alert--error" role="alert">{hub.error}</p>}
      {status?.lastError && status.lastError !== hub.error && <p className="dh-alert dh-alert--warn" role="status">{status.lastError}</p>}

      {showSettings && hub.settings && <SettingsPanel settings={hub.settings} onSave={hub.updateSettings} onClose={() => setShowSettings(false)} />}

      {hub.snapshot && <SummaryStrip summary={hub.snapshot.summary} />}
      <FilterBar value={filter} counts={counts} onChange={setFilter} />

      {hub.loading ? (
        <div className="dh-empty" role="status">Cihazlar taranıyor…</div>
      ) : visible.length === 0 ? (
        <div className="dh-empty">{devices.length === 0 ? 'Henüz çevre birimi algılanmadı.' : 'Bu filtreye uyan cihaz yok.'}</div>
      ) : (
        <div className="dh-grid">
          {visible.map((d) => (
            <DeviceCard key={d.id} device={d} onOpen={setSelectedId} />
          ))}
        </div>
      )}

      {selected && <DeviceDetailPanel device={selected} onClose={() => setSelectedId(null)} />}

      {hub.notifications.length > 0 && (
        <div className="dh-toasts" aria-live="polite">
          {hub.notifications.map((n) => (
            <div key={n.timestamp} className={`dh-toast dh-toast--${n.type}`}>
              <div>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
              </div>
              <button type="button" className="dh-btn dh-btn--ghost" onClick={() => hub.dismissNotification(n.timestamp)} aria-label="Bildirimi kapat">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DeviceHubPage;
