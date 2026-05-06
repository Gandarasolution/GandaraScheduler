/**
 * @fileoverview Hook useCalendarColumns - Gestion des colonnes spéciales du calendrier
 * 
 * Calcule les positions des colonnes avec statut particulier:
 * - Jours fériés (holidays)
 * - Week-ends (weekends)
 * - Jours non travaillés personnalisés (nonWorking)
 * 
 * @hook useCalendarColumns
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useMemo } from 'react';
import { format, isSameDay, isWeekend } from 'date-fns';
import { isHoliday } from '../../utils/dates';
import { CELL_WIDTH } from '../../utils/constants';

export interface ColumnOverlay {
  left: number;
  key: number;
}

interface UseCalendarColumnsParams {
  dayInTimeline: number[];
  nonWorkingDates: Record<string, number>;
}

interface UseCalendarColumnsResult {
  holidayColumns: ColumnOverlay[];
  weekendColumns: ColumnOverlay[];
  nonWorkingColumns: ColumnOverlay[];
}

/**
 * Hook pour calculer les colonnes spéciales (jours fériés, week-ends, jours non travaillés)
 * 
 * @param dayInTimeline - Tableau des timestamps des jours affichés
 * @param nonWorkingDates - Tableau des jours non travaillés personnalisés
 * @returns Objets contenant les positions et clés des colonnes spéciales
 */
export const useCalendarColumns = ({
  dayInTimeline,
  nonWorkingDates,
}: UseCalendarColumnsParams): UseCalendarColumnsResult => {

  const { holidayColumns, weekendColumns, nonWorkingColumns } = useMemo(() => {
    const holidays: ColumnOverlay[] = [];
    const weekends: ColumnOverlay[] = [];
    const nonWorking: ColumnOverlay[] = [];

    dayInTimeline.forEach((day, index) => {
      const left = index * CELL_WIDTH;
      const isFerie = isHoliday(day);
      const isWk = isWeekend(day);
      const isNonWorking = nonWorkingDates[format(day, 'yyyy-MM-dd')] !== undefined;

      // Priorité: férié > week-end > non-working custom
      if (isFerie) {
        holidays.push({ left, key: day });
        return; // Pas besoin d'ajouter d'autres surcouches
      }

      if (isWk) {
        weekends.push({ left, key: day });
      }

      if (isNonWorking) {
        nonWorking.push({ left, key: day });
      }
    });

    return { holidayColumns: holidays, weekendColumns: weekends, nonWorkingColumns: nonWorking };
  }, [dayInTimeline, nonWorkingDates]);

  return {
    holidayColumns,
    weekendColumns,
    nonWorkingColumns,
  };
};
