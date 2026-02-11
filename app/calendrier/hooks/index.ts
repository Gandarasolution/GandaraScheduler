/**
 * @fileoverview Index des hooks personnalisés
 * 
 * Ce fichier exporte tous les hooks personnalisés utilisés dans l'application calendrier.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

// Hooks de notifications
export { useNotifications } from './useNotifiactions';
export type { Notification, NotificationsState } from './useNotifiactions';

// Hooks de configuration
export { useCalendarConfig } from './useCalendarConfig';

// Hooks d'interaction et UI
export { useAutoScrollOnDrag } from './useAutoScrollOnDrag';
export { useDebounce } from './useDebounce';
export { useSwipe } from './useSwipe';
export { useRecentEmployees } from './useRecentEmployees';
export { useInteraction } from './useInteraction';
export { useSmartScroll } from './useSmartScroll';
export { useCalendarWorker } from './useCalendarWorker';

// Hooks de logique métier
export { useAppointmentLogic } from './useAppointmentLogic';
export { useCalendarInteractions } from './useCalendarInteractions';
export { useCalendarLayout } from './useCalendarLayout';
export { useCalendarView } from './useCalendarView';
export { useDataLayer } from './useDataLayer';
export { useTimeline } from './useTimeline';

// Hooks de collaboration
export { useCollaboration } from './useCollaboration';