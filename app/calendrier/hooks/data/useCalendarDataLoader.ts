/**
 * @fileoverview Hook useCalendarDataLoader - Gestion du chargement des données du calendrier
 * 
 * Gère le chargement progressif des rendez-vous selon la fenêtre visible:
 * - Détection des seuils de chargement (soft et hard)
 * - Chargement après arrêt du scroll/grab
 * - Chargement préventif pendant le scroll continu
 * 
 * @hook useCalendarDataLoader
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useEffect, useRef, useCallback } from 'react';
import { 
  INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE, 
  INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER 
} from '../../utils/constants';

interface UseCalendarDataLoaderParams {
  visibleWindowStart: number;
  visibleWindowEnd: number;
  isGrabbing: boolean;
  isScrolling: boolean;
  onLoadAppointmentsInRange: (startDate: number, endDate: number) => Promise<void>;
}

/**
 * Hook pour gérer le chargement progressif des rendez-vous
 * 
 * Stratégie:
 * 1. Chargement "soft" après arrêt du scroll/grab (seuils confortables)
 * 2. Chargement "hard" pendant le scroll continu (seuils critiques)
 */
export const useCalendarDataLoader = ({
  visibleWindowStart,
  visibleWindowEnd,
  isGrabbing,
  isScrolling,
  onLoadAppointmentsInRange,
}: UseCalendarDataLoaderParams): void => {

  const isLoadingRef = useRef(false);
  const visibleWindowStartInitial = useRef(0);
  const visibleWindowEndInitial = useRef(0);

  // Fonction de chargement centralisée
  const checkAndLoadData = useCallback((forceCriticalCheck = false) => {
    if (isLoadingRef.current) return;

    // Configuration des seuils
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
    
    // "Soft Threshold" (Zone de confort) : Utilisé quand on s'arrête
    const SOFT_THRESHOLD_BEFORE = (INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE - 2) * MS_PER_WEEK;
    const SOFT_THRESHOLD_AFTER = (INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER - 2) * MS_PER_WEEK;

    // "Hard Threshold" (Zone critique) : Utilisé pendant le scroll continu
    const HARD_THRESHOLD = 3 * 24 * 60 * 60 * 1000; 

    // Choix du seuil selon le mode
    const thresholdBefore = forceCriticalCheck ? HARD_THRESHOLD : SOFT_THRESHOLD_BEFORE;
    const thresholdAfter = forceCriticalCheck ? HARD_THRESHOLD : SOFT_THRESHOLD_AFTER;

    // Initialisation si vide
    if (visibleWindowStartInitial.current === 0) {
      visibleWindowStartInitial.current = visibleWindowStart;
      visibleWindowEndInitial.current = visibleWindowEnd;
      return;
    }

    // Vérification des limites
    const isOutOfBoundLeft = visibleWindowStart < (visibleWindowStartInitial.current - thresholdBefore);
    const isOutOfBoundRight = visibleWindowEnd > (visibleWindowEndInitial.current + thresholdAfter);

    if (isOutOfBoundLeft || isOutOfBoundRight) {
      console.log(`Loading data... Mode: ${forceCriticalCheck ? 'CRITICAL' : 'SOFT_STOP'}`);
      isLoadingRef.current = true;

      const LOAD_BUFFER_BEFORE = INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE * MS_PER_WEEK;
      const LOAD_BUFFER_AFTER = INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER * MS_PER_WEEK;

      const newLoadStart = visibleWindowStart - LOAD_BUFFER_BEFORE;
      const newLoadEnd = visibleWindowEnd + LOAD_BUFFER_AFTER;

      onLoadAppointmentsInRange(newLoadStart, newLoadEnd).finally(() => {
        isLoadingRef.current = false;
      });

      // Mise à jour optimiste
      if (isOutOfBoundLeft) visibleWindowStartInitial.current = newLoadStart;
      if (isOutOfBoundRight) visibleWindowEndInitial.current = newLoadEnd;
    }
  }, [visibleWindowStart, visibleWindowEnd, onLoadAppointmentsInRange]);

  // SCÉNARIO A : Relâchement du grab
  const prevIsGrabbing = useRef(false);
  useEffect(() => {
    if (prevIsGrabbing.current && !isGrabbing) {
      // L'utilisateur vient de lâcher la barre
      checkAndLoadData(false); // Vérification standard (Soft)
    }
    prevIsGrabbing.current = isGrabbing;
  }, [isGrabbing, checkAndLoadData]);

  // SCÉNARIO B : Arrêt du scroll (Flèches/Molette)
  const prevIsScrolling = useRef(false);
  useEffect(() => {
    if (prevIsScrolling.current && !isScrolling && !isGrabbing) {
      // L'utilisateur a arrêté de scroller
      checkAndLoadData(false); // Vérification standard (Soft)       
    }
    prevIsScrolling.current = isScrolling;
  }, [isScrolling, isGrabbing, checkAndLoadData]);

  // SCÉNARIO C : Limite critique pendant le scroll
  useEffect(() => {
    if (isScrolling && !isGrabbing) {
      // Vérification avec le mode "Critique" (seuils très courts)
      checkAndLoadData(true); 
    }
  }, [visibleWindowStart, visibleWindowEnd, isScrolling, isGrabbing, checkAndLoadData]);
};
