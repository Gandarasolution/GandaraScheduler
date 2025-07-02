"use client";
import { JSX, memo, useEffect, useCallback } from "react";
import { Appointment } from "../types";

interface RightClickComponentProps {
  open: boolean;
  coordinates: { x: number; y: number } | null;
  rightClickItem: { label: string; logo: JSX.Element, action?: () => void }[];
  clipBoardAppointment: Appointment | null; // Optionnel pour gérer le presse-papiers
  onClose: () => void;
}

const RightClickComponent = ({ 
  open, 
  coordinates, 
  rightClickItem, 
  clipBoardAppointment,
  onClose 
}: RightClickComponentProps) => {

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (open && !target.closest('.rightClickComponent')) {
      onClose();
    }
  }, [open, onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [handleEscape]);

  // Ferme le menu contextuel si on clique en dehors
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Ne pas rendre le composant si pas de coordonnées
  if (!coordinates || !open) {
    return null;
  }

  return (
    <div
      className="rightClickComponent fixed flex flex-col bg-white border border-gray-300 rounded shadow-lg z-50 p-2"
      style={{ 
        top: coordinates.y, 
        left: coordinates.x,
      }}
    >
      {rightClickItem.map((item) => (
        <div 
          key={item.label} 
          className={`flex items-center p-2 hover:bg-gray-100 rounded ${item.label === 'Coller' && !clipBoardAppointment ? 'opacity-50 cursor-not-allowed' : ' cursor-pointer'}`}
          onClick={() => {
            item.action && item.action();
            onClose();
          }}
        >
          {item.logo}
          <span className="ml-2">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default memo(RightClickComponent);