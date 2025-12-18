import { useState, useRef, useCallback, useEffect } from 'react';
import { addDays, format, isWeekend } from 'date-fns';
import { CELL_WIDTH, WINDOW_SIZE, DAYS_TO_ADD } from '../utils/constants';
import { eachDayOfInterval } from '../utils/dates';

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
  const lastScrollCheck = useRef(0);
  const lastScrollTop = useRef(0);
  const isInfiniteScrollEnabled = useRef(false);
  const isAutoScrolling = useRef(false);
  const isArrowKeyPressed = useRef(false);
  const arrowKeyDirection = useRef<'left' | 'right' | null>(null);
  const throttledScrollHandler = useRef<(() => void) | null>(null);

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
      let currentDate = referenceDate + modifier * 86400000; // +1 jour en ms
      while (newDays.length < DAYS_TO_ADD) {
        if (isDisplayWeekend || !isWeekend(currentDate)) {
             direction === 'right' ? newDays.push(currentDate) : newDays.unshift(currentDate);
        }
        currentDate = currentDate + modifier * 86400000;
      }

      // Ajustement du scroll après rendu
      queueMicrotask(() => {
        if (scrollElement && scrollElement.isConnected) {
          if (direction === 'left') {
             scrollElement.scrollLeft = previousScrollLeft + (newDays.length * CELL_WIDTH);
          }
          // Pas d'ajustement nécessaire pour la droite car on n'enlève plus d'éléments
        }
        setTimeout(() => { isProcessingInfiniteScroll.current = false; }, 100);
      });

      // On accumule les jours sans les supprimer (plus de slice)
      const combined = direction === 'right' ? [...prevDays, ...newDays] : [...newDays, ...prevDays];
      return combined;
    });
  }, [isDisplayWeekend]);

  // --- Gestionnaire de Scroll Throttlé ---
  if (!throttledScrollHandler.current) {
    let rafId: number | null = null;
    let lastProcessTime = 0;

    throttledScrollHandler.current = () => {
        if (rafId || isProcessingInfiniteScroll.current || !isInfiniteScrollEnabled.current || isAutoScrolling.current) return;
        
        const now = performance.now();
        if (now - lastProcessTime < 16) return;

        rafId = requestAnimationFrame(() => {
            rafId = null;
            lastProcessTime = performance.now();
            const el = mainScrollRef.current;
            if (!el) return;

            const { scrollLeft, scrollWidth, clientWidth } = el;
            const scrollableWidth = scrollWidth - clientWidth;
            const percentage = (scrollLeft / scrollableWidth) * 100;

            if (percentage >= 85) {
                isProcessingInfiniteScroll.current = true;
                addDaysToTimeline('right');
            } else if (percentage <= 15) {
                isProcessingInfiniteScroll.current = true;
                addDaysToTimeline('left');
            }
        });
    };
  }

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
    const halfWindow = Math.floor(WINDOW_SIZE / 2);
    const startDate = date - halfWindow * 86400000;
    const endDate = date + halfWindow * 86400000;
    
    let newTimeline: number[] = [];
    let curr = startDate;
    while (curr <= endDate) {
        if (isDisplayWeekend || !isWeekend(curr)) newTimeline.push(curr);
        curr = curr + 86400000;
    }

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
                 setIsLoading(false);
                 resolve(true);
            }
        });
    });
    });
  }, [isDisplayWeekend]);

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
      if (!mainScrollRef.current || !isInfiniteScrollEnabled.current) return;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const direction = e.key === 'ArrowRight' ? 1 : -1;
          mainScrollRef.current.scrollLeft += (100 * direction);
          
          if (!isArrowKeyPressed.current) {
              isArrowKeyPressed.current = true;
              arrowKeyDirection.current = direction === 1 ? 'right' : 'left';
              throttledScrollHandler.current?.();
          }
      }
  }, []);

  const handleKeyboardScrollStop = useCallback((e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          isArrowKeyPressed.current = false;
      }
  }, []);

  // Callback pour notifier que l'élément de scroll est monté
  const onScrollElementMounted = useCallback(() => {
    setIsScrollReady(true);
  }, []);

  useEffect(() => {
    if(viewType !== 'calendar') return;
    // Optimisation : pré-calculer les constantes une seule fois
    const date = selectedDate;
    const halfWindow = Math.floor(WINDOW_SIZE / 2);
    const startDate = days[0] || date - halfWindow * 86400000;
    const endDate = days[days.length -1] || date + halfWindow * 86400000;

    // Optimisation : construction directe selon includeWeekend
    let newTimeline: number[];

    if (isDisplayWeekend) {
      newTimeline = eachDayOfInterval({ start: startDate, end: endDate });
    } else {
      newTimeline = [];
      let currentDate = startDate;
      while (currentDate <= endDate) {
        if (!isWeekend(currentDate)) {
          newTimeline.push(currentDate);
        }
        currentDate = currentDate + 86400000;
      }
    }

    setDays(newTimeline);
  }, [isDisplayWeekend]);

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
    handleKeyboardScrollStop
  };
};