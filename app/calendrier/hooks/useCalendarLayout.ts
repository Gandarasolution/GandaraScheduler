import { useMemo, useCallback } from 'react';
import { Appointment, Employee } from '../types';
import { CELL_HEIGHT } from '../utils/constants';

interface UseCalendarLayoutParams {
  employees: Employee[];
  appointments: Appointment[];
  dayInTimeline: number[];
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

      // Constante : nombre de millisecondes dans un jour
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      employees.forEach(employee => {
          
      
          const employeeAllAppointments = appointments.filter(
              app => app.employeeId === employee.id
          );
          dayInTimeline.forEach(dayTimestamp => {
              // 'dayTimestamp' est supposé être le timestamp à 00:00:00
              
              const startOfNextDay = dayTimestamp + ONE_DAY_MS;

              // On filtre uniquement sur les nombres
              const employeeAppointmentsForDay = employeeAllAppointments.filter(
                  app => 
                      // Le RDV commence avant la fin de la journée
                      app.startDate < startOfNextDay && 
                      // Le RDV finit après le début de la journée
                      app.endDate > dayTimestamp
              );

              const overlapping = getMaxOverlaps(employeeAppointmentsForDay);

              heights.push({
                  employeeId: employee.id,
                  dayKey: dayTimestamp, // C'est déjà un nombre
                  height: overlapping === 0
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
            const sortedApps = [...employeeAppointments].sort((a, b) => a.startDate - b.startDate);
            
            const activeSlots: { endDate: number, count: number }[] = [];
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
  const assignAppointmentTops = useCallback((appointments: Appointment[], isMobile: boolean, dayInTimeline: number[]) => {
    const result: (Appointment & { top: number, _dayKey?: number })[] = [];

    employees.forEach(emp => {
      if (isMobile) {
        const ONE_DAY_MS = 86400000;

       
        const empAppointments = appointments.filter(app => app.employeeId === emp.id);

        dayInTimeline.forEach(day => {
            
            const dayStartTs = day; 
            const dayEndTs = dayStartTs + ONE_DAY_MS;

            // 2. Filtrage et Tri numérique
            const dayAppointments = empAppointments
                .filter(app => 
                    app.startDate < dayEndTs && app.endDate > dayStartTs
                )
                .sort((a, b) => a.startDate - b.startDate); 

            // 3. Calcul des slots (Collision)
            const slots: Appointment[][] = [];
            
            dayAppointments.forEach(app => {
                let slotIndex = 0;

                // La logique d'intersection reste identique, mais opère sur des nombres
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

                // 4. Construction du résultat sans conversion Date inutile
                result.push({ 
                    ...app, 
                    top: slotIndex, 
                    _dayKey: dayStartTs // On réutilise le nombre calculé au début
                });
            });
        });
    } else {
        const sorted = [...appointments]
          .filter(app => app.employeeId === emp.id)
          .sort((a, b) => a.startDate - b.startDate);
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
