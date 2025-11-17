/**
 * @fileoverview Composant de menu contextuel (clic droit)
 * 
 * Ce composant affiche un menu contextuel qui se positionne automatiquement
 * pour éviter de dépasser les bords de l'écran. Il se retourne intelligemment
 * selon l'espace disponible.
 * 
 * Fonctionnalités :
 * - Positionnement intelligent (évite le débordement d'écran)
 * - Fermeture par Escape ou clic extérieur
 * - Actions contextuelles avec icônes
 * - Gestion du presse-papiers
 * - États désactivés pour certaines actions
 * 
 * @component RightClickComponent
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
import { JSX, memo, useEffect, useCallback, useRef, useState } from "react";
import { Appointment } from "../../types";

/**
 * Interface définissant les propriétés du composant RightClickComponent
 * @interface RightClickComponentProps
 */
interface RightClickComponentProps {
  /** Contrôle la visibilité du menu */
  open: boolean;
  /** Position initiale du menu (coordonnées du clic) */
  coordinates: { x: number; y: number } | null;
  /** Items du menu avec labels, icônes et actions */
  rightClickItem: { label: string; logo: JSX.Element, action?: () => void; actif?: boolean }[];
  /** Rendez-vous en presse-papiers (pour action Coller) */
  clipBoardAppointment: Appointment | null;
  /** Callback de fermeture du menu */
  onClose: () => void;
}

/**
 * Composant de menu contextuel avec positionnement intelligent
 * 
 * Se positionne automatiquement pour éviter les débordements d'écran :
 * - Se décale vers la gauche si débordement horizontal
 * - Se décale vers le haut si débordement vertical
 * - Utilise les dimensions réelles du menu pour les calculs
 * 
 * @param {RightClickComponentProps} props - Propriétés du composant
 * @returns {JSX.Element|null} Menu contextuel ou null si fermé
 */
const RightClickComponent = ({ 
  open, 
  coordinates, 
  rightClickItem, 
  clipBoardAppointment,
  onClose 
}: RightClickComponentProps) => {
  
  // Référence pour mesurer les dimensions du menu
  const menuRef = useRef<HTMLDivElement>(null);
  
  // État pour la position finale calculée
  const [finalPosition, setFinalPosition] = useState<{ x: number; y: number } | null>(null);

  /**
   * Calcule la position optimale du menu selon les angles disponibles
   * Logique de positionnement :
   * - Par défaut : angle haut-gauche du menu au point de clic
   * - Si débordement vertical : bascule vers angle bas-gauche
   * - Si débordement horizontal : utilise les angles droits (menu à gauche du point)
   * - Combinaisons possibles : haut-gauche, bas-gauche, haut-droite, bas-droite
   */
  const calculateOptimalPosition = useCallback(() => {
    if (!coordinates || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let { x, y } = coordinates;
    let useBottomAnchor = false; // Utiliser l'angle bas au lieu du haut
    let useRightAnchor = false;  // Utiliser l'angle droit au lieu du gauche
    
    // Vérifier débordement vertical (par défaut angle haut-gauche)
    if (y + rect.height > viewportHeight) {
      useBottomAnchor = true; // Passer à l'angle bas-gauche
      y = y - rect.height;
    }
    
    // Vérifier débordement horizontal
    if (x + rect.width > viewportWidth) {
      useRightAnchor = true; // Passer aux angles droits
      x = x - rect.width;
    }
    
    // Vérifications supplémentaires pour éviter les débordements après ajustement
    
    // Si on utilise l'angle bas et qu'on dépasse encore vers le haut
    if (useBottomAnchor && y < 10) {
      y = 10; // Position minimale depuis le haut
    }
    
    // Si on utilise l'angle droit et qu'on dépasse encore à gauche
    if (useRightAnchor && x < 10) {
      x = 10; // Position minimale depuis la gauche
    }
    
    // Si on n'utilise pas l'angle bas mais qu'on dépasse vers le bas
    if (!useBottomAnchor && y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }
    
    // Si on n'utilise pas l'angle droit mais qu'on dépasse à droite
    if (!useRightAnchor && x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }
    
    setFinalPosition({ x, y });
  }, [coordinates]);

  // Recalculer la position quand le menu s'ouvre ou change
  useEffect(() => {
    if (open && coordinates && menuRef.current) {
      // Petit délai pour s'assurer que le DOM est rendu
      const timer = setTimeout(calculateOptimalPosition, 0);
      return () => clearTimeout(timer);
    }
  }, [open, coordinates, rightClickItem, calculateOptimalPosition]);

  /**
   * Gestionnaire de fermeture par touche Escape
   */
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  /**
   * Gestionnaire de fermeture par clic extérieur
   */
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (open && !target.closest('.rightClickComponent')) {
      onClose();
    }
    }, [open, onClose]);

  // Gestion des événements clavier (Escape)
  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleEscape]);

  // Gestion du clic extérieur pour fermer le menu
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Ne pas rendre si le menu est fermé ou sans coordonnées
  if (!coordinates || !open) {
    return null;
  }

  // Utiliser la position calculée ou la position initiale
  const position = finalPosition || coordinates;  return (
    <>
      <div
        ref={menuRef}
        className="
        rightClickComponent 
        fixed flex flex-col 
        bg-white border border-gray-300 rounded-xl shadow-lg z-60 p-2
        "
        style={{ 
          top: position.y, 
          left: position.x,
          // Style initial invisible pour éviter le flash pendant le calcul
          visibility: finalPosition ? 'visible' : 'hidden',
        }}
        onClick={(e) => e.stopPropagation()} // Empêche la fermeture du menu lors du clic à l'intérieur
      >
        {rightClickItem.map((item) => (        
          <div 
            key={item.label} 
            className={`
              flex items-center p-2 rounded-xl 
              ${(item.label === 'Coller' && !clipBoardAppointment) || item.actif
                ? 'opacity-50 cursor-not-allowed pointer-events-none' 
                : ' cursor-pointer'
              }
              item hover:bg-[#e7f4f2]
              `
            }
            onClick={() => {
              item.action && item.action();
              onClose();
            }}
          >
            {item.logo}
            <span className="ml-2 poppins">{item.label}</span>
          </div>
        ))}
      </div>
      {/* Overlay pour fermer le menu en cliquant à l'extérieur */}
      <div 
        className="fixed z-50 inset-0 transition-opacity animate-fadeIn overlay" 
        onClick={onClose} 
      />
    </>
  );
};

export default memo(RightClickComponent);