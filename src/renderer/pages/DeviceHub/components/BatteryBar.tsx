import type { JSX } from 'react';
import type { BatteryInfo } from '../../../../shared/device-hub/types';
import { formatRelative, LEVEL_LABEL } from '../format';

/** Yalnızca battery !== null olduğunda çağrılmalıdır. */
export function BatteryBar({ battery, compact = false }: { battery: BatteryInfo; compact?: boolean }): JSX.Element {
  if (!battery.dataAvailable || battery.percentage === null) {
    return (
      <div className="dh-battery dh-battery--unavailable" role="status">
        <span className="dh-battery__reason">Pil bilgisi alınamıyor: {battery.unavailableReason ?? 'neden bilinmiyor'}</span>
        {battery.stale && typeof battery.lastKnownPercentage === 'number' && (
          <span className="dh-battery__stale">
            Son bilinen: %{battery.lastKnownPercentage} ({formatRelative(battery.lastKnownAt)}) — güncel değil
          </span>
        )}
      </div>
    );
  }
  const pct = battery.percentage;
  return (
    <div className={`dh-battery dh-battery--${battery.level}`}>
      <div className="dh-battery__row">
        <span className="dh-battery__pct">%{pct}</span>
        {!compact && <span className="dh-battery__level">{LEVEL_LABEL[battery.level]}</span>}
        {battery.isCharging === true && <span className="dh-battery__charging" title="Şarj oluyor">⚡ Şarj oluyor</span>}
      </div>
      <div
        className="dh-battery__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Pil seviyesi yüzde ${pct}`}
      >
        <div className="dh-battery__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
