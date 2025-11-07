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

import React, { useMemo, useState, useCallback, memo, useRef, useEffect, use } from 'react';
import FlexibleFrame from '../dnd/FlexibleFrame';

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
  type?: 'string' | 'number' | 'date' | 'boolean' | 'custom' | 'hidden-column';
  /** Renderer personnalisé pour cette colonne */
  renderer?: CellRenderer;
  /** Indique si c'est une propriété de base de l'objet */
  isBaseProperty?: boolean;
  /** Indique si la colonne peut être triée */
  sortable?: boolean;
  /** Alignement du texte dans la cellule */
  align?: 'left' | 'center' | 'right';
  /** Indique si la colonne est fixe (ex: image) */
  isFixed?: boolean;
  /** Clé de la colonne cachée à réafficher (pour type='hidden-column') */
  hiddenColumnKey?: string;
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
  /** Taille de la police */
  FontSize?: number;
  /** Hauteur des cellules */
  heightCell?: number;
  /** Padding par cellule */
  cellPadding?: number;
  /** Affiche l'en-tête du tableau */
  withHeader?: boolean;
  /** Contenu personnalisé pour l'en-tête */
  customHeader?: React.ReactNode;
  /** Affiche la possibilité de cacher une colonne */
  showColumnVisibilityToggle?: boolean;
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
  categoriesStructure: categoriesStructureSource,
  items,
  FontSize = 14,
  cellPadding = 8,
  heightCell = 60,
  containerWidth: customContainerWidth,
  computedFields = {},
  columnWidths: customColumnWidths,
  customRenderers = {},
  enableHighlight = true,
  showGroupHeaders = true,
  headerClassName = 'bg-primary-ultra-light',
  showColumnVisibilityToggle = true,
  withHeader = true,
  customHeader,
  onRowClick,
  onCellDoubleClick,
  defaultSort,
}: DataTableFrameProps<T>) => {
  
  
  // État pour la largeur du conteneur (pour réagir aux changements de taille de fenêtre)
  const [containerWidth, setContainerWidth] = useState<number>(
    customContainerWidth || 1200
  );  
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Si une largeur custom est fournie, l'utiliser directement
    if (customContainerWidth) {
      setContainerWidth(customContainerWidth);
      return;
    }

    // Sinon, mesurer la largeur réelle du conteneur
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setContainerWidth(width);
      }
    });

    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [customContainerWidth]);

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
  const [categoriesStructure, setCategoriesStructure] = useState<CategoryStructure[]>(categoriesStructureSource);

  // État pour les colonnes cachées
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());


  // Fonction pour toggle la visibilité d'une colonne
  const toggleColumnVisibility = (columnKey: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  // Mettre à jour la structure des catégories quand une colonne est cachée
  useEffect(() => {
    setCategoriesStructure( 
      categoriesStructureSource.map(category => {
        // Pour chaque attribut de la catégorie
        const updatedAttributes: AttributeConfig[] = [];
        
        category.attributes.forEach(attr => {
          const isHidden = hiddenColumns.has(attr.key);
          
          if (isHidden) {
            // Remplacer par une colonne spéciale "hidden-column"
            updatedAttributes.push({
              key: `hidden-${attr.key}`,
              label: attr.label,
              type: 'hidden-column',
              hiddenColumnKey: attr.key,
              isFixed: true, // Largeur fixe de 30px
            });
          } else {
            // Garder la colonne normale
            updatedAttributes.push(attr);
          }
        });
        
        return {
          ...category,
          attributes: updatedAttributes
        };
      })
    )
  }, [hiddenColumns, categoriesStructureSource]);
    

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
    if (computedFields && computedFields[key]) {
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
    return Math.ceil(metrics.width) + cellPadding;
  }, [cellPadding]);

  /**
   * Calcul des largeurs de colonnes basé sur le contenu réel
   * 
   * Algorithme :
   * 1. Mesure la largeur du header de chaque colonne
   * 2. Parcourt tous les items et mesure le contenu de chaque cellule
   * 3. Détermine la largeur max nécessaire pour chaque colonne
   * 4. Applique des contraintes (min: 80px, max: 300px, image: 60px fixe)
   * 5. Compare la largeur totale avec la largeur de la fenêtre :
   *    - Si trop large : réduit proportionnellement (sauf images)
   *    - Si trop petit : distribue l'espace supplémentaire (sauf images)
   * 6. S'adapte automatiquement aux changements de taille de fenêtre
   */
  const calculateColumnWidths = useMemo(() => {
    const MIN_WIDTH = 60;
    const MAX_WIDTH = 450;
    const HIDDEN_COLUMN_WIDTH = 20; // Largeur fine pour colonnes cachées
    const PADDING = 20; // Padding supplémentaire pour l'espacement
    
    if (!sortedItems.length) return attributeLabels.map(() => MIN_WIDTH);

    // Calculer la largeur max pour chaque colonne
    const columnWidths = attributeKeys.map((key, columnIndex) => {
      // Trouver la configuration de l'attribut
      const attributeConfig = categoriesStructure
        .flatMap(cat => cat.attributes)
        .find(attr => attr.key === key);
      
      // Si c'est une colonne "hidden-column" (colonne cachée à réafficher)
      if (attributeConfig?.type === 'hidden-column') {
        return { width: HIDDEN_COLUMN_WIDTH, isFixed: true };
      }
              
      // Si c'est une colonne image ou fixe, retourner la largeur fixe
      if (attributeConfig?.isFixed) {
        return { width: MIN_WIDTH, isFixed: true };
      }
      
      // Mesurer la largeur du header
      //const headerWidth = measureTextWidth(attributeLabels[columnIndex], 14);
      
      // Mesurer la largeur maximale du contenu
      let maxContentWidth = MIN_WIDTH;
      
      sortedItems.forEach(item => {
        if (!item) return;
        
        const value = getAttributeValue(item, attributeConfig || { key, label: '' });
        
        if (value != null && value !== undefined) {
          const textValue = String(value);
          const contentWidth = measureTextWidth(textValue, FontSize);
          maxContentWidth = Math.max(maxContentWidth, contentWidth);
        }
      });
      
      // Appliquer les limites min/max et ajouter du padding
      const idealWidth = Math.min(Math.max(maxContentWidth + PADDING, MIN_WIDTH), MAX_WIDTH);
    
      return { width: idealWidth, isFixed: false };
    });

    //console.log('columnWidths avant ajustement:', columnWidths);
    
    const fixedColumns = columnWidths.filter(col => col.isFixed);
    const flexibleColumns = columnWidths.filter(col => !col.isFixed);
  
    const totalFixedWidth = fixedColumns.reduce((sum, col) => sum + col.width, 0);
    const totalFlexibleWidth = flexibleColumns.reduce((sum, col) => sum + col.width, 0);

    const totalWidth = totalFixedWidth + totalFlexibleWidth;
    const availableWidth = containerWidth - totalWidth;

    //console.log(availableWidth);
    
    let adjustedWidths: number[];

    // console.log('totalWidth:', totalWidth);
    // console.log('availableWidth:', availableWidth);
    // console.log('containerWidth:', containerWidth);
    

    if (totalWidth > containerWidth) {
      // CAS 1 : Le tableau est trop large - réduire proportionnellement
      const ratio = availableWidth / flexibleColumns.length;
      //console.log('ratio', ratio);
      
      
      adjustedWidths = columnWidths.map(col => {
        if (col.isFixed) return col.width;
        
        // Réduire proportionnellement, mais respecter le minimum
        const reducedWidth = Math.floor(col.width + ratio);
        return Math.max(reducedWidth, MIN_WIDTH);
      });
      
    } 
    else if (totalWidth < containerWidth) {
    // CAS 2 : Le tableau est trop petit - distribuer l'espace supplémentaire
    const extraSpace = availableWidth;
    const extraPerColumn = extraSpace / flexibleColumns.length;
    //console.log('extraPerColumn', extraPerColumn);
    

    adjustedWidths = columnWidths.map(col => {
      if (col.isFixed) return col.width;
      
      // Ajouter l'espace supplémentaire, mais respecter le maximum
      const expandedWidth = Math.floor(col.width + extraPerColumn);
      return Math.min(expandedWidth, MAX_WIDTH);
    });
    
  } else {
    // CAS 3 : Taille parfaite - utiliser les largeurs idéales
    adjustedWidths = columnWidths.map(col => col.width);
  }

  //console.log('adjustedWidths avant correction finale:', adjustedWidths);
  
  // Étape 4 : CORRECTION FINALE - Ajuster pour correspondre EXACTEMENT à containerWidth
  // Cette étape élimine les erreurs d'arrondi
  const currentTotal = adjustedWidths.reduce((sum, width) => sum + width, 0);
  const difference = containerWidth - currentTotal;
  // console.log('currentTotal:', currentTotal);
  // console.log('difference:', difference);
  
  if (difference !== 0) {
    // Trouver l'index de la dernière colonne flexible (non-fixe)
    let lastFlexibleIndex = -1;
    for (let i = adjustedWidths.length - 1; i >= 0; i--) {
      if (!columnWidths[i].isFixed) {
        lastFlexibleIndex = i;
        break;
      }
    }
    
    // Ajuster la dernière colonne flexible pour compenser la différence
    if (lastFlexibleIndex !== -1) {
      adjustedWidths[lastFlexibleIndex] += difference;
      
      // S'assurer que la largeur reste dans les limites min/max
      adjustedWidths[lastFlexibleIndex] = Math.max(
        MIN_WIDTH,
        Math.min(adjustedWidths[lastFlexibleIndex], MAX_WIDTH)
      );
    }
  }

    return adjustedWidths;
  }, [attributeLabels, attributeKeys, containerWidth, sortedItems, categoriesStructure, getAttributeValue, measureTextWidth, FontSize]);

  
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


  return (
    <div 
      className="relative h-full"
      style={style}
    >
      <FlexibleFrame
        mainRef={containerRef}
        className={`data-table-frame h-full pl-7 ${className}`}
        contentClassName='overflow-x-hidden'
        gridConfig={{
          mode: 'custom',
          template: gridTemplateColumns
        }}
        headers={[
          // Niveau 1: Groupes (si fournis)
          ...(groups && showGroupHeaders ? [{
            items: groups.map(g => ({
              span: g.span,
              key: g.key,
              render: () => (
                <div className="sticky left-0 z-30 pl-4">
                  <div className="flex sticky flex-col items-center">
                    <span className="poppins text-center font-semibold">{g.label}</span>
                  </div>
                </div>
              ),
              className: 'col-span-full text-primary flex items-center justify-start py-2 text-[14px] poppins border-r border-ultra-light bg-primary-ultra-light border-b max-h-[49px]'
            })),
            show: true,
            minHeight: '40px',
            containerClassName: 'bg-bg-secondary border-ultra-light',
          }] : []),
          // Niveau 2: En-têtes de colonnes (si withHeader=true)
          ...(withHeader ? [{
            items: customHeader ? 
              // Si customHeader fourni, l'utiliser
              attributeLabels.map((label, index) => ({
                span: 1,
                key: `header-${index}`,
                render: () => customHeader,
              })) :
              // Sinon, rendu par défaut avec tri
              attributeLabels.map((label, index) => {
                const attributeKey = attributeKeys[index];
                
                // Trouver la configuration de l'attribut
                const attributeConfig = categoriesStructure
                  .flatMap(cat => cat.attributes)
                  .find(attr => attr.key === attributeKey);

                return {
                  span: 1,
                  key: `header-${index}`,
                  render: () => {
                    // Si c'est une colonne cachée (type='hidden-column')
                    if (attributeConfig?.type === 'hidden-column' && attributeConfig.hiddenColumnKey) {
                      // Vérifier si la colonne précédente est aussi cachée
                      const prevAttributeConfig = index > 0 
                        ? categoriesStructure.flatMap(cat => cat.attributes).find(attr => attr.key === attributeKeys[index - 1])
                        : null;
                      const isPrevHidden = prevAttributeConfig?.type === 'hidden-column';
                      
                      // Vérifier si la colonne suivante est aussi cachée
                      const nextAttributeConfig = index < attributeKeys.length - 1
                        ? categoriesStructure.flatMap(cat => cat.attributes).find(attr => attr.key === attributeKeys[index + 1])
                        : null;
                      const isNextHidden = nextAttributeConfig?.type === 'hidden-column';

                      return (
                        <div
                          className="flex items-center justify-center border-b border-default bg-gradient-to-r from-gray-50 to-gray-100 hover:from-primary-ultra-light hover:to-primary-light transition-all cursor-pointer group"
                          style={{
                            width: `${calculateColumnWidths[index]}px`,
                            height: '56px',
                            minWidth: `${calculateColumnWidths[index]}px`,
                            maxWidth: `${calculateColumnWidths[index]}px`,
                            borderRight: isNextHidden ? '1px dashed #e5e7eb' : '1px solid #e5e7eb',
                            borderLeft: isPrevHidden ? 'none' : '1px solid #e5e7eb',
                          }}
                          onClick={() => toggleColumnVisibility(attributeConfig.hiddenColumnKey!)}
                          title={`Afficher la colonne "${label}"`}
                        >
                          <svg 
                            className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-dark transition-colors" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      );
                    }

                    // Rendu normal pour les colonnes visibles
                    const isActive = sortConfig.key === attributeKey;
                    const direction = isActive ? sortConfig.direction : null;
                    
                    return (
                      <div
                        className="flex flex-col justify-center border-b border-r border-default text-center text-sm text-primary p-2 bg-primary-ultra-light hover:bg-gray-50 transition-colors relative group"
                        style={{
                          width: `${calculateColumnWidths[index]}px`,
                          height: '56px',
                          minWidth: `${calculateColumnWidths[index]}px`,
                          maxWidth: `${calculateColumnWidths[index]}px`
                        }}
                      >
                        {/* Bouton cacher/afficher colonne */}
                        {showColumnVisibilityToggle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleColumnVisibility(attributeKey);
                            }}
                            className="absolute top-1 right-1 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                            title="Cacher la colonne"
                          >
                            <svg 
                              className="w-3 h-3 text-gray-600" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              {/* Icône œil barré */}
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          </button>
                        )}

                        {/* En-tête cliquable pour le tri */}
                        <div 
                          className="flex flex-col justify-center items-center h-full px-2 cursor-pointer"
                          onClick={() => handleSort(attributeKey)}
                          title={`Cliquer pour trier par ${label}`}
                        >
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
                  }
                };
              }),
            show: true,
            minHeight: '56px',
            containerClassName: 'bg-bg-secondary border-ultra-light',
          }] : [])
        ]}
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
                  <tr 
                    key={`row-${item.id}`} 
                    className=""
                    style={style}
                    onClick={() => onRowClick?.(item)}
                  >
                    {allValues.map(({ attributeKey, attributeLabel, value }, valueIndex) => {
                      const columnIndex = attributeKeys.indexOf(attributeKey);
                      const isExactHoveredCell = itemHoveredId === item.id && columnHoveredKey === attributeKey;
                      
                      // Trouver la configuration de l'attribut pour détecter les colonnes cachées
                      const attributeConfig = categoriesStructure
                        .flatMap(cat => cat.attributes)
                        .find(attr => attr.key === attributeKey);
                      
                      // Si c'est une colonne cachée (type='hidden-column'), afficher cellule vide
                      if (attributeConfig?.type === 'hidden-column') {
                        // Vérifier si la colonne précédente est aussi cachée
                        const prevAttributeConfig = valueIndex > 0 
                          ? categoriesStructure.flatMap(cat => cat.attributes).find(attr => attr.key === attributeKeys[valueIndex - 1])
                          : null;
                        const isPrevHidden = prevAttributeConfig?.type === 'hidden-column';
                        
                        // Vérifier si la colonne suivante est aussi cachée
                        const nextAttributeConfig = valueIndex < attributeKeys.length - 1
                          ? categoriesStructure.flatMap(cat => cat.attributes).find(attr => attr.key === attributeKeys[valueIndex + 1])
                          : null;
                        const isNextHidden = nextAttributeConfig?.type === 'hidden-column';

                        return (
                          <td
                            key={`${item.id}-${attributeKey}`}
                            className="border-b border-default bg-gradient-to-r from-gray-50 to-gray-100"
                            style={{
                              width: `${calculateColumnWidths[valueIndex]}px`,
                              minWidth: `${calculateColumnWidths[valueIndex]}px`,
                              maxWidth: `${calculateColumnWidths[valueIndex]}px`,
                              height: `${heightCell}px`,
                              padding: 0,
                              borderRight: isNextHidden ? '1px dashed #e5e7eb' : '1px solid #e5e7eb',
                              borderLeft: isPrevHidden ? 'none' : '1px solid #e5e7eb',
                            }}
                          />
                        );
                      }

                      // Rendu normal pour colonnes visibles
                      const cellClasses = isExactHoveredCell 
                        ? 'bg-primary-ultra-light' 
                        : getCellPositionClasses(item.id, attributeKey, columnIndex);
                      
                      return (
                        <td
                          key={`${item.id}-${attributeKey}`}
                          className={`border-b border-r border-default overflow-hidden text-sm transition-colors text-primary ${cellClasses}`}
                          title={`${attributeLabel}: ${value || '-'}`}
                          style={{
                            width: `${calculateColumnWidths[valueIndex]}px`,
                            minWidth: `${calculateColumnWidths[valueIndex]}px`,
                            maxWidth: `${calculateColumnWidths[valueIndex]}px`,
                            height: `${heightCell}px`,
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            padding: `${cellPadding}px`
                          }}
                          onMouseEnter={() => {
                            setItemHoveredId(item.id);
                            setColumnHoveredKey(attributeKey);
                          }}
                          onMouseLeave={() => {
                            setItemHoveredId(null);
                            setColumnHoveredKey(null);
                          }}
                          onDoubleClick={() => onCellDoubleClick?.(item, attributeKey, value)}
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