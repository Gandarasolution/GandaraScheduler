/**
 * @fileoverview Hook useAppointmentPositioning - Calculs de positionnement pour les rendez-vous
 * 
 * Centralise les calculs de position (left, width, top) utilisés par AppointmentItem et EmployeeRow
 * Gère les conversions entre timestamp et pixels, en tenant compte des week-ends
 * 
 * @hook useAppointmentPositioning
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useMemo, useCallback } from 'react';
import { isWeekend } from 'date-fns';
import { CELL_WIDTH, CELL_HEIGHT, DAY_MS, DAY_INTERVALS, HALF_DAY_INTERVALS } from '../../utils/constants';
import { HalfDayInterval } from '../../types';
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

/**
 * Hook pour calculer la position et les dimensions d'un rendez-vous
 * 
 * @param params - Paramètres de positionnement
 * @returns Position calculée (left, width, topPx)
 */
export const useAppointmentPositioning = ({
  startDate,
  endDate,
  timelineStart,
  isFullDay,
  isDisplayWeekend,
  top = 0,
}: UseAppointmentPositioningParams): AppointmentPosition => {
  
  /**
   * Calcule le nombre d'intervalles entre deux dates
   * Gère les week-ends si nécessaire
   */
  const getIntervalCount = useCallback((start: number, end: number): number => {
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
    let count = 0;
    let currentTs = start;
    const forward = end >= start;
    
    while (forward ? currentTs < end : currentTs > end) {
      if (isDisplayWeekend || !isWeekend(currentTs)) {
        count++;
      }
      const currentHour = new Date(currentTs).getHours();
      let idx = intervals.findIndex(interval => 
        currentHour >= interval.startHour && currentHour < interval.endHour
      );
      if (idx === -1) idx = 0;

      if (forward) {
        idx++;
        if (idx >= intervals.length) {
          idx = 0;
          currentTs = new Date(currentTs + DAY_MS).setHours(intervals[idx].startHour, 0, 0, 0);
        } else {
          currentTs = new Date(currentTs).setHours(intervals[idx].startHour, 0, 0, 0);
        }
      } else {
        idx--;
        if (idx < 0) {
          idx = intervals.length - 1;
          currentTs = new Date(currentTs - DAY_MS).setHours(intervals[idx].startHour, 0, 0, 0);
        } else {
          currentTs = new Date(currentTs).setHours(intervals[idx].startHour, 0, 0, 0);
        }
      }
    }
    return forward ? Math.max(0, count) : -Math.max(0, count);
  }, [isDisplayWeekend, isFullDay]);

  /**
   * Calcule la position et les dimensions du rendez-vous
   */
  const position = useMemo((): AppointmentPosition => {
    // 1. Calcul de la position left (décalage depuis le début de la timeline)
    const msDiffStart = Math.max(0, startDate - timelineStart);
    const totalDaysDiff = msDiffStart / DAY_MS;
    
    let weekendsToRemove = 0;
    if (!isDisplayWeekend) {
      weekendsToRemove = countWeekends(timelineStart, startDate);
    }
    
    const visualDaysOffset = totalDaysDiff - weekendsToRemove;
    const left = visualDaysOffset * CELL_WIDTH;

    // 2. Calcul de la largeur (durée du rendez-vous)
    const durationMs = endDate - startDate;
    const durationDays = durationMs / DAY_MS;
    
    let weekendsInDuration = 0;
    if (!isDisplayWeekend) {
      weekendsInDuration = countWeekends(startDate, endDate);
    }
    
    const visualDurationDays = Math.max(0.1, durationDays - weekendsInDuration);
    const width = visualDurationDays * CELL_WIDTH;

    // 3. Calcul du nombre d'intervalles (pour info)
    const intervalCount = getIntervalCount(startDate, endDate);

    // 4. Calcul de la position verticale
    const topPx = (top * CELL_HEIGHT) + (2 * top);

    return {
      left,
      width,
      topPx,
      visualDurationDays,
      intervalCount,
    };
  }, [startDate, endDate, timelineStart, isDisplayWeekend, getIntervalCount, top]);

  return position;
};

/**
 * Fonction utilitaire pour calculer la largeur en pixels d'une durée
 * Utilisée pour les calculs de width pendant le resize
 * 
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @param isFullDay - Mode journée complète
 * @param isDisplayWeekend - Afficher les week-ends
 * @returns Largeur en pixels
 */
export const calculateWidthPx = (
  startDate: number,
  endDate: number,
  isFullDay: boolean,
  isDisplayWeekend: boolean
): number => {
  const durationMs = endDate - startDate;
  const durationInterval = Math.round(durationMs / (isFullDay ? DAY_MS : DAY_MS / 2));
  
  let NbDayWeekends = 0;
  if (!isDisplayWeekend) {
    NbDayWeekends = countWeekends(startDate, endDate);
  }
  
  const visualDurationDays = Math.max(0.1, durationInterval - (NbDayWeekends * (isFullDay ? 1 : 2)));
  return visualDurationDays * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2);
};

/**
 * Fonction utilitaire pour calculer la position left pendant un resize
 * 
 * @param startDate - Nouvelle date de début
 * @param timelineStart - Début de la timeline
 * @param isFullDay - Mode journée complète
 * @param isDisplayWeekend - Afficher les week-ends
 * @returns Position left en pixels
 */
export const calculateLeftPx = (
  startDate: number,
  timelineStart: number,
  isFullDay: boolean,
  isDisplayWeekend: boolean
): number => {
  const startFromTimelineOrigin = startDate - timelineStart;
  const intervalFromOrigin = Math.round(startFromTimelineOrigin / (isFullDay ? DAY_MS : (DAY_MS / 2)));
  
  let weekendsToRemove = 0;
  if (!isDisplayWeekend) {
    weekendsToRemove = countWeekends(timelineStart, startDate);
  }
  
  const visualIntervalsOffset = intervalFromOrigin - (weekendsToRemove * (isFullDay ? 1 : 2));
  return Math.max(0, visualIntervalsOffset * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2));
};

/**
 * Fonction utilitaire pour calculer le nombre d'intervalles entre deux dates
 * Gère les week-ends si nécessaire
 * 
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @param isFullDay - Mode journée complète
 * @param isDisplayWeekend - Afficher les week-ends
 * @returns Nombre d'intervalles
 */
export const getIntervalCount = (
  startDate: number,
  endDate: number,
  isFullDay: boolean,
  isDisplayWeekend: boolean
): number => {
  const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
  let count = 0;
  let currentTs = startDate;
  const forward = endDate >= startDate;
  
  while (forward ? currentTs < endDate : currentTs > endDate) {
    if (isDisplayWeekend || !isWeekend(currentTs)) {
      count++;
      
      const currentDate = new Date(currentTs);
      const currentHour = currentDate.getHours();
      const currentIntervalIdx = intervals.findIndex(
        (interval: HalfDayInterval) => currentHour >= interval.startHour && currentHour < interval.endHour
      );
      
      const nextIntervalIdx = forward ? currentIntervalIdx + 1 : currentIntervalIdx - 1;
      
      if (nextIntervalIdx < 0 || nextIntervalIdx >= intervals.length) {
        const dayIncrement = forward ? DAY_MS : -DAY_MS;
        const newDate = new Date(currentTs + dayIncrement);
        const targetInterval = forward ? intervals[0] : intervals[intervals.length - 1];
        currentTs = newDate.setHours(targetInterval.startHour, 0, 0, 0);
      } else {
        const targetInterval = intervals[nextIntervalIdx];
        currentTs = currentDate.setHours(targetInterval.startHour, 0, 0, 0);
      }
    } else {
      currentTs = forward ? currentTs + DAY_MS : currentTs - DAY_MS;
    }
  }
  
  return count;
};
