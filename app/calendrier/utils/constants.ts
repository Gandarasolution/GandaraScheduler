// Palette de couleurs, tailles de cellules, et autres constantes globales
// Centralisé pour la réutilisation et la maintenance

import { HalfDayInterval } from "../types";

export const EMPLOYEE_COLUMN_WIDTH = 150;
export const CELL_WIDTH = 45;
export const CELL_HEIGHT = 40;
export const MARGIN_BETWEEN_TEAMS = 20;


export const HALF_DAY_INTERVALS: HalfDayInterval[] = [
  { name: "morning", startHour: 0, endHour: 12},
  { name: "afternoon", startHour: 12, endHour: 24 },
];
export const DAY_INTERVALS: HalfDayInterval[] = [
  { name: "day", startHour: 0, endHour: 24 },
];

export const colors: string[] = [
  "bg-blue-400",
  "bg-emerald-400 ",
  "bg-amber-400 ",
  "bg-rose-400 ",
  "bg-purple-400",
  "bg-pink-400 ",
  "bg-gray-400",
  "bg-sky-400 ",
  "bg-orange-400 ",
  "bg-teal-400",
];

export const DAYS_TO_ADD = 30;
export const THRESHOLD_MAX = 80;
export const THRESHOLD_MIN = 20;
export const WINDOW_SIZE = 100;
