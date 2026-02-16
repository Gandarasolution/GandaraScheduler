/**
 * @fileoverview Composant SearchOverlay - Overlay de recherche générique et réutilisable
 * 
 * Ce composant générique gère l'affichage d'un overlay de recherche pour n'importe quel type de données.
 * 
 * Fonctionnalités :
 * - Recherche en temps réel
 * - Support du drag & drop (optionnel)
 * - Actions personnalisables par item
 * - Interface responsive et adaptée mobile
 * - Gestion du clavier (ESC pour fermer)
 * - États vides personnalisables
 * - Animation slide-in sur mobile
 * 
 * @component SearchOverlay
 * @author Gandara Solutions
 * @version 2.1.0 - Generic, Reusable & Mobile Optimized
 * 
 * @example
 * // Nomenclature des données :
 * // 1. Définir le type de données recherchables
 * interface SearchableItem {
 *   id: string | number;
 *   label: string;          // Propriété principale affichée
 *   [key: string]: any;     // Autres propriétés optionnelles
 * }
 * 
 * // 2. Utiliser le composant
 * <SearchOverlay
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   searchInput={searchText}
 *   setSearchInput={setSearchText}
 *   items={filteredItems}
 *   placeholder="Rechercher un élément..."
 *   emptyStateConfig={{
 *     noInput: {
 *       icon: <SearchIcon />,
 *       title: "Rechercher",
 *       description: "Tapez pour rechercher"
 *     },
 *     noResults: {
 *       icon: <NoResultsIcon />,
 *       title: "Aucun résultat",
 *       description: "Aucun élément trouvé"
 *     }
 *   }}
 *   renderItem={(item, index) => (
 *     <div key={item.id}>
 *       <span>{item.label}</span>
 *     </div>
 *   )}
 *   onItemAction={(item) => handleItemClick(item)}
 *   actionLabel="+"
 * />
 */

import { useDragDropManager } from "react-dnd";
import { memo, useEffect, useState, ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Type générique pour un élément recherchable
 */
export type SearchableItem = {
  id: string | number;
  label: string;
  [key: string]: any;
};

/**
 * Configuration des états vides
 */
export interface EmptyStateConfig {
  icon?: ReactNode;
  title: string;
  description: string;
}

/**
 * Props du composant SearchOverlay
 */
type SearchOverlayProps<T extends SearchableItem = SearchableItem> = {
  /** État d'ouverture de l'overlay */
  isOpen: boolean;
  /** Callback de fermeture */
  onClose: () => void;
  /** Valeur de l'input de recherche */
  searchInput: string;
  /** Callback pour modifier l'input */
  setSearchInput: (input: string) => void;
  /** Liste des items filtrés à afficher */
  items: T[];
  /** Placeholder de l'input de recherche */
  placeholder?: string;
  /** Configuration des états vides */
  emptyStateConfig?: {
    noInput?: EmptyStateConfig;
    noResults?: EmptyStateConfig;
  };
  /** Fonction de rendu personnalisée pour chaque item */
  renderItem?: (item: T, index: number) => ReactNode;
  /** Callback lors du clic sur l'action d'un item */
  onItemAction?: (item: T) => void;
  /** Label du bouton d'action (si onItemAction est fourni) */
  actionLabel?: string;
  /** Active la détection du drag & drop */
  enableDragDetection?: boolean;
  /** Classes CSS additionnelles pour le conteneur */
  className?: string;
  /** Style inline pour le conteneur */
  style?: React.CSSProperties;
  /** Largeur maximale de l'overlay */
  maxWidth?: string;
  /** Hauteur maximale de la liste */
  maxHeight?: string;
  /** Position de l'overlay (top, left) */
  position?: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
};

/**
 * Composant SearchOverlay - Overlay de recherche générique
 */
const SearchOverlay = <T extends SearchableItem = SearchableItem>({
  isOpen,
  onClose,
  searchInput,
  setSearchInput,
  items,
  placeholder = "Rechercher...",
  emptyStateConfig,
  renderItem,
  onItemAction,
  actionLabel = "+",
  enableDragDetection = true,
  className = '',
  style,
  maxWidth = '2xl',
  maxHeight = '50vh',
  position = { top: '35%', left: '32%' }
}: SearchOverlayProps<T>) => {
  const dragDropManager = useDragDropManager();
  const [isDragging, setIsDragging] = useState(false);

  // Utiliser React DnD pour détecter l'état de drag (optionnel)
  useEffect(() => {
    if (!enableDragDetection) return;
    
    const monitor = dragDropManager.getMonitor();
    
    const unsubscribe = monitor.subscribeToStateChange(() => {
      const isDragInProgress = monitor.isDragging();
      setIsDragging(isDragInProgress);
    });

    return unsubscribe;
  }, [dragDropManager, enableDragDetection]);

  // États vides par défaut
  const defaultEmptyStates = {
    noInput: emptyStateConfig?.noInput || {
      icon: (
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      title: "Rechercher",
      description: "Tapez pour commencer la recherche"
    },
    noResults: emptyStateConfig?.noResults || {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="w-16 h-16 mx-auto mb-4" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
        </svg>
      ),
      title: "Aucun résultat",
      description: "Aucun élément ne correspond à votre recherche"
    }
  };

  if (!isOpen) return null;
  
  return (
    <>
      {/* Overlay de fond */}
      <div 
        className={`fixed inset-0 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          enableDragDetection && isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ backgroundColor: 'var(--bg-overlay)' }}
        onClick={() => {
          if (!enableDragDetection || !isDragging) {
            onClose();
            setSearchInput('');
          }
        }}
      />
      
      {/* Conteneur principal - Responsive */}
      <div 
        className={`
          fixed z-[60] flex flex-col
          rounded-t-[2rem] sm:rounded-2xl 
          w-full sm:max-w-${maxWidth}
          max-h-[90vh] sm:max-h-[80vh]
          bottom-0 sm:bottom-auto
          left-0 sm:left-1/2 sm:-translate-x-1/2
          transition-all duration-300 ease-out
          ${enableDragDetection && isDragging ? 'opacity-0 translate-y-full sm:translate-y-0' : 'opacity-100 translate-y-0'}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          top: position.top,
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-2xl)',
          ...style
        }}
      >
        {/* Header avec bouton de fermeture - Mobile */}
        <div 
          className="flex items-center justify-between px-4 sm:px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <h3 
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Rechercher
          </h3>
          <button
            onClick={() => {
              onClose();
              setSearchInput('');
            }}
            className="w-10 h-10 rounded-full active:scale-95 transition-all flex items-center justify-center"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="px-4 sm:px-6 pt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={placeholder}
              className="
                block w-full pl-11 pr-4 py-3.5 sm:py-3
                rounded-xl
                focus:outline-none focus:ring-2
                text-base sm:text-sm
                transition-all duration-200
              "
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                borderWidth: '1px',
                borderColor: 'var(--border-light)',
                '--tw-ring-color': 'var(--color-primary)'
              } as React.CSSProperties}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onClose();
                  setSearchInput('');
                }
              }}
            />
          </div>
        </div>
        
        {/* Liste des items */}
        <div 
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
          style={{ maxHeight }}
        >
          {searchInput.trim() === '' ? (
            // État: aucune recherche
            <div className="text-center py-12 sm:py-8">
              {defaultEmptyStates.noInput.icon}
              <p 
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {defaultEmptyStates.noInput.title}
              </p>
              <p 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {defaultEmptyStates.noInput.description}
              </p>
            </div>
          ) : items.length === 0 ? (
            // État: aucun résultat
            <div className="text-center py-12 sm:py-8">
              {defaultEmptyStates.noResults.icon}
              <p 
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {defaultEmptyStates.noResults.title}
              </p>
              <p 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {defaultEmptyStates.noResults.description}
              </p>
            </div>
          ) : (
            // Affichage des résultats
            <div className="space-y-2">
              {items.map((item, index) => (
                <div 
                  key={`${item.id}-${index}`} 
                  className="
                    w-full flex justify-between items-center
                    rounded-xl transition-all duration-200
                  "
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderWidth: '1px',
                    borderColor: 'var(--border-light)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                >
                  {/* Rendu personnalisé ou rendu par défaut */}
                  {renderItem ? (
                    renderItem(item, index)
                  ) : (
                    <div className="flex-1 py-3 px-4">
                      <span 
                        className="font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.label}
                      </span>
                    </div>
                  )}
                  
                  {/* Bouton d'action optionnel */}
                  {onItemAction && (
                    <div className="pr-2">
                      <button
                        className="
                          w-10 h-10 flex items-center justify-center
                          rounded-lg transition-all duration-200
                          text-xl font-semibold
                          active:scale-95
                        "
                        style={{ color: 'var(--color-primary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary-lighter)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => {
                          onItemAction(item);
                          onClose();
                          setSearchInput('');
                        }}
                        title="Sélectionner"
                      >
                        {actionLabel}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};


export default memo(SearchOverlay);