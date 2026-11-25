import { useMemo } from 'react';
import { CELL_WIDTH, CELL_HEIGHT, DAY_MS } from '../../utils/constants';
import { countWeekends } from '../../utils/dates';

interface UseAppointmentPositioningParams {
  startDate: number;
  endDate: number;
  timelineStart: number;
  isFullDay: boolean;
  isDisplayWeekend: boolean;
  top?: number;
}

interface AppointmentPosition {
  left: number;
  width: number;
  topPx: number;
  visualDurationDays: number;
  intervalCount: number;
}

export const useAppointmentPositioning = ({
  startDate,
  endDate,
  timelineStart,
  isFullDay,
  isDisplayWeekend,
  top = 0,
}: UseAppointmentPositioningParams): AppointmentPosition => {
  return useMemo((): AppointmentPosition => {
    const msDiffStart = Math.max(0, startDate - timelineStart);
    const totalDaysDiff = msDiffStart / DAY_MS;
    const weekendsToRemove = isDisplayWeekend ? 0 : countWeekends(timelineStart, startDate);
    const visualDaysOffset = totalDaysDiff - weekendsToRemove;
    const left = visualDaysOffset * CELL_WIDTH;

    const durationMs = endDate - startDate;
    const durationDays = durationMs / DAY_MS;
    const weekendsInDuration = isDisplayWeekend ? 0 : countWeekends(startDate, endDate);
    const visualDurationDays = Math.max(0.1, durationDays - weekendsInDuration);
    const width = visualDurationDays * CELL_WIDTH;

    const intervalCount = getIntervalCount(startDate, endDate, isFullDay, isDisplayWeekend);
    const topPx = top * CELL_HEIGHT + 2 * top;

    return {
      left,
      width,
      topPx,
      visualDurationDays,
      intervalCount,
    };
  }, [startDate, endDate, timelineStart, isFullDay, isDisplayWeekend, top]);
};

export const calculateWidthPx = (
  startDate: number,
  endDate: number,
  isFullDay: boolean,
  isDisplayWeekend: boolean
): number => {
  const intervalMs = isFullDay ? DAY_MS : DAY_MS / 2;
  const intervalWidth = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
  const durationInterval = Math.round((endDate - startDate) / intervalMs);
  const weekends = isDisplayWeekend ? 0 : countWeekends(startDate, endDate);
  const visualDurationDays = Math.max(0.1, durationInterval - weekends * (isFullDay ? 1 : 2));

  return visualDurationDays * intervalWidth;
};

export const calculateLeftPx = (
  startDate: number,
  timelineStart: number,
  isFullDay: boolean,
  isDisplayWeekend: boolean
): number => {
  const intervalMs = isFullDay ? DAY_MS : DAY_MS / 2;
  const intervalWidth = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
  const intervalFromOrigin = Math.round((startDate - timelineStart) / intervalMs);
  const weekendsToRemove = isDisplayWeekend ? 0 : countWeekends(timelineStart, startDate);
  const visualIntervalsOffset = intervalFromOrigin - weekendsToRemove * (isFullDay ? 1 : 2);

  return Math.max(0, visualIntervalsOffset * intervalWidth);
};

/**
 * Calcul en O(1) du nombre d'intervalles ouvrés/totaux entre deux timestamps (sans boucle while ni allocation Date).
 */
export const getIntervalCount = (
  startDate: number,
  endDate: number,
  isFullDay: boolean,
  isDisplayWeekend: boolean
): number => {
  if (startDate === endDate) return 0;

  const forward = endDate >= startDate;
  const minTs = forward ? startDate : endDate;
  const maxTs = forward ? endDate : startDate;

  const intervalMs = isFullDay ? DAY_MS : DAY_MS / 2;
  const rawIntervals = Math.round((maxTs - minTs) / intervalMs);
  const weekends = isDisplayWeekend ? 0 : countWeekends(minTs, maxTs);
  const count = Math.max(0, rawIntervals - weekends * (isFullDay ? 1 : 2));

  return forward ? count : -count;
};