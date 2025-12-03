import { useMemo, useCallback } from 'react';
import { Appointment, Employee } from '../types';
import { CELL_HEIGHT } from '../utils/constants';

interface UseCalendarLayoutParams {
  employees: Employee[];
  appointments: Appointment[];
  dayInTimeline: Date[];
  isMobile: boolean;
}

export const useCalendarLayout = ({
  employees,
  appointments,
  dayInTimeline,
  isMobile,
}: UseCalendarLayoutParams) => {

  /**
   * Calcule le nombre maximal de rendez-vous qui se chevauchent dans une liste donnée.
   */
  const getMaxOverlaps = useCallback((overlapping: Appointment[]) => {
    let maxOverlap = 0;
    for (let i = 0; i < overlapping.length; i++) {
      let overlapCount = 1;
      for (let j = i + 1; j < overlapping.length; j++) {
        if (i !== j &&
          overlapping[j].startDate < overlapping[i].endDate &&
          overlapping[j].endDate > overlapping[i].startDate
        ) {
          overlapCount++;
        }
      }
      if (overlapCount > maxOverlap) maxOverlap = overlapCount;
    }
    return Math.max(maxOverlap, 1);
  }, []);

  // Calcule la hauteur nécessaire pour chaque cellule employé/jour
  const employeeHeights = useMemo(() => {
    if (isMobile) {
      const heights: { employeeId: number; dayKey: number; height: number }[] = [];

      employees.forEach(employee => {
        dayInTimeline.forEach(day => {
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);

          const employeeAppointments = appointments.filter(
            app =>
              app.employeeId === employee.id &&
              app.startDate < dayEnd &&
              app.endDate > dayStart
          );

          const overlapping = getMaxOverlaps(employeeAppointments);

          heights.push({
            employeeId: employee.id,
            dayKey: dayStart.getTime(),
            height:
              overlapping === 0
                ? CELL_HEIGHT
                : overlapping * CELL_HEIGHT + 2 * overlapping + 10,
          });
        });
      });

      return heights;
    } else {
      return employees.map(employee => {
        const employeeAppointments = appointments.filter(app => app.employeeId === employee.id);
        
        let maxOverallOverlap = 0;
        if (employeeAppointments.length > 0) {
            const sortedApps = [...employeeAppointments].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
            
            const activeSlots: { endDate: Date, count: number }[] = [];
            sortedApps.forEach(app => {
                for (let i = activeSlots.length - 1; i >= 0; i--) {
                    if (activeSlots[i].endDate <= app.startDate) {
                        activeSlots.splice(i, 1);
                    }
                }
                
                let placed = false;
                for (let i = 0; i < activeSlots.length; i++) {
                    if (activeSlots[i].endDate <= app.startDate) {
                        activeSlots[i].endDate = app.endDate;
                        placed = true;
                        break;
                    }
                }
                
                if (!placed) {
                    activeSlots.push({ endDate: app.endDate, count: activeSlots.length });
                }
                
                maxOverallOverlap = Math.max(maxOverallOverlap, activeSlots.length);
            });
        }

        const calculatedHeight = maxOverallOverlap === 0
            ? CELL_HEIGHT
            : (maxOverallOverlap * CELL_HEIGHT) + (2 * maxOverallOverlap) + 10;

        return { employeeId: employee.id, height: calculatedHeight, dayKey: undefined };
      });
    }
  }, [employees, appointments, dayInTimeline, isMobile, getMaxOverlaps]);

  /**
   * Attribue à chaque rendez-vous un indice de "pile" (top)
   */
  const assignAppointmentTops = useCallback((appointments: Appointment[], isMobile: boolean, dayInTimeline: Date[]) => {
    const result: (Appointment & { top: number, _dayKey?: number })[] = [];

    employees.forEach(emp => {
      if (isMobile) {
        dayInTimeline.forEach(day => {
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);

          const dayAppointments = appointments
            .filter(app =>
              app.employeeId === emp.id &&
              app.startDate < dayEnd && app.endDate > dayStart
            )
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

          const slots: Appointment[][] = [];
          dayAppointments.forEach(app => {
            let slotIndex = 0;
            while (
              slots[slotIndex] &&
              slots[slotIndex].some(other =>
                !(app.endDate <= other.startDate || app.startDate >= other.endDate)
              )
            ) {
              slotIndex++;
            }
            if (!slots[slotIndex]) slots[slotIndex] = [];
            slots[slotIndex].push(app);
            result.push({ ...app, top: slotIndex, _dayKey: dayStart.getTime() });
          });
        });
      } else {
        const sorted = [...appointments]
          .filter(app => app.employeeId === emp.id)
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const slots: Appointment[][] = [];
        sorted.forEach(app => {
          let slotIndex = 0;
          while (
            slots[slotIndex] &&
            slots[slotIndex].some(other =>
              !(app.endDate <= other.startDate || app.startDate >= other.endDate)
            )
          ) {
            slotIndex++;
          }
          if (!slots[slotIndex]) slots[slotIndex] = [];
          slots[slotIndex].push(app);
          result.push({ ...app, top: slotIndex});
        });
      }
    });
    return result;
  }, [employees]);

  const appointmentsWithTop = useMemo(() => {
    return assignAppointmentTops(appointments, isMobile, dayInTimeline);
  }, [assignAppointmentTops, appointments, isMobile, dayInTimeline]);

  return {
    employeeHeights,
    appointmentsWithTop
  };
};
