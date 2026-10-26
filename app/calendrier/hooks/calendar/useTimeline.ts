import { useState, useRef, useCallback, useEffect } from 'react';
import { addDays, isSameDay, isWeekend, startOfDay } from 'date-fns';
import { CELL_WIDTH, WINDOW_DAYS_AFTER, WINDOW_DAYS_BEFORE } from '@/app/calendrier/utils/constants';

interface UseTimelineProps {
  isDisplayWeekend: boolean;
  selectedDate: number;
  setSelectedDate: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useTimeline = ({ isDisplayWeekend, selectedDate, setSelectedDate, isLoading, setIsLoading }: UseTimelineProps) => {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  
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

    const leftTarget = WINDOW_DAYS_BEFORE;
    const rightTarget = WINDOW_DAYS_AFTER;

    const addDaysHelper = (timestamp: number, daysCount: number) => {
      const d = new Date(timestamp);
      d.setDate(d.getDate() + daysCount);
      return d.getTime();
    };

    let cursor = addDaysHelper(centerDate, -1);
    while (left.length < leftTarget) {
      if (shouldInclude(cursor)) {
        left.push(cursor);
      }
      cursor = addDaysHelper(cursor, -1);
    }

    cursor = addDaysHelper(centerDate, 1);
    while (right.length < rightTarget) {
      if (shouldInclude(cursor)) {
        right.push(cursor);
      }
      cursor = addDaysHelper(cursor, 1);
    }

    return [
      ...left.reverse(),
      ...(includeCenter ? [centerDate] : []),
      ...right,
    ];
  }, [isDisplayWeekend]);

  // **CORRECTION 1**: Initialisation synchrone du state 'days' avec 'buildWindow'
  // Évite d'avoir 'days = []' au tout premier rendu
  const [days, setDays] = useState<number[]>(() => buildWindow(selectedDate));

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
      isInfiniteScrollEnabled.current = true;
    }
  }, [days]);

  const goToDate = useCallback((date: number) => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    executeGoToDate(date);
  }, [executeGoToDate]);

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

  const handleKeyboardScroll = useCallback((e: KeyboardEvent) => {
    const scroller = mainScrollRef.current;
    
    if (!scroller || !isInfiniteScrollEnabled.current || isLoading) return;
          
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

    const step = CELL_WIDTH;

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
  }, [isDisplayWeekend, buildWindow, selectedDate]);

  const getVisibleYears = (): number[] => {
    if (!days || days.length === 0) {
      return [];
    }

    const yearsSet = new Set<number>();

    days.forEach((day) => {
      const dateObj = new Date(day);
      if (!isNaN(dateObj.getTime())) {
        yearsSet.add(dateObj.getFullYear());
      }
    });

    return Array.from(yearsSet);
  };

  return {
    days,
    setDays,
    mainScrollRef,
    goToDate,
    handleKeyboardScroll,
    getFirstDayAppearing,
    getVisibleYears
  };
};