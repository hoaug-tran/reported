import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface ScrollContextValue {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  isAtTop: boolean;
  isAtBottom: boolean;
  canScroll: boolean;
}

const ScrollContext = createContext<ScrollContextValue | null>(null);

export const ScrollProvider: React.FC<{
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}> = ({ scrollContainerRef, children }) => {
  const [canScroll, setCanScroll] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const scrollable = scrollHeight > clientHeight + 40;
    setCanScroll(scrollable);
    setIsAtTop(scrollTop <= 20);
    setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 20);
  }, [scrollContainerRef]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [scrollContainerRef, updateScrollState]);

  const scrollToTop = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTo({ top: 0, behavior });
      }
    },
    [scrollContainerRef],
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior });
      }
    },
    [scrollContainerRef],
  );

  return (
    <ScrollContext.Provider
      value={{
        scrollContainerRef,
        scrollToTop,
        scrollToBottom,
        isAtTop,
        isAtBottom,
        canScroll,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
};

export const useScrollContext = (): ScrollContextValue => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error("useScrollContext must be used within a ScrollProvider");
  }
  return context;
};
