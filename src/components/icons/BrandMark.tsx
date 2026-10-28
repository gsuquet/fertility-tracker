import type React from 'react';

/**
 * Sprout logo on its ink tile. public/icons/logo.svg is the same drawing.
 * The fill attributes are its light colors; the classes give the theme colors in header.css.
 */
export const BrandMark: React.FC = () => (
  <svg aria-hidden="true" className="brand-mark" viewBox="0 0 64 64">
    <rect className="brand-mark-tile" width="64" height="64" rx="14" fill="#1f3a5f" />
    <path
      className="brand-mark-stem"
      d="M32 52V33"
      fill="none"
      stroke="#ffffff"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      className="brand-mark-leaf"
      d="M31 37C20 37 13 30 13 19c11 0 18 7 18 18z"
      fill="#86efac"
    />
    <path
      className="brand-mark-leaf-light"
      d="M33 32c0-12 7-20 19-20 0 12-7 20-19 20z"
      fill="#bbf7d0"
    />
  </svg>
);
