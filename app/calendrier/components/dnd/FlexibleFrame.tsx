/**
 * @fileoverview Composant FlexibleFrame - Grille ultra-flexible et réutilisable
 * 
 * Ce composant fournit une structure de grille hautement configurable avec :
 * - En-têtes multi-niveaux (groupes, sous-groupes, colonnes)
 * - Configuration CSS Grid flexible (auto, fixe, personnalisée)
 * - Rendu personnalisé complet ou partiel
 * - Gestion intelligente du scroll et du sticky
 * - Support des layouts complexes (tableau, timeline, kanban, etc.)
 * 
 * Design Philosophy:
 * - Zero configuration par défaut (tout est optionnel)
 * - Composable (combine les fonctionnalités nécessaires)
 * - Extensible (override n'importe quelle partie)
 * - Agnostique du domaine (aucune logique métier)
 * 
 * @component FlexibleFrame
 * @author Gandara Solutions
 * @version 2.0.0 - Ultra-Flexible & Universal
 */

"use client";
import React, { ReactNode, memo, CSSProperties } from 'react';

/**
 * Interface unifiée pour définir un item d'en-tête
 * Peut représenter un groupe, sous-groupe, colonne, ou tout autre niveau
 * Tous les niveaux d'en-têtes utilisent cette même structure
 * 
 * Le rendu est TOUJOURS contrôlé par l'appelant via la fonction `render`
 */
interface HeaderItem {
  /** Nombre de colonnes occupées (span) */
  span: number;
  /** Identifiant unique */
  key: string;
  /** Classes CSS personnalisées pour cet item */
  className?: string;
  /** Styles inline personnalisés */
  style?: CSSProperties;
  /** Fonction de rendu personnalisé (OBLIGATOIRE) - Contrôle total du rendu par l'appelant */
  render: () => ReactNode;
}

/**
 * Configuration unifiée d'un niveau d'en-tête
 * Groups et Items utilisent maintenant exactement la même structure
 * La seule différence est le style appliqué via les props de configuration
 */
interface HeaderLevel {
  /** Items de ce niveau (groupes, colonnes, etc.) */
  items: HeaderItem[];
  /** Afficher ce niveau (défaut: true) */
  show?: boolean;
  /** Position sticky top (auto-calculée si non fournie) */
  stickyTop?: number | string;
  /** Hauteur minimale */
  minHeight?: number | string;
  /** Classes CSS pour le conteneur du niveau */
  containerClassName?: string;
  /** Classes CSS pour chaque item du niveau */
  itemClassName?: string;
  /** Styles du conteneur */
  containerStyle?: CSSProperties;
  /** Rendu personnalisé complet du niveau */
  customRender?: ReactNode;
}

/**
 * Interface définissant les propriétés du composant FlexibleFrame
 */
interface FlexibleFrameProps {
  /** Référence pour le scroll principal */
  mainRef: React.RefObject<HTMLDivElement | null>;
  
  /** Contenu à afficher dans la zone principale (children) */
  children: ReactNode;
  
  /** Configuration des niveaux d'en-têtes (ex: [groupes, items]) */
  headers?: HeaderLevel[];
  
  /** Configuration CSS Grid pour les colonnes */
  gridConfig?: {
    /** Mode: 'auto' | 'fixed' | 'custom' */
    mode?: 'auto' | 'fixed' | 'custom';
    /** Nombre total de colonnes (requis pour auto et fixed) */
    columns?: number;
    /** Largeur fixe par cellule (mode fixed) */
    cellWidth?: number;
    /** Template CSS Grid personnalisé (mode custom) */
    template?: string;
    /** Largeur min pour mode auto */
    minColumnWidth?: number;
    /** Largeur max pour mode auto */
    maxColumnWidth?: number;
  };
  
  /** Gestionnaire d'événement scroll */
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  
  /** Classes CSS additionnelles pour le conteneur principal */
  className?: string;
  
  /** Classes CSS pour la zone de contenu scrollable */
  contentClassName?: string;
  
  /** Styles inline pour le conteneur principal */
  style?: CSSProperties;
  
  /** Désactiver le conteneur externe (uniquement la grille) */
  bareMode?: boolean;
}

/**
 * Composant FlexibleFrame - Grille ultra-flexible
 */
const FlexibleFrame: React.FC<FlexibleFrameProps> = ({
  mainRef,
  children,
  headers = [],
  gridConfig,
  onScroll,
  className = '',
  contentClassName = '',
  style,
  bareMode = false,
}) => {

  // ========== LOGIQUE DE GRILLE ==========
  const getGridColumns = (): string => {
    if (!gridConfig) {
      return 'repeat(auto-fit, minmax(100px, 1fr))';
    }
    
    // Mode custom : utiliser le template fourni
    if (gridConfig.mode === 'custom' && gridConfig.template) {
      return gridConfig.template;
    }
    
    // Mode auto : colonnes flexibles avec min/max
    if (gridConfig.mode === 'auto' && gridConfig.columns) {
      const min = gridConfig.minColumnWidth || 100;
      const max = gridConfig.maxColumnWidth ? `, ${gridConfig.maxColumnWidth}px` : '';
      return `repeat(${gridConfig.columns}, minmax(${min}px${max}, max-content))`;
    }
    
    // Mode fixed : largeur uniforme
    if (gridConfig.mode === 'fixed' && gridConfig.columns) {
      return `repeat(${gridConfig.columns}, ${gridConfig.cellWidth || 120}px)`;
    }
    
    // Fallback
    return 'repeat(auto-fit, minmax(100px, 1fr))';
  };

  const gridTemplateColumns = getGridColumns();

  // ========== CALCUL DES POSITIONS STICKY ==========
  const calculateStickyTop = (levelIndex: number): string => {
    let cumulativeTop = 0;
    for (let i = 0; i < levelIndex; i++) {
      const header = headers[i];
      if (header && header.show !== false) {
        const height = header.minHeight;
        cumulativeTop += typeof height === 'number' ? height : parseInt(String(height)) || 0;
      }
    }
    return `${cumulativeTop}px`;
  };

  // ========== RENDU DES EN-TÊTES ==========
  /**
   * Rendu d'un niveau d'en-tête
   * Le rendu est TOUJOURS contrôlé par l'appelant via customRender ou item.render()
   */
  const renderHeader = (headerLevel: HeaderLevel, levelIndex: number) => {
    // Ne pas afficher si show === false
    if (headerLevel.show === false) return null;

    // Si customRender au niveau est fourni, l'utiliser directement
    // Cela permet un contrôle total du rendu du niveau entier depuis le parent
    if (headerLevel.customRender) {
      return (
        <div
          key={`header-level-${levelIndex}`}
          className={`grid sticky z-30 ${headerLevel.containerClassName || ''}`}
          style={{
            gridTemplateColumns,
            minHeight: headerLevel.minHeight || 'auto',
            top: headerLevel.stickyTop || calculateStickyTop(levelIndex),
            ...headerLevel.containerStyle,
          }}
        >
          {headerLevel.customRender}
        </div>
      );
    }

    // Rendu item par item avec contrôle total depuis le parent
    let columnIndex = 0;
    return (
      <div
        key={`header-level-${levelIndex}`}
        className={`grid sticky z-30 ${headerLevel.containerClassName || ''}`}
        style={{
          gridTemplateColumns,
          minHeight: headerLevel.minHeight || 'auto',
          top: headerLevel.stickyTop || calculateStickyTop(levelIndex),
          ...headerLevel.containerStyle,
        }}
      >
        {headerLevel.items.map((item: HeaderItem) => {
          const startColumn = columnIndex + 1;
          const endColumn = columnIndex + item.span;
          columnIndex += item.span;
          // Ne pas rendre si isHidden est true
          
          // Appel de la fonction render fournie par le parent
          return (
            <div
              key={item.key}
              style={{ gridColumn: `${startColumn} / ${endColumn + 1}`, ...item.style }}
              className={item.className}
            >
              {item.render()}
            </div>
          );
        })}
      </div>
    );
  };

  // ========== RENDU PRINCIPAL ==========
  const contentArea = (
    <div
      className={`relative w-full overflow-y-auto rounded-3xl border h-full border-ultra-light ${contentClassName}`}
      onScroll={onScroll}
      ref={mainRef}
    >
      {/* Rendu de tous les niveaux d'en-têtes */}
      {headers.map((headerLevel: HeaderLevel, index: number) => renderHeader(headerLevel, index))}

      {/* Zone de contenu */}
      <div
        className="relative"
        style={{
          gridTemplateColumns,
          display: 'grid',
        }}
      >
        {children}
      </div>
    </div>
  );

  // Mode bare : retourner uniquement la zone de contenu
  if (bareMode) {
    return contentArea;
  }

  // Mode normal : avec conteneurs
  return (
    <div className={`flex-1 min-w-0 flex flex-col pr-7 rounded-2xl poppins ${className}`} style={style}>
      <div className="p-4 border rounded-4xl bg-bg-secondary w-full h-full border-ultra-light">
        {contentArea}
      </div>
    </div>
  );
};

export default memo(FlexibleFrame);