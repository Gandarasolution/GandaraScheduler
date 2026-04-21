/**
 * @fileoverview Utilitaires pour la gestion des rendez-vous
 * 
 * Ce fichier contient toutes les fonctions utilitaires pour :
 * - Création, modification, suppression de rendez-vous
 * - Gestion des rendez-vous répétés
 * - Copier/coller de rendez-vous
 * - Déplacement et redimensionnement
 * - Division et prolongation de rendez-vous
 * 
 * @utils appointmentUtils
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { addDays, addWeeks, addMonths } from 'date-fns';
import { Appointment, Item, User } from '../types';
import { getIntervals, getNextWorkedDay, getWorkedDayIntervals } from './dates';
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from './constants';

export interface AppointmentUtils {
  //idGenerator: () => number;
  createRepeatedAppointments: (params: RepeatAppointmentParams) => Appointment[];
  //pasteAppointment: (params: PasteAppointmentParams) => Appointment[];
}



export interface RepeatAppointmentParams {
  appointment: Appointment;
  repeatInterval: 'day' | 'week' | 'month';
  repeatCount?: number;
  endDate?: number;
  numberCount?: number;
  isFullDay: boolean;
  nonWorkingDates: number[];
  includeWeekend: boolean;
  includeNonWorkingDays: boolean;
}




export interface PasteAppointmentParams {
  clipboardAppointment: Appointment;
  targetCell: { employeeId: number; date: number };
  isFullDay: boolean;
  nonWorkingDates: number[];
  includeWeekend: boolean;
  includeNonWorkingDays: boolean;
}



/**
 * Crée une instance des utilitaires de gestion des rendez-vous
 * @returns Objet contenant toutes les fonctions utilitaires
 */
export const createAppointmentUtils = (
  employees: User[],
): AppointmentUtils => {


  const createRepeatedAppointments = (params: RepeatAppointmentParams): Appointment[] => {
    const { appointment, repeatInterval, repeatCount, endDate, numberCount, isFullDay, nonWorkingDates, includeWeekend, includeNonWorkingDays } = params;
    
    const startDateOriginal = appointment.DebutPlanningEvenement;
    const endDateOriginal = appointment.FinPlanningEvenement;
    const diff = endDateOriginal - startDateOriginal;
    const newAppointments: Appointment[] = [];
    
    let currentStartDate = repeatInterval === 'day' ? addDays(startDateOriginal, numberCount || 0).getTime() 
      : repeatInterval === 'week' ? addWeeks(startDateOriginal, numberCount || 0).getTime()
      : addMonths(startDateOriginal, numberCount || 0).getTime();

    currentStartDate = getNextWorkedDay(
      currentStartDate, 
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      nonWorkingDates
    );

    if (repeatCount) {
      for (let i = 0; i < repeatCount; i++) {
        const newStartDate = getNextWorkedDay(
          currentStartDate,
          isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          nonWorkingDates
        );
        const newEndDate = newStartDate + diff;

        const days = getWorkedDayIntervals(
          newStartDate,
          newEndDate,
          isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          includeNonWorkingDays,
          includeWeekend,
          nonWorkingDates,
        );

        days.forEach(day => {
          newAppointments.push({
            IdPlanningEvenement: 0,
            AnnotationPlanningEvenement: appointment.AnnotationPlanningEvenement || 'Description du rendez-vous répété',
            DebutPlanningEvenement: day.start,
            FinPlanningEvenement: day.end,
            IdEmploye: appointment.IdEmploye,
            IdPlanningRessource: appointment.IdPlanningRessource,
          });
        });

        currentStartDate = repeatInterval === 'day' ? addDays(newStartDate, numberCount || 1).getTime()
          : repeatInterval === 'week' ? addWeeks(newStartDate, numberCount || 1).getTime() 
          : addMonths(newStartDate, numberCount || 1).getTime();
      }
    } else if (endDate) {
      while (currentStartDate <= endDate) {
        const newStartDate = getNextWorkedDay(
          currentStartDate, 
          isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          nonWorkingDates
        );
        const newEndDate = newStartDate + diff;
        const days = getWorkedDayIntervals(
          newStartDate, 
          newEndDate,
          isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          includeNonWorkingDays,
          includeWeekend,
          nonWorkingDates
        );

        days.forEach(day => {
          newAppointments.push({
            IdPlanningEvenement: 0,
            AnnotationPlanningEvenement: appointment.AnnotationPlanningEvenement || 'Description du rendez-vous répété',
            DebutPlanningEvenement: day.start,
            FinPlanningEvenement: day.end,
            IdEmploye: appointment.IdEmploye,
            IdPlanningRessource: appointment.IdPlanningRessource,
          });
        });

        currentStartDate = repeatInterval === 'day' ? addDays(newStartDate, numberCount || 1).getTime()
          : repeatInterval === 'week' ? addWeeks(newStartDate, numberCount || 1).getTime()
          : addMonths(newStartDate, numberCount || 1).getTime();
      }
    }

    return newAppointments;
  };





  // const pasteAppointment = (params: PasteAppointmentParams): Appointment[] => {
  //   const { clipboardAppointment, targetCell, isFullDay, nonWorkingDates, includeWeekend, includeNonWorkingDays } = params;
    
  //   const startDate = clipboardAppointment.DebutPlanningEvenement;
  //   const endDate = clipboardAppointment.FinPlanningEvenement;
  //   const diff = endDate - startDate;
    
  //   const newStartDate = targetCell.date;
  //   const newEndDate = newStartDate + diff;
  
  //   const days = getWorkedDayIntervals(
  //     newStartDate, 
  //     newEndDate,
  //     isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
  //     includeNonWorkingDays,
  //     includeWeekend,
  //     nonWorkingDates
  //   );
    
  //   return days.map(day => ({
  //     ...clipboardAppointment,
  //     id: idGenerator(),
  //     startDate: day.start,
  //     endDate: day.end,
  //     IdEmploye: targetCell.employeeId,
  //   }));
  // };



  return {
    //idGenerator,
    createRepeatedAppointments,
    //pasteAppointment,
  };
};