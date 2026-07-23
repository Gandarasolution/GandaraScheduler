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
import React, { useMemo, ReactNode, memo, useEffect } from 'react';
import { format, isToday, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CELL_WIDTH, TIMELINE_HEADERGROUPS_CELL_HEIGHT, TIMELINE_HEADERITEMS_CELL_HEIGHT } from '../../utils/constants';
import FlexibleFrame from '../dnd/FlexibleFrame';
import { getWeekNumber } from '../../utils/dates';
import { isHoliday } from '../../utils/dates';

/**
 * Interface définissant les propriétés du composant TimelineFrame
 * @interface TimelineFrameProps
 */
interface TimelineFrameProps {
  /** Liste des dates à afficher dans la timeline (optionnel pour mode custom) */
  dayInTimeline?: number[];
  /** Configuration des colonnes pour mode custom */
  columns?: {
    /** Labels pour les groupes/catégories */
    groups: { label: string; span: number }[];
    /** Labels pour les colonnes individuelles */
    items: string[];
  };
  nonworkingDates?: Record<string, number>; // Clé: date au format "yyyy-MM-dd"
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
  nonworkingDates,
  showGroupHeaders = true,
  showItemHeaders = true,
  contentClassName = '',
  customMonthLabels,
  customDayLabels,
  useAutoCells = false
}) => {


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

const computedHeaders = useMemo(() => {
    const headersConfig = [];

    // Niveau 1: Groupes (Mois)
    if (showGroupHeaders) {
      headersConfig.push({
        show: true,
        minHeight: TIMELINE_HEADERGROUPS_CELL_HEIGHT,
        containerClassName: 'bg-secondary-bg border-ultra-light',
        items: groupsInTimeline.map(group => ({
          span: group.span,
          key: group.key,
          style: {
            maxHeight: `${TIMELINE_HEADERGROUPS_CELL_HEIGHT}px`,
            minHeight: `${TIMELINE_HEADERGROUPS_CELL_HEIGHT}px`,
          },
          className: `col-span-full text-primary flex items-center justify-start py-2 text-[14px] poppins border-r border-ultra-light bg-secondary-bg border-b`,
          render: () => (
            <div className="sticky left-0 z-30 pl-4">
              <div className="flex sticky flex-col items-center">
                <span className="poppins text-center font-semibold">
                  {group.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </div>
            </div>
          ),
        }))
      });
    }

    // Niveau 2: Items (Jours)
    if (showItemHeaders) {
      headersConfig.push({
        show: true,
        minHeight: TIMELINE_HEADERITEMS_CELL_HEIGHT,
        containerClassName: 'bg-secondary-bg border-ultra-light',
        items: itemsInTimeline.map((item, index) => {
          if ((customDayLabels && customDayLabels.length > 0) || columns) {
            return {
              span: 1,
              key: `item-${index}-custom`,
              style: { width: `${CELL_WIDTH}px`, height: 'auto', minWidth: `${CELL_WIDTH}px` },
              render: () => (
                <div className="flex flex-col justify-center border-b border-r border-light text-center text-sm font-semibold text-primary p-2 bg-secondary-bg relative item-cell">
                  <div className="flex flex-col justify-center items-center h-full px-2">
                    <span className="text-xs leading-3 break-words text-center">{item}</span>
                  </div>
                </div>
              )
            };
          }

          if (!dayInTimeline || !dayInTimeline[index]) return { span: 1, key: `empty-${index}`, render: () => null };

          const day = dayInTimeline[index];
          const holiday = isHoliday(day);
          const weekNumber = getWeekNumber(day);
          const dayKey = format(day, 'yyyy-MM-dd');
          
          // Détection du jour non-travaillé
          const isNonWorking = nonworkingDates && nonworkingDates[dayKey];

          return {
            span: 1,
            // 💡 LA MODIFICATION MAGIQUE : La clé change de nom si le statut du jour change !
            key: `item-${index}-${isNonWorking ? 'nw' : 'w'}`,
            style: {
              maxHeight: `${TIMELINE_HEADERITEMS_CELL_HEIGHT}px`,
              minHeight: `${TIMELINE_HEADERITEMS_CELL_HEIGHT}px`,
              width: `${CELL_WIDTH}px`,
              minWidth: `${CELL_WIDTH}px`
            },
            render: () => (
              <div
                className={`
                  flex flex-col justify-end border-b border-r border-light text-center text-sm font-semibold text-primary p-1 h-full w-full
                  ${(isToday(day) && 'calendar-today') || (holiday ? 'FERIE' : (isWeekend(day) ? 'calendar-weekend' : (isNonWorking ? 'NON-WORKING' : 'bg-secondary-bg')))}
                  relative day-cell
                `}
              >
                {new Date(day).getDay() === 1 && (
                  <span
                    className="absolute -top-4 -left-3 z-30 rounded-full p-2 flex items-center justify-center text-white font-bold"
                    style={{ width: '24px', height: '24px', background: '#23adde' }}
                  >
                    {weekNumber}
                  </span>
                )}
                <div className="flex flex-col justify-center items-center h-full">
                  <span className="block font-bold text-lg">
                    {customDayLabels && customDayLabels[index] ? customDayLabels[index].split(' ')[0] : format(day, 'd', { locale: fr })}
                  </span>
                  <span className="block text-xs text-secondary">
                    {customDayLabels && customDayLabels[index]
                      ? customDayLabels[index].split(' ').slice(1).join(' ')
                      : format(day, 'EEE', { locale: fr }).charAt(0).toUpperCase() + format(day, 'EEE', { locale: fr }).slice(1).replace('.', '')}
                  </span>
                </div>
              </div>
            )
          };
        })
      });
    }

    return headersConfig;
  }, [showGroupHeaders, showItemHeaders, groupsInTimeline, itemsInTimeline, dayInTimeline, nonworkingDates, customDayLabels, columns]);


  return (
    <FlexibleFrame
      mainRef={mainScrollRef}
      onScroll={onScroll}
      className={contentClassName}
      gridConfig={{
        mode: useAutoCells ? 'auto' : 'fixed',
        columns: itemsInTimeline.length,
        cellWidth: CELL_WIDTH,
        minColumnWidth: CELL_WIDTH
      }}
      headers={computedHeaders}
    >
      {children}
    </FlexibleFrame>
  );
};

export default memo(TimelineFrame);
