/**
 * @fileoverview Composant ChantierTableFrame - Vue tableau des chantiers
 * 
 * Ce composant réutilise FlexibleFrame pour afficher un tableau où :
 * - Les groupes représentent les grandes catégories (Informations générales, Analyse chantier)
 * - Les colonnes représentent les attributs (code, identifiant, état, etc.)
 * 
 * @component ChantierTableFrame
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
import React, { useMemo } from 'react';
import FlexibleFrame from './FlexibleFrame';
import { ChantierEvent } from '../types';

/**
 * Props du composant ChantierTableFrame
 */
interface ChantierTableFrameProps {
  className?: string;
  style?: React.CSSProperties;
  chantiers: ChantierEvent[];
  containerWidth?: number; // Largeur du conteneur en pixels
}

/**
 * Composant ChantierTableFrame - Affichage tableau des chantiers
 */
const ChantierTableFrame: React.FC<ChantierTableFrameProps> = ({
  className = '',
  style,
  chantiers,
  containerWidth
}) => {
  
  // Structure organisée des catégories avec leurs attributs
  const categoriesStructure = useMemo(() => [
    {
      key: 'IG',
      label: 'Informations Générales', 
      attributes: [
        { key: 'image', label: 'Image', isBaseProperty: true }, // Image vient de BaseEvent
        { key: 'code', label: 'Code' },
        { key: 'identifiant', label: 'Identifiant' },
        { key: 'libelle', label: 'Libellé' },
        { key: 'etat', label: 'État' },
        { key: 'chargeAffaire', label: 'Chargé Affaire' },
        { key: 'chefChantier', label: 'Chef Chantier' },
        { key: 'dateOS', label: 'Date OS' },
        { key: 'dateFin', label: 'Date Fin' }
      ]
    },
    {
      key: 'analyse',
      label: 'Analyse Chantier',
      attributes: [
        { key: 'TM', label: 'Temps Marché' },
        { key: 'HR', label: 'Heures Réalisées' },
        { key: 'SH', label: 'Solde Heure' },
        { key: 'DPF', label: 'Durée Planifiée Future' },
        { key: 'RPF', label: 'Réalisé - Planif Future' },
        { key: 'AP', label: 'Avancement prévisionnel' },
        { key: 'SP', label: 'Solide Prévisionnel' },
      ]
    }
  ], []);

  // Configuration des groupes (générée à partir de la structure)
  const groups = useMemo(() => 
    categoriesStructure.map(category => ({
      label: category.label,
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
    ) as (keyof ChantierEvent['attributs'] | 'image')[] // Include 'image' as possible key
  , [categoriesStructure]);

  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Logique de scroll personnalisée si nécessaire
  };

  /**
   * Fonction qui retourne les valeurs d'un chantier organisées par catégorie
   */
  const getChantierValuesByCategory = React.useCallback((chantier: ChantierEvent) => {
    // Vérification de sécurité
    if (!chantier || !chantier.attributs) {
      console.error('Chantier invalide dans getChantierValuesByCategory:', chantier);
      return [];
    }
    
    return categoriesStructure.map(category => ({
      categoryKey: category.key,
      categoryLabel: category.label,
      values: category.attributes.map(attr => ({
        attributeKey: attr.key,
        attributeLabel: attr.label,
        value: attr.isBaseProperty 
          ? (chantier as any)[attr.key] // Propriété de BaseEvent (image, color, etc.)
          : chantier.attributs[attr.key as keyof ChantierEvent['attributs']] // Propriété des attributs
      }))
    }));
  }, [categoriesStructure]);

  // Debug : Afficher la structure organisée dans la console
  React.useEffect(() => {
    console.log('🏗️ Structure des catégories et attributs:', categoriesStructure);
    console.log('📊 Configuration des groupes:', groups);
    console.log('🏷️ Labels des attributs:', attributeLabels);
    console.log('🔑 Clés des attributs:', attributeKeys);
    
    if (chantiers.length > 0) {
      const exempleChantier = getChantierValuesByCategory(chantiers[0]);
      console.log('📋 Exemple de chantier organisé par catégories:', exempleChantier);
    }
  }, [categoriesStructure, groups, attributeLabels, attributeKeys, chantiers, getChantierValuesByCategory]);

  // Calculer les largeurs optimales pour chaque colonne
  const calculateColumnWidths = React.useMemo(() => {
    if (!chantiers.length) return attributeLabels.map(() => 80);

    const fixedWidth = 89; // Largeur fixe pour les colonnes standard
    const padding = 24; // Padding horizontal (px-3 = 12px de chaque côté)
    
    // Colonnes qui s'adaptent à leur contenu
    const adaptiveColumns = ['libelle', 'chefChantier', 'chargeAffaire', 'etat', 'dateOS', 'dateFin', 'identifiant', 'image'];
    
    // Calculer d'abord les largeurs pour les colonnes adaptatives
    const adaptiveWidths: { [key: string]: number } = {};
    
    attributeLabels.forEach((label, colIndex) => {
      const attributeKey = attributeKeys[colIndex];
      
      if (adaptiveColumns.includes(attributeKey)) {
        let maxWidthForColumn = Math.max(85, label.length * 8 + padding); // Largeur minimale basée sur le titre
        
        // Calculer la largeur nécessaire pour chaque valeur de cette colonne
        chantiers.forEach(chantier => {
          // Vérification de sécurité pour éviter les erreurs
          if (!chantier || !chantier.attributs) {
            console.warn('Chantier invalide détecté:', chantier);
            return;
          }
          
          // Récupérer la valeur selon le type de propriété
          const value = attributeKey === 'image' 
            ? chantier.image 
            : chantier.attributs[attributeKey as keyof ChantierEvent['attributs']];
            
          if (value && typeof value === 'string') {
            let estimatedWidth;
            
            // Pour l'état, on compte le badge avec padding supplémentaire
            if (attributeKey === 'etat') {
              estimatedWidth = Math.max(85, value.length * 8 + padding + 20); // +20px pour le badge
            }
            else if (attributeKey === 'image') {
              estimatedWidth = 60; // Largeur fixe pour l'image
            } 
            else {
              estimatedWidth = Math.max(85, value.length * 8 + padding);
            }
            
            maxWidthForColumn = Math.max(maxWidthForColumn, estimatedWidth);
          }
        });
        
        // Limiter les largeurs maximales pour éviter que le tableau soit trop large
        const maxLimits: { [key: string]: number } = {
          'libelle': 296,
          'chefChantier': 140,
          'chargeAffaire': 140,
          'etat': 108,
          'dateOS': 120,
          'dateFin': 120,
          'identifiant': 120,
          'image': 80, // Largeur fixe pour l'image
        };
        
        adaptiveWidths[attributeKey] = Math.min(maxLimits[attributeKey] || 200, maxWidthForColumn);
      }
    });


    return attributeLabels.map((label, colIndex) => {
      const attributeKey = attributeKeys[colIndex];
      
      // Colonnes adaptatives
      if (adaptiveColumns.includes(attributeKey)) {
        return adaptiveWidths[attributeKey] || fixedWidth;
      }
      
      // Colonnes fixes
      return fixedWidth;
    });
  }, [chantiers, attributeLabels, attributeKeys, containerWidth]);

  // Créer le style CSS Grid avec les largeurs calculées
  const gridTemplateColumns = React.useMemo(() => {
    return calculateColumnWidths.map(width => `${width}px`).join(' ');
  }, [calculateColumnWidths]);

  // Rendu des valeurs d'attributs avec styles appropriés
  const renderAttributeValue = (value: string | undefined, attributeKey: keyof ChantierEvent['attributs'] | 'image') => {
    if (!value) return <span className="text-gray-400">-</span>;
    
    switch (attributeKey) {
      case 'etat':
        const badgeColor = value === 'En cours' ? 'bg-green-100 text-green-800' 
                         : value === 'Planifié' ? 'bg-blue-100 text-blue-800'
                         : value === 'Terminé' ? 'bg-gray-100 text-gray-800'
                         : 'bg-yellow-100 text-yellow-800';
        return (
          <span className={`inline-flex w-[80px] justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium poppins ${badgeColor}`}>
            {value}
          </span>
        );
      case 'image':
        if (value && typeof value === 'string') {
          return (
            <div className="flex items-center justify-center w-10 h-10">
              <img src={value} alt="Chantier" className="w-8 h-8" />
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      default:
        return <span className="text-gray-900 poppins">{value}</span>;
    }
  };

  return (
        <FlexibleFrame
          groups={groups}
          items={attributeLabels}
          mainScrollRef={mainScrollRef}
          onScroll={handleScroll}
          isScrollX={false}
          className="chantier-timeline-frame h-full pl-7 overflow-x-hidden"
          useAutoCells={false}
          customGridColumns={gridTemplateColumns}
          customItemHeaders={
            // En-têtes d'items avec largeurs calculées
            attributeLabels.map((label, index) => (
              <div
                key={`header-${index}`}
                className="flex flex-col justify-center border-b border-r border-gray-300 text-center text-sm text-gray-700 p-2 bg-white"
                style={{
                  width: `${calculateColumnWidths[index]}px`,
                  height: '56px',
                  minWidth: `${calculateColumnWidths[index]}px`,
                  maxWidth: `${calculateColumnWidths[index]}px`
                }}
              >
                <div className="flex flex-col justify-center items-center h-full px-2">
                  <span className="leading-3 break-words text-center">
                    {label}
                  </span>
                </div>
              </div>
            ))
          }
        >
          {/* Contenu des chantiers avec largeurs calculées */}
          {chantiers
            .filter(chantier => chantier && chantier.attributs) // Filtrer les éléments invalides
            .flatMap((chantier, rowIndex) => {
            const chantierByCategories = getChantierValuesByCategory(chantier);
            const allValues = chantierByCategories.flatMap(cat => cat.values);
            
            return allValues.map(({ attributeKey, attributeLabel, value }, valueIndex) => {
              const columnWidth = calculateColumnWidths[valueIndex] || 150;
                
              return (
                <div
                  key={`${chantier.id}-${attributeKey}`}
                  className="chantier-cell flex items-center justify-start px-3 py-2 border-r border-b border-gray-100 bg-white text-sm hover:bg-gray-50 transition-colors"
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
                  {renderAttributeValue(value, attributeKey as keyof ChantierEvent['attributs'] | 'image')}
                </div>
              );
            });
          })}
        </FlexibleFrame>
  );
};

export default ChantierTableFrame;