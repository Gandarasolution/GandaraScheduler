/**
 * @fileoverview Index des hooks personnalisés
 * 
 * Ce fichier exporte tous les hooks personnalisés utilisés dans l'application calendrier.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

export { useNotifications } from './useNotifications';
export type { Notification, NotificationsState } from './useNotifications';

export { useCalendarConfig } from './useCalendarConfig';
export type { CalendarConfigState } from './useCalendarConfig';

export { useAppointmentHistory } from './useAppointmentHistory';
export type { AppointmentHistoryState } from './useAppointmentHistory';

export { useInfiniteScroll } from './useInfiniteScroll';
export type { InfiniteScrollState } from './useInfiniteScroll';