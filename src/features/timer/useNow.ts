import { useEffect, useState } from 'react';

/**
 * Returns the current epoch ms, re-rendering every second while `active`.
 * The timer's truth is always timestamps — this only drives the display, so
 * backgrounding or sleeping the device never loses or drifts time.
 */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return now;
}
