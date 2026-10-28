import { useState, useEffect, useRef } from 'react';

export const useSmartScroll = (ref: React.RefObject<HTMLElement>, mouseUpAfterScroll: () => void) => {
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Refs internes pour éviter les re-renders inutiles
  const isDownOnScrollbar = useRef(false);
  const scrollTimeout = useRef<number | null>(null);
  const lastScrollPos = useRef(0);
  const hasScrolled = useRef(false); // Nouveau: track si un scroll a eu lieu
  const isMountedRef = useRef(true);
  const isGrabbingRef = useRef(false);
  const isScrollingRef = useRef(false);
  const mouseUpAfterScrollRef = useRef(mouseUpAfterScroll);
  const customHorizontalDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);

  const HORIZONTAL_DRAG_SENSITIVITY = 0.5;

  useEffect(() => {
    mouseUpAfterScrollRef.current = mouseUpAfterScroll;
  }, [mouseUpAfterScroll]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    isMountedRef.current = true;

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
        hasScrolled.current = false; // Reset le flag au début d'un potentiel scroll

        if (isHorizontal && node.scrollWidth > node.clientWidth) {
          const thumbSize = Math.max(20, (node.clientWidth * node.clientWidth) / node.scrollWidth);
          const trackSize = node.clientWidth - thumbSize;
          const thumbStart = trackSize > 0
            ? (node.scrollLeft / (node.scrollWidth - node.clientWidth)) * trackSize
            : 0;

          if (clickX >= thumbStart && clickX <= thumbStart + thumbSize) {
            customHorizontalDragRef.current = {
              startX: e.clientX,
              startScrollLeft: node.scrollLeft,
            };
            e.preventDefault();
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const drag = customHorizontalDragRef.current;
      if (!drag) return;

      const thumbSize = Math.max(20, (node.clientWidth * node.clientWidth) / node.scrollWidth);
      const trackSize = node.clientWidth - thumbSize;
      const scrollRange = node.scrollWidth - node.clientWidth;

      if (trackSize <= 0 || scrollRange <= 0) return;

      node.scrollLeft = drag.startScrollLeft
        + ((e.clientX - drag.startX) * scrollRange / trackSize * HORIZONTAL_DRAG_SENSITIVITY);
    };

    const resetScrollInteraction = () => {
      customHorizontalDragRef.current = null;
      isDownOnScrollbar.current = false;
      document.body.style.userSelect = '';

      if (isGrabbingRef.current) {
        isGrabbingRef.current = false;
        setIsGrabbing(false);
      }
      if (isScrollingRef.current) {
        isScrollingRef.current = false;
        setIsScrolling(false);
      }

      // N'appeler mouseUpAfterScroll que si un scroll a réellement eu lieu
      if (hasScrolled.current) {
        mouseUpAfterScrollRef.current();
        hasScrolled.current = false;
      }
    };

    // --- 2. LOGIQUE SCROLL GÉNÉRIQUE (Timer) ---
    const handleScroll = () => {
      // Marquer qu'un scroll a eu lieu
      hasScrolled.current = true;
      
      // On signale que ça bouge
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setIsScrolling(true);
      }

      // On reset le timer à chaque événement (Debounce)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

      // Si pas de nouveau scroll après 50ms, on considère que c'est fini
      scrollTimeout.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          isScrollingRef.current = false;
          setIsScrolling(false);
        }
      }, 50);


      const deltaX = Math.abs(node.scrollLeft - lastScrollPos.current);
      const deltaY = Math.abs(node.scrollTop - lastScrollPos.current);

      // Si on a scrollé beaucoup en X ou Y et que la souris est sur la scrollbar, on active le mode "grabbing"      
      if (((isDownOnScrollbar.current && deltaX > 150) || (isDownOnScrollbar.current && deltaY > 150)) && !isGrabbingRef.current) {
         isGrabbingRef.current = true;
         setIsGrabbing(true); 
      }
      lastScrollPos.current = node.scrollLeft;
    };

    // Listeners
    node.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', resetScrollInteraction);
    window.addEventListener('pointerup', resetScrollInteraction);
    window.addEventListener('blur', resetScrollInteraction);
    node.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      isMountedRef.current = false;
      node.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', resetScrollInteraction);
      window.removeEventListener('pointerup', resetScrollInteraction);
      window.removeEventListener('blur', resetScrollInteraction);
      node.removeEventListener('scroll', handleScroll);
      document.body.style.userSelect = '';
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
        scrollTimeout.current = null;
      }
    };
  }, [ref]);

  return { isGrabbing, isScrolling };
};