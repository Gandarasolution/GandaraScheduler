import { useState, useRef, useEffect, useCallback } from 'react';
import { isWeekend } from 'date-fns';
import { CELL_WIDTH, DAY_MS, DAY_INTERVALS, HALF_DAY_INTERVALS } from '../../utils/constants';
import { HalfDayInterval } from '../../types';
import evenementService from '@/app/service/evenement.service';

interface UseAppointmentResizeParams {
  appointmentId: number;
  startDate: number;
  endDate: number;
  priority: number;
  isFullDay: boolean;
  isDisplayWeekend: boolean;
  onAppointmentResize?: (
    id: number,
    newStart: number,
    newEnd: number,
    resizeDirection: 'left' | 'right',
    priority: number
  ) => void | Promise<void>;
  onLockedError?: (message: string) => void;
}

interface UseAppointmentResizeReturn {
  isResizingLeft: boolean;
  isResizingRight: boolean;
  dragStart: number;
  dragEnd: number;
  handleMouseDown: (e: React.MouseEvent, handleType: 'left' | 'right') => void;
}

export const useAppointmentResize = ({
  appointmentId,
  startDate,
  endDate,
  priority,
  isFullDay,
  isDisplayWeekend,
  onAppointmentResize,
  onLockedError,
}: UseAppointmentResizeParams): UseAppointmentResizeReturn => {
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);
  const [dragStart, setDragStart] = useState<number>(startDate);
  const [dragEnd, setDragEnd] = useState<number>(endDate);

  const resizingSideRef = useRef<'left' | 'right' | null>(null);
  const dragStartRef = useRef<number>(startDate);
  const dragEndRef = useRef<number>(endDate);
  const initialXRef = useRef(0);
  const lastIntervalsMovedRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const resizeLockPromiseRef = useRef<Promise<boolean> | null>(null);

  // Refs pour les props afin d'éviter de détacher/réattacher les listeners document
  const latestPropsRef = useRef({
    appointmentId,
    startDate,
    endDate,
    priority,
    isFullDay,
    isDisplayWeekend,
    onAppointmentResize,
    onLockedError,
  });
  latestPropsRef.current = {
    appointmentId,
    startDate,
    endDate,
    priority,
    isFullDay,
    isDisplayWeekend,
    onAppointmentResize,
    onLockedError,
  };

  useEffect(() => {
    if (!resizingSideRef.current) {
      dragStartRef.current = startDate;
      setDragStart(startDate);
    }
  }, [startDate]);

  useEffect(() => {
    if (!resizingSideRef.current) {
      dragEndRef.current = endDate;
      setDragEnd(endDate);
    }
  }, [endDate]);

  const addInterval = useCallback((date: number, n: number, intervals: HalfDayInterval[], fullDay: boolean, displayWeekend: boolean): number => {
    let currentTs = date;
    const currentHour = new Date(currentTs).getHours();
    let idx = intervals.findIndex(
      (interval) => currentHour >= interval.startHour && currentHour < interval.endHour
    );
    if (idx === -1) idx = 0;

    const step = n >= 0 ? 1 : -1;
    const stepMs = fullDay ? DAY_MS : DAY_MS / 2;
    let remaining = Math.abs(n);

    while (remaining > 0) {
      idx += step;
      if (idx >= intervals.length) {
        idx = 0;
        currentTs += stepMs;
      } else if (idx < 0) {
        idx = intervals.length - 1;
        currentTs -= stepMs;
      } else {
        currentTs += step * stepMs;
      }

      if (!displayWeekend) {
        while (isWeekend(currentTs)) {
          currentTs += step * stepMs;
        }
      }
      remaining--;
    }
    return currentTs;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, handleType: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();

    const { appointmentId: id, startDate: sDate, endDate: eDate, onLockedError: onErr } = latestPropsRef.current;

    initialXRef.current = e.clientX;
    lastIntervalsMovedRef.current = 0;
    dragStartRef.current = sDate;
    dragEndRef.current = eDate;
    resizingSideRef.current = handleType;

    setDragStart(sDate);
    setDragEnd(eDate);
    setResizingSide(handleType);

    resizeLockPromiseRef.current = evenementService
      .lockQuickEvenement(id)
      .then((response) => {
        if (response.success === false) {
          resizingSideRef.current = null;
          setResizingSide(null);
          onErr?.(response.message || 'Un autre utilisateur modifie cet événement.');
          return false;
        }
        return true;
      })
      .catch((error) => {
        console.error('Erreur lors du verrouillage du rendez-vous pour le resize :', error);
        resizingSideRef.current = null;
        setResizingSide(null);
        return false;
      });
  }, []);

  useEffect(() => {
    if (!resizingSide) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const side = resizingSideRef.current;
      if (!side) return;

      const { isFullDay: fullDay, isDisplayWeekend: displayWeekend, startDate: sDate, endDate: eDate } = latestPropsRef.current;
      const intervalWidth = fullDay ? CELL_WIDTH : CELL_WIDTH / 2;
      const intervalsMoved = Math.round((e.clientX - initialXRef.current) / intervalWidth);

      // Ne rien faire si on reste dans le même cran d'intervalle
      if (intervalsMoved === lastIntervalsMovedRef.current) return;
      lastIntervalsMovedRef.current = intervalsMoved;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const intervals = fullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;

        if (side === 'left') {
          let newStartDate = addInterval(sDate, intervalsMoved, intervals, fullDay, displayWeekend);
          if (newStartDate > dragEndRef.current) {
            newStartDate = addInterval(dragEndRef.current, 0, intervals, fullDay, displayWeekend);
          }
          if (newStartDate !== dragStartRef.current) {
            dragStartRef.current = newStartDate;
            setDragStart(newStartDate);
          }
        } else if (side === 'right') {
          let newEndDate = addInterval(eDate, intervalsMoved, intervals, fullDay, displayWeekend);
          if (newEndDate < dragStartRef.current) {
            newEndDate = addInterval(dragStartRef.current, 1, intervals, fullDay, displayWeekend);
          }
          if (newEndDate !== dragEndRef.current) {
            dragEndRef.current = newEndDate;
            setDragEnd(newEndDate);
          }
        }
      });
    };

    const handleMouseUp = async () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      const side = resizingSideRef.current;
      resizingSideRef.current = null;
      lastIntervalsMovedRef.current = null;

      const lockPromise = resizeLockPromiseRef.current;
      resizeLockPromiseRef.current = null;

      const lockAcquired = lockPromise ? await lockPromise : false;
      if (!lockAcquired || !side) {
        setResizingSide(null);
        return;
      }

      const { appointmentId: id, priority: prio, onAppointmentResize: onResize } = latestPropsRef.current;

      try {
        if (onResize) {
          // On attend la mise à jour optimiste du state parent AVANT de repasser isResizing à false
          await Promise.resolve(
            onResize(id, dragStartRef.current, dragEndRef.current, side, prio)
          );
        }
      } finally {
        setResizingSide(null);
        try {
          await evenementService.unlockEvenement(id);
        } catch (error) {
          console.error('Erreur lors du déverrouillage après resize :', error);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingSide, addInterval]);

  return {
    isResizingLeft: resizingSide === 'left',
    isResizingRight: resizingSide === 'right',
    dragStart,
    dragEnd,
    handleMouseDown,
  };
};