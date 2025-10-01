/**
 * @fileoverview Point d'entrée pour les composants CalendarGrid refactorisés
 * Exporte tous les composants, hooks et utilitaires du module CalendarGrid
 * 
 * @author Gandara Solutions
 * @version 2.0.0
 */

// 🎯 Composant principal refactorisé
export { default as CalendarGridRefactored } from '../CalendarGridRefactored';

// 📱 Composants de vue
export { default as MobileCalendarView } from './MobileCalendarView';
export { default as DesktopCalendarView } from './DesktopCalendarView';
export { default as EmployeeColumn } from './EmployeeColumn';
export { default as CalendarTable } from './CalendarTable';

// 🎣 Hooks personnalisés
export { useEmployeeHeights } from '../../hooks/useEmployeeHeights';
export { useAppointmentPositioning } from '../../hooks/useAppointmentPositioning';
export { useDimensionManagement } from '../../hooks/useDimensionManagement';

// 🔧 Utilitaires
export * from '../../utils/calendarCalculations';

// 📝 Types
export type { AppointmentWithPosition } from '../../hooks/useAppointmentPositioning';