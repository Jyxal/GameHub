import type { JSX } from 'react';
import type { DeviceHubSummary } from '../../../../shared/device-hub/types';

export function SummaryStrip({ summary }: { summary: DeviceHubSummary }): JSX.Element {
  const items: Array<{ label: string; value: number; tone?: string }> = [
    { label: 'Toplam', value: summary.total },
    { label: 'Bağlı', value: summary.connected, tone: 'ok' },
    { label: 'Kablosuz', value: summary.wireless },
    { label: 'Kablolu', value: summary.wired },
    { label: 'Pil bilgisi olan', value: summary.withBattery },
    { label: 'Düşük pil', value: summary.lowBattery, tone: summary.lowBattery > 0 ? 'warn' : undefined },
  ];
  return (
    <section className="dh-summary" aria-label="Cihaz özeti">
      {items.map((it) => (
        <div key={it.label} className={`dh-summary__item${it.tone ? ` dh-summary__item--${it.tone}` : ''}`}>
          <span className="dh-summary__value">{it.value}</span>
          <span className="dh-summary__label">{it.label}</span>
        </div>
      ))}
    </section>
  );
}
