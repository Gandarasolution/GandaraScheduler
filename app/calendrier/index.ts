/**
 * @fileoverview Index principal du module Calendrier
 * 
 * Ce fichier centralise tous les exports du module calendrier pour faciliter
 * l'importation dans d'autres parties de l'application.
 * 
 * @example
 * // Au lieu de :
 * import { useCalendarConfig } from '@/app/calendrier/hooks/useCalendarConfig';
 * import { formatDate } from '@/app/calendrier/utils/dates';
 * 
 * // On peut faire :
 * import { useCalendarConfig, formatDate } from '@/app/calendrier';
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

// ===== TYPES =====
export * from './types';

// ===== HOOKS =====
export * from './hooks';

// ===== SERVICES =====
export * from './services';

// ===== UTILITAIRES =====
export * from './utils';

// ===== COMPOSANTS =====
export * from './components';
