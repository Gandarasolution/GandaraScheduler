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
import { Appointment, Item } from '../types';
import { getIntervals, getNextWorkedDay, getWorkedDayIntervals } from './dates';
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from './constants';

export interface AppointmentUtils {
  idGenerator: () => number;
  createAppointment: (params: CreateAppointmentParams) => Appointment;
  createRepeatedAppointments: (params: RepeatAppointmentParams) => Appointment[];
  divideAppointment: (params: DivideAppointmentParams) => Appointment[];
  pasteAppointment: (params: PasteAppointmentParams) => Appointment[];
  createAppointmentFromDrag: (params: DragCreateParams) => Appointment;
  saveAppointment: (params: SaveAppointmentParams) => Appointment[];
  deleteAppointment: (appointmentId: number, appointments: Appointment[]) => Appointment[];
}

export interface CreateAppointmentParams {
  startDate: number;
  endDate: number;
  employeeId: number;
  eventId: number;
  type: 'chantier' | 'absence' | 'autre';
  description?: string;
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

export interface MoveAppointmentParams {
  appointment: Appointment;
  newStartDate: number;
  newEndDate: number;
  newEmployeeId: number;
  isFullDay: boolean;
  includeWeekend: boolean;
  nonWorkingDates: number[];
}

export interface ResizeAppointmentParams {
  appointment: Appointment;
  newStartDate: number;
  newEndDate: number;
  newEmployeeId?: number;
}

export interface DivideAppointmentParams {
  appointment: Appointment;
  isFullDay: boolean;
}

export interface ExtendAppointmentParams {
  appointment: Appointment;
  newEndDate: Date;
}

export interface PasteAppointmentParams {
  clipboardAppointment: Appointment;
  targetCell: { employeeId: number; date: number };
  isFullDay: boolean;
  nonWorkingDates: number[];
  includeWeekend: boolean;
  includeNonWorkingDays: boolean;
}

export interface DragCreateParams {
  title: string;
  date: number;
  intervalName: 'morning' | 'afternoon' | 'day';
  employeeId: number;
  imageUrl: string;
  typeEvent: 'Chantier' | 'Absence' | 'Autre';
}

export interface SaveAppointmentParams {
  appointment: Appointment;
  eventUpdate: Item;
  isFullDay: boolean;
  nonWorkingDates: number[];
  includeNonWorkingDays: boolean;
  includeWeekend: boolean;
}

/**
 * Crée une instance des utilitaires de gestion des rendez-vous
 * @returns Objet contenant toutes les fonctions utilitaires
 */
export const createAppointmentUtils = (): AppointmentUtils => {
  let idCounter = 10000; // Compteur pour générer des IDs uniques

  const idGenerator = (): number => {
    return ++idCounter;
  };

  const createAppointment = (params: CreateAppointmentParams): Appointment => {
    const { startDate, endDate, employeeId, eventId, type, description } = params;
    
    return {
      id: idGenerator(),
      description: description || 'Nouveau rendez-vous',
      startDate,
      endDate,
      employeeId,
      type,
      EventId: eventId,
    };
  };

  const createRepeatedAppointments = (params: RepeatAppointmentParams): Appointment[] => {
    const { appointment, repeatInterval, repeatCount, endDate, numberCount, isFullDay, nonWorkingDates, includeWeekend, includeNonWorkingDays } = params;
    
    const startDateOriginal = appointment.startDate;
    const endDateOriginal = appointment.endDate;
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
            id: idGenerator(),
            description: appointment.description || 'Description du rendez-vous répété',
            startDate: day.start,
            endDate: day.end,
            employeeId: appointment.employeeId,
            type: appointment.type,
            EventId: appointment.EventId,
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
            id: idGenerator(),
            description: appointment.description || 'Description du rendez-vous répété',
            startDate: day.start,
            endDate: day.end,
            employeeId: appointment.employeeId,
            type: appointment.type,
            EventId: appointment.EventId,
          });
        });

        currentStartDate = repeatInterval === 'day' ? addDays(newStartDate, numberCount || 1).getTime()
          : repeatInterval === 'week' ? addWeeks(newStartDate, numberCount || 1).getTime()
          : addMonths(newStartDate, numberCount || 1).getTime();
      }
    }

    return newAppointments;
  };


  const divideAppointment = (params: DivideAppointmentParams): Appointment[] => {
    const { appointment, isFullDay } = params;

    const nbIntervals = getIntervals(
      appointment.startDate,
      appointment.endDate,
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      isFullDay,
    );
    
    if (isFullDay) {
      const firstAppointmentEnd = appointment.startDate + ((DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour) * 60 * 60 * 1000 - 1) * nbIntervals;
      const secondAppointmentStart = firstAppointmentEnd + 1;

      return [
        {
          ...appointment,
          id: idGenerator(),
          endDate: firstAppointmentEnd,
          description: `${appointment.description} (Matin)`
        },
        {
          ...appointment,
          id: idGenerator(),
          startDate: secondAppointmentStart,
          description: `${appointment.description} (Après-midi)`
        }
      ];
    } else {
      // Division en demi-journée : créer deux créneaux
      const middleTime = appointment.startDate + appointment.endDate / 2;
      
      return [
        {
          ...appointment,
          id: idGenerator(),
          endDate: middleTime,
          description: `${appointment.description} (1/2)`
        },
        {
          ...appointment,
          id: idGenerator(),
          startDate: middleTime,
          description: `${appointment.description} (2/2)`
        }
      ];
    }
  };




  const pasteAppointment = (params: PasteAppointmentParams): Appointment[] => {
    const { clipboardAppointment, targetCell, isFullDay, nonWorkingDates, includeWeekend, includeNonWorkingDays } = params;
    
    const startDate = clipboardAppointment.startDate;
    const endDate = clipboardAppointment.endDate;
    const diff = endDate - startDate;
    
    const newStartDate = targetCell.date;
    const newEndDate = newStartDate + diff;
  
    const days = getWorkedDayIntervals(
      newStartDate, 
      newEndDate,
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      includeNonWorkingDays,
      includeWeekend,
      nonWorkingDates
    );
    
    return days.map(day => ({
      ...clipboardAppointment,
      id: idGenerator(),
      startDate: day.start,
      endDate: day.end,
      employeeId: targetCell.employeeId,
    }));
  };

  const createAppointmentFromDrag = (params: DragCreateParams): Appointment => {
    const { title, date, intervalName, employeeId, imageUrl, typeEvent } = params;
    
    // Calculer les heures selon l'intervalle
    let startDate: number;
    let endDate: number;
    
    if (intervalName === 'morning') {
      startDate =  new Date(date).setHours(HALF_DAY_INTERVALS[0].startHour, 0, 0, 0);
      endDate = new Date(date).setHours(HALF_DAY_INTERVALS[0].endHour - 1, 59, 59, 999);
    } else if (intervalName === 'afternoon') {
      startDate = new Date(date).setHours(HALF_DAY_INTERVALS[1].startHour, 0, 0, 0);
      endDate = new Date(date).setHours(HALF_DAY_INTERVALS[1].endHour - 1, 59, 59, 999);
    } else { // day
      startDate = new Date(date).setHours(DAY_INTERVALS[0].startHour, 0, 0, 0);
      endDate = new Date(date).setHours(DAY_INTERVALS[0].endHour - 1, 59, 59, 999);
    }
    
    return {
      id: idGenerator(),
      description: title,
      startDate: startDate,
      endDate: endDate,
      employeeId,
      type: typeEvent.toLowerCase() as 'chantier' | 'absence' | 'autre',
      EventId: 1, // Sera mis à jour selon l'événement sélectionné
    };
  };

  const saveAppointment = (params: SaveAppointmentParams): Appointment[] => {
    const { appointment, eventUpdate, isFullDay, nonWorkingDates, includeWeekend, includeNonWorkingDays } = params;
    
    const days = getWorkedDayIntervals(
      appointment.startDate, 
      appointment.endDate,
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      includeNonWorkingDays,
      includeWeekend,
      nonWorkingDates
    );
    
    const createdAppointments: Appointment[] = [];
    
    // Créer les rendez-vous pour tous les jours travaillés
    days.forEach((day, index) => {
      if (index === 0 && appointment.id) {
        // Mettre à jour le rendez-vous existant
        appointment.startDate = day.start;
        appointment.endDate = day.end;
      } else {
        // Créer de nouveaux rendez-vous pour les jours supplémentaires
        createdAppointments.push({
          id: idGenerator(),
          description: appointment.description,
          startDate: day.start,
          endDate: day.end,
          employeeId: appointment.employeeId,
          type: appointment.type,
          EventId: appointment.EventId,
        });
      }
    });
    
    return createdAppointments;
  };

  const deleteAppointment = (appointmentId: number, appointments: Appointment[]): Appointment[] => {
    return appointments.filter(app => app.id !== appointmentId);
  };

  return {
    idGenerator,
    createAppointment,
    createRepeatedAppointments,
    divideAppointment,
    pasteAppointment,
    createAppointmentFromDrag,
    saveAppointment,
    deleteAppointment
  };
};