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
  nonWorkingDates: Record<string, { Id: number; TypeJourCode: string }>;
}

export const useCalendarColumns = ({
  dayInTimeline,
  nonWorkingDates,
}: UseCalendarColumnsParams): { specialColumns: ColumnOverlay[] } => {
  const { DayTypes } = useDayTypesContext();

  const dayTypesMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof DayTypes>[number]>();
    DayTypes?.forEach((dt) => map.set(String(dt.Id), dt));
    return map;
  }, [DayTypes]);

  const specialColumns = useMemo(() => {
    const columns: ColumnOverlay[] = [];
    const ferieInfo = dayTypesMap.get('ferie');

    for (let index = 0; index < dayInTimeline.length; index++) {
      const day = dayInTimeline[index]!;
      const left = index * CELL_WIDTH;

      if (isHoliday(day)) {
        columns.push({
          left,
          key: day,
          CouleurFond: ferieInfo?.CouleurFond,
          CouleurTexte: ferieInfo?.CouleurTexte,
        });
        continue;
      }

      const formattedDate = format(day, 'yyyy-MM-dd');
      const nonWorkingData = nonWorkingDates[formattedDate];

      if (nonWorkingData) {
        const dayTypeInfo = dayTypesMap.get(String(nonWorkingData.TypeJourCode));
        columns.push({
          left,
          key: day,
          className: 'NON-WORKING',
          CouleurFond: dayTypeInfo?.CouleurFond,
          CouleurTexte: dayTypeInfo?.CouleurTexte,
        });
        continue;
      }

      if (isWeekend(day)) {
        columns.push({
          left,
          key: day,
          className: 'WEEKEND',
        });
      }
    }

    return columns;
  }, [dayInTimeline, nonWorkingDates, dayTypesMap]);

  return { specialColumns };
};