import { useState, useRef, useCallback, useEffect } from 'react';
import { addDays, isSameDay, isWeekend, startOfDay } from 'date-fns';
import { CELL_WIDTH, WINDOW_SIZE } from '@/app/calendrier/utils/constants';

interface UseTimelineProps {
  isDisplayWeekend: boolean;
  selectedDate: number;
  setSelectedDate: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useTimeline = ({ isDisplayWeekend, selectedDate, setSelectedDate, isLoading, setIsLoading }: UseTimelineProps) => {
  const [days, setDays] = useState<number[]>([]);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  
  // **NOUVEAU**: Queue de navigation en attente
  //const pendingNavigationRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationSeqRef = useRef(0);
  
  const isInfiniteScrollEnabled = useRef(false);
  const isAutoScrolling = useRef(false);

  const normalizeDate = useCallback((timestamp: number) => startOfDay(timestamp).getTime(), []);

  const resolveTargetDate = useCallback((timestamp: number) => {
    let candidate = normalizeDate(timestamp);

    if (isDisplayWeekend) {
      return candidate;
    }

    // Si les week-ends sont masqués, on décale la navigation au prochain jour ouvré visible.
    while (isWeekend(candidate)) {
      candidate = addDays(candidate, 1).getTime();
    }

    return candidate;
  }, [isDisplayWeekend, normalizeDate]);
  

  const buildWindow = useCallback((centerDate: number) => {
    const shouldInclude = (ts: number) => isDisplayWeekend || !isWeekend(ts);

    const left: number[] = [];
    const right: number[] = [];
    const includeCenter = shouldInclude(centerDate);

    // Nombre de jours à placer de part et d'autre de la date cible
    const leftTarget = Math.floor(WINDOW_SIZE / 2);
    const rightTarget = WINDOW_SIZE - leftTarget - (includeCenter ? 1 : 0);

    // Fonction utilitaire pour ajouter/soustraire un jour en gérant l'heure d'été/hiver
    const addDays = (timestamp: number, days: number) => {
      const d = new Date(timestamp);
      d.setDate(d.getDate() + days);
      return d.getTime();
    };

    // Collecte des jours à gauche (ordre inverse pour garder l'ordre chronologique ensuite)
    let cursor = addDays(centerDate, -1);
    while (left.length < leftTarget) {
      if (shouldInclude(cursor)) {
        left.push(cursor);
      }
      cursor = addDays(cursor, -1);
    }

    // Collecte des jours à droite
    cursor = addDays(centerDate, 1);
    while (right.length < rightTarget) {
      if (shouldInclude(cursor)) {
        right.push(cursor);
      }
      cursor = addDays(cursor, 1);
    }

    return [
      ...left.reverse(),
      ...(includeCenter ? [centerDate] : []),
      ...right,
    ];
  }, [isDisplayWeekend]);

 
  // --- **NOUVELLE FONCTION**: Exécution de la navigation vers une date ---
  const executeGoToDate = useCallback((date: number): boolean => {
    const scrollElement = mainScrollRef.current;
    if (!scrollElement) {
      return false;
    }

    const navigationId = ++navigationSeqRef.current;
    const targetDate = resolveTargetDate(date);
    let timelineToUse = days;
    
    setIsLoading(true);

    const hasTargetInCurrentWindow = days.some((d) => isSameDay(d, targetDate));
    if (!hasTargetInCurrentWindow) {
      const newTimeline = buildWindow(targetDate);
      setDays(newTimeline);
      timelineToUse = newTimeline;
    }

    const targetIndex = timelineToUse.findIndex((d) => isSameDay(d, targetDate));
    if (targetIndex < 0) {
      isInfiniteScrollEnabled.current = true;
      setIsLoading(false);
      return false;
    }
    
    // Centrage visuel
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (navigationId !== navigationSeqRef.current) {
            return;
          }

          const currentScrollElement = mainScrollRef.current;
          if (!currentScrollElement) {
              isInfiniteScrollEnabled.current = true;
              setIsLoading(false);
              return;
          }

          isAutoScrolling.current = true;
          const targetLeft = targetIndex * CELL_WIDTH;
          currentScrollElement.scrollTo({ left: targetLeft, behavior: 'smooth' });

          setTimeout(() => {
            if (navigationId !== navigationSeqRef.current) {
              return;
            }

            const latestScrollElement = mainScrollRef.current;
            if (latestScrollElement) {
              // Recalage final pour éviter les offsets de smooth scroll.
              latestScrollElement.scrollLeft = targetLeft;
            }

            isAutoScrolling.current = false;
            isInfiniteScrollEnabled.current = true;
            setSelectedDate(targetDate);
            setIsLoading(false);
          }, 850);
        });
      });
    });
    return true;
  }, [buildWindow, days, resolveTargetDate, setIsLoading, setSelectedDate]);

  useEffect(() => {
    if (days.length > 0) {
      // Activer dès que les jours sont chargés
      isInfiniteScrollEnabled.current = true;
    }
  }, [days]);

  // --- **FONCTION PUBLIQUE**: Navigation avec retry automatique ---
  const goToDate = useCallback((date: number) => {
    
    // Annuler tout retry en cours
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    executeGoToDate(date);
  }, [executeGoToDate]);

  // --- **NETTOYAGE**: Annuler les retries au démontage ---
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const getFirstDayAppearing = useCallback(() => {
    if (isAutoScrolling.current || days.length === 0 || !mainScrollRef.current) return null;
    const scroller = mainScrollRef.current;

    const firstVisibleIndex = Math.floor(scroller.scrollLeft / CELL_WIDTH);
    const safeIndex = Math.max(0, Math.min(firstVisibleIndex, days.length - 1));
    setSelectedDate(days[safeIndex]);
  }, [days, setSelectedDate]);


  // --- Gestion Clavier Scroll ---
  const handleKeyboardScroll = useCallback((e: KeyboardEvent) => {
    const scroller = mainScrollRef.current;
    
    if (!scroller || !isInfiniteScrollEnabled.current || isLoading) return;
          
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

    const step = CELL_WIDTH

    if (e.key === 'ArrowLeft') {
      scroller.scrollLeft = Math.max(0, scroller.scrollLeft - step);
      requestAnimationFrame(() => getFirstDayAppearing());
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      const max = scroller.scrollWidth - scroller.clientWidth;
      scroller.scrollLeft = Math.min(max, scroller.scrollLeft + step);
      requestAnimationFrame(() => getFirstDayAppearing());
      e.preventDefault();
    }
  }, [getFirstDayAppearing, isLoading]);


  useEffect(() => {
    
    const date = selectedDate;        
    const newTimeline = buildWindow(date);

    setDays(newTimeline);
  }, [isDisplayWeekend, buildWindow]);

  return {
    days,
    setDays,
    mainScrollRef,
    goToDate,
    handleKeyboardScroll,
    getFirstDayAppearing,
  };
};