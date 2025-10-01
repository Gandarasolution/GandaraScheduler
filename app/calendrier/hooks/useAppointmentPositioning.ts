/**
 * @fileoverview Hook personnalisé pour le positionnement des appointments
 * Gère l'attribution des indices de pile (top) pour l'affichage des rendez-vous
 * 
 * @hook useAppointmentPositioning
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useMemo, useCallback } from 'react';
import { Appointment, Employee } from '../types';

export interface AppointmentWithPosition extends Appointment {
  top: number;
  _dayKey?: number;
}

/**
 * Hook pour calculer le positionnement des appointments avec gestion des chevauchements
 */
export const useAppointmentPositioning = (
  employees: Employee[],
  appointments: Appointment[],
  dayInTimeline: Date[],
  isMobile: boolean
) => {
  const assignAppointmentTops = useCallback((
    appointments: Appointment[], 
    isMobile: boolean, 
    dayInTimeline: Date[],
    employees: Employee[]
  ): AppointmentWithPosition[] => {
    const result: AppointmentWithPosition[] = [];

    employees.forEach(emp => {
      if (isMobile) {
        // Mode mobile : empilement par jour
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
        // Mode desktop : empilement global
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
          result.push({ ...app, top: slotIndex });
        });
      }
    });
    
    return result;
  }, []);

  const appointmentsWithTop = useMemo(() => {
    return assignAppointmentTops(appointments, isMobile, dayInTimeline, employees);
  }, [assignAppointmentTops, appointments, isMobile, dayInTimeline, employees]);

  return {
    appointmentsWithTop,
    assignAppointmentTops
  };
};