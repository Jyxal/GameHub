import type { JSX } from 'react';
import { DEVICE_FILTERS, type DeviceFilter } from '../../../../shared/device-hub/types';
import { FILTER_LABEL } from '../format';

export function FilterBar({ value, counts, onChange }: { value: DeviceFilter; counts: Record<DeviceFilter, number>; onChange: (f: DeviceFilter) => void }): JSX.Element {
  return (
    <nav className="dh-filters" aria-label="Cihaz filtreleri">
      {DEVICE_FILTERS.map((f) => (
        <button key={f} type="button" className={`dh-chip${f === value ? ' dh-chip--active' : ''}`} aria-pressed={f === value} onClick={() => onChange(f)}>
          {FILTER_LABEL[f]}
          <span className="dh-chip__count">{counts[f]}</span>
        </button>
      ))}
    </nav>
  );
}
