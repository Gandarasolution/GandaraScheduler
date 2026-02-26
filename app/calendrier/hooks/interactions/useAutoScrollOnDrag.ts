import { useEffect, useRef } from 'react';

interface UseAutoScrollOnDragOptions {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  enabled: boolean; // active uniquement pendant le drag
  edgeThreshold?: number; // distance du bord en pixels pour déclencher le scroll
  scrollSpeed?: number; // vitesse de base du scroll
}

/**
 * Hook pour gérer le scroll automatique pendant le drag and drop
 * Scroll automatiquement quand la souris est proche des bords du conteneur
 */
export const useAutoScrollOnDrag = ({
  scrollContainerRef,
  enabled,
  edgeThreshold = 50,
  scrollSpeed = 10,
}: UseAutoScrollOnDragOptions) => {
  const rafIdRef = useRef<number | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Nettoyer le RAF si le drag est terminé
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastMousePosRef.current = null;
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const autoScroll = () => {
      if (!enabled || !lastMousePosRef.current || !container) {
        rafIdRef.current = null;
        return;
      }

      const rect = container.getBoundingClientRect();
      const { x, y } = lastMousePosRef.current;

      let scrollX = 0;
      let scrollY = 0;

      // Scroll horizontal
      const distanceFromLeft = x - rect.left;
      const distanceFromRight = rect.right - x;

      if (distanceFromLeft < edgeThreshold && distanceFromLeft > 0) {
        // Proche du bord gauche
        const intensity = 1 - (distanceFromLeft / edgeThreshold);
        scrollX = -scrollSpeed * intensity;
      } else if (distanceFromRight < edgeThreshold && distanceFromRight > 0) {
        // Proche du bord droit
        const intensity = 1 - (distanceFromRight / edgeThreshold);
        scrollX = scrollSpeed * intensity;
      }

      // Scroll vertical
      const distanceFromTop = y - rect.top;
      const distanceFromBottom = rect.bottom - y;

      if (distanceFromTop < edgeThreshold && distanceFromTop > 0) {
        // Proche du bord haut
        const intensity = 1 - (distanceFromTop / edgeThreshold);
        scrollY = -scrollSpeed * intensity;
      } else if (distanceFromBottom < edgeThreshold && distanceFromBottom > 0) {
        // Proche du bord bas
        const intensity = 1 - (distanceFromBottom / edgeThreshold);
        scrollY = scrollSpeed * intensity;
      }

      // Appliquer le scroll si nécessaire
      if (scrollX !== 0 || scrollY !== 0) {
        container.scrollLeft += scrollX;
        container.scrollTop += scrollY;
      }

      // Continuer l'animation
      rafIdRef.current = requestAnimationFrame(autoScroll);
    };

    // Démarrer l'écoute des mouvements de souris
    document.addEventListener('mousemove', handleMouseMove);

    // Démarrer le RAF pour le scroll automatique
    rafIdRef.current = requestAnimationFrame(autoScroll);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [enabled, edgeThreshold, scrollSpeed, scrollContainerRef]);
};
