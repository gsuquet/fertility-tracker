import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A toast message that hides itself `durationMs` after the last call of `showToast`.
 * The timer is cancelled when the component unmounts.
 */
export const useToast = (durationMs: number) => {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showToast = useCallback(
    (text: string) => {
      clearTimeout(timer.current);
      setMessage(text);
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs]
  );

  return [message, showToast] as const;
};
