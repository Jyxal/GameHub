import { useEffect, useRef, type JSX } from 'react';
import type { DeviceInfo } from '../../../../shared/device-hub/types';
import {
  BRAND_CONFIDENCE_LABEL,
  CATEGORY_LABEL,
  CONNECTION_LABEL,
  formatDateTime,
  formatVidPid,
  LEVEL_LABEL,
  STATUS_LABEL,
} from '../format';
import { BatteryBar } from './BatteryBar';
import { CategoryIcon } from './CategoryIcon';

export function DeviceDetailPanel({ device, onClose }: { device: DeviceInfo; onClose: () => void }): JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows: Array<[string, string]> = [
    ['Marka', device.brand ?? 'Bilinmiyor'],
    ['Marka tanıma', BRAND_CONFIDENCE_LABEL[device.brandConfidence]],
    ['Model', device.model ?? '—'],
    ['Üretici (Windows)', device.manufacturer ?? '—'],
    ['Kategori', CATEGORY_LABEL[device.category]],
    ['Bağlantı türü', CONNECTION_LABEL[device.connectionType]],
    ['Durum', STATUS_LABEL[device.connectionStatus]],
    ['VID:PID', formatVidPid(device.vendorId, device.productId)],
    ['Seri numarası', device.serialNumber ?? '—'],
    ['Sağlayıcı', device.providerId],
    ['İlk görülme', formatDateTime(device.firstSeen)],
    ['Son bağlı görülme', formatDateTime(device.lastSeenConnected || null)],
    ['Son güncelleme', formatDateTime(device.lastUpdated)],
  ];
  const b = device.battery;
  if (b) {
    rows.push(['Pil seviyesi', b.dataAvailable ? LEVEL_LABEL[b.level] : 'Alınamıyor']);
    rows.push(['Şarj durumu', b.isCharging === null ? 'Bilinmiyor' : b.isCharging ? 'Şarj oluyor' : 'Şarj olmuyor']);
    if (b.source) rows.push(['Pil veri kaynağı', b.source]);
    rows.push(['Pil son okuma', formatDateTime(b.lastUpdated)]);
  } else {
    rows.push(['Pil', 'Uygulanmaz (pil göstergesi yok)']);
  }

  return (
    <div className="dh-overlay" role="presentation" onClick={onClose}>
      <aside className="dh-detail" role="dialog" aria-modal="true" aria-label={`${device.displayName} ayrıntıları`} onClick={(e) => e.stopPropagation()}>
        <header className="dh-detail__head">
          <div className="dh-card__media dh-card__media--lg">
            <CategoryIcon category={device.category} size={36} />
          </div>
          <div>
            <h2 className="dh-detail__title">{device.displayName}</h2>
            <p className="dh-card__sub">{CATEGORY_LABEL[device.category]} · {CONNECTION_LABEL[device.connectionType]}</p>
          </div>
          <button ref={closeRef} type="button" className="dh-btn dh-btn--ghost dh-detail__close" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </header>
        {b && <BatteryBar battery={b} />}
        <dl className="dh-detail__grid">
          {rows.map(([k, v]) => (
            <div key={k} className="dh-detail__row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h3 className="dh-detail__section">Donanım bilgisi</h3>
        <dl className="dh-detail__grid">
          {Object.entries(device.hardwareInfo).map(([k, v]) => (
            <div key={k} className="dh-detail__row">
              <dt>{k}</dt>
              <dd className="dh-mono">{v}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
