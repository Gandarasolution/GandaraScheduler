/**
 * @fileoverview Composant SearchOverlay - Overlay de recherche générique et réutilisable
 * 
 * Ce composant générique gère l'affichage d'un overlay de recherche pour n'importe quel type de données.
 * 
 * Fonctionnalités :
 * - Recherche en temps réel
 * - Support du drag & drop (optionnel)
 * - Actions personnalisables par item
 * - Interface responsive
 * - Gestion du clavier (ESC pour fermer)
 * - États vides personnalisables

 * 
 * @component SearchOverlay
 * @author Gandara Solutions
 * @version 2.0.0 - Generic & Reusable
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
        className={`fixed inset-0 overlay z-50 ${
          enableDragDetection && isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}

        onClick={() => {
          if (!enableDragDetection || !isDragging) {
            onClose();
            setSearchInput('');
          }
        }}
      />

      {/* Conteneur principal */}
      <div 
        className={`fixed z-60 bg-opacity-0 rounded-2xl 
          w-[calc(100vw-2rem)] left-4 top-[10%] 
          sm:w-[calc(100vw-4rem)] sm:left-8 sm:top-[20%] 
          lg:w-auto lg:max-w-${maxWidth} lg:left-[32%] lg:top-[35%] 
          max-h-[80vh] flex flex-col ${
          enableDragDetection && isDragging ? 'opacity-0' : 'opacity-100'
        } transition-all duration-300 ease-in-out ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          ...(window.innerWidth >= 1024 ? position : {}),
          left: enableDragDetection && isDragging ? '100%' : (window.innerWidth < 640 ? '1rem' : window.innerWidth < 1024 ? '2rem' : position.left),
          minWidth: window.innerWidth >= 1024 ? '675px' : undefined,
          ...style
        }}
      >
        {/* Barre de recherche */}
        <div className="">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 sm:pl-3 pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={placeholder}
              className="block bg-bg-secondary placeholder:text-primary text-primary w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-color focus:border-transparent text-sm sm:text-base"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault(); // Empêche le comportement par défaut si nécessaire
                  onClose();
                  setSearchInput('');
                }
              }}
            />
          </div>
        </div>

        <div className="p-3"></div>

        {/* Liste des items */}
        <div 
          className="flex-1 overflow-y-auto px-2 sm:px-2 py-2 bg-bg-secondary rounded-2xl shadow-lg border border-light text-primary"
          style={{ maxHeight }}
        >
          {searchInput.trim() === '' ? (
            // État: aucune recherche
            <div className="text-center py-4 sm:py-8">
              {defaultEmptyStates.noInput.icon}
              <p className="text-base sm:text-lg font-medium mb-2">{defaultEmptyStates.noInput.title}</p>
              <p className="text-xs sm:text-sm">{defaultEmptyStates.noInput.description}</p>
            </div>
          ) : items.length === 0 ? (
            // État: aucun résultat
            <div className="text-center py-4 sm:py-8">
              {defaultEmptyStates.noResults.icon}
              <p className="text-base sm:text-lg font-medium mb-2">{defaultEmptyStates.noResults.title}</p>
              <p className="text-xs sm:text-sm">{defaultEmptyStates.noResults.description}</p>
            </div>
          ) : (
            // Affichage des résultats
            <div className="grid gap-2 sm:gap-3">
              {items.map((item, index) => (
                <div 
                  key={`${item.id}-${index}`} 
                  className="w-full flex justify-between hover:bg-primary-ultra-light rounded-xl transition-colors px-1 sm:px-2"
                >
                  {/* Rendu personnalisé ou rendu par défaut */}
                  {renderItem ? (
                    renderItem(item, index)
                  ) : (
                    <div className="flex-1 py-1.5 sm:py-2">
                      <span className="poppins text-sm sm:text-base">{item.label}</span>
                    </div>
                  )}

                  {/* Bouton d'action optionnel */}
                  {onItemAction && (
                    <div className="h-full">
                      <button
                        className="px-1.5 sm:px-2 py-1 text-lg sm:text-xl cursor-pointer h-full hover:text-color-primary transition-colors"
                        onClick={() => {
                          onItemAction(item);
                          onClose();
                          setSearchInput('');
                        }}
                        title="Ajouter"
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
