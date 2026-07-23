"use client";
import React, { memo } from 'react';
import { useDrag } from 'react-dnd';
import { Item } from '../../types';

/**
 * Props du composant DraggableSource
 * Permet de rendre un élément externe draggable (ex: source de rendez-vous à glisser dans le calendrier).
 */
interface DraggableSourceProps {
  id: number; // ID unique de la source
  item: Item;
  title: string;
  imageUrl?: string | undefined; // URL de l'image associée à la source, optionnelle
  type: "Projet" | "Paie" | "Rubrique Perso"; // Type de l'élément, pour catégoriser les sources
  className?: string; // Classes CSS additionnelles
}

/**
 * Composant DraggableSource
 * Utilisé pour rendre un élément draggable depuis une source externe.
 */
const DraggableSource: React.FC<DraggableSourceProps> = ({ id, item, title, imageUrl = null, type, className }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'external-item',
    item: { id, item, title, sourceType: 'external', imageUrl, typeEvent: type },
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
      {imageUrl ? (
        // CAS 1 : L'image existe -> On l'affiche
        <img 
          src={imageUrl} 
          alt="Icône" 
          className="w-12 h-12 rounded border border-default object-cover" 
        />
      ) : (
        // CAS 2 : Pas d'image -> Fond gris avec une croix
        <div className="w-12 h-12 rounded border border-default bg-gray-200 flex items-center justify-center text-gray-400">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor" 
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      <span>{title}</span>
    </div>
  );
};

export default memo(DraggableSource);