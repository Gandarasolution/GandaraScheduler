/**
 * @fileoverview Composant DataTableFrame - Vue tableau générique et réutilisable
 * 
 * Ce composant générique gère l'affichage de tableaux pour n'importe quel type de données.
 * 
 * Fonctionnalités :
 * - Tri par colonnes
 * - Surlignage en "L" au survol
 * - Calculs automatiques de largeurs basés sur le contenu réel
 *   * Mesure précise de la largeur du texte de chaque cellule
 *   * Largeur fixe de 70px pour les colonnes image
 *   * Largeur maximale de 300px par colonne
 *   * Adaptation automatique à la taille de la fenêtre
 *   * Redistribution proportionnelle de l'espace disponible
 * - Structure organisée par catégories
 * - Rendu personnalisable des cellules
 * - Support des fonctions de calcul dynamiques
 * - Responsive: s'adapte aux changements de taille de fenêtre
 * 
 * @component DataTableFrame
 * @author Gandara Solutions
 * @version 2.1.0 - Generic & Reusable avec calcul automatique des largeurs
 * 
 * @example
 * // Nomenclature des données :
 * // 1. Définir la structure des catégories
 * const categoriesStructure = [
 *   {
 *     key: 'general',
 *     label: 'Informations Générales',
 *     attributes: [
 *       { key: 'id', label: 'ID', type: 'number' },
 *       { key: 'name', label: 'Nom', type: 'string' },
 *       { key: 'image', label: 'Image', type: 'custom', renderer: (value, item) => <img src={value} /> }
 *     ]
 *   },
 *   {
 *     key: 'details',
 *     label: 'Détails',
 *     attributes: [
 *       { key: 'TM', label: 'Temps Marché', subKey: 'attributs' }, // Accède à item.attributs.TM
 *       { key: 'HR', label: 'Heures Réalisées', subKey: 'attributs' }, // Accède à item.attributs.HR
 *       { key: 'status', label: 'Statut' } // Accès direct à item.status (pas de subKey)
 *     ]
 *   }
 * ];
 * 
 * // 2. Définir les données
 * const items = [
 *   { 
 *     id: 1, 
 *     name: 'Item 1', 
 *     image: 'url',
 *     status: 'En cours',
 *     attributs: {  // Propriétés imbriquées accessibles via subKey dans AttributeConfig
 *       TM: '100h',
 *       HR: '75h'
 *     }
 *   }
 * ];
 * 
 * // 3. (Optionnel) Définir les fonctions de calcul dynamiques
 * const computedFields = {
 *   total: (item) => item.price * item.quantity,
 *   percentage: (item) => (item.completed / item.total) * 100
 * };
 * 
 * // 4. (Optionnel) Définir les largeurs de colonnes
 * const columnWidths = {
 *   id: 80,
 *   name: { min: 150, weight: 2 },
 *   image: 100
 * };
 * 
 * // 5. (Optionnel) Définir les renderers personnalisés
 * const customRenderers = {
 *   status: (value, item) => <Badge color={value}>{value}</Badge>,
 *   actions: (value, item) => <Button onClick={() => edit(item)}>Edit</Button>
 * };
 */

"use client";

import React, { useMemo, useState, useCallback, memo } from 'react';
import FlexibleFrame from '../FlexibleFrame';

/**
 * Type générique pour un élément de données
 */
export type GenericDataItem = Record<string, any> & { id: number | string };

/**
 * Type pour les fonctions de calcul dynamiques
 */
export type ComputedField<T = GenericDataItem> = (item: T) => string | number;

/**
 * Type pour les renderers personnalisés
 */
export type CellRenderer<T = GenericDataItem> = (
  value: any,
  item: T,
  attributeKey: string
) => React.ReactNode;

/**
 * Interface pour la structure des attributs
 */
export interface AttributeConfig {
  /** Clé unique de l'attribut */
  key: string;
  /** Sous-clé pour les attributs imbriqués */
  subKey?: string;
  /** Label affiché dans l'en-tête */
  label: string;
  /** Type de données (pour le tri et l'affichage) */
  type?: 'string' | 'number' | 'date' | 'boolean' | 'custom';
  /** Renderer personnalisé pour cette colonne */
  renderer?: CellRenderer;
  /** Indique si c'est une propriété de base de l'objet */
  isBaseProperty?: boolean;
  /** Indique si la colonne peut être triée */
  sortable?: boolean;
  /** Alignement du texte dans la cellule */
  align?: 'left' | 'center' | 'right';
}

/**
 * Interface pour la structure des catégories
 */
export interface CategoryStructure {
  /** Clé unique de la catégorie */
  key: string;
  /** Label affiché pour le groupe */
  label: string;
  /** Liste des attributs de cette catégorie */
  attributes: AttributeConfig[];
}

/**
 * Configuration des largeurs de colonnes
 */
export interface ColumnWidthConfig {
  /** Largeur fixe en pixels */
  fixed?: number;
  /** Largeur minimale en pixels */
  min?: number;
  /** Largeur maximale en pixels */
  max?: number;
  /** Poids pour la répartition de l'espace disponible */
  weight?: number;
}

/**
 * Props du composant DataTableFrame
 */
export interface DataTableFrameProps<T extends GenericDataItem = GenericDataItem> {
  /** Classes CSS additionnelles */
  className?: string;
  /** Styles inline */
  style?: React.CSSProperties;
  /** Structure des catégories et colonnes */
  categoriesStructure: CategoryStructure[];
  /** Données à afficher */
  items: T[];
  /** Largeur du conteneur (auto-détectée si non fournie) */
  containerWidth?: number;
  /** Fonctions de calcul pour les champs dynamiques */
  computedFields?: Record<string, ComputedField<T>>;
  /** Configuration des largeurs de colonnes */
  columnWidths?: Record<string, number | ColumnWidthConfig>;
  /** Renderers personnalisés pour des colonnes spécifiques */
  customRenderers?: Record<string, CellRenderer<T>>;
  /** Active/désactive le surlignage en L au survol */
  enableHighlight?: boolean;
  /** Affiche les en-têtes de groupes */
  showGroupHeaders?: boolean;
  /** Classe CSS pour les en-têtes */
  headerClassName?: string;
  /** Callback lors du clic sur une ligne */
  onRowClick?: (item: T) => void;
  /** Callback lors du double-clic sur une cellule */
  onCellDoubleClick?: (item: T, attributeKey: string, value: any) => void;
  /** Tri initial */
  defaultSort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
}

/**
 * Composant DataTableFrame - Tableau générique et réutilisable
 */
const DataTableFrame = <T extends GenericDataItem = GenericDataItem>({
  className = '',
  style,
  categoriesStructure,
  items,
  containerWidth,
  computedFields = {},
  columnWidths: customColumnWidths,
  customRenderers = {},
  enableHighlight = true,
  showGroupHeaders = true,
  headerClassName = 'bg-primary-ultra-light',
  onRowClick,
  onCellDoubleClick,
  defaultSort,
}: DataTableFrameProps<T>) => {
  
  
  // État pour la largeur du conteneur (pour réagir aux changements de taille de fenêtre)
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Écouter les changements de taille de fenêtre
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculer la largeur du conteneur
  const calculatedContainerWidth = useMemo(() => {
    return containerWidth || (windowWidth - 85);
  }, [containerWidth, windowWidth]);

  // États pour gérer le tri
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>(defaultSort || {
    key: null,
    direction: 'asc'
  });

  // États pour le surlignage
  const [itemHoveredId, setItemHoveredId] = useState<string | number | null>(null);
  const [columnHoveredKey, setColumnHoveredKey] = useState<string | null>(null);


  // Configuration des groupes
  const groups = useMemo(() => 
    categoriesStructure.map(category => ({
      label: category.label,
      span: category.attributes.length,
      key: category.key
    }))
  , [categoriesStructure]);

  // Labels des attributs
  const attributeLabels = useMemo(() => 
    categoriesStructure.flatMap(category => 
      category.attributes.map(attr => attr.label)
    )
  , [categoriesStructure]);

  // Clés des attributs
  const attributeKeys = useMemo(() => 
    categoriesStructure.flatMap(category => 
      category.attributes.map(attr => attr.key)
    )
  , [categoriesStructure]);

  // Fonction pour extraire la valeur d'un attribut (avec support des champs calculés et subKey)
  const getAttributeValue = useCallback((item: T, attribute: AttributeConfig): any => {
    const { key, subKey } = attribute;
    
    // Si c'est un champ calculé
    if (computedFields[key]) {
      return computedFields[key](item);
    }
    
    // Si subKey est défini, accéder à la propriété imbriquée
    if (subKey) {
      // Accès à item[subKey][key]
      const parentObject = item[subKey];
      if (parentObject && typeof parentObject === 'object') {
        return parentObject[key];
      }
      return undefined;
    }
    
    // Sinon, accès direct à la propriété
    return item[key];
  }, [computedFields]);

  // Fonction de tri générique
  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return items;
    
    const sorted = [...items].sort((a, b) => {
      if (!a || !b) return 0;
      
      // Trouver la configuration de l'attribut pour obtenir son subKey
      const attributeConfig = categoriesStructure
        .flatMap(cat => cat.attributes)
        .find(attr => attr.key === sortConfig.key);
      
      if (!attributeConfig) return 0;
      
      const aValue = getAttributeValue(a, attributeConfig);
      const bValue = getAttributeValue(b, attributeConfig);
      
      // Gestion des valeurs nulles/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Conversion en string pour comparaison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      // Tentative de comparaison numérique
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Comparaison alphabétique
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [items, sortConfig, getAttributeValue, categoriesStructure]);

  // Fonctions utilitaires pour le surlignage
  const getItemIndex = useCallback((itemId: string | number): number => {
    return sortedItems.findIndex(item => item && item.id === itemId);
  }, [sortedItems]);

  const isItemBeforeHovered = useCallback((currentItemId: string | number, hoveredItemId: string | number | null): boolean => {
    if (!hoveredItemId || currentItemId === hoveredItemId) return false;
    
    const currentIndex = getItemIndex(currentItemId);
    const hoveredIndex = getItemIndex(hoveredItemId);
    
    if (currentIndex === -1 || hoveredIndex === -1) return false;
    
    return currentIndex < hoveredIndex;
  }, [getItemIndex]);

  const getCellPositionClasses = useCallback((itemId: string | number, columnKey: string, columnIndex: number): string => {
    if (!itemHoveredId || !columnHoveredKey) {
      return 'bg-transparent';
    }

    const hoveredColumnIndex = attributeKeys.findIndex(key => key === columnHoveredKey);
    if (hoveredColumnIndex === -1) return 'bg-transparent';

    const isCurrentRowBeforeHovered = isItemBeforeHovered(itemId, itemHoveredId);
    const isCurrentColumnBeforeHovered = columnIndex < hoveredColumnIndex;
    const isSameRow = itemId === itemHoveredId;
    const isSameColumn = columnKey === columnHoveredKey;

    if (isSameRow && isCurrentColumnBeforeHovered) {
      return 'bg-primary-ultra-light';
    } else if (isSameColumn && isCurrentRowBeforeHovered) {
      return 'bg-primary-ultra-light';
    }
    
    return 'bg-transparent';
  }, [enableHighlight, itemHoveredId, columnHoveredKey, isItemBeforeHovered, attributeKeys]);

  // Gestion du tri
  const handleSort = (attributeKey: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === attributeKey) {
        return {
          key: attributeKey,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        return {
          key: attributeKey,
          direction: 'asc'
        };
      }
    });
  };


  // Fonction pour mesurer la largeur du texte
  const measureTextWidth = useCallback((text: string, fontSize: number = 14): number => {
    if (typeof window === 'undefined') return 100;
    
    // Créer un élément temporaire pour mesurer le texte
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 100;
    
    context.font = `${fontSize}px Poppins, sans-serif`;
    const metrics = context.measureText(text);
    
    // Ajouter du padding (16px de chaque côté) et une marge
    return Math.ceil(metrics.width) + 32 + 10;
  }, []);

  /**
   * Calcul des largeurs de colonnes basé sur le contenu réel
   * 
   * Algorithme :
   * 1. Mesure la largeur du header de chaque colonne
   * 2. Parcourt tous les items et mesure le contenu de chaque cellule
   * 3. Détermine la largeur max nécessaire pour chaque colonne
   * 4. Applique des contraintes (min: 80px, max: 300px, image: 70px fixe)
   * 5. Compare la largeur totale avec la largeur de la fenêtre :
   *    - Si trop large : réduit proportionnellement (sauf images)
   *    - Si trop petit : distribue l'espace supplémentaire (sauf images)
   * 6. S'adapte automatiquement aux changements de taille de fenêtre
   */
  const calculateColumnWidths = useMemo(() => {
    const MIN_WIDTH = 60;
    const MAX_WIDTH = 300;
    const PADDING = 20; // Padding supplémentaire pour l'espacement
    
    if (!sortedItems.length) return attributeLabels.map(() => MIN_WIDTH);

    // Calculer la largeur max pour chaque colonne
    const columnWidths = attributeKeys.map((key, columnIndex) => {
      // Trouver la configuration de l'attribut
      const attributeConfig = categoriesStructure
        .flatMap(cat => cat.attributes)
        .find(attr => attr.key === key);
      
      // Si c'est une colonne image, retourner la largeur fixe
      if (key === 'image') {
        return MIN_WIDTH;
      }
      
      // Mesurer la largeur du header
      const headerWidth = measureTextWidth(attributeLabels[columnIndex], 14);
      
      // Mesurer la largeur maximale du contenu
      let maxContentWidth = headerWidth;
      
      sortedItems.forEach(item => {
        if (!item) return;
        
        const value = getAttributeValue(item, attributeConfig || { key, label: '' });
        
        if (value != null && value !== undefined) {
          const textValue = String(value);
          const contentWidth = measureTextWidth(textValue, 14);
          maxContentWidth = Math.max(maxContentWidth, contentWidth);
        }
      });
      
      // Appliquer les limites min/max et ajouter du padding
      return Math.min(Math.max(maxContentWidth + PADDING, MIN_WIDTH), MAX_WIDTH);
    });

    // Calculer la largeur totale nécessaire
    const totalRequiredWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    const availableWidth = calculatedContainerWidth;

    // Si la largeur totale dépasse la largeur disponible, proportionner
    if (totalRequiredWidth > availableWidth) {
      const ratio = availableWidth / totalRequiredWidth;
      return columnWidths.map((width, index) => {
        // Ne pas réduire les colonnes image
        const attributeKey = attributeKeys[index];
        const attributeConfig = categoriesStructure
          .flatMap(cat => cat.attributes)
          .find(attr => attr.key === attributeKey);
        
        if (attributeKey === 'image') {
          return MIN_WIDTH;
        }
        
        return Math.max(Math.floor(width * ratio), MIN_WIDTH);
      });
    }

    // Si la largeur totale est inférieure à la largeur disponible, étendre proportionnellement
    if (totalRequiredWidth < availableWidth) {
      const extraSpace = availableWidth - totalRequiredWidth;
      const nonImageColumns = columnWidths.filter((_, index) => {
        const attributeKey = attributeKeys[index];
        const attributeConfig = categoriesStructure
          .flatMap(cat => cat.attributes)
          .find(attr => attr.key === attributeKey);
        
        return !(attributeConfig?.type === 'custom' && (attributeKey === 'image' || attributeConfig.label.toLowerCase().includes('image')));
      }).length;
      
      const extraPerColumn = extraSpace / nonImageColumns;
      
      return columnWidths.map((width, index) => {
        const attributeKey = attributeKeys[index];
        const attributeConfig = categoriesStructure
          .flatMap(cat => cat.attributes)
          .find(attr => attr.key === attributeKey);
        
        // Les colonnes image restent fixes
        if (attributeKey === 'image') {
          return MIN_WIDTH;
        }
        
        // Les autres colonnes reçoivent l'espace supplémentaire
        const newWidth = width + extraPerColumn;
        return Math.min(Math.floor(newWidth), MAX_WIDTH);
      });
    }

    return columnWidths;
  }, [attributeLabels, attributeKeys, calculatedContainerWidth, sortedItems, categoriesStructure, getAttributeValue, measureTextWidth]);

  // Style CSS Grid
  const gridTemplateColumns = useMemo(() => {
    return calculateColumnWidths.map(width => `${width}px`).join(' ');
  }, [calculateColumnWidths]);

  // Fonction de rendu des valeurs générique
  const renderAttributeValue = (value: any, attributeKey: string, item: T) => {
    // 1. Vérifier si un renderer personnalisé existe
    if (customRenderers[attributeKey]) {
      return customRenderers[attributeKey](value, item, attributeKey);
    }
    
    // 2. Trouver la configuration de l'attribut
    const attributeConfig = categoriesStructure
      .flatMap(cat => cat.attributes)
      .find(attr => attr.key === attributeKey);
    
    // 3. Utiliser le renderer de la configuration si disponible
    if (attributeConfig?.renderer) {
      return attributeConfig.renderer(value, item, attributeKey);
    }
    
    // 4. Rendu par défaut selon le type et l'alignement
    if (!value && value !== 0) return <span className="text-gray-400">-</span>;
    
    const align = attributeConfig?.align || 'left';
    const alignClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
    
    // 5. Rendu générique par défaut
    return (
      <div className={`flex items-center ${alignClass} w-full h-full`}>
        <span className="poppins">{String(value)}</span>
      </div>
    );
  };

  // Fonction pour obtenir les valeurs organisées par catégorie
  const getValuesByCategory = useCallback((item: T) => {
    if (!item) {
      console.error('Élément invalide dans getValuesByCategory:', item);
      return [];
    }
    
    return categoriesStructure.map(category => ({
      categoryKey: category.key,
      categoryLabel: category.label,
      values: category.attributes.map(attr => {
        // Utiliser getAttributeValue qui gère les champs calculés, subKey et l'accès aux propriétés
        const value = getAttributeValue(item, attr);
        
        return {
          attributeKey: attr.key,
          attributeLabel: attr.label,
          value: value
        };
      })
    }));
  }, [categoriesStructure, getAttributeValue]);

  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Logique de scroll personnalisée si nécessaire
  };

  
  
  return (
    <div className="relative h-full">
      <FlexibleFrame
        groups={groups}
        items={attributeLabels}
        mainScrollRef={mainScrollRef}
        onScroll={handleScroll}
        showGroupHeaders={showGroupHeaders}
        className={`data-table-frame h-full pl-7 overflow-x-hidden ${className}`}
        classNameHeader={headerClassName}
        contentClassName='overflow-x-hidden scroll-hidden'
        useAutoCells={false}
        customGridColumns={gridTemplateColumns}
        customItemHeaders={
          attributeLabels.map((label, index) => {
            const attributeKey = attributeKeys[index];
            const isActive = sortConfig.key === attributeKey;
            const direction = isActive ? sortConfig.direction : null;
            
            return (
              <div
                key={`header-${index}`}
                className="flex flex-col justify-center border-b border-r border-default text-center text-sm text-primary p-2 bg-primary-ultra-light hover:bg-gray-50 cursor-pointer transition-colors"
                style={{
                  width: `${calculateColumnWidths[index]}px`,
                  height: '56px',
                  minWidth: `${calculateColumnWidths[index]}px`,
                  maxWidth: `${calculateColumnWidths[index]}px`
                }}
                onClick={() => handleSort(attributeKey)}
                title={`Cliquer pour trier par ${label}`}
              >
                <div className="flex flex-col justify-center items-center h-full px-2">
                  <div className="flex items-center justify-center gap-1">
                    <span className="leading-3 break-words text-center">
                      {label}
                    </span>
                    <div className="flex flex-col items-center ml-1">
                      {/* Flèche vers le haut */}
                      <svg 
                        className={`w-2 h-2 transition-colors ${
                          isActive && direction === 'asc' 
                            ? 'text-color-primary' 
                            : 'text-gray-300'
                        }`}
                        fill="currentColor" 
                        viewBox="0 0 8 8"
                      >
                        <path d="M4 0L0 4h8z" />
                      </svg>
                      {/* Flèche vers le bas */}
                      <svg 
                        className={`w-2 h-2 -mt-0.5 transition-colors ${
                          isActive && direction === 'desc' 
                            ? 'text-color-primary' 
                            : 'text-gray-300'
                        }`}
                        fill="currentColor" 
                        viewBox="0 0 8 8"
                      >
                        <path d="M4 8L8 4H0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        }
      >
        <table className="w-full border-collapse overflow-auto">
          {/* Corps du tableau */}
          <tbody>
            {sortedItems
              .filter(item => !!item)
              .map((item, rowIndex) => {
                const itemByCategories = getValuesByCategory(item);
                const allValues = itemByCategories.flatMap(cat => cat.values);
                
                return (
                  <tr key={`row-${item.id}`} className="">
                    {allValues.map(({ attributeKey, attributeLabel, value }, valueIndex) => {
                      const columnIndex = attributeKeys.indexOf(attributeKey);
                      const isExactHoveredCell = itemHoveredId === item.id && columnHoveredKey === attributeKey;

                      const cellClasses = isExactHoveredCell 
                        ? 'bg-primary-ultra-light' 
                        : getCellPositionClasses(item.id, attributeKey, columnIndex);
                      
                      return (
                        <td
                          key={`${item.id}-${attributeKey}`}
                          className={`border-b border-r border-default p-2 overflow-hidden text-sm transition-colors text-primary ${cellClasses}`}
                          title={`${attributeLabel}: ${value || '-'}`}
                          style={{
                            width: `${calculateColumnWidths[valueIndex]}px`,
                            minWidth: `${calculateColumnWidths[valueIndex]}px`,
                            maxWidth: `${calculateColumnWidths[valueIndex]}px`,
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={() => {
                            setItemHoveredId(item.id);
                            setColumnHoveredKey(attributeKey);
                          }}
                          onMouseLeave={() => {
                            setItemHoveredId(null);
                            setColumnHoveredKey(null);
                          }}
                        >
                          {renderAttributeValue(value, attributeKey, item)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </FlexibleFrame>
    </div>
  );
};

export default memo(DataTableFrame);