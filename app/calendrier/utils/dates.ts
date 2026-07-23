// Fonctions utilitaires pour la gestion des jours travaillés, fériés, et intervalles
// Centralisées pour la réutilisation dans tout le projet

import { addHours, format, isSameDay } from "date-fns";
import Holidays from "date-holidays";
import { HalfDayInterval } from "../types";
import { DAY_MS, HOUR_MS } from "./constants";


const hd = new Holidays("FR");
const holidays = hd.getHolidays(new Date().getFullYear());
// Pré-calcul d'un Set pour accélérer la détection des jours fériés
const holidaySet = new Set(holidays.map(h => format(new Date(h.date), "yyyy-MM-dd")));

/**
 * Vérifie si une date est un jour férié (France)
 * @param date Date à tester
 * @returns true si férié, false sinon
 */
export const isHoliday = (date: number): boolean => {  
  if (!Number.isFinite(date)) return false;
  try {
    const dateStr = format(date, "yyyy-MM-dd"); // Format ISO standard
    return holidaySet.has(dateStr);
  } catch (error) {
    console.warn("Erreur lors de la vérification du jour férié:", error);
    return false;
  }
};

/**
 * Vérifie si une date est un jour travaillé
 * @param date Date à tester
 * @returns true si travaillé, false sinon
 */
export const isWorkedDay = (date: number, nonWorkingDates: Record<string, number>): boolean => {  
  if (!Number.isFinite(date)) return false;
  const dateKey = format(date, 'yyyy-MM-dd');
  return !isHoliday(date) 
    && !nonWorkingDates[dateKey];
};

/**
 * Vérifie si une date est un week-end (samedi ou dimanche)
 * @param date Date à tester
 * @returns true si week-end, false sinon
 */
export const isWeekend = (date: number): boolean => {
  if (!Number.isFinite(date)) return false;
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

/**
 * Retourne le prochain jour de repos (week-end ou férié) à partir d'une date
 * @param date Date de départ
 * @param HALF_DAY_INTERVALS Intervalles demi-journée
 * @returns Date du prochain repos
 */
export const getNextRestDay = (date: number, HALF_DAY_INTERVALS: HalfDayInterval[], nonWorkingDates: Record<string, number>): number => {
  if (!Number.isFinite(date)) return date;
  let next = new Date(date);
  while (isWorkedDay(next.getTime(), nonWorkingDates)) {
    next = addHours(next, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour);
  }  
  return next.getTime();
};


/**
 * Retourne le prochain jour travaillé à partir d'une date
 * @param date Date de départ
 * @param HALF_DAY_INTERVALS Intervalles demi-journée
 * @returns Date du prochain jour travaillé
 */
export const getNextWorkedDay = (date: number, HALF_DAY_INTERVALS: HalfDayInterval[], nonWorkingDates: Record<string, number>): number => {
  if (!Number.isFinite(date)) return date;
  let next = date;
  let safety = 0;
  const maxIterations = 1000;
  while (!isWorkedDay(next, nonWorkingDates)) {
    next = addHours(next, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour).getTime();
    safety++;
    if (safety > maxIterations) {
      console.error("Boucle infinie détectée dans getNextWorkedDay, date de départ:", date);
      throw new Error("Impossible de trouver un jour travaillé après 1000 itérations");
    }
  }
  return next;
};

/**
 * Retourne le jour travaillé précédent à partir d'une date
 * @param date Date de départ
 * @param HALF_DAY_INTERVALS Intervalles demi-journée
 * @returns Date du jour travaillé précédent
 */
export const getBeforeWorkedDay = (date: number, HALF_DAY_INTERVALS: HalfDayInterval[], nonWorkingDates: Record<string, number>): number => {
  if (!Number.isFinite(date)) return date;
  let previous = date;
  let safety = 0;
  const maxIterations = 1000;
  while (!isWorkedDay(previous, nonWorkingDates)) {
    previous = addHours(previous, -(HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour)).getTime();
    safety++;
    if (safety > maxIterations) {
      console.error("Boucle infinie détectée dans getBeforeWorkedDay, date de départ:", date);
      throw new Error("Impossible de trouver un jour travaillé précédent après 1000 itérations");
    }
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
  start: number,
  end: number,
  HALF_DAY_INTERVALS: HalfDayInterval[],
  includeNonWorkingDays: boolean,
  includeWeekends: boolean,
  nonWorkingDates: Record<string, number>,
): { start: number; end: number }[] => {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return [];
  const intervals: { start: number; end: number }[] = [];
  let day = start;

  const isIncluded = (date: number) => {    
    if (!includeWeekends && isWeekend(date)) {
        return false;
    }

    // 2. Gestion des jours fériés et jours non travaillés spécifiques
    const dateKey = format(date, 'yyyy-MM-dd');
    const isCustomNonWorking = nonWorkingDates[dateKey] !== undefined;
    const isPublicHoliday = isHoliday(date);

    // Si on ne doit PAS inclure les jours chômés ET que c'en est un -> EXCLURE
    if (!includeNonWorkingDays && (isCustomNonWorking || isPublicHoliday)) {
        return false;
    }

    // 3. Sinon, c'est inclus
    return true;
  };

  let safety = 0;
  const maxIterations = 10000;
  
  while (day < end) {
    // Cherche le prochain jour à inclure
    while (day < end && !isIncluded(day)) {
      day = addHours(day, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour).getTime();
      safety++;
      if (safety > maxIterations) throw new Error("Boucle infinie détectée dans getWorkedDayIntervals (recherche début)");
    }
    if (day >= end) break;

    // Début de l'intervalle
    const intervalStart = day;

    

    // Cherche la fin de l'intervalle continu à inclure
    while (
      day < end &&
      isIncluded(day)
    ) {
      day = addHours(day, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour).getTime();
      safety++;
      if (safety > maxIterations) throw new Error("Boucle infinie détectée dans getWorkedDayIntervals (recherche fin)");
    }


    const newEnd = new Date(day).getHours() === 0 ? addHours(day, -1).setMinutes(59, 59, 999) : day;

    

    intervals.push({
      start: intervalStart,
      end: newEnd < end ? newEnd : end,
    });
  }
  

  return intervals;
};



export const getIntervals = (
  start: number,
  end: number,
  HALF_DAY_INTERVALS: HalfDayInterval[],
  isFullDay: boolean,
): number => {

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

  if(isFullDay){
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return totalDays;
  }

  const totalHours = (end - start) / (1000 * 60 * 60);
  const hoursPerDay = HALF_DAY_INTERVALS.reduce((sum, interval) => sum + (interval.endHour - interval.startHour), 0);
  const totalDays = totalHours / hoursPerDay;
  return totalDays;
}


export const eachDayOfInterval = (interval: { start: number; end: number }): number[] => {
  if (!Number.isFinite(interval.start) || !Number.isFinite(interval.end)) return [];
  const dates: number[] = [];
  let current = interval.start;
  while (current <= interval.end) {
    dates.push(current);
    current = current + 86400000; // Ajouter un jour en millisecondes    
  }
  return dates;
}



/**
 * Calcule le numéro de semaine pour un jour donné
 * @param d - Date à analyser
 * @returns Numéro de la semaine
 */
export const getWeekNumber = (d: number): number => {
  if (!Number.isFinite(d)) return 0;
  const date = new Date(d);
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

/**
 *  Compte le nombre de jours de week-end dans un intervalle de dates
 * @param startDate Date de début de l'intervalle
 * @param endDate Date de fin de l'intervalle
 * @returns Nombre de jours de week-end
 */
export const countWeekends = (startDate: number, endDate: number) => {
  if (!Number.isFinite(startDate) || !Number.isFinite(endDate) || endDate <= startDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let count = 0;
  const curDate = new Date(start);

  // Note : Cette boucle while peut être optimisée mathématiquement pour O(1) 
  // si tu as des milliers d'années, mais pour quelques mois c'est ultra rapide.
  while (curDate < end) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 = Dimanche, 6 = Samedi
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};