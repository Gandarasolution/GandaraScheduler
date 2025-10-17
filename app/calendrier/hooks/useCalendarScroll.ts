/**
 * Hook personnalisé pour gérer le scroll infini du calendrier
 * Extrait la logique complexe du composant principal
 */

import { useRef, useCallback, MutableRefObject, useEffect } from 'react';

interface UseCalendarScrollProps {
  isInfiniteScrollEnabled: MutableRefObject<boolean>;
  isAutoScrolling: MutableRefObject<boolean>;
  isArrowKeyPressed: MutableRefObject<boolean>;
  arrowKeyDirection: MutableRefObject<'left' | 'right' | null>;
  mainScrollRef: MutableRefObject<HTMLDivElement | null>;
  addDaysToRight: () => void;
  addDaysToLeft: () => void;
}

export function useCalendarScroll({
  isInfiniteScrollEnabled,
  isAutoScrolling,
  isArrowKeyPressed,
  arrowKeyDirection,
  mainScrollRef,
  addDaysToRight,
  addDaysToLeft
}: UseCalendarScrollProps) {
  const lastScrollCheck = useRef<number>(0);
  const lastScrollTop = useRef<number>(0);
  const isProcessingInfiniteScroll = useRef<boolean>(false);
  const throttledScrollHandler = useRef<(() => void) | null>(null);

  // Initialiser le gestionnaire throttled
  useEffect(() => {
    if (throttledScrollHandler.current) return;

    let rafId: number | null = null;
    let lastProcessTime = 0;
    
    throttledScrollHandler.current = () => {
      // Early exits pour économiser les cycles
      if (rafId || isProcessingInfiniteScroll.current || !isInfiniteScrollEnabled.current || isAutoScrolling.current) return;
      
      // Throttling plus agressif - max 60fps
      const now = performance.now();
      if (now - lastProcessTime < 16) return;
      
      rafId = requestAnimationFrame(() => {
        rafId = null;
        lastProcessTime = performance.now();
        
        const scrollElement = mainScrollRef.current;
        if (!scrollElement) return;

        // Cache des propriétés pour éviter les reflows multiples
        const { scrollLeft, scrollWidth, clientWidth, scrollTop } = scrollElement;
        
        // Skip si scroll vertical détecté
        if (Math.abs(scrollTop - lastScrollTop.current) > Math.abs(scrollLeft - (lastScrollCheck.current || scrollLeft))) {
          lastScrollTop.current = scrollTop;
          return;
        }

        // Throttling temporel optimisé
        const timeDelta = now - lastScrollCheck.current;
        const minInterval = isArrowKeyPressed.current ? 50 : 150;
        if (timeDelta < minInterval) return;
        
        lastScrollCheck.current = now;
        
        // Early exit optimisé
        if (scrollWidth <= clientWidth) return;
        
        // Calcul de pourcentage avec mise en cache
        const scrollableWidth = scrollWidth - clientWidth;
        const scrollPercentage = (scrollLeft / scrollableWidth) * 100;

        // Seuils optimisés
        const isArrowRight = isArrowKeyPressed.current && arrowKeyDirection.current === 'right';
        const isArrowLeft = isArrowKeyPressed.current && arrowKeyDirection.current === 'left';
        const rightThreshold = isArrowRight ? 85 : 92;
        const leftThreshold = isArrowLeft ? 15 : 8;
        
        if (scrollPercentage >= rightThreshold) {
          isProcessingInfiniteScroll.current = true;
          addDaysToRight();
        } else if (scrollPercentage <= leftThreshold) {
          isProcessingInfiniteScroll.current = true;
          addDaysToLeft();
        }
      });
    };
  }, [isInfiniteScrollEnabled, isAutoScrolling, isArrowKeyPressed, arrowKeyDirection, mainScrollRef, addDaysToRight, addDaysToLeft]);

  const resetProcessingFlag = useCallback(() => {
    isProcessingInfiniteScroll.current = false;
  }, []);

  return {
    throttledScrollHandler,
    lastScrollCheck,
    lastScrollTop,
    isProcessingInfiniteScroll,
    resetProcessingFlag
  };
}
