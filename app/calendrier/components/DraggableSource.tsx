"use client";
import React from 'react';
import { useDrag } from 'react-dnd';

import ChantierIcones from '../image/Icones/Chantier.png';
import AbsenceIcones from '../image/Icones/Absences.png';
import AutreIcones from '../image/Icones/Autres.png';

/**
 * Props du composant DraggableSource
 * Permet de rendre un élément externe draggable (ex: source de rendez-vous à glisser dans le calendrier).
 */
interface DraggableSourceProps {
  id: number; // ID unique de la source
  title: string;
  imageUrl?: string; // URL de l'image associée à la source, optionnelle
  type: 'Chantier' | 'Absence' | 'Autre'; // Type de l'élément, pour catégoriser les sources
  className?: string; // Classes CSS additionnelles
}

/**
 * Composant DraggableSource
 * Utilisé pour rendre un élément draggable depuis une source externe.
 */
const DraggableSource: React.FC<DraggableSourceProps> = ({ id, title, imageUrl = null, type, className }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'external-item',
    item: { id, title, sourceType: 'external', imageUrl, typeEvent: type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={(node) => {
          if (node) drag(node);
      }}
      className={`
        my-2 flex flex-row items-center gap-2 poppins
        cursor-grab text-sm font-medium
        transition-opacity duration-100
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${className || ''}
      `}
    >
      <img 
        src={
          type === 'Chantier' ? ChantierIcones.src : 
          type === 'Absence' ? AbsenceIcones.src : 
          AutreIcones.src
        }
        width={24}
        height={24}
        alt={title} 
      />
      <span>{title}</span>
    </div>
  );
};

export default DraggableSource;