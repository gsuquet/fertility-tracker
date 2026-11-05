/** The QR code of the invitation link. See docs/reference/screens/settings.md#qr-code. */
import type React from 'react';
import { useMemo } from 'react';
import { qrMatrix } from './qrMatrix';

/** The light modules around the code, as the standard asks */
const QUIET_ZONE = 4;

interface QrCodeProps {
  text: string;
  /** The accessible name of the image */
  label: string;
}

export const QrCode: React.FC<QrCodeProps> = ({ text, label }) => {
  const modules = useMemo(() => qrMatrix(text), [text]);
  if (!modules) return null;
  const size = modules.length + QUIET_ZONE * 2;
  const path = modules
    .flatMap((row, y) =>
      row.map((dark, x) => (dark ? `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z` : ''))
    )
    .join('');
  return (
    <svg
      className="sync-qr"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect className="sync-qr-light" width={size} height={size} />
      <path className="sync-qr-dark" d={path} />
    </svg>
  );
};
