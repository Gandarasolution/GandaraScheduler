// Palette de couleurs, tailles de cellules, et autres constantes globales
// Centralisé pour la réutilisation et la maintenance

import { HalfDayInterval } from "../types";

export const EMPLOYEE_COLUMN_WIDTH = "150px";
export const CELL_WIDTH = 60;
export const CELL_HEIGHT = 50;

export const HALF_DAY_INTERVALS: HalfDayInterval[] = [
  { name: "morning", startHour: 0, endHour: 12},
  { name: "afternoon", startHour: 12, endHour: 24 },
];
export const DAY_INTERVALS: HalfDayInterval[] = [
  { name: "day", startHour: 0, endHour: 24 },
];

export const colors: string[] = [
  "bg-blue-400 ring-blue-500",
  "bg-emerald-400 ring-emerald-500",
  "bg-amber-400 ring-amber-500",
  "bg-rose-400 ring-rose-500",
  "bg-purple-400 ring-purple-500",
  "bg-pink-400 ring-pink-500",
  "bg-gray-400 ring-gray-500",
  "bg-sky-400 ring-sky-500",
  "bg-orange-400 ring-orange-500",
  "bg-teal-400 ring-teal-500",
];

export const DAYS_TO_ADD = 30;
export const THRESHOLD_MAX = 80;
export const THRESHOLD_MIN = 20;
export const WINDOW_SIZE = 100;
