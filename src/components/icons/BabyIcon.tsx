import type React from 'react';

/** Baby figure of the white and light green stamps: a round head with a curl and a swaddled body */
export const BabyIcon: React.FC = () => (
  <svg aria-hidden="true" className="baby-svg" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="7.2" r="4.6" />
    <path
      d="M10.4 3.1c.3-1.9 2.9-2.6 4.1-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path d="M12 12.6c4.1 0 6.4 2.6 6.4 5.3 0 2.8-3 4.5-6.4 4.5s-6.4-1.7-6.4-4.5c0-2.7 2.3-5.3 6.4-5.3z" />
  </svg>
);
