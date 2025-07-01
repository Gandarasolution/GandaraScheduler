"use client";
import React from 'react';
import { useDrag } from 'react-dnd';

/**
 * Props du composant DraggableSource
 * Permet de rendre un élément externe draggable (ex: source de rendez-vous à glisser dans le calendrier).
 */
interface DraggableSourceProps {
  id: string;
  title: string;
}

/**
 * Composant DraggableSource
 * Utilisé pour rendre un élément draggable depuis une source externe.
 */
const DraggableSource: React.FC<DraggableSourceProps> = ({ id, title }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'external-item',
    item: { id, title, sourceType: 'external' },
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
        p-3 my-2  border  rounded-md
        cursor-grab text-center text-sm font-medium
        transition-opacity duration-100
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      {title}
    </div>
  );
};

export default DraggableSource;