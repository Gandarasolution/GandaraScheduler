/**
 * @fileoverview Hook personnalisé pour calculer les hauteurs des lignes d'employés
 * Gère les calculs de hauteur basés sur les chevauchements d'appointments
 * 
 * @hook useEmployeeHeights
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useMemo } from 'react';
import { Appointment, Employee } from '../types';
import { CELL_HEIGHT } from '../utils/constants';

interface EmployeeHeight {
  employeeId: number;
  height: number;
  dayKey?: number;
}

/**
 * Calcule le nombre maximal de rendez-vous qui se chevauchent
 */
const getMaxOverlaps = (appointments: Appointment[]): number => {
  let maxOverlap = 0;
  for (let i = 0; i < appointments.length; i++) {
    let overlapCount = 1;
    for (let j = i + 1; j < appointments.length; j++) {
      if (i !== j &&
        appointments[j].startDate < appointments[i].endDate &&
        appointments[j].endDate > appointments[i].startDate
      ) {
        overlapCount++;
      }
    }
    if (overlapCount > maxOverlap) maxOverlap = overlapCount;
  }
  return Math.max(maxOverlap, 1);
};

/**
 * Hook pour calculer les hauteurs des employés en fonction des chevauchements
 */
export const useEmployeeHeights = (
  employees: Employee[],
  appointments: Appointment[],
  dayInTimeline: Date[],
  isMobile: boolean
): EmployeeHeight[] => {
  return useMemo(() => {
    if (isMobile) {
      // Mode mobile : calcul par jour
      const heights: EmployeeHeight[] = [];

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
            height: overlapping === 0
              ? CELL_HEIGHT
              : overlapping * CELL_HEIGHT + 2 * overlapping + 10,
          });
        });
      });

      return heights;
    } else {
      // Mode desktop : calcul global par employé
      return employees.map(employee => {
        const employeeAppointments = appointments.filter(app => app.employeeId === employee.id);
        
        let maxOverallOverlap = 0;
        if (employeeAppointments.length > 0) {
          const sortedApps = [...employeeAppointments].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
          const activeSlots: { endDate: Date }[] = [];
          
          sortedApps.forEach(app => {
            // Nettoyer les slots expirés
            for (let i = activeSlots.length - 1; i >= 0; i--) {
              if (activeSlots[i].endDate <= app.startDate) {
                activeSlots.splice(i, 1);
              }
            }
            
            // Tenter de placer le rendez-vous dans un slot existant
            let placed = false;
            for (let i = 0; i < activeSlots.length; i++) {
              if (activeSlots[i].endDate <= app.startDate) {
                activeSlots[i].endDate = app.endDate;
                placed = true;
                break;
              }
            }
            
            // Si pas placé, créer un nouveau slot
            if (!placed) {
              activeSlots.push({ endDate: app.endDate });
            }
            
            maxOverallOverlap = Math.max(maxOverallOverlap, activeSlots.length);
          });
        }

        const calculatedHeight = maxOverallOverlap === 0
          ? CELL_HEIGHT
          : (maxOverallOverlap * CELL_HEIGHT) + (2 * maxOverallOverlap) + 10;

        return { employeeId: employee.id, height: calculatedHeight };
      });
    }
  }, [employees, appointments, dayInTimeline, isMobile]);
};