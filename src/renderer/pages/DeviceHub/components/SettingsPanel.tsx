import { useEffect, useState, type JSX } from 'react';
import { SETTINGS_LIMITS, type DeviceHubNotificationSettings, type DeviceHubSettings, type DeviceHubSettingsPatch } from '../../../../shared/device-hub/types';

const NOTIF_LABELS: Record<keyof DeviceHubNotificationSettings, string> = {
  lowBattery: 'Düşük pil',
  criticalBattery: 'Kritik pil',
  deviceDisconnected: 'Cihaz bağlantısı kesildi',
  deviceReconnected: 'Cihaz yeniden bağlandı',
  newDevice: 'Yeni cihaz algılandı',
  batteryUnavailable: 'Pil bilgisi alınamıyor',
};

interface Props {
  settings: DeviceHubSettings;
  onSave: (patch: DeviceHubSettingsPatch) => Promise<string | null>;
  onClose: () => void;
}

export function SettingsPanel({ settings, onSave, onClose }: Props): JSX.Element {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  const num = (key: 'lowBatteryThreshold' | 'criticalBatteryThreshold', v: string) => setDraft((d) => ({ ...d, [key]: Number(v) }));
  const sec = (key: 'batteryPollIntervalMs' | 'devicePollIntervalMs', v: string) => setDraft((d) => ({ ...d, [key]: Math.round(Number(v) * 1000) }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const err = await onSave({
      lowBatteryThreshold: draft.lowBatteryThreshold,
      criticalBatteryThreshold: draft.criticalBatteryThreshold,
      batteryPollIntervalMs: draft.batteryPollIntervalMs,
      devicePollIntervalMs: draft.devicePollIntervalMs,
      notifications: draft.notifications,
    });
    setSaving(false);
    setError(err);
    setSaved(err === null);
  };

  return (
    <section className="dh-settings" aria-label="Device Hub ayarları">
      <header className="dh-settings__head">
        <h2>Ayarlar</h2>
        <button type="button" className="dh-btn dh-btn--ghost" onClick={onClose} aria-label="Ayarları kapat">✕</button>
      </header>
      <div className="dh-settings__grid">
        <label className="dh-field">
          <span>Düşük pil eşiği (%)</span>
          <input type="number" min={SETTINGS_LIMITS.thresholdMin} max={SETTINGS_LIMITS.thresholdMax} value={draft.lowBatteryThreshold} onChange={(e) => num('lowBatteryThreshold', e.target.value)} />
        </label>
        <label className="dh-field">
          <span>Kritik pil eşiği (%)</span>
          <input type="number" min={SETTINGS_LIMITS.thresholdMin} max={SETTINGS_LIMITS.thresholdMax} value={draft.criticalBatteryThreshold} onChange={(e) => num('criticalBatteryThreshold', e.target.value)} />
        </label>
        <label className="dh-field">
          <span>Pil sorgulama aralığı (sn)</span>
          <input type="number" min={SETTINGS_LIMITS.batteryPollMinMs / 1000} max={SETTINGS_LIMITS.batteryPollMaxMs / 1000} value={draft.batteryPollIntervalMs / 1000} onChange={(e) => sec('batteryPollIntervalMs', e.target.value)} />
        </label>
        <label className="dh-field">
          <span>Yedek cihaz tarama aralığı (sn)</span>
          <input type="number" min={SETTINGS_LIMITS.devicePollMinMs / 1000} max={SETTINGS_LIMITS.devicePollMaxMs / 1000} value={draft.devicePollIntervalMs / 1000} onChange={(e) => sec('devicePollIntervalMs', e.target.value)} />
        </label>
      </div>
      <fieldset className="dh-settings__notifs">
        <legend>Bildirimler</legend>
        {(Object.keys(NOTIF_LABELS) as Array<keyof DeviceHubNotificationSettings>).map((k) => (
          <label key={k} className="dh-toggle">
            <input type="checkbox" checked={draft.notifications[k]} onChange={(e) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, [k]: e.target.checked } }))} />
            <span className="dh-toggle__track" aria-hidden="true" />
            <span>{NOTIF_LABELS[k]}</span>
          </label>
        ))}
      </fieldset>
      <p className="dh-settings__hint">Pil seviyesi renkleri sabittir: %80–100 yüksek, %50–79 orta, %20–49 düşük, %1–19 kritik. Eşikler yalnızca bildirimleri ve "Düşük pil" filtresini etkiler.</p>
      {error && <p className="dh-alert dh-alert--error" role="alert">{error}</p>}
      {saved && <p className="dh-alert dh-alert--ok" role="status">Ayarlar kaydedildi.</p>}
      <div className="dh-settings__actions">
        <button type="button" className="dh-btn dh-btn--primary" onClick={save} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </div>
    </section>
  );
}
