import { useState, useRef, useCallback, useEffect } from 'react';
import { format, isWeekend } from 'date-fns';
import { CELL_WIDTH, WINDOW_SIZE, DAY_MS } from '../utils/constants';

interface UseTimelineProps {
  isDisplayWeekend: boolean;
  selectedDate: number;
  setSelectedDate: React.Dispatch<React.SetStateAction<number>>;
}

export const useTimeline = ({ isDisplayWeekend, selectedDate, setSelectedDate }: UseTimelineProps) => {
  const [days, setDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  
  // **NOUVEAU**: Queue de navigation en attente
  //const pendingNavigationRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isInfiniteScrollEnabled = useRef(false);
  const isAutoScrolling = useRef(false);
  

  const buildWindow = useCallback((centerDate: number) => {
    const shouldInclude = (ts: number) => isDisplayWeekend || !isWeekend(ts);

    const left: number[] = [];
    const right: number[] = [];
    const includeCenter = shouldInclude(centerDate);

    // Nombre de jours à placer de part et d'autre de la date cible
    const leftTarget = Math.floor(WINDOW_SIZE / 2);
    const rightTarget = WINDOW_SIZE - leftTarget - (includeCenter ? 1 : 0);

    // Collecte des jours à gauche (ordre inverse pour garder l'ordre chronologique ensuite)
    let cursor = centerDate - DAY_MS;
    while (left.length < leftTarget) {
      if (shouldInclude(cursor)) {
        left.push(cursor);
      }
      cursor -= DAY_MS;
    }

    // Collecte des jours à droite
    cursor = centerDate + DAY_MS;
    while (right.length < rightTarget) {
      if (shouldInclude(cursor)) {
        right.push(cursor);
      }
      cursor += DAY_MS;
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
    
    setIsLoading(true);
  
    if(!days.includes(date)) {
      const newTimeline = buildWindow(date);
      setDays(newTimeline);
    }
    
    // Centrage visuel
    queueMicrotask(() => {
      requestAnimationFrame(() => {
          const todayCell = document.getElementById(format(date, "yyyy-MM-dd"));
          if (todayCell && scrollElement) {
              isAutoScrolling.current = true;
              
              // Trouver l'index de la date dans le tableau days
              const dateIndex = days.indexOf(date);
              
              if (dateIndex !== -1) {
                  // Calculer la position exacte basée sur l'index
                  const targetLeft = dateIndex * CELL_WIDTH;
                  
                  scrollElement.scrollTo({ left: targetLeft, behavior: 'smooth' });
              } else {
                  // Fallback si la date n'est pas trouvée
                  const cellRect = todayCell.getBoundingClientRect();
                  const containerRect = scrollElement.getBoundingClientRect();
                  const targetLeft = scrollElement.scrollLeft + cellRect.left - containerRect.left;
                  scrollElement.scrollTo({ left: targetLeft, behavior: 'smooth' });
              }
              
              setTimeout(() => {
                  isAutoScrolling.current = false;
                  isInfiniteScrollEnabled.current = true;
                  setIsLoading(false);
              }, 800);
          } else {
              isInfiniteScrollEnabled.current = true;
              setIsLoading(false);
          }
      });
    });
    return true;
  }, [isDisplayWeekend, buildWindow]);

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
    if (days.length === 0 || !mainScrollRef.current) return null;
    const scroller = mainScrollRef.current;

    const firstVisibleIndex = Math.floor(scroller.scrollLeft / CELL_WIDTH);
    setSelectedDate(days[firstVisibleIndex])
  }, [days]);


  // --- Gestion Clavier Scroll ---
  const handleKeyboardScroll = useCallback((e: KeyboardEvent) => {
    const scroller = mainScrollRef.current;
    
    if (!scroller || !isInfiniteScrollEnabled.current) return;
          
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
  }, [getFirstDayAppearing]);


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
    isLoading,
    handleKeyboardScroll,
    getFirstDayAppearing,
  };
};