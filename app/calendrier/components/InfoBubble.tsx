"use client";
import React, { useEffect, useRef } from 'react';
import { CELL_HEIGHT, CELL_WIDTH } from '../utils/constants';

interface InfoBubbleProps {
  content: string;
  position: { x: number; y: number };
  onClose: () => void;
}


const InfoBubble: React.FC<InfoBubbleProps> = ({ content, position, onClose }) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubblePos, setBubblePos] = React.useState<{left: number, top: number, arrow: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'}>({ left: position.x, top: position.y + CELL_HEIGHT*1.2, arrow: 'top-left' });

  

  // Fermer sur clic extérieur ou touche Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Ajuste la position si la bulle sort de l'écran
  useEffect(() => {
    if (!bubbleRef.current) return;
    const bubble = bubbleRef.current;
    const { innerWidth, innerHeight } = window;
    const rect = bubble.getBoundingClientRect();
    let left = bubblePos.left;
    let top = bubblePos.top;
    let arrow: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = bubblePos.arrow;

    // Si la bulle dépasse à droite, la placer à gauche du curseur
    if (left + rect.width > innerWidth) {
      left  = left - rect.width - 100; // 100px de marge
      arrow = 'top-right';
    }
    // Si la bulle dépasse en bas, la placer au-dessus du curseur
    if (top + rect.height > innerHeight) {
      top -= rect.height;
      arrow = arrow === 'top-left' ? 'bottom-left' : 'bottom-right';
    }
    // Si la bulle dépasse à gauche, la recoller au bord
    if (left < 8) left = 8;
    // Si la bulle dépasse en haut, la recoller au bord
    if (top < 8) top = 8;
    setBubblePos({ left, top, arrow });
    // eslint-disable-next-line
  }, [position.x, position.y, content]);

  return (
    <div
      ref={bubbleRef}
      className="fixed z-50 text-sm max-w-xs break-words animate-bubble-fade"
      style={{ left: bubblePos.left, top: bubblePos.top }}
    >
      {/* Flèche dynamique */}
      {bubblePos.arrow === 'top-left' && (
        <div className="absolute -top-2 left-3 w-4 h-4 overflow-hidden pointer-events-none">
          <div className="w-3 h-3 bg-gray-800 rotate-45 shadow-md relative left-1 top-1"></div>
        </div>
      )}
      {bubblePos.arrow === 'top-right' && (
        <div className="absolute -top-2 right-3 w-4 h-4 overflow-hidden pointer-events-none">
          <div className="w-3 h-3 bg-gray-800 rotate-45 shadow-md relative left-0 top-1"></div>
        </div>
      )}
      {bubblePos.arrow === 'bottom-left' && (
        <div className="absolute -bottom-2 left-3 w-4 h-4 overflow-hidden pointer-events-none">
          <div className="w-3 h-3 bg-gray-800 rotate-45 shadow-md relative left-1 top-0"></div>
        </div>
      )}
      {bubblePos.arrow === 'bottom-right' && (
        <div className="absolute -bottom-2 right-3 w-4 h-4 overflow-hidden pointer-events-none">
          <div className="w-3 h-3 bg-gray-800 rotate-45 shadow-md relative left-0 top-0"></div>
        </div>
      )}
      {/* Contenu bulle */}
      <div 
        className="relative bg-gray-800 text-white px-4 py-3 rounded-lg shadow-xl border border-gray-900/10"
      >
        {content}
      </div>      
    </div>
  );
};

export default InfoBubble;