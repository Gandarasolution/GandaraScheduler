import { useState, useEffect } from 'react';

export const useScrollbarGrab = (ref: React.RefObject<HTMLElement>) => {
  const [isScrollingByBar, setIsScrollingByBar] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const handleMouseDown = (e: MouseEvent) => {
      // 1. Récupérer les dimensions
      const { left, width } = node.getBoundingClientRect();
      const clientWidth = node.clientWidth; // Largeur SANS la scrollbar
      
      // 2. Calculer la largeur de la scrollbar
      // offsetWidth inclut la scrollbar, clientWidth l'exclut.
      // Note: On peut aussi comparer directement les coordonnées.
      
      // Position X de la souris relative au conteneur
      const clickX = e.clientX - left;

      // Si le clic est au-delà de la zone de contenu, c'est sur la scrollbar
      if (clickX > clientWidth && clickX <= width) {
        setIsScrollingByBar(true);
      }
      
      // Même logique pour la scrollbar horizontale (en bas)
      const { top, height } = node.getBoundingClientRect();
      const clientHeight = node.clientHeight;
      const clickY = e.clientY - top;
      
      if (clickY > clientHeight && clickY <= height) {
        setIsScrollingByBar(true);
      }
    };

    const handleMouseUp = () => {
      if (isScrollingByBar) {
        setIsScrollingByBar(false);
      }
    };

    // On écoute le mousedown sur l'élément scrollable
    node.addEventListener('mousedown', handleMouseDown);
    // On écoute le mouseup sur window (au cas où on relâche la souris hors de la div)
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      node.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [ref, isScrollingByBar]);

  return isScrollingByBar;
};