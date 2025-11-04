/**
 * @fileoverview Composant FlexibleFrame - Version simplifiée et flexible du TimelineFrame
 * 
 * Ce composant fournit une structure de grille flexible avec :
 * - En-têtes de groupes configurables
 * - En-têtes d'items configurables
 * - Cellules auto-dimensionnées ou de taille fixe
 * - Structure adaptable pour différents types de données
 * 
 * @component FlexibleFrame
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
import React, { ReactNode, memo } from 'react';

/**
 * Interface pour définir un groupe/catégorie
 */
interface Group {
  /** Libellé du groupe */
  label: string;
  /** Nombre de colonnes que ce groupe occupe */
  span: number;
  /** Identifiant unique du groupe */
  key: string;
}

/**
 * Interface définissant les propriétés du composant FlexibleFrame
 */
interface FlexibleFrameProps {
  /** Configuration des groupes/catégories */
  groups: Group[];
  /** Labels des items/colonnes individuelles */
  items: string[];
  /** Référence pour le scroll principal */
  mainRef: React.RefObject<HTMLDivElement | null>;
  /** Gestionnaire d'événement scroll */
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Contenu à afficher dans la zone principale (children) */
  children: ReactNode;
  /** Classes CSS additionnelles pour le conteneur principal */
  className?: string;
  /** Classes CSS additionnelles pour l'en-tête */
  classNameHeader?: string;
  /** Afficher les en-têtes de groupes (défaut: true) */
  showGroupHeaders?: boolean;
  /** Afficher les en-têtes d'items (défaut: true) */
  showItemHeaders?: boolean;
  /** Classes CSS additionnelles pour la zone de contenu scrollable */
  contentClassName?: string;
  /** Utiliser des cellules de taille automatique au lieu de largeur fixe */
  useAutoCells?: boolean;
  /** Largeur fixe des cellules en pixels (défaut: 120) */
  cellWidth?: number;
  /** Rendu personnalisé des en-têtes d'items */
  customItemHeaders?: ReactNode;
  /** Configuration CSS Grid personnalisée pour les colonnes */
  customGridColumns?: string;
  /** Afficher ou masquer les groupes */
}

/**
 * Composant FlexibleFrame - Structure flexible pour grilles de données
 */
const FlexibleFrame: React.FC<FlexibleFrameProps> = ({
  groups,
  items,
  mainRef,
  onScroll,
  children,
  className = '',
  classNameHeader = '',
  showGroupHeaders = true,
  showItemHeaders = true,
  contentClassName = '',
  useAutoCells = false,
  cellWidth = 120,
  customItemHeaders,
  customGridColumns
}) => {

  const totalColumns = items.length;

  // Configuration CSS Grid - utilise customGridColumns si fourni
  const getGridColumns = () => {
    if (customGridColumns) return customGridColumns;
    return useAutoCells 
      ? `repeat(${totalColumns}, minmax(100px, max-content))` 
      : `repeat(${totalColumns}, ${cellWidth}px)`;
  };

  return (
    <div className={`flex-1 min-w-0 flex flex-col pr-7 rounded-2xl poppins ${className}`}>
      {/* Conteneur avec le même style que TimelineFrame */}
      <div className='p-4 border rounded-4xl bg-bg-secondary w-full h-full border-ultra-light'>
        <div 
          className={`
          relative w-full  overflow-y-auto
          rounded-3xl border h-full border-ultra-light ${contentClassName}`}
          style={{
            scrollbarGutter: 'stable',
          }}
          onScroll={onScroll}
          ref={mainRef}
        >
          {/* Sticky group header */}
          {showGroupHeaders && (
            <div
              className="grid sticky top-0 z-30 bg-bg-secondary border-ultra-light"
              style={{
                gridTemplateColumns: getGridColumns(),
                minHeight: '40px',
              }}
            >
              {(() => {
                let columnIndex = 0;
                return groups.map((group) => {
                  const startColumn = columnIndex + 1;
                  const endColumn = columnIndex + group.span;
                  columnIndex += group.span;
                  
                  return (
                    <div
                      key={group.key}
                      className={`
                         col-span-full text-primary flex items-center justify-start py-2 text-[14px] poppins
                         border-r border-ultra-light bg-bg-secondary border-b max-h-[49px] ${classNameHeader}
                      `}
                      style={{ 
                        gridColumn: `${startColumn} / ${endColumn + 1}`,
                      }}
                    >
                      <div
                        className="sticky left-0 z-30 pl-4"
                      >
                        <div className="flex sticky flex-col items-center">
                          <span className='poppins text-center font-semibold'>{group.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
          
          {/* Sticky item header */}
          {showItemHeaders && (
            <div
              className="grid sticky z-30 bg-bg-secondary border-ultra-light"
              style={{
                gridTemplateColumns: getGridColumns(),
                minHeight: '56px',
                top: showGroupHeaders ? '40px' : '0'
              }}
            >
              {customItemHeaders ? customItemHeaders : (
                items.map((item, index) => (
                  <div
                    key={`header-item-${index}`}
                    className="
                      flex flex-col justify-center border-b border-r border-ultra-light text-center text-sm font-semibold text-primary p-2
                      bg-bg-secondary relative item-cell
                    "
                    style={{ 
                      height: 'auto',
                    }}
                  >
                    <div className="flex flex-col justify-center items-center h-full px-2">
                      <span className="text-xs leading-3 break-words text-center">
                        {item}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Content area */}
          <div 
            className="relative"
            style={{
              gridTemplateColumns: getGridColumns(),
              display: 'grid'
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(FlexibleFrame);