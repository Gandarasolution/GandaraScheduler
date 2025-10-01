/**
 * @fileoverview Utilitaires pour les calculs de calendrier
 * Fonctions réutilisables pour les calculs de chevauchements et positionnement
 * 
 * @utilities CalendarUtils
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { Appointment } from '../types';

/**
 * Calcule le nombre maximum de rendez-vous qui se chevauchent dans une liste
 */
export const calculateMaxOverlaps = (appointments: Appointment[]): number => {
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
 * Vérifie si deux périodes se chevauchent
 */
export const isOverlapping = (
  start1: Date, 
  end1: Date, 
  start2: Date, 
  end2: Date
): boolean => {
  return !(end1 <= start2 || start1 >= end2);
};

/**
 * Trie les appointments par date de début
 */
export const sortAppointmentsByStart = (appointments: Appointment[]): Appointment[] => {
  return [...appointments].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
};

/**
 * Filtre les appointments d'un employé pour une journée donnée
 */
export const getEmployeeAppointmentsForDay = (
  appointments: Appointment[],
  employeeId: number,
  day: Date
): Appointment[] => {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return appointments.filter(
    app =>
      app.employeeId === employeeId &&
      app.startDate < dayEnd &&
      app.endDate > dayStart
  );
};

/**
 * Calcule la hauteur optimale pour une liste d'appointments
 */
export const calculateOptimalHeight = (
  appointments: Appointment[],
  baseHeight: number,
  spacing: number = 2,
  padding: number = 10
): number => {
  if (appointments.length === 0) return baseHeight;
  
  const maxOverlaps = calculateMaxOverlaps(appointments);
  return (maxOverlaps * baseHeight) + (spacing * maxOverlaps) + padding;
};

/**
 * Crée un slot d'empilement pour les appointments qui se chevauchent
 */
export const createStackingSlots = (appointments: Appointment[]): Appointment[][] => {
  const slots: Appointment[][] = [];
  const sortedAppointments = sortAppointmentsByStart(appointments);

  sortedAppointments.forEach(app => {
    let slotIndex = 0;
    while (
      slots[slotIndex] &&
      slots[slotIndex].some(other => isOverlapping(
        app.startDate, app.endDate, 
        other.startDate, other.endDate
      ))
    ) {
      slotIndex++;
    }
    if (!slots[slotIndex]) slots[slotIndex] = [];
    slots[slotIndex].push(app);
  });

  return slots;
};