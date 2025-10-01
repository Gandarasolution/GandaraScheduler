/**
 * @fileoverview Hook personnalisé pour la gestion du scroll infini
 * 
 * Ce hook centralise la logique de scroll infini :
 * - Ajout dynamique de jours à gauche et à droite
 * - Gestion du throttling pour les performances
 * - Navigation vers une date spécifique
 * - Gestion de l'état de chargement
 * 
 * @hook useInfiniteScroll
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useState, useRef, useCallback } from 'react';
import { addDays, eachDayOfInterval } from 'date-fns';
import { DAYS_TO_ADD, WINDOW_SIZE } from '../utils/constants';

export interface InfiniteScrollState {
  dayInTimeline: Date[];
  isLoading: boolean;
  goToDate: (date: Date) => void;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  addDaysToLeft: () => void;
  addDaysToRight: () => void;
  setDayInTimeline: React.Dispatch<React.SetStateAction<Date[]>>;
}

/**
 * Hook pour la gestion du scroll infini du calendrier
 * @param includeWeekend - Inclure les week-ends dans la timeline
 * @param mainScrollRef - Référence vers l'élément de scroll principal
 * @returns État et fonctions de gestion du scroll infini
 */
export const useInfiniteScroll = (
  includeWeekend: boolean,
  mainScrollRef: React.RefObject<HTMLDivElement>
): InfiniteScrollState => {
  const [dayInTimeline, setDayInTimeline] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // États pour la gestion du scroll
  const isProcessingInfiniteScroll = useRef(false);
  const lastScrollCheck = useRef(0);
  const isAutoScrolling = useRef(false);
  const isAddingLeft = useRef(false);
  const isAddingRight = useRef(false);
  const isInfiniteScrollEnabled = useRef(false);
  const throttledScrollHandler = useRef<(() => void) | null>(null);

  // Fonctions optimisées pour ajouter des jours
  const addDaysToRight = useCallback(() => {
    if (!mainScrollRef.current) return;
    
    const previousScrollLeft = mainScrollRef.current.scrollLeft;
    const previousScrollWidth = mainScrollRef.current.scrollWidth;
    
    setDayInTimeline((prevDays) => {
      if (prevDays.length === 0) return prevDays;
      
      const lastDay = prevDays[prevDays.length - 1];
      const newDays = eachDayOfInterval({
        start: addDays(lastDay, 1),
        end: addDays(lastDay, DAYS_TO_ADD),
      });
      
      return [...prevDays, ...newDays];
    });

    // Restaurer la position de scroll après l'ajout (optionnel pour le côté droit)
    requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        const newScrollWidth = mainScrollRef.current.scrollWidth;
        const scrollDiff = newScrollWidth - previousScrollWidth;
        // Pour le côté droit, on peut garder la position actuelle ou ajuster selon les besoins
      }
      isAddingRight.current = false;
    });
  }, [includeWeekend]);

  const addDaysToLeft = useCallback(() => {
    if (!mainScrollRef.current) return;
    
    const previousScrollLeft = mainScrollRef.current.scrollLeft;
    
    setDayInTimeline((prevDays) => {
      if (prevDays.length === 0) return prevDays;
      
      const firstDay = prevDays[0];
      const newDays = eachDayOfInterval({
        start: addDays(firstDay, -DAYS_TO_ADD),
        end: addDays(firstDay, -1),
      });
      
      return [...newDays, ...prevDays];
    });

    // Ajuster la position de scroll pour éviter le "saut"
    requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        const cellWidth = 120; // CELL_WIDTH from constants
        const addedWidth = DAYS_TO_ADD * cellWidth;
        mainScrollRef.current.scrollLeft = previousScrollLeft + addedWidth;
      }
      isAddingLeft.current = false;
    });
  }, [includeWeekend]);

  // Initialiser le throttled scroll handler
  if (!throttledScrollHandler.current) {
    let rafId: number | null = null;
    throttledScrollHandler.current = () => {
      if (rafId) return; // Déjà planifié
      
      rafId = requestAnimationFrame(() => {
        rafId = null;
        
        if (!mainScrollRef.current || !isInfiniteScrollEnabled.current) return;
        
        const now = Date.now();
        if (now - lastScrollCheck.current < 16) return; // Limite à ~60fps
        lastScrollCheck.current = now;
        
        const { scrollLeft, scrollWidth, clientWidth } = mainScrollRef.current;
        const scrollableWidth = scrollWidth - clientWidth;
        
        // Seuil pour déclencher l'ajout de jours (10% de la largeur visible)
        const threshold = clientWidth * 0.1;
        
        // Ajout à droite
        if (scrollLeft > scrollableWidth - threshold && !isAddingRight.current && !isProcessingInfiniteScroll.current) {
          isAddingRight.current = true;
          isProcessingInfiniteScroll.current = true;
          addDaysToRight();
          setTimeout(() => { isProcessingInfiniteScroll.current = false; }, 100);
        }
        
        // Ajout à gauche
        if (scrollLeft < threshold && !isAddingLeft.current && !isProcessingInfiniteScroll.current) {
          isAddingLeft.current = true;
          isProcessingInfiniteScroll.current = true;
          addDaysToLeft();
          setTimeout(() => { isProcessingInfiniteScroll.current = false; }, 100);
        }
      });
    };
  }

  // Gestion du scroll ultra-optimisée
  const handleScroll = useCallback(() => {
    // Appel différé pour éviter de bloquer le thread principal
    throttledScrollHandler.current?.();
    
    // Détecter si on scroll contre les bords pour maintenir l'infinite scroll actif
    // Seulement si l'infinite scroll est activé
    if (mainScrollRef.current && isInfiniteScrollEnabled.current) {
      const { scrollLeft, scrollWidth, clientWidth } = mainScrollRef.current;
      const threshold = clientWidth * 0.05; // 5% de seuil
      
      if (scrollLeft < threshold || scrollLeft > (scrollWidth - clientWidth - threshold)) {
        // Proche des bords, maintenir l'infinite scroll actif
        setTimeout(() => { isInfiniteScrollEnabled.current = true; }, 100);
      }
    }
  }, []);

  // Centrage sur une date spécifique
  const goToDate = useCallback((date: Date) => {
    if (!mainScrollRef.current) return;
    setIsLoading(true);
    setDayInTimeline(
      eachDayOfInterval({
        start: addDays(date, -WINDOW_SIZE / 2),
        end: addDays(date, WINDOW_SIZE / 2),
      })
    );
    setTimeout(() => {
      if (mainScrollRef.current) {
        const cellWidth = 120; // CELL_WIDTH from constants
        const targetScrollLeft = (WINDOW_SIZE / 2) * cellWidth;
        
        // Désactiver temporairement l'infinite scroll pendant le positionnement
        isInfiniteScrollEnabled.current = false;
        isAutoScrolling.current = true;
        
        mainScrollRef.current.scrollLeft = targetScrollLeft;
        
        // Réactiver l'infinite scroll après un délai
        setTimeout(() => {
          isAutoScrolling.current = false;
          isInfiniteScrollEnabled.current = true;
        }, 500);
      }
      setIsLoading(false);
    }, 50);
  }, []);

  return {
    dayInTimeline,
    isLoading,
    goToDate,
    handleScroll,
    addDaysToLeft,
    addDaysToRight,
    setDayInTimeline
  };
};