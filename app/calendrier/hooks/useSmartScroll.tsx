import { useState, useEffect, useRef } from 'react';

export const useSmartScroll = (ref: React.RefObject<HTMLElement>) => {
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Refs internes pour éviter les re-renders inutiles
  const isDownOnScrollbar = useRef(false);
  const scrollTimeout = useRef<number | null>(null);
  const lastScrollPos = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // --- 1. LOGIQUE GRAB (Souris) ---
    const handleMouseDown = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // Détection précise si on clique sur la barre (verticale ou horizontale)
      const isVertical = clickX > node.clientWidth && clickX <= rect.width;
      const isHorizontal = clickY > node.clientHeight && clickY <= rect.height;

      if (isVertical || isHorizontal) {
        isDownOnScrollbar.current = true;
        document.body.style.userSelect = 'none'; // UX: On évite de sélectionner du texte

      }
    };

    const handleMouseUp = () => {
      isDownOnScrollbar.current = false;
      document.body.style.userSelect = '';
      if (isGrabbing) setIsGrabbing(false);
    };

    // --- 2. LOGIQUE SCROLL GÉNÉRIQUE (Timer) ---
    const handleScroll = () => {
      // On signale que ça bouge
      if (!isScrolling) setIsScrolling(true);

      // On reset le timer à chaque événement (Debounce)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

      // Si pas de nouveau scroll après 50ms, on considère que c'est fini
      scrollTimeout.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 50);


      const delta = Math.abs(node.scrollLeft - lastScrollPos.current);      
      if (isDownOnScrollbar.current && delta > 150 && !isGrabbing) {
         setIsGrabbing(true); 
      }
      lastScrollPos.current = node.scrollLeft;
    };

    // Listeners
    node.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    node.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      node.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      node.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [ref, isGrabbing, isScrolling]);

  return { isGrabbing, isScrolling };
};