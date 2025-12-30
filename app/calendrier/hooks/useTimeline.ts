import { useState, useRef, useCallback, useEffect } from 'react';
import { format, isWeekend } from 'date-fns';
import { CELL_WIDTH, WINDOW_SIZE, DAYS_TO_ADD, DAY_MS } from '../utils/constants';

interface UseTimelineProps {
  isDisplayWeekend: boolean;
  selectedDate: number;
  viewType: string;
}

export const useTimeline = ({ isDisplayWeekend, selectedDate, viewType }: UseTimelineProps) => {
  const [days, setDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScrollReady, setIsScrollReady] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  
  // **NOUVEAU**: Queue de navigation en attente
  const pendingNavigationRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs pour le scroll performance
  const isProcessingInfiniteScroll = useRef(false);
  const isInfiniteScrollEnabled = useRef(false);
  const isAutoScrolling = useRef(false);
  const throttledScrollHandler = useRef<(() => void) | null>(null);

  const buildWindow = useCallback((centerDate: number) => {
    const startDate = centerDate - Math.floor(WINDOW_SIZE / 2) * DAY_MS;
    const windowDays: number[] = [];
    let cursor = startDate;

    while (windowDays.length < WINDOW_SIZE) {
      if (isDisplayWeekend || !isWeekend(cursor)) {
        windowDays.push(cursor);
      }
      cursor += DAY_MS;
    }

    return windowDays;
  }, [isDisplayWeekend]);

  // --- Logique d'ajout de jours ---
  const addDaysToTimeline = useCallback((direction: 'left' | 'right') => {
    const scrollElement = mainScrollRef.current;
    if (!scrollElement) return;

    const previousScrollLeft = scrollElement.scrollLeft;

    setDays((prevDays) => {
      if (prevDays.length === 0) return prevDays;

      let newDays: number[] = [];
      const referenceDate = direction === 'right' ? prevDays[prevDays.length - 1] : prevDays[0];
      const modifier = direction === 'right' ? 1 : -1;

      // Génération optimisée des jours
      let currentDate = referenceDate + modifier * DAY_MS;
      while (newDays.length < DAYS_TO_ADD) {
        if (isDisplayWeekend || !isWeekend(currentDate)) {
             direction === 'right' ? newDays.push(currentDate) : newDays.unshift(currentDate);
        }
        currentDate = currentDate + modifier * DAY_MS;
      }

      let combined = direction === 'right' ? [...prevDays, ...newDays] : [...newDays, ...prevDays];
      let removedLeft = 0;
      let removedRight = 0;

      if (combined.length > WINDOW_SIZE) {
        const overflow = combined.length - WINDOW_SIZE;
        if (direction === 'right') {
          removedLeft = overflow;
          combined = combined.slice(overflow);
        } else {
          removedRight = overflow;
          combined = combined.slice(0, combined.length - overflow);
        }
      }

      const netLeftShift = direction === 'left' ? Math.max(newDays.length - removedRight, 0) : -removedLeft;

      // Ajustement du scroll après rendu
      queueMicrotask(() => {
        if (scrollElement && scrollElement.isConnected && netLeftShift !== 0) {
          scrollElement.scrollLeft = previousScrollLeft + (netLeftShift * CELL_WIDTH);
        }
        setTimeout(() => { isProcessingInfiniteScroll.current = false; }, 100);
      });

      return combined;
    });
  }, [isDisplayWeekend]);

  // --- Gestionnaire de Scroll Throttlé ---
  // if (!throttledScrollHandler.current) {
  //   let rafId: number | null = null;
  //   let lastProcessTime = 0;

  //   throttledScrollHandler.current = () => {
  //       if (rafId || isProcessingInfiniteScroll.current || !isInfiniteScrollEnabled.current || isAutoScrolling.current) return;
        
  //       const now = performance.now();
  //       if (now - lastProcessTime < 16) return;

  //       rafId = requestAnimationFrame(() => {
  //           rafId = null;
  //           lastProcessTime = performance.now();
  //           const el = mainScrollRef.current;
  //           if (!el) return;

  //           const { scrollLeft, scrollWidth, clientWidth } = el;
  //           const scrollableWidth = scrollWidth - clientWidth;
  //           const percentage = (scrollLeft / scrollableWidth) * 100;

  //           if (percentage >= 85) {
  //               isProcessingInfiniteScroll.current = true;
  //               addDaysToTimeline('right');
  //           } else if (percentage <= 15) {
  //               isProcessingInfiniteScroll.current = true;
  //               addDaysToTimeline('left');
  //           }
  //       });
  //   };
  // }

  const handleScroll = useCallback(() => {
      throttledScrollHandler.current?.();
  }, []);

  // --- **NOUVELLE FONCTION**: Exécution de la navigation vers une date ---
  const executeGoToDate = useCallback((date: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const scrollElement = mainScrollRef.current;
      
      if (!scrollElement) {
        resolve(false);
        return;
      }
      
      setIsLoading(true);
    
    // Calcul fenêtre initiale
    const newTimeline = buildWindow(date);

    setDays(newTimeline);

    // Centrage visuel
    queueMicrotask(() => {
        requestAnimationFrame(() => {
            const todayCell = document.getElementById(format(date, "yyyy-MM-dd"));
            if (todayCell && scrollElement) {
                isAutoScrolling.current = true;
                const cellRect = todayCell.getBoundingClientRect();
                const containerRect = scrollElement.getBoundingClientRect();
                const targetLeft = scrollElement.scrollLeft + cellRect.left - containerRect.left - (scrollElement.clientWidth / 2) + (todayCell.clientWidth / 2);
                
                scrollElement.scrollTo({ left: targetLeft, behavior: 'smooth' });
                setTimeout(() => {
                    isAutoScrolling.current = false;
                    isInfiniteScrollEnabled.current = true;
                    setIsLoading(false);
                    resolve(true);
                }, 800);
            } else {
                 isInfiniteScrollEnabled.current = true;
                 setIsLoading(false);
                 resolve(true);
            }
        });
    });
    });
  }, [isDisplayWeekend, buildWindow]);

  useEffect(() => {
    if (days.length > 0 && mainScrollRef.current) {
      isInfiniteScrollEnabled.current = true;
    }
  }, [days]);

  // --- **FONCTION PUBLIQUE**: Navigation avec retry automatique ---
  const goToDate = useCallback(async (date: number) => {
    
    // Annuler tout retry en cours
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Tentative immédiate
    const success = await executeGoToDate(date);
    
    if (!success) {
      // Stocker la date pour retry
      pendingNavigationRef.current = date;
      
      // Retry avec timeout croissant (100ms, 200ms, 400ms max)
      let attempts = 0;
      const maxAttempts = 3;
      
      const retry = async () => {
        attempts++;
        
        if (pendingNavigationRef.current && attempts <= maxAttempts) {
          const retrySuccess = await executeGoToDate(pendingNavigationRef.current);
          
          if (retrySuccess) {
            pendingNavigationRef.current = null;
          } else {
            const delay = Math.min(100 * Math.pow(2, attempts - 1), 400);
            retryTimeoutRef.current = setTimeout(retry, delay);
          }
        } else if (attempts > maxAttempts) {
          pendingNavigationRef.current = null;
          setIsLoading(false);
        }
      };
      
      retryTimeoutRef.current = setTimeout(retry, 100);
    }
  }, [executeGoToDate]);

  // --- **NETTOYAGE**: Annuler les retries au démontage ---
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // --- Gestion Clavier Scroll ---
  const handleKeyboardScroll = useCallback((e: KeyboardEvent) => {
    const scroller = mainScrollRef.current;
    if (!scroller || !isInfiniteScrollEnabled.current) return;
      
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

    const step = CELL_WIDTH * (e.shiftKey ? 20 : 1);

    if (e.key === 'ArrowLeft') {
      scroller.scrollLeft = Math.max(0, scroller.scrollLeft - step);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      const max = scroller.scrollWidth - scroller.clientWidth;
      scroller.scrollLeft = Math.min(max, scroller.scrollLeft + step);
      e.preventDefault();
    }

    // Déclenche manuellement le handler infini pour les scrolls clavier maintenus
    throttledScrollHandler.current?.();
  }, []);

  

  // Callback pour notifier que l'élément de scroll est monté
  const onScrollElementMounted = useCallback(() => {
    setIsScrollReady(true);
  }, []);

  useEffect(() => {
    if(viewType !== 'calendar') return;
    // Optimisation : pré-calculer les constantes une seule fois
    
    const date = selectedDate;        
    const newTimeline = buildWindow(date);

    setDays(newTimeline);
  }, [isDisplayWeekend, buildWindow, selectedDate]);

  return {
    days,
    setDays,
    scrollRef: mainScrollRef,
    handleScroll,
    goToDate,
    isLoading,
    isScrollReady,
    onScrollElementMounted,
    handleKeyboardScroll,
  };
};