/**
 * @fileoverview Hook useGhostSegments - Calcul des segments de chevauchement (Ghost Mode)
 * 
 * Gère le calcul des zones hachurées et zones pleines pour les rendez-vous en chevauchement
 * 
 * @hook useGhostSegments
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useMemo } from 'react';
import { CELL_WIDTH, DAY_MS } from '../../utils/constants';
import { countWeekends } from '../../utils/dates';

export interface GhostSegment {
  widthGhost: number;
  widthNoGhost: number;
}

interface UseGhostSegmentsParams {
  isGhost: boolean;
  ghostInterval?: { start: number; end: number } | { start: number; end: number }[];
  dragStart: number;
  dragEnd: number;
  isFullDay: boolean;
  isDisplayWeekend: boolean;
}

/**
 * Calcule les segments de chevauchement pour le mode Ghost
 * 
 * Retourne un tableau de segments alternant zones hachurées (chevauchement) 
 * et zones pleines (non-chevauchement)
 * 
 * @param params - Paramètres du ghost mode
 * @returns Tableau de segments avec leurs largeurs
 */
export const useGhostSegments = ({
  isGhost,
  ghostInterval,
  dragStart,
  dragEnd,
  isFullDay,
  isDisplayWeekend,
}: UseGhostSegmentsParams): GhostSegment[] => {
  
  const segments = useMemo((): GhostSegment[] => {
    // Si pas en mode ghost ou pas d'intervalle, retourner un segment vide
    if (!isGhost || !ghostInterval) {
      return [{ widthGhost: 0, widthNoGhost: 0 }];
    }

    // Normaliser en tableau d'intervalles
    const intervals = Array.isArray(ghostInterval) ? ghostInterval : [ghostInterval];
    
    // Filtrer et trier les intervalles qui chevauchent réellement
    const sortedIntervals = intervals
      .filter(gi => gi && gi.end > dragStart && gi.start < dragEnd)
      .sort((a, b) => a.start - b.start);

    const ghostWidths: GhostSegment[] = [];
    let currentPos = dragStart;
    
    sortedIntervals.forEach((gi) => {
      const overlapStart = Math.max(gi.start, dragStart);
      const overlapEnd = Math.min(gi.end, dragEnd);
      
      // Zone visible AVANT le chevauchement (si il y a un espace)
      if (overlapStart > currentPos) {
        const visibleSegment = calculateSegmentWidth(
          currentPos,
          overlapStart,
          isFullDay,
          isDisplayWeekend
        );
        
        if (visibleSegment > 0) {
          ghostWidths.push({ widthGhost: 0, widthNoGhost: visibleSegment });
        }
      }
      
      // Zone hachurée (chevauchement)
      const ghostSegment = calculateSegmentWidth(
        overlapStart,
        overlapEnd,
        isFullDay,
        isDisplayWeekend
      );
      
      if (ghostSegment > 0) {
        ghostWidths.push({ widthGhost: ghostSegment, widthNoGhost: 0 });
      }
      
      currentPos = overlapEnd;
    });
    
    // Zone visible APRÈS le dernier chevauchement
    if (currentPos < dragEnd) {
      const visibleSegment = calculateSegmentWidth(
        currentPos,
        dragEnd,
        isFullDay,
        isDisplayWeekend
      );
      
      if (visibleSegment > 0) {
        ghostWidths.push({ widthGhost: 0, widthNoGhost: visibleSegment });
      }
    }
    
    return ghostWidths.length > 0 ? ghostWidths : [{ widthGhost: 0, widthNoGhost: 0 }];
  }, [isGhost, ghostInterval, dragStart, dragEnd, isFullDay, isDisplayWeekend]);

  return segments;
};

/**
 * Calcule la largeur d'un segment en pixels
 * 
 * @param start - Date de début du segment
 * @param end - Date de fin du segment
 * @param isFullDay - Mode journée complète
 * @param isDisplayWeekend - Afficher les week-ends
 * @returns Largeur du segment en pixels
 */
const calculateSegmentWidth = (
  start: number,
  end: number,
  isFullDay: boolean,
  isDisplayWeekend: boolean
): number => {
  const durationMs = end - start;
  const intervals = Math.round(durationMs / (isFullDay ? DAY_MS : DAY_MS / 2));
  
  let weekends = 0;
  if (!isDisplayWeekend) {
    weekends = countWeekends(start, end);
  }
  
  const visualDays = Math.max(0, intervals - (weekends * (isFullDay ? 1 : 2)));
  return visualDays * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2);
};
