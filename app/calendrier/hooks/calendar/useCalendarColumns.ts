/**
 * @fileoverview Hook useCalendarColumns - Gestion des colonnes spéciales du calendrier
 */

import { useMemo } from 'react';
import { format, isWeekend } from 'date-fns';
import { isHoliday } from '../../utils/dates';
import { CELL_WIDTH } from '../../utils/constants';
import { useDayTypesContext } from '../data/dayTypesContext';

export interface ColumnOverlay {
  left: number;
  key: number;
  className?: string;
  CouleurFond?: string;
  CouleurTexte?: string;
}

interface UseCalendarColumnsParams {
  dayInTimeline: number[];
  nonWorkingDates: Record<string, {Id: number; TypeJourCode: string }>;
}

export const useCalendarColumns = ({
  dayInTimeline,
  nonWorkingDates,
}: UseCalendarColumnsParams): { specialColumns: ColumnOverlay[] } => {
  
  // Appel du hook de contexte à la racine du hook (règle de React)
  const { DayTypes } = useDayTypesContext();

  const specialColumns = useMemo(() => {
    const columns: ColumnOverlay[] = [];

    dayInTimeline.forEach((day, index) => {
      const left = index * CELL_WIDTH;
      const formattedDate = format(day, 'yyyy-MM-dd');

      const isFerie = isHoliday(day);
      const isWk = isWeekend(day);
      const nonWorkingData = nonWorkingDates[formattedDate];

      // Priorité 1 : Férié
      if (isFerie) {
        const dayTypeInfo = DayTypes?.find((dt: any) => String(dt.Id) === 'ferie');
        columns.push({ 
          left, 
          key: day, 
          CouleurFond: dayTypeInfo?.CouleurFond,
          CouleurTexte: dayTypeInfo?.CouleurTexte,          
        });
        return;
      }

      // Priorité 2 : Personnalisé (Non-working)
      if (nonWorkingData) {
        const dayTypeInfo = DayTypes?.find((dt: any) => String(dt.Id) === String(nonWorkingData.TypeJourCode));
        columns.push({ 
          left, 
          key: day, 
          className: 'NON-WORKING',
          CouleurFond: dayTypeInfo?.CouleurFond,
          CouleurTexte: dayTypeInfo?.CouleurTexte
        });
        return;
      }

      // Priorité 3 : Week-end classique
      if (isWk) {
        columns.push({ 
          left, 
          key: day, 
          className: 'WEEKEND',
        });
      }
    });

    return columns;
  }, [dayInTimeline, nonWorkingDates, DayTypes]); // Ne pas oublier d'ajouter DayTypes aux dépendances

  return { specialColumns };
};