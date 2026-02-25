import { useMemo, useCallback } from 'react';
import { Appointment, User } from '../types';
import { CELL_HEIGHT, DAY_MS, ROW_HEIGHT } from '../utils/constants';

interface UseCalendarLayoutParams {
  employees: User[];
  appointments: Appointment[];
  tagPlacement: 'hover' | 'fixed';
}

export const useCalendarLayout = ({
  employees,
  appointments,
  tagPlacement
}: UseCalendarLayoutParams) => {


  // Calcule la hauteur nécessaire pour chaque cellule employé/jour
  const employeeHeights = useMemo(() => {
    return employees.map(employee => {
      const employeeAppointments = appointments.filter(app => app.employee.id === employee.id);
      
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

      const calculatedHeight = maxOverallOverlap > 0 ? (maxOverallOverlap * CELL_HEIGHT) + (2 * maxOverallOverlap) + (tagPlacement === 'fixed' ? 18 : 10) : CELL_HEIGHT;

      return { employeeId: employee.id, height: calculatedHeight, dayKey: undefined };
    });
    
  }, [employees, appointments]);

  /**
   * Attribue à chaque rendez-vous un indice de "pile" (top) basé sur la priorité
   * Le top est calculé automatiquement : priorité basse = top bas (visuellement en bas)
   * Pour les rdv sans priorité ou priorité 0, on les place en bas
   */
  const assignAppointmentTops = useCallback((appointments: Appointment[]) => {
    const result: (Appointment & { top: number, _dayKey?: number })[] = [];

    employees.forEach(emp => {
      const empAppointments = appointments.filter(app => app.employee.id === emp.id);
      
      empAppointments.forEach(app => {
          // Trouver tous les rdv qui chevauchent
          const overlapping = empAppointments.filter(other => 
              !(app.endDate <= other.startDate || app.startDate >= other.endDate)
          );
          // Compter combien ont une priorité inférieure
          const lowerPriorityTab = overlapping.filter(other => 
              ((other.priority ?? 0) < (app.priority ?? 0))
          )
          let lowerPriorityCount = 0;
          if (lowerPriorityTab.length > 0) {              
            lowerPriorityTab.forEach(lpApp => {
              const priorityValue = lpApp.priority ?? 0;
              if (priorityValue >= lowerPriorityCount) {
                lowerPriorityCount = priorityValue + 1;
              }
          });
          }   
          result.push({ ...app, top: lowerPriorityCount});
      });
    });
    return result;
  }, [employees]);

  const appointmentsWithTop = useMemo(() => {
    return assignAppointmentTops(appointments);
  }, [assignAppointmentTops, appointments]);

  return {
    employeeHeights,
    appointmentsWithTop
  };
};
