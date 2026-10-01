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
  IdentifiantProjet?: string;
  imageUrl?: string | undefined; // URL de l'image associée à la source, optionnelle
  type: "Projet" | "Paie" | "Rubrique Perso"; // Type de l'élément, pour catégoriser les sources
  codeItem?: string; // Code de l'élément, optionnel
  className?: string; // Classes CSS additionnelles
}

/**
 * Composant DraggableSource
 * Utilisé pour rendre un élément draggable depuis une source externe.
 */
const DraggableSource: React.FC<DraggableSourceProps> = ({ id, item, title, IdentifiantProjet, imageUrl = null, type, codeItem, className,  }) => {
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
        group
        flex items-center gap-3
        w-full max-w-full min-w-0
        overflow-hidden box-border
        px-3 py-2.5
        rounded-xl
        border border-transparent
        bg-white
        hover:bg-gray-50
        hover:border-gray-200
        hover:shadow-sm
        cursor-grab active:cursor-grabbing
        transition-all duration-150
        poppins
        ${isDragging ? 'opacity-40 scale-[0.99]' : 'opacity-100'}
        ${className || ''}
      `}
    >
      {/* IMAGE */}
      <div className="shrink-0 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="
              w-11 h-11
              rounded-lg
              border border-gray-200
              object-cover
              bg-gray-50
            "
          />
        ) : (
          <div
            className="
              w-11 h-11
              rounded-lg
              border border-gray-200
              bg-gray-100
              flex items-center justify-center
              text-gray-400
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        )}
      </div>

      {/* CONTENU */}
      <div className="flex flex-1 min-w-0 items-center gap-3">

        {/* BLOC TEXTE */}
        <div className="flex-1 min-w-0">

          {/* LIGNE PRINCIPALE */}
          <div className="flex  gap-2 min-w-0">
            {codeItem && (
              <span
                className="
                  shrink-0
                  px-2 py-1
                  rounded-md
                  text-xs font-semibold
                  text-gray-500
                  whitespace-nowrap
                "
              >
                {codeItem}
              </span>
            )}
            -
            <span
              className="
                flex-1 min-w-0
                text-sm font-medium
                text-gray-700
                whitespace-normal
                break-words
                leading-5
              "
              title={title}
            >
              {title}
            </span>
          </div>

          {/* IDENTIFIANT */}
          {IdentifiantProjet && (
            <div className="mt-1 pl-0">
              <span
                className="
                  text-[11px]
                  px-2 py-1
                  font-medium
                  text-gray-400
                  whitespace-nowrap
                "
              >
                {IdentifiantProjet}
              </span>
            </div>
          )}

        </div>
      </div>
      

      {/* INDICATEUR DRAG */}
      <div
        className="
          shrink-0
          flex items-center justify-center
          w-8 h-8
          rounded-lg
          text-gray-300
          group-hover:text-gray-500
          group-hover:bg-gray-100
          transition-all
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4"
        >
          <circle cx="9" cy="6" r="1.3" />
          <circle cx="15" cy="6" r="1.3" />
          <circle cx="9" cy="12" r="1.3" />
          <circle cx="15" cy="12" r="1.3" />
          <circle cx="9" cy="18" r="1.3" />
          <circle cx="15" cy="18" r="1.3" />
        </svg>
      </div>
    </div>
  );
};

export default memo(DraggableSource);


/*
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
          className="w-10 h-10 rounded border border-default object-cover" 
        />
      ) : (
        <div className="w-10 h-10 shrink-0 rounded border border-default bg-gray-200 flex items-center justify-center text-gray-400">
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
      <span>{codeItem} - {title}</span>
    </div>
  );
   */

