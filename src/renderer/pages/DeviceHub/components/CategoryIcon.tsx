import type { JSX } from 'react';
import type { DeviceCategory } from '../../../../shared/device-hub/types';

const PATHS: Record<DeviceCategory, JSX.Element> = {
  mouse: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="6" />
      <path d="M12 2.5v6.5M6 9h12" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
    </>
  ),
  headset: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="2.5" y="14" width="4.5" height="7" rx="1.5" />
      <rect x="17" y="14" width="4.5" height="7" rx="1.5" />
    </>
  ),
  microphone: (
    <>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21.5M8.5 21.5h7" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 7h10a5 5 0 0 1 4.9 6l-.8 4a2.5 2.5 0 0 1-4.3 1.2L14.5 16h-5l-2.3 2.2a2.5 2.5 0 0 1-4.3-1.2l-.8-4A5 5 0 0 1 7 7Z" />
      <path d="M7.5 10.5v3M6 12h3M15.5 11h.01M17.5 13h.01" />
    </>
  ),
  joystick: (
    <>
      <circle cx="12" cy="5.5" r="2.5" />
      <path d="M12 8v8M4 19.5h16v-1.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2Z" />
    </>
  ),
  webcam: (
    <>
      <circle cx="12" cy="10" r="7" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8 21.5h8M12 17v4.5" />
    </>
  ),
  speaker: (
    <>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <circle cx="12" cy="14.5" r="3.5" />
      <path d="M12 6.5h.01" />
    </>
  ),
  usb: (
    <>
      <path d="M12 2.5v15M12 17.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
      <path d="M12 13l-4-3V7.5M12 11l4-2.5V6" />
      <rect x="6.5" y="5" width="3" height="2.5" />
      <circle cx="16" cy="5" r="1.2" />
    </>
  ),
  bluetooth: <path d="m7 7 10 10-5 4.5V2.5L17 7 7 17" />,
  'wireless-receiver': (
    <>
      <rect x="8" y="9" width="8" height="12.5" rx="1.5" />
      <path d="M10.5 9V6.5h3V9M8.5 4.5a5 5 0 0 1 7 0M6.5 2.5a8 8 0 0 1 11 0" />
    </>
  ),
  other: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
};

export function CategoryIcon({ category, size = 28 }: { category: DeviceCategory; size?: number }): JSX.Element {
  return (
    <svg
      className="dh-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[category] ?? PATHS.other}
    </svg>
  );
}
