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

  if (includeWeekend) {
    intervals.push({ start: new Date(start), end: new Date(end) });
    return intervals; // Si on inclut les week-ends, on retourne l'interval complet
  }

  let day = getNextWorkedDay(start, HALF_DAY_INTERVALS, nonWorkingDates);

  while (day < end) {
    const intervalEnd = getNextRestDay(day, HALF_DAY_INTERVALS, nonWorkingDates);
    if (intervalEnd > end) {
      intervals.push({
        start: new Date(day),
        end: new Date(end),
      });
      break;
    }
    intervals.push({
      start: new Date(day),
      end: intervalEnd,
    });
    day = getNextWorkedDay(intervalEnd, HALF_DAY_INTERVALS, nonWorkingDates);
    if (day > end) break;
  }
  return intervals;
};
