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

    let rafId: number | null = null;
    let timeoutId: number | null = null;
    let observer: ResizeObserver | null = null;
    let previousHeight = container.scrollHeight;

    const performScroll = () => {
      if (isUserInteractingRef.current) return;
      scrollToBottom("auto");
    };

    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => {
        performScroll();
      });
    });

    observer = new ResizeObserver(() => {
      if (isUserInteractingRef.current) return;
      if (container.scrollHeight > previousHeight) {
        previousHeight = container.scrollHeight;
        performScroll();
      }
    });

    observer.observe(container);
    if (container.firstElementChild) {
      observer.observe(container.firstElementChild);
    }

    timeoutId = window.setTimeout(() => {
      if (observer) {
        observer.disconnect();
      }
    }, 2000);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (observer) observer.disconnect();
    };
  }, [isReady, key, scrollContainerRef, scrollToBottom]);
};
