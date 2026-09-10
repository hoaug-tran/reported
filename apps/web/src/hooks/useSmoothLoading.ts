import { useState, useEffect, useRef } from "react";

interface UseSmoothLoadingOptions {
  delay?: number;
  minDuration?: number;
}

export function useSmoothLoading(
  isLoading: boolean,
  options: UseSmoothLoadingOptions = {},
): boolean {
  const { delay = 160, minDuration = 280 } = options;
  const [showLoading, setShowLoading] = useState(false);
  const startTimeRef = useRef<number>(0);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      if (minTimerRef.current) {
        clearTimeout(minTimerRef.current);
        minTimerRef.current = null;
      }
      delayTimerRef.current = setTimeout(() => {
        startTimeRef.current = Date.now();
        setShowLoading(true);
      }, delay);
    } else {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }

      if (startTimeRef.current > 0) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, minDuration - elapsed);
        minTimerRef.current = setTimeout(() => {
          setShowLoading(false);
          startTimeRef.current = 0;
        }, remaining);
      } else {
        setShowLoading(false);
      }
    }

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (minTimerRef.current) clearTimeout(minTimerRef.current);
    };
  }, [isLoading, delay, minDuration]);

  return showLoading;
}
