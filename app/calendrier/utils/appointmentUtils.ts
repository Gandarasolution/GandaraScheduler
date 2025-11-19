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
import { Appointment, Evenement, Employee } from '../types';
import { getNextWorkedDay, getWorkedDayIntervals, isWorkedDay } from './dates';
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from './constants';

export interface AppointmentUtils {
  idGenerator: () => number;
  createAppointment: (params: CreateAppointmentParams) => Appointment;
  createRepeatedAppointments: (params: RepeatAppointmentParams) => Appointment[];
  moveAppointment: (params: MoveAppointmentParams) => void;
  resizeAppointment: (params: ResizeAppointmentParams) => void;
  divideAppointment: (params: DivideAppointmentParams) => Appointment[];
  extendAppointment: (params: ExtendAppointmentParams) => void;
  copyAppointment: (appointment: Appointment) => Appointment;
  pasteAppointment: (params: PasteAppointmentParams) => Appointment[];
  createAppointmentFromDrag: (params: DragCreateParams) => Appointment;
  saveAppointment: (params: SaveAppointmentParams) => Appointment[];
  deleteAppointment: (appointmentId: number, appointments: Appointment[]) => Appointment[];
}

export interface CreateAppointmentParams {
  startDate: Date;
  endDate: Date;
  employeeId: number;
  eventId: number;
  type: 'chantier' | 'absence' | 'autre';
  description?: string;
}

export interface RepeatAppointmentParams {
  appointment: Appointment;
  repeatInterval: 'day' | 'week' | 'month';
  repeatCount?: number;
  endDate?: Date;
  numberCount?: number;
  isFullDay: boolean;
  nonWorkingDates: Date[];
  includeWeekend: boolean;
  includeNonWorkingDays: boolean;
}

export interface MoveAppointmentParams {
  appointment: Appointment;
  newStartDate: Date;
  newEndDate: Date;
  newEmployeeId: number;
  isFullDay: boolean;
  includeWeekend: boolean;
  nonWorkingDates: Date[];
}

export interface ResizeAppointmentParams {
  appointment: Appointment;
  newStartDate: Date;
  newEndDate: Date;
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
  targetCell: { employeeId: number; date: Date };
  isFullDay: boolean;
  nonWorkingDates: Date[];
  includeWeekend: boolean;
  includeNonWorkingDays: boolean;
}

export interface DragCreateParams {
  title: string;
  date: Date;
  intervalName: 'morning' | 'afternoon' | 'day';
  employeeId: number;
  imageUrl: string;
  typeEvent: 'Chantier' | 'Absence' | 'Autre';
}

export interface SaveAppointmentParams {
  appointment: Appointment;
  eventUpdate: Evenement;
  isFullDay: boolean;
  nonWorkingDates: Date[];
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
    const diff = endDateOriginal.getTime() - startDateOriginal.getTime();
    const newAppointments: Appointment[] = [];
    
    let currentStartDate = repeatInterval === 'day' ? addDays(startDateOriginal, numberCount || 0) 
      : repeatInterval === 'week' ? addWeeks(startDateOriginal, numberCount || 0) 
      : addMonths(startDateOriginal, numberCount || 0);

    currentStartDate = getNextWorkedDay(
      currentStartDate, 
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      nonWorkingDates
    );

    if (repeatCount) {
      for (let i = 0; i < repeatCount; i++) {
        const newStartDate = getNextWorkedDay(
          new Date(currentStartDate.getTime()),
          isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          nonWorkingDates
        );
        const newEndDate = new Date(newStartDate.getTime() + diff);

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

        currentStartDate = repeatInterval === 'day' ? addDays(newStartDate, numberCount || 1)
          : repeatInterval === 'week' ? addWeeks(newStartDate, numberCount || 1) 
          : addMonths(newStartDate, numberCount || 1);
      }
    } else if (endDate) {
      while (currentStartDate <= endDate) {
        const newStartDate = getNextWorkedDay(
          new Date(currentStartDate.getTime()), 
          isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          nonWorkingDates
        );
        const newEndDate = new Date(newStartDate.getTime() + diff);

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

        currentStartDate = repeatInterval === 'day' ? addDays(newStartDate, numberCount || 1)
          : repeatInterval === 'week' ? addWeeks(newStartDate, numberCount || 1)
          : addMonths(newStartDate, numberCount || 1);
      }
    }

    return newAppointments;
  };

  const moveAppointment = (params: MoveAppointmentParams): void => {
    // Cette fonction sera implémentée selon les besoins spécifiques
    // Elle devra modifier l'appointment en place ou retourner un nouveau appointment
    console.log('Move appointment:', params);
  };

  const resizeAppointment = (params: ResizeAppointmentParams): void => {
    // Cette fonction sera implémentée selon les besoins spécifiques
    console.log('Resize appointment:', params);
  };

  const divideAppointment = (params: DivideAppointmentParams): Appointment[] => {
    const { appointment, isFullDay } = params;
    
    if (isFullDay) {
      // Division en journée : créer matin et après-midi
      const morningEnd = new Date(appointment.startDate);
      morningEnd.setHours(12, 0, 0, 0);
      
      const afternoonStart = new Date(appointment.startDate);
      afternoonStart.setHours(13, 0, 0, 0);
      
      return [
        {
          ...appointment,
          id: idGenerator(),
          endDate: morningEnd,
          description: `${appointment.description} (Matin)`
        },
        {
          ...appointment,
          id: idGenerator(),
          startDate: afternoonStart,
          description: `${appointment.description} (Après-midi)`
        }
      ];
    } else {
      // Division en demi-journée : créer deux créneaux
      const middleTime = new Date(
        (appointment.startDate.getTime() + appointment.endDate.getTime()) / 2
      );
      
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

  const extendAppointment = (params: ExtendAppointmentParams): void => {
    // Cette fonction sera implémentée selon les besoins spécifiques
    console.log('Extend appointment:', params);
  };

  const copyAppointment = (appointment: Appointment): Appointment => {
    return { ...appointment };
  };

  const pasteAppointment = (params: PasteAppointmentParams): Appointment[] => {
    const { clipboardAppointment, targetCell, isFullDay, nonWorkingDates, includeWeekend, includeNonWorkingDays } = params;
    
    const startDate = clipboardAppointment.startDate;
    const endDate = clipboardAppointment.endDate;
    const diff = endDate.getTime() - startDate.getTime();
    
    const newStartDate = new Date(targetCell.date.getTime());
    const newEndDate = new Date(newStartDate.getTime() + diff);
    
    if (!isWorkedDay(newStartDate, nonWorkingDates)) {
      throw new Error('Les dates sélectionnées ne sont pas des jours travaillés.');
    }
    
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
    let startDate: Date;
    let endDate: Date;
    
    if (intervalName === 'morning') {
      startDate = new Date(date);
      startDate.setHours(8, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(12, 0, 0, 0);
    } else if (intervalName === 'afternoon') {
      startDate = new Date(date);
      startDate.setHours(13, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(17, 0, 0, 0);
    } else { // day
      startDate = new Date(date);
      startDate.setHours(8, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(17, 0, 0, 0);
    }
    
    return {
      id: idGenerator(),
      description: title,
      startDate,
      endDate,
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
    moveAppointment,
    resizeAppointment,
    divideAppointment,
    extendAppointment,
    copyAppointment,
    pasteAppointment,
    createAppointmentFromDrag,
    saveAppointment,
    deleteAppointment
  };
};