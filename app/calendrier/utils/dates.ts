// Fonctions utilitaires pour la gestion des jours travaillés, fériés, et intervalles
// Centralisées pour la réutilisation dans tout le projet

import { addHours } from "date-fns";
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
  const dateStr = date.toISOString().split("T")[0];
  return holidays.some((holiday) => holiday.date === dateStr);
};

/**
 * Vérifie si une date est un jour travaillé (ni week-end, ni férié)
 * @param date Date à tester
 * @returns true si travaillé, false sinon
 */
export const isWorkedDay = (date: Date): boolean => {
  return date.getDay() !== 0 && date.getDay() !== 6 && !isHoliday(date);
};

/**
 * Retourne le prochain jour de repos (week-end ou férié) à partir d'une date
 * @param date Date de départ
 * @param HALF_DAY_INTERVALS Intervalles demi-journée
 * @returns Date du prochain repos
 */
export const getNextRestDay = (date: Date, HALF_DAY_INTERVALS: HalfDayInterval[]): Date => {
  let next = new Date(date);
  while (isWorkedDay(next)) {
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
export const getNextWorkedDay = (date: Date, HALF_DAY_INTERVALS: HalfDayInterval[]): Date => {
  let next = new Date(date);
  while (!isWorkedDay(next)) {
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
  HALF_DAY_INTERVALS: HalfDayInterval[]
): { start: Date; end: Date }[] => {
  const intervals: { start: Date; end: Date }[] = [];
  let day = getNextWorkedDay(start, HALF_DAY_INTERVALS);

  while (day < end) {
    const intervalEnd = getNextRestDay(day, HALF_DAY_INTERVALS);
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
    day = getNextWorkedDay(intervalEnd, HALF_DAY_INTERVALS);
    if (day > end) break;
  }
  return intervals;
};
