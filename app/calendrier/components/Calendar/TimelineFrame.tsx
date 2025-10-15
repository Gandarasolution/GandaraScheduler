/**
 * @fileoverview Composant TimelineFrame - Cadre réutilisable pour la timeline
 * 
 * Ce composant fournit la structure et les en-têtes d'une timeline avec :
 * - En-tête des mois avec regroupement automatique
 * - En-tête des jours avec numéros de semaine
 * - Ligne verticale de la date actuelle
 * - Zone de contenu scrollable
 * - Gestion responsive et accessibilité
 * 
 * @component TimelineFrame
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
import React, { useMemo, ReactNode } from 'react';
import { format, isToday, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CELL_WIDTH } from '../../utils/constants';
import FlexibleFrame from '../FlexibleFrame';

/**
 * Interface définissant les propriétés du composant TimelineFrame
 * @interface TimelineFrameProps
 */
interface TimelineFrameProps {
  /** Liste des dates à afficher dans la timeline (optionnel pour mode custom) */
  dayInTimeline?: Date[];
  /** Configuration des colonnes pour mode custom */
  columns?: {
    /** Labels pour les groupes/catégories */
    groups: { label: string; span: number }[];
    /** Labels pour les colonnes individuelles */
    items: string[];
  };
  /** Référence pour le scroll principal */
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  /** Gestionnaire d'événement scroll */
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Contenu à afficher dans la zone principale (children) */
  children: ReactNode;
  /** Classes CSS additionnelles pour le conteneur principal */
  className?: string;
  /** Style inline pour le conteneur principal */
  style?: React.CSSProperties;
  /** Afficher la ligne de la date actuelle */
  showTodayLine?: boolean;
  /** Couleur de la ligne de la date actuelle */
  todayLineColor?: string;
  /** Afficher les en-têtes de groupes (défaut: true) */
  showGroupHeaders?: boolean;
  /** Afficher les en-têtes d'items (défaut: true) */
  showItemHeaders?: boolean;
  /** Classes CSS additionnelles pour la zone de contenu scrollable */
  contentClassName?: string;
  /** Labels personnalisés pour les mois (remplace les vrais mois) - DEPRECATED: utilisez columns.groups */
  customMonthLabels?: string[];
  /** Labels personnalisés pour les jours (remplace les dates) - DEPRECATED: utilisez columns.items */
  customDayLabels?: string[];
  /** Utiliser des cellules de taille automatique au lieu de largeur fixe */
  useAutoCells?: boolean;
}

/**
 * Composant TimelineFrame - Cadre réutilisable pour timeline
 * 
 * @param {TimelineFrameProps} props - Propriétés du composant
 * @returns {JSX.Element} Structure timeline avec en-têtes et zone de contenu
 */
const TimelineFrame: React.FC<TimelineFrameProps> = ({
  dayInTimeline,
  columns,
  mainScrollRef,
  onScroll,
  children,
  className = '',
  style,
  showTodayLine = true,
  todayLineColor = '#ffcdde',
  showGroupHeaders = true,
  showItemHeaders = true,
  contentClassName = '',
  customMonthLabels,
  customDayLabels,
  useAutoCells = false
}) => {

  /**
   * Calcule le numéro de semaine pour un jour donné
   * @param d - Date à analyser
   * @returns Numéro de la semaine
   */
  const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  /**
   * Calcule les groupes et leur portée pour l'en-tête
   * @returns Liste des groupes avec leur portée
   */
  const groupsInTimeline = useMemo(() => {
    const groups: { name: string; span: number; key: string }[] = [];
    
    // Mode colonnes personnalisées
    if (columns) {
      return columns.groups.map((group, index) => ({
        name: group.label,
        span: group.span,
        key: `group-${index}`
      }));
    }
    
    // Mode avec dayInTimeline
    if (!dayInTimeline || dayInTimeline.length === 0) return groups;

    // Si on a des labels personnalisés pour les mois, les utiliser
    if (customMonthLabels && customMonthLabels.length > 0) {
      // Distribuer les jours équitablement entre les catégories
      const daysPerCategory = Math.ceil(dayInTimeline.length / customMonthLabels.length);
      
      customMonthLabels.forEach((label, categoryIndex) => {
        const startIndex = categoryIndex * daysPerCategory;
        const endIndex = Math.min(startIndex + daysPerCategory, dayInTimeline.length);
        const span = endIndex - startIndex;
        
        if (span > 0) {
          groups.push({
            name: label,
            span: span,
            key: `custom-${categoryIndex}`,
          });
        }
      });
      
      return groups;
    }

    // Logique standard pour les vrais mois
    let currentMonth = format(dayInTimeline[0], 'yyyy-MM', { locale: fr });
    let currentMonthStartDayIndex = 0;

    dayInTimeline.forEach((day, index) => {
      const monthKey = format(day, 'yyyy-MM', { locale: fr });
      if (monthKey !== currentMonth) {
        groups.push({
          name: format(dayInTimeline[currentMonthStartDayIndex], 'MMMM yyyy', { locale: fr }),
          span: index - currentMonthStartDayIndex,
          key: currentMonth,
        });
        currentMonth = monthKey;
        currentMonthStartDayIndex = index;
      }
      if (index === dayInTimeline.length - 1) {
        groups.push({
          name: format(day, 'MMMM yyyy', { locale: fr }),
          span: index - currentMonthStartDayIndex + 1,
          key: currentMonth,
        });
      }
    });
    return groups;
  }, [dayInTimeline, customMonthLabels, columns]);

  /**
   * Calcule les items/colonnes pour l'en-tête
   * @returns Liste des items à afficher
   */
  const itemsInTimeline = useMemo(() => {
    // Mode colonnes personnalisées
    if (columns) {
      return columns.items;
    }
    
    // Mode avec dayInTimeline
    if (!dayInTimeline) return [];
    
    // Si on a des labels personnalisés pour les jours, les utiliser
    if (customDayLabels && customDayLabels.length > 0) {
      return customDayLabels;
    }
    
    // Retourner les dates formatées
    return dayInTimeline.map(day => format(day, 'd', { locale: fr }));
  }, [dayInTimeline, customDayLabels, columns]);

  /**
   * Calcule le nombre total de colonnes
   */
  const totalColumns = useMemo(() => {
    if (columns) {
      return columns.items.length;
    }
    return dayInTimeline?.length || 0;
  }, [dayInTimeline, columns]);

  /**
   * Trouve l'index du jour courant dans la timeline
   */
  const todayIndex = useMemo(() => {
    if (!dayInTimeline || !showTodayLine) return -1;
    return dayInTimeline.findIndex(day => 
      format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    );
  }, [dayInTimeline, showTodayLine]);

  /**
   * Convertit les groupes TimelineFrame vers le format FlexibleFrame
   */
  const flexibleGroups = useMemo(() => {
    return groupsInTimeline.map(group => ({
      label: group.name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      span: group.span,
      key: group.key
    }));
  }, [groupsInTimeline]);

  return (
    <FlexibleFrame
      groups={flexibleGroups}
      items={itemsInTimeline}
      mainScrollRef={mainScrollRef}
      onScroll={onScroll}
      className={contentClassName}
      showGroupHeaders={showGroupHeaders}
      showItemHeaders={showItemHeaders}
      useAutoCells={useAutoCells}
      cellWidth={CELL_WIDTH}
      customItemHeaders={
        // En-têtes personnalisés pour les jours avec logique date/custom
        showItemHeaders ? (
          itemsInTimeline.map((item, index) => {
            // Si on utilise des labels personnalisés ou le mode colonnes
            if ((customDayLabels && customDayLabels.length > 0) || columns) {
              return (
                <div
                  key={`header-item-${index}`}
                  className="flex flex-col justify-center border-b border-r border-gray-300 text-center text-sm font-semibold text-gray-700 p-2 bg-white relative item-cell"
                  style={{ 
                    width: `${CELL_WIDTH}px`,
                    height: 'auto',
                    minWidth: `${CELL_WIDTH}px`
                  }}
                >
                  <div className="flex flex-col justify-center items-center h-full px-2">
                    <span className="text-xs leading-3 break-words text-center">
                      {item}
                    </span>
                  </div>
                </div>
              );
            }
            
            // Mode normal avec vraies dates
            if (!dayInTimeline || !dayInTimeline[index]) {
              return null;
            }
            
            const day = dayInTimeline[index];
            const isCurrentDay = isToday(day);
            const isWeekendDay = isWeekend(day);
            const weekNumber = getWeekNumber(day);
            
            return (
              <div
                key={`day-${index}`}
                className={`
                  flex flex-col justify-end border-b border-r border-gray-300 text-center text-sm font-semibold text-gray-700 p-1
                  ${(isToday(day) && 'bg-[#ffcdde]') || (isWeekend(day) ? 'bg-[#f6f6f6]' : 'bg-white')}
                  relative
                  day-cell
                `}
                style={{ 
                  width: `${CELL_WIDTH}px`,
                  height: 'auto',
                  minWidth: `${CELL_WIDTH}px`
                }}
              >
                {/* Affiche le numéro de semaine en début de semaine */}
                {day.getDay() === 1 && (
                  <span
                    className="absolute -top-4 -left-3 z-30 rounded-full p-2 flex items-center justify-center text-white font-bold"
                    style={{
                      width: '24px',
                      height: '24px',
                      background: '#23adde',
                    }}
                  >
                    {weekNumber}
                  </span>
                )}
                <div className="flex flex-col justify-center items-center h-full">
                  <span className="block font-bold text-lg">
                    {customDayLabels && customDayLabels[index] 
                      ? customDayLabels[index].split(' ')[0] // Premier mot si c'est un label personnalisé
                      : format(day, 'd', { locale: fr }) // Numéro du jour sinon
                    }
                  </span>
                  <span className="block text-xs text-gray-500">
                    {customDayLabels && customDayLabels[index]
                      ? customDayLabels[index].split(' ').slice(1).join(' ') // Reste du label si personnalisé
                      : format(day, 'EEE', { locale: fr }).charAt(0).toUpperCase() 
                        + format(day, 'EEE', { locale: fr }).slice(1).replace('.', '') // Jour de la semaine sinon
                    }
                  </span>
                </div>
              </div>
            );
          })
        ) : undefined
      }
    >
      {children}
      
      {/* Ligne verticale pour aujourd'hui */}
      {showTodayLine && todayIndex >= 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none"
          style={{
            left: `${todayIndex * CELL_WIDTH + CELL_WIDTH / 2}px`,
            backgroundColor: todayLineColor,
          }}
        />
      )}
    </FlexibleFrame>
  );
};

export default TimelineFrame;