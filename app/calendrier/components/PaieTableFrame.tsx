/**
 * @fileoverview Composant PaieTableFrame - Vue tableau des éléments de paie
 * 
 * Ce composant réutilise FlexibleFrame pour afficher un tableau où :
 * - Les groupes représentent les catégories d'informations (Informations générales, Configuration)
 * - Les colonnes représentent les attributs (verrou, image, code, libellé, actf, catégorie)
 * 
 * @component PaieTableFrame
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
import React, { useMemo, useState } from 'react';
import FlexibleFrame from './FlexibleFrame';
import { PaieItem } from '../types';

/**
 * Props du composant PaieTableFrame
 */
interface PaieTableFrameProps {
  className?: string;
  style?: React.CSSProperties;
  paieItems: PaieItem[];
  containerWidth?: number; // Largeur du conteneur en pixels
}

/**
 * Composant PaieTableFrame - Affichage tableau des éléments de paie
 */
const PaieTableFrame: React.FC<PaieTableFrameProps> = ({
  className = '',
  style,
  paieItems,
  containerWidth
}) => {
  
  // État pour gérer le tri
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });

  // Fonction pour trier les éléments de paie
  const sortedPaieItems = useMemo(() => {
    if (!sortConfig.key) return paieItems;
    
    const sorted = [...paieItems].sort((a, b) => {
      // Vérifier si les éléments ont des données valides
      if (!a || !b) return 0;
      
      // Récupérer les valeurs selon le type de propriété
      let aValue: any, bValue: any;
      
      if (sortConfig.key === 'image') {
        aValue = a.image;
        bValue = b.image;
      } else if (sortConfig.key === 'verrou') {
        aValue = a.verrou;
        bValue = b.verrou;
      } else {
        aValue = a[sortConfig.key as keyof PaieItem];
        bValue = b[sortConfig.key as keyof PaieItem];
      }
      
      // Gérer les valeurs nulles/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Conversion en string pour la comparaison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      // Tri numérique pour les valeurs qui ressemblent à des nombres
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Tri alphabétique
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [paieItems, sortConfig]);

  // Fonction pour gérer le clic sur une en-tête de colonne
  const handleSort = (attributeKey: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === attributeKey) {
        // Si on clique sur la même colonne, changer la direction
        return {
          key: attributeKey,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // Si on clique sur une nouvelle colonne, tri croissant par défaut
        return {
          key: attributeKey,
          direction: 'asc'
        };
      }
    });
  };
  
  // Structure organisée des attributs sans groupes
  const categoriesStructure = useMemo(() => [
    {
      key: 'all',
      label: '', 
      attributes: [
        { key: 'verrou', label: 'Verrou' },
        { key: 'image', label: 'Image', isBaseProperty: true },
        { key: 'code', label: 'Code' },
        { key: 'libelle', label: 'Libellé' },
        { key: 'actf', label: 'ACTF' },
        { key: 'categorie', label: 'Catégorie' },
      ]
    }
  ], []);

  // Configuration des groupes (pas de regroupement)
  const groups = useMemo(() => 
    categoriesStructure.map(category => ({
      label: '',
      span: category.attributes.length,
      key: category.key
    }))
  , [categoriesStructure]);

  // Labels des attributs (générés à partir de la structure)
  const attributeLabels = useMemo(() => 
    categoriesStructure.flatMap(category => 
      category.attributes.map(attr => attr.label)
    )
  , [categoriesStructure]);

  // Clés des attributs (générées à partir de la structure)
  const attributeKeys = useMemo(() => 
    categoriesStructure.flatMap(category => 
      category.attributes.map(attr => attr.key)
    ) as (keyof PaieItem | 'image')[]
  , [categoriesStructure]);

  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Logique de scroll personnalisée si nécessaire
  };

  /**
   * Fonction qui retourne les valeurs d'un élément de paie organisées par catégorie
   */
  const getPaieValuesByCategory = React.useCallback((paieItem: PaieItem) => {
    // Vérification de sécurité
    if (!paieItem) {
      console.error('Élément de paie invalide dans getPaieValuesByCategory:', paieItem);
      return [];
    }
    
    return categoriesStructure.map(category => ({
      categoryKey: category.key,
      categoryLabel: category.label,
      values: category.attributes.map(attr => {
        let value: string | undefined;
        
        if (attr.key === 'verrou') {
          // Convertir boolean en string
          value = paieItem.verrou ? 'true' : 'false';
        } else if (attr.isBaseProperty || attr.key === 'image') {
          // Propriété directe de PaieItem (image, etc.)
          value = (paieItem as any)[attr.key];
        } else {
          // Propriété standard de PaieItem
          value = paieItem[attr.key as keyof PaieItem] as string;
        }
        
        return {
          attributeKey: attr.key,
          attributeLabel: attr.label,
          value: value
        };
      })
    }));
  }, [categoriesStructure]);

  // Debug : Afficher la structure organisée dans la console
  React.useEffect(() => {
    console.log('💰 Structure des catégories et attributs (Paie):', categoriesStructure);
    console.log('📊 Configuration des groupes (Paie):', groups);
    console.log('🏷️ Labels des attributs (Paie):', attributeLabels);
    console.log('🔑 Clés des attributs (Paie):', attributeKeys);
    console.log('🔄 Configuration du tri (Paie):', sortConfig);
    
    if (sortedPaieItems.length > 0) {
      const exempleElement = getPaieValuesByCategory(sortedPaieItems[0]);
      console.log('📋 Exemple d\'élément de paie organisé par catégories:', exempleElement);
    }
  }, [categoriesStructure, groups, attributeLabels, attributeKeys, sortedPaieItems, getPaieValuesByCategory, sortConfig]);

  // Calculer les largeurs pour chaque colonne
  const calculateColumnWidths = React.useMemo(() => {
    if (!sortedPaieItems.length) return attributeLabels.map(() => 80);

    const fixedWidth = 92; // Largeur fixe pour les colonnes standard
    
    // Colonnes qui utilisent des largeurs spécifiques
    const adaptiveColumns = ['verrou', 'image', 'code', 'libelle', 'actf', 'categorie'];
    
    // Largeurs fixes pour les colonnes adaptatives
    const maxLimits: { [key: string]: number } = {
      'verrou': 80,
      'image': 80,
      'code': 120,
      'libelle': 300,
      'actf': 100,
      'categorie': 150,
    };

    return attributeLabels.map((label, colIndex) => {
      const attributeKey = attributeKeys[colIndex];
      
      // Colonnes avec largeurs spécifiques
      if (adaptiveColumns.includes(attributeKey as string)) {
        return maxLimits[attributeKey as string] || fixedWidth;
      }
      
      // Colonnes fixes
      return fixedWidth;
    });
  }, [attributeLabels, attributeKeys]);

  // Créer le style CSS Grid avec les largeurs calculées
  const gridTemplateColumns = React.useMemo(() => {
    return calculateColumnWidths.map(width => `${width}px`).join(' ');
  }, [calculateColumnWidths]);

  // Rendu des valeurs d'attributs avec styles appropriés
  const renderAttributeValue = (value: string | undefined, attributeKey: keyof PaieItem | 'image') => {
    if (!value) return <span className="text-gray-400">-</span>;
    
    switch (attributeKey) {
      case 'verrou':
        // Afficher une icône de cadenas selon l'état
        const isLocked = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'verrouillé';
        return (
          <div className="flex items-center justify-center w-full h-full">
            {isLocked ? (
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-red-600"
              >
                <path 
                  d="M18 11H6C5.45 11 5 11.45 5 12V20C5 20.55 5.45 21 6 21H18C18.55 21 19 20.55 19 20V12C19 11.45 18.55 11 18 11Z" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  fill="currentColor"
                />
                <path 
                  d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            ) : (
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-green-600"
              >
                <path 
                  d="M18 11H6C5.45 11 5 11.45 5 12V20C5 20.55 5.45 21 6 21H18C18.55 21 19 20.55 19 20V12C19 11.45 18.55 11 18 11Z" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  fill="currentColor"
                />
                <path 
                  d="M15 7C15 5.34 13.66 4 12 4C10.34 4 9 5.34 9 7" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            )}
          </div>
        );
      case 'image':
        if (value && typeof value === 'string') {
          return (
            <div className="flex items-center justify-center w-10 h-10">
              <img src={value} alt="Paie" className="w-8 h-8" />
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      case 'categorie':
        const badgeColor = value === 'Absence' ? 'bg-red-100 text-red-800' 
                         : value === 'Repas' ? 'bg-blue-100 text-blue-800'
                         : value === 'Astreinte' ? 'bg-orange-100 text-orange-800'
                         : value === 'Autres' ? 'bg-gray-100 text-gray-800'
                         : 'bg-purple-100 text-purple-800';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium poppins ${badgeColor}`}>
            {value}
          </span>
        );
      default:
        return (
          <div className='flex items-center justify-start w-full h-full'>
            <span className="text-gray-900 poppins">{value}</span>
          </div>
        );
    }
  };

  return (
    <FlexibleFrame
      groups={groups}
      items={attributeLabels}
      mainScrollRef={mainScrollRef}
      onScroll={handleScroll}
      showGroupHeaders={false} // Pas de groupes visibles
      className="paie-timeline-frame h-full pl-7 overflow-x-hidden"
      contentClassName='overflow-x-hidden scroll-hidden'
      useAutoCells={false}
      customGridColumns={gridTemplateColumns}
      customItemHeaders={
        // En-têtes d'items avec largeurs calculées et fonctionnalité de tri
        attributeLabels.map((label, index) => {
          const attributeKey = attributeKeys[index];
          const isActive = sortConfig.key === attributeKey;
          const direction = isActive ? sortConfig.direction : null;
          
          return (
            <div
              key={`header-${index}`}
              className="flex flex-col justify-center border-b border-r border-gray-300 text-center text-sm text-gray-700 p-2 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              style={{
                width: `${calculateColumnWidths[index]}px`,
                height: '56px',
                minWidth: `${calculateColumnWidths[index]}px`,
                maxWidth: `${calculateColumnWidths[index]}px`
              }}
              onClick={() => handleSort(attributeKey as string)}
              title={`Cliquer pour trier par ${label}`}
            >
              <div className="flex flex-col justify-center items-center h-full px-2">
                <div className="flex items-center justify-center gap-1">
                  <span className="leading-3 break-words text-center">
                    {label}
                  </span>
                  {/* Indicateur de tri */}
                  <div className="flex flex-col items-center ml-1">
                    {!isActive && (
                      <div className="flex flex-col">
                        <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-l-transparent border-r-transparent border-b-gray-300 mb-[1px]"></div>
                        <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-gray-300"></div>
                      </div>
                    )}
                    {isActive && direction === 'asc' && (
                      <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-l-transparent border-r-transparent border-b-blue-600"></div>
                    )}
                    {isActive && direction === 'desc' && (
                      <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-blue-600"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      }
    >
      {/* Contenu des éléments de paie avec largeurs calculées */}
      {sortedPaieItems
        .filter(paieItem => paieItem) // Filtrer les éléments invalides
        .flatMap((paieItem: PaieItem, rowIndex: number) => {
        const paieByCategories = getPaieValuesByCategory(paieItem);
        const allValues = paieByCategories.flatMap(cat => cat.values);
        
        return allValues.map(({ attributeKey, attributeLabel, value }, valueIndex) => {
          const columnWidth = calculateColumnWidths[valueIndex] || 150;
            
          return (
            <div
              key={`${paieItem.id}-${attributeKey}`}
              className="paie-cell px-3 py-2 border-r border-b border-gray-100 bg-white text-sm hover:bg-gray-50 transition-colors"
              style={{ 
                height: '58px',
                width: `${columnWidth}px`,
                minWidth: `${columnWidth}px`,
                maxWidth: `${columnWidth}px`,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={`${attributeLabel}: ${value || 'N/A'}`}
            >
              {renderAttributeValue(value, attributeKey as keyof PaieItem | 'image')}
            </div>
          );
        });
      })}
    </FlexibleFrame>
  );
};

export default PaieTableFrame;