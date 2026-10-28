import type React from 'react';

/** Sprout logo on its ink tile. public/icons/logo.svg is the same drawing. */
export const BrandMark: React.FC = () => (
  <svg aria-hidden="true" className="brand-mark" viewBox="0 0 64 64">
    <rect className="brand-mark-tile" width="64" height="64" rx="14" />
    <path className="brand-mark-stem" d="M32 52V33" />
    <path className="brand-mark-leaf" d="M31 37C20 37 13 30 13 19c11 0 18 7 18 18z" />
    <path className="brand-mark-leaf-light" d="M33 32c0-12 7-20 19-20 0 12-7 20-19 20z" />
  </svg>
);
