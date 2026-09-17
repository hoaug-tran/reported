import { useEffect, useRef } from "react";
import { useScrollContext } from "../contexts/ScrollContext";

interface UseAutoScrollToBottomOptions {
  isReady: boolean;
  key?: string | number;
}

export const useAutoScrollToBottomOnLoad = ({
  isReady,
  key,
}: UseAutoScrollToBottomOptions): void => {
  const { scrollContainerRef, scrollToBottom } = useScrollContext();
  const lastScrolledKeyRef = useRef<string | number | undefined>(undefined);
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleUserInteraction = () => {
      isUserInteractingRef.current = true;
    };

    container.addEventListener("wheel", handleUserInteraction, { passive: true });
    container.addEventListener("touchstart", handleUserInteraction, { passive: true });
    container.addEventListener("keydown", handleUserInteraction, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleUserInteraction);
      container.removeEventListener("touchstart", handleUserInteraction);
      container.removeEventListener("keydown", handleUserInteraction);
    };
  }, [scrollContainerRef]);

  useEffect(() => {
    if (!isReady) return;
    if (lastScrolledKeyRef.current === key) return;

    lastScrolledKeyRef.current = key;
    isUserInteractingRef.current = false;

    const container = scrollContainerRef.current;
    if (!container) return;

    const timerId = window.setTimeout(() => {
      if (isUserInteractingRef.current) return;
      scrollToBottom("smooth");
    }, 180);

    return () => {
      clearTimeout(timerId);
    };
  }, [isReady, key, scrollContainerRef, scrollToBottom]);
};
