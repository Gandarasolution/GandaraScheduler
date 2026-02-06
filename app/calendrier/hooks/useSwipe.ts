/**
 * @fileoverview Hook personnalisé pour la détection de gestes de swipe
 * 
 * Ce hook détecte les gestes de swipe horizontaux et verticaux sur un élément.
 * Parfait pour la navigation gestuelle sur mobile.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useEffect, useRef, TouchEvent as ReactTouchEvent } from 'react';

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  minSwipeDistance?: number; // Distance minimale en pixels pour déclencher un swipe
  preventScroll?: boolean;    // Empêcher le scroll lors du swipe
}

/**
 * Hook pour détecter les gestes de swipe
 * @param callbacks - Fonctions à appeler pour chaque direction de swipe
 * @param options - Options de configuration
 * @returns Ref à attacher à l'élément à surveiller
 * 
 * @example
 * const swipeRef = useSwipe({
 *   onSwipeLeft: () => console.log('Swipe gauche'),
 *   onSwipeRight: () => console.log('Swipe droite'),
 * }, { minSwipeDistance: 50 });
 * 
 * return <div ref={swipeRef}>Swipez ici</div>;
 */
export function useSwipe<T extends HTMLElement>(
  callbacks: SwipeCallbacks,
  options: SwipeOptions = {}
) {
  const { minSwipeDistance = 50, preventScroll = false } = options;
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (preventScroll) {
        const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
        const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
        
        // Si le mouvement horizontal est plus important que le vertical, empêcher le scroll
        if (deltaX > deltaY && deltaX > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX;
      touchEndY.current = e.changedTouches[0].clientY;

      const deltaX = touchEndX.current - touchStartX.current;
      const deltaY = touchEndY.current - touchStartY.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Détecter la direction du swipe (horizontal ou vertical)
      if (absDeltaX > absDeltaY && absDeltaX > minSwipeDistance) {
        // Swipe horizontal
        if (deltaX > 0) {
          callbacks.onSwipeRight?.();
        } else {
          callbacks.onSwipeLeft?.();
        }
      } else if (absDeltaY > absDeltaX && absDeltaY > minSwipeDistance) {
        // Swipe vertical
        if (deltaY > 0) {
          callbacks.onSwipeDown?.();
        } else {
          callbacks.onSwipeUp?.();
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [callbacks, minSwipeDistance, preventScroll]);

  return elementRef;
}
