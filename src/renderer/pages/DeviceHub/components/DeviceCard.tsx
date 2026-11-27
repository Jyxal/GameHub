import type { JSX } from 'react';
import type { DeviceInfo } from '../../../../shared/device-hub/types';
import { CATEGORY_LABEL, CONNECTION_LABEL, formatRelative, STATUS_LABEL } from '../format';
import { getProductImage } from '../productImages';
import { BatteryBar } from './BatteryBar';
import { CategoryIcon } from './CategoryIcon';

export function DeviceCard({ device, onOpen }: { device: DeviceInfo; onOpen: (id: string) => void }): JSX.Element {
  const image = getProductImage(device);
  const connected = device.connectionStatus === 'connected';
  const title = [device.brand, device.model].filter(Boolean).join(' ');
  return (
    <article className={`dh-card${connected ? '' : ' dh-card--off'}`}>
      <button type="button" className="dh-card__hit" onClick={() => onOpen(device.id)} aria-label={`${device.displayName} ayrıntıları`}>
        <div className="dh-card__head">
          <div className="dh-card__media">
            {image ? <img src={image} alt="" className="dh-card__img" /> : <CategoryIcon category={device.category} />}
          </div>
          <div className="dh-card__titles">
            <h3 className="dh-card__name" title={device.displayName}>{device.displayName}</h3>
            <p className="dh-card__sub">{title && title !== device.displayName ? title : CATEGORY_LABEL[device.category]}</p>
          </div>
          <span className={`dh-status dh-status--${device.connectionStatus}`}>
            <span className="dh-status__dot" aria-hidden="true" />
            {STATUS_LABEL[device.connectionStatus]}
          </span>
        </div>
        <div className="dh-card__tags">
          <span className="dh-tag">{CATEGORY_LABEL[device.category]}</span>
          <span className="dh-tag">{CONNECTION_LABEL[device.connectionType]}</span>
        </div>
        {device.battery !== null && <BatteryBar battery={device.battery} compact />}
        <p className="dh-card__updated">Son güncelleme: {formatRelative(device.battery?.lastUpdated ?? device.lastUpdated)}</p>
      </button>
    </article>
  );
}
