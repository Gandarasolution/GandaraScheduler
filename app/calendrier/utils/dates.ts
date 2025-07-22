// Fonctions utilitaires pour la gestion des jours travaillés, fériés, et intervalles
// Centralisées pour la réutilisation dans tout le projet

import { addHours, formatDate, isSameDay } from "date-fns";
import Holidays from "date-holidays";
import { HalfDayInterval } from "../types";

const hd = new Holidays("FR");
const holidays = hd.getHolidays(new Date().getFullYear());

/**
 * Vérifie si une date est un jour férié (France)
 * @param date Date à tester
 * @returns true si férié, false sinon
 */
export const isHoliday = (date: Date): boolean => {  
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dateStr = formatDate(d, "yyyy-MM-dd HH:mm:ss"); // Format YYYY-MM-DD HH:mm:ss
  return holidays.some((holiday) => holiday.date === dateStr);
};

/**
 * Vérifie si une date est un jour travaillé (ni week-end, ni férié)
 * @param date Date à tester
 * @returns true si travaillé, false sinon
 */
export const isWorkedDay = (date: Date, nonWorkingDates: Date[]): boolean => {  
  return date.getDay() !== 0 
    && date.getDay() !== 6 
    && !isHoliday(date) 
    && !nonWorkingDates.some(d => isSameDay(d, date));
};

/**
 * Vérifie si une date est un week-end (samedi ou dimanche)
 * @param date Date à tester
 * @returns true si week-end, false sinon
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Retourne le prochain jour de repos (week-end ou férié) à partir d'une date
 * @param date Date de départ
 * @param HALF_DAY_INTERVALS Intervalles demi-journée
 * @returns Date du prochain repos
 */
export const getNextRestDay = (date: Date, HALF_DAY_INTERVALS: HalfDayInterval[], nonWorkingDates: Date[]): Date => {
  let next = new Date(date);
  while (isWorkedDay(next, nonWorkingDates)) {
    next = addHours(next, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour);
  }  
  return next;
};

/**
 * Retourne le prochain jour travaillé à partir d'une date
 * @param date Date de départ
 * @param HALF_DAY_INTERVALS Intervalles demi-journée
 * @returns Date du prochain jour travaillé
 */
export const getNextWorkedDay = (date: Date, HALF_DAY_INTERVALS: HalfDayInterval[], nonWorkingDates: Date[]): Date => {
  let next = new Date(date);
  while (!isWorkedDay(next, nonWorkingDates)) {
    next = addHours(next, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour);
  }
  return next;
};

/**
 * Retourne le jour travaillé précédent à partir d'une date
 * @param date Date de départ
 * @param HALF_DAY_INTERVALS Intervalles demi-journée
 * @returns Date du jour travaillé précédent
 */
export const getBeforeWorkedDay = (date: Date, HALF_DAY_INTERVALS: HalfDayInterval[], nonWorkingDates: Date[]): Date => {
  let previous = new Date(date);
  while (!isWorkedDay(previous, nonWorkingDates)) {
    previous = addHours(previous, -(HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour));
  }
  return previous;
};

/**
 * Découpe un intervalle en sous-intervalles de jours travaillés
 * @param start Date de début
 * @param end Date de fin
 * @param HALF_DAY_INTERVALS Intervalles demi-journée
 * @returns Tableau d'intervalles {start, end}
 */
export const getWorkedDayIntervals = (
  start: Date,
  end: Date,
  HALF_DAY_INTERVALS: HalfDayInterval[],
  includeWeekend: boolean,
  nonWorkingDates: Date[]
): { start: Date; end: Date }[] => {
  const intervals: { start: Date; end: Date }[] = [];

  // Nouvelle logique : on découpe toujours sur les jours non travaillés (fériés, absences), même si includeWeekend
  let current = new Date(start);
  while (current < end) {
    let next = new Date(current);
    // Avance jusqu'au prochain jour non travaillé (hors week-end si includeWeekend, sinon week-end inclus)
    while (next < end) {
      // Si c'est un jour non travaillé (hors week-end si includeWeekend)
      const isNonWorked = !isWorkedDay(next, nonWorkingDates);
      if (isNonWorked && (includeWeekend ? !isWeekend(next) : true)) {
        break;
      }
      next = addHours(next, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour);
    }
    // Ajoute l'intervalle courant
    intervals.push({ start: new Date(current), end: new Date(Math.min(next.getTime(), end.getTime())) });
    // Passe au prochain jour travaillé après le non travaillé
    current = new Date(next);
    while (current < end && (!isWorkedDay(current, nonWorkingDates) && (includeWeekend ? !isWeekend(current) : true))) {
      current = addHours(current, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour);
    }
  }
  return intervals;
};
