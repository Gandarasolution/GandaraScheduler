/**
 * @fileoverview Composant AppointmentItem - Affichage et interaction avec un rendez-vous
 * 
 * Ce composant représente un rendez-vous individuel dans la grille calendrier.
 * Il gère l'affichage visuel, les interactions utilisateur et les fonctionnalités avancées :
 * 
 * Fonctionnalités principales :
 * - Affichage avec couleurs personnalisées et icônes
 * - Drag & Drop pour déplacer les rendez-vous
 * - Redimensionnement par les bords (resize)
 * - Menu contextuel et double-clic
 * - Support mobile et desktop
 * - Gestion des week-ends et jours non-travaillés
 * - Aperçu lors du déplacement
 * 
 * @component AppointmentItem
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
import React, { useState, useRef, memo, useEffect, useCallback, useMemo } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import {Appointment, HalfDayInterval, Item } from '../../types';
import { isWeekend } from 'date-fns';
import { CELL_WIDTH, HALF_DAY_INTERVALS, CELL_HEIGHT, DAY_INTERVALS, DAY_MS, HOUR_MS } from '../../utils/constants';
import AppointmentTag from './AppointmentTag';
import { countWeekends } from '../../utils/dates';

/**
 * Interface définissant les propriétés du composant AppointmentItem
 * @interface AppointmentItemProps
 */
interface AppointmentItemProps {
  /** Rendez-vous à afficher avec position verticale */
  appointment: Appointment & { top: number};
  /** Indique si l'affichage est en mode journée complète */
  isFullDay: boolean;
  /** Indique si l'interface est en mode mobile */
  isMobile: boolean;
  /** Inclure les week-ends dans le calcul de durée (optionnel) */
  isDisplayWeekend?: boolean;
  /** Date de début de la timeline pour le calcul de position */
  timelineStart?: number;
  /** ClassName */
  className?: string;
  /** Position absolue forcée en pixels (optionnel) */
  absoluteLeft?: number;
  /** Largeur forcée en pixels (optionnel) */
  absoluteWidth?: number;
  /** Décalage vertical forcé en pixels (optionnel) */
  absoluteTop?: number;
  /** Type d'événement associé au rendez-vous */
  event: Item;
  /** Informations de l'employé assigné */
  chargeeAffaire: string ;
  /** Source d'appel du composant */
  source?: 'calendar' | 'demo';
  /** Indique si le rendez-vous est sélectionné */
  isSelected?: boolean;
  /** Callback appelé lors du clic */
  onClick?: () => void;
  /** Callback appelé lors du double-clic */
  onDoubleClick?: () => void;
  /** Callback appelé lors du redimensionnement */
  onResize?: (id: number, newStart: number, newEnd: number, resizeDirection: 'left' | 'right') => void;
  /** Callback appelé lors du clic droit (menu contextuel) */
  handleContextMenu?: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
}

/**
 * Composant principal pour afficher et interagir avec un rendez-vous
 * 
 * Fonctionnalités avancées :
 * - Redimensionnement du rendez-vous à gauche ou à droite via des poignées (handles)
 * - Déplacement du rendez-vous via drag & drop (intégration react-dnd)
 * - Sélection du rendez-vous et gestion du contexte (clic, double-clic, menu contextuel)
 * - Calcul dynamique de la largeur et de la position selon la durée et le type d'intervalle
 * - Prise en charge du mode mobile (largeur adaptée)
 * 
 * Hooks/Context utilisés :
 * - useSelectedCell : Gestion de la sélection de cellule dans la grille
 * - useSelectedAppointment : Gestion de la sélection du rendez-vous courant
 * - useDrag, useDragLayer (react-dnd) : Gestion du drag & drop
 * 
 * @param {AppointmentItemProps} props - Propriétés du composant
 * @returns {JSX.Element} Élément JSX représentant le rendez-vous interactif
 */
const AppointmentItem: React.FC<AppointmentItemProps> = ({
  appointment,
  isFullDay,
  isMobile,
  event,
  chargeeAffaire,
  isDisplayWeekend,
  timelineStart = 0,
  source = 'calendar',
  isSelected,
  className,
  absoluteLeft,
  absoluteWidth,
  absoluteTop,
  onClick,
  onDoubleClick,
  onResize,
  handleContextMenu,
}) => {
  // États pour le redimensionnement et le drag & drop
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragStart, setDragStart] = useState<number>(appointment.startDate);
  const [dragEnd, setDragEnd] = useState<number>(appointment.endDate);

  
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartRef = useRef<number>(appointment.startDate);
  const dragEndRef = useRef<number>(appointment.endDate);
  const initialX = useRef(0);

  const startDate = React.useMemo(() => appointment.startDate, [appointment.startDate]);
  const endDate = React.useMemo(() => appointment.endDate, [appointment.endDate]);


  // Largeur d'un intervalle selon le type de rendez-vous
  const INTERVAL_WIDTH = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
  // Durée d'un intervalle en millisecondes
  const INTERVAL_DURATION = isFullDay 
    ? (DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour) * 60 * 60 * 1000 
    : (HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour) * 60 * 60 * 1000;
    

  // Calculer le nombre d'intervalles (matin/après-midi)
  const getIntervalCount = useCallback((start: number, end: number) => {
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
    let count = 0;
    
    // On travaille sur des copies primitives (nombres)
    let currentTs = start;
    const forward = end >= start;
    
    // --- Boucle Principale ---

    // Condition mathématique pure (start < end ou inversement)
    while (forward ? currentTs < end : currentTs > end) {
      
      // 1. Comptage (si ce n'est pas un weekend ou si on affiche les weekends)
      if (isDisplayWeekend || !isWeekend(currentTs)) {
        count++;
      }

      // 2. Trouver l'index de l'intervalle actuel
      const currentHour = new Date(currentTs).getHours();
      let idx = intervals.findIndex(interval => 
        currentHour >= interval.startHour && currentHour < interval.endHour
      );
      if (idx === -1) idx = 0;

      // 3. Navigation
      if (forward) {
        idx++;
        if (idx >= intervals.length) {
          // Passage au jour suivant (index 0)
          idx = 0;
          currentTs = new Date(currentTs + DAY_MS).setHours(intervals[idx].startHour, 0, 0, 0);
        } else {
          // Même jour, intervalle suivant
          currentTs = new Date(currentTs).setHours(intervals[idx].startHour, 0, 0, 0);
        }
      } else {
        idx--;
        if (idx < 0) {
          // Passage au jour précédent (dernier index)
          idx = intervals.length - 1;
          // Equivalent: addDays(-1) + setHours(...)
          currentTs = new Date(currentTs - DAY_MS).setHours(intervals[idx].startHour, 0, 0, 0);
        } else {
          // Même jour, intervalle précédent
          currentTs = new Date(currentTs).setHours(intervals[idx].startHour, 0, 0, 0);
        }
      }
    }

    return forward ? Math.max(0, count) : -Math.max(0, count);
  }, [isDisplayWeekend, isFullDay]); // Dépendances réduites

  const intervalCount = getIntervalCount(dragStart, dragEnd);
  
  // Détection des petits rendez-vous (une seule case)
  const isSmallAppointment = intervalCount <= 1;
  const appointmentWidthPx = intervalCount * INTERVAL_WIDTH;
  const hasSpaceForBothHandles = appointmentWidthPx >= 60; // Minimum 60px pour avoir les deux handles


  // Décalage horizontal du bloc (en px)
  const offsetIntervals = isDisplayWeekend 
    ? Math.floor((dragStart - startDate) / INTERVAL_DURATION)
    : getIntervalCount(startDate, dragStart);

  const [computedWidth, setComputedWidth] = useState<string>(
    absoluteWidth !== undefined 
    ? `${absoluteWidth}px` 
    : isMobile 
      ? (intervalCount >= 2 && !isFullDay ? '200%' : '100%') 
      : `${intervalCount * INTERVAL_WIDTH}px`
  );
  const [computedLeft, setComputedLeft] = useState<number>(absoluteLeft !== undefined ? absoluteLeft : offsetIntervals * INTERVAL_WIDTH);


  
  // Drag & drop avec react-dnd
  const [{ isDragging }, drag] = useDrag({
    type: 'appointment',
    item: () => ({
      id: appointment.id,
      type: 'appointment',
      startDate: startDate,
      endDate: endDate,
      dragOffset,
    }),
    canDrag: () => !isResizingLeft && !isResizingRight,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Savoir si un élément est en train d'être déplacé
  const isAnyDragging = useDragLayer((monitor) => monitor.isDragging());
  const computedTop = absoluteTop !== undefined
    ? `${absoluteTop}px`
    : `${(appointment.top * CELL_HEIGHT) + (2 * appointment.top)}px`;


  // Capture la position du clic dans le bloc (en px)
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
  }, []);

  // Met à jour la date de début lors du resize
  const setDragStartSafe = useCallback((date: number) => {
    dragStartRef.current = date;
    setDragStart(date);
  }, []);

  // Met à jour la date de fin lors du resize
  const setDragEndSafe = useCallback((date: number) => {
    dragEndRef.current = date;
    setDragEnd(date);
  }, []);

  /**
   * Avance ou recule la date de n intervalles (matin/après-midi/jour entier).
   * @param date Date de départ
   * @param n Nombre d'intervalles à avancer (positif) ou reculer (négatif)
   * @param intervals Tableau d'intervalles (ex: HALF_DAY_INTERVALS ou DAY_INTERVALS)
   * @returns Nouvelle date positionnée au début de l'intervalle cible
   */
  // Ajoute ou retire n intervalles en sautant les week-ends si besoin
  const addInterval = useCallback((date: number, n: number, intervals: HalfDayInterval[]): number => {      

      let currentTs = date;

      // --- Logique Principale ---

      // 1. Trouver l'index de départ
      let currentHour = new Date(currentTs).getHours();
      let idx = intervals.findIndex(interval => 
          currentHour >= interval.startHour && currentHour < interval.endHour
      );
      if (idx === -1) idx = 0;

      const step = n >= 0 ? 1 : -1;
      let remaining = Math.abs(n);

      

      // 2. Boucle de déplacement
      while (remaining > 0) {
          idx += step;
          
          // Gestion du dépassement de journée
          if (idx > 0 ) {
              idx = 0;
              currentTs += isFullDay ? DAY_MS : DAY_MS/2; // + 1 jour
          } else if (idx <= 0) {
              idx = intervals.length - 1;
              currentTs -= isFullDay ? DAY_MS : DAY_MS/2; // - 1 jour
          }

          // Sauter les week-ends si nécessaire
          if (!isDisplayWeekend) {
              // Tant qu'on  est sur un weekend, on avance/recule d'un jour
              while (isWeekend(currentTs)) {
                  currentTs += (step * (isFullDay ? DAY_MS : DAY_MS/2));
              }
          }
          remaining--;
      }
      
      return currentTs;

  }, [isDisplayWeekend, isFullDay]);

  // Débute le redimensionnement (gauche ou droite)
  /**
   * Gère l'événement de pression de la souris sur les poignées de redimensionnement d'un rendez-vous.
   * Initialise l'état de redimensionnement et détermine quel côté (gauche ou droite) est en cours de redimensionnement.
   *
   * @param e - L'événement souris déclenché lors de l'appui sur une poignée de redimensionnement.
   * @param handleType - Spécifie quelle poignée est utilisée : 'left' ou 'right'.
   */
  const handleMouseDown = useCallback((e: React.MouseEvent, handleType: 'left' | 'right') => {
    e.stopPropagation();
    initialX.current = e.clientX;
    setDragStart(startDate);
    setDragEnd(endDate);
    if (handleType === 'left') setIsResizingLeft(true);
    else setIsResizingRight(true);
  }, [startDate, endDate]);

  /**
   * Gère les mouvements de la souris lors du redimensionnement d'un rendez-vous.
   * 
   * Cette fonction callback met à jour la date de début ou de fin du rendez-vous
   * pendant que l'utilisateur fait glisser les poignées de redimensionnement (gauche ou droite).
   * Elle calcule le nombre d'intervalles déplacés en fonction de la position X de la souris
   * et ajuste la date de début ou de fin en conséquence.
   * 
   * - Si on redimensionne à gauche, la date de début est mise à jour (sans dépasser la date de fin).
   * - Si on redimensionne à droite, la date de fin est mise à jour (sans précéder la date de début).
   * - La taille de l'intervalle dépend du type de rendez-vous (journée entière ou demi-journée).
   * 
   * @param e - L'événement souris déclenché lors du mouvement.
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (!isResizingLeft && !isResizingRight) return;
    

    const currentDx = (e.clientX - initialX.current) ;
    let intervalsMoved = Math.round(currentDx / INTERVAL_WIDTH);
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;


    if (isResizingLeft) {

      let newStartDate = addInterval(startDate, intervalsMoved, intervals);
            
      if (newStartDate > dragEndRef.current) {
        newStartDate = addInterval(dragEndRef.current, 0, intervals);
      }

      setDragStartSafe(newStartDate);
    }
    if (isResizingRight) {
      

      let newEndDate = addInterval(endDate, intervalsMoved, intervals);
      //console.log('newEndDate', new Date(newEndDate));
      
      
      if (newEndDate < dragStartRef.current) {
        newEndDate = addInterval(dragStartRef.current, 1, intervals);
      }

      //console.log('newEndDate after', new Date(newEndDate));
      
      setDragEndSafe(new Date(newEndDate).setHours(new Date(newEndDate).getHours() - 1, 59, 59, 999));
    }    
  }, [isResizingLeft, isResizingRight, startDate, endDate, isFullDay, addInterval, setDragStartSafe, setDragEndSafe]);


  /**
   * Gère l'événement de relâchement de la souris lors du redimensionnement d'un rendez-vous.
   *
   * Si le redimensionnement se fait à droite, appelle la fonction `onResize` avec la direction 'right'.
   * Si le redimensionnement se fait à gauche, appelle la fonction `onResize` avec la direction 'left'.
   * Réinitialise les états de redimensionnement après l'opération.
   *
   * @function
   * @returns {void}
   */
  const handleMouseUp = useCallback(() => {
    if (isResizingRight) {
      
      onResize && onResize(appointment.id, dragStartRef.current, dragEndRef.current, 'right');
    }
    if (isResizingLeft) {      
      onResize && onResize(appointment.id, dragStartRef.current, dragEndRef.current, 'left');
    }
    
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, [isResizingLeft, isResizingRight, onResize, appointment.id]);


  
  // Ajoute/retire les listeners lors du redimensionnement
  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, handleMouseMove, handleMouseUp]);

  // Met à jour les dates de drag si les props changent
  useEffect(() => {
    setDragStartSafe(startDate);
    setDragEndSafe(endDate);
  }, [startDate, endDate, setDragStartSafe, setDragEndSafe]);

  useEffect(() => {
    // 1. CALCUL DE LA LARGEUR (Ça c'est bon, sauf l'arrondi)
    const durationMs = dragEndRef.current - dragStartRef.current;

    // Astuce DST : On arrondit pour éviter les jours de 23h/25h
    const durationInterval = Math.round(durationMs / (isFullDay ? DAY_MS : DAY_MS / 2)); 
    

    let NbDayWeekends = 0;
    if (!isDisplayWeekend) {
      NbDayWeekends = countWeekends(dragStartRef.current, dragEndRef.current);
    }
    
    // On s'assure d'avoir au moins un petit bout visible
    const visualDurationDays = Math.max(0.1, durationInterval - (NbDayWeekends * (isFullDay ? 1 : 2)));
    setComputedWidth((visualDurationDays * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2)) + 'px');

    // 2. CALCUL DE LA POSITION (C'est ici qu'on change)
    if (isResizingLeft) {
      // "timelineStart" doit être la date du tout début de ta grille (colonne 0)
      // Ne pas utiliser l'ancienne start date du RDV, mais bien le référentiel global
      const startFromTimelineOrigin = dragStartRef.current - timelineStart;
      
      
      const intervalFromOrigin = Math.round(startFromTimelineOrigin / (isFullDay ? DAY_MS : (DAY_MS / 2)));
      
      let weekendsToRemove = 0;
      if (!isDisplayWeekend) {
        weekendsToRemove = countWeekends(timelineStart, dragStartRef.current);
      }

      //console.log('weekendsToRemove', weekendsToRemove);
      
      
      const visualInstervalsOffset = intervalFromOrigin - (weekendsToRemove * (isFullDay ? 1 : 2));

      // console.log('intervalFromOrigin', intervalFromOrigin);
      // console.log('visualInstervalsOffset', visualInstervalsOffset);
      
      
      
      const newLeftPixel = Math.max(0, visualInstervalsOffset * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2));
      
      
      setComputedLeft(newLeftPixel);
    }
    
  }, [absoluteWidth, isMobile, intervalCount, INTERVAL_WIDTH, isResizingLeft, timelineStart, isFullDay]); 
  
  useEffect(() => {
    // Si on est en train de redimensionner à gauche manuellement, 
    // on IGNORE la synchronisation avec absoluteLeft ou offsetIntervals
    if (isResizingLeft) return; 

    if (absoluteLeft !== undefined) {
      setComputedLeft(absoluteLeft);
    } else {
      setComputedLeft(offsetIntervals * INTERVAL_WIDTH);
    }
  }, [absoluteLeft, offsetIntervals, isResizingLeft, INTERVAL_WIDTH]); // isResizingLeft ajouté aux dépendances
  
  // --- Styles ---
  
  const appointmentColor = event?.color || '#1E40AF';
  const appointmentBorderColor = event?.borderColor || '#1E40AF';
  const appointmentTextColor = event?.textColor || '#FFFFFF';

  // Optimisation du style pour éviter les recalculs inutiles
  const containerStyle = useMemo(() => ({
    width: source === 'demo' ? '100%' : computedWidth,
    height: `${CELL_HEIGHT + 4}px`,
    minWidth: `${INTERVAL_WIDTH}px`,
    pointerEvents: isDragging ? 'none' as const : 'auto' as const,
    left: `${computedLeft}px`,
    willChange: 'width, left',
    top: computedTop,
    backgroundColor: isHovered ? 'white' : appointmentColor,
    border: `2px solid ${appointmentBorderColor}`,
    transition: 'all 0.2s ease-in-out', // Désactiver transition pendant drag pour fluidité
  }), [source, computedWidth, INTERVAL_WIDTH, isDragging, computedLeft, computedTop, isHovered, appointmentColor, appointmentBorderColor, isResizingLeft, isResizingRight]);

  return (
    <div
      key={appointment.id}
      ref={(node) => { if (node && source === 'calendar') drag(node); }} // Référence pour le drag & drop
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick && onDoubleClick();
      }}
      onContextMenu={(e) => {
        // Calculer la cellule sous la souris lors du clic droit
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        // Calculer l'intervalle sous la souris
        const intervalIndex = Math.floor(mouseX / INTERVAL_WIDTH);
        const totalIntervals =getIntervalCount(startDate, endDate);
        const clampedIntervalIndex = Math.max(0, Math.min(intervalIndex, totalIntervals - 1));
        
        // Calculer la date correspondant à cet intervalle
        const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
        let targetDate = startDate;
        let currentIntervalCount = 0;
        
        // Parcourir les intervalles depuis le début du RDV jusqu'à celui sous la souris
        while (currentIntervalCount < clampedIntervalIndex) {
          // Trouver l'intervalle actuel
          let currentIntervalIdx = intervals.findIndex(interval =>
             new Date(targetDate).getHours() >= interval.startHour && new Date(targetDate).getHours() < interval.endHour
          );
          if (currentIntervalIdx === -1) currentIntervalIdx = 0;
          
          // Passer à l'intervalle suivant
          currentIntervalIdx++;
          if (currentIntervalIdx >= intervals.length) {
            // Passer au jour suivant
            targetDate = new Date(targetDate + DAY_MS).setHours(intervals[0].startHour, 0, 0, 0);
            
            // Vérifier si on doit ignorer les week-ends
            while (!isDisplayWeekend && isWeekend(targetDate)) {
              targetDate = targetDate + DAY_MS;
            }
          } else {
            targetDate = new Date(targetDate).setHours(intervals[currentIntervalIdx].startHour, 0, 0, 0);
          }
          currentIntervalCount++;
        }
        
        // Créer l'objet cellule correspondant à la position sous la souris
        const cellUnderMouse = {
          employeeId: appointment.employeeId as number,
          date: targetDate
        };
        
        handleContextMenu && handleContextMenu(e, 'appointment', appointment, cellUnderMouse);
      }}
      onMouseDown={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        appointment-item rounded-xl text-sm shadow-md
        flex flex-shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap text-ellipsis
        transition-all z-20 h-11 group duration-200
        ${isDragging ? 'opacity-60 scale-95' : 'opacity-100'}
        ${source === 'calendar' && isSelected ? 'ring-3 ring-color' : ''}
        ${isAnyDragging ? 'opacity-50 pointer-events-none' : ''}
        ${source === 'calendar' ? 'absolute cursor-grab' : 'block'}
        hover:shadow-xl
        ${className || ''}
      `}
      title={event?.label}
      style={containerStyle}
    >
      {/* Handle de redimensionnement à gauche */}
      {source === 'calendar' && (
        <div
          className={`absolute top-0 h-full cursor-ew-resize z-30 ${
            isSmallAppointment || !hasSpaceForBothHandles 
              ? 'left-0 w-1/3 bg-transparent' 
              : '-left-1 w-3'
          }`}
          title={isSmallAppointment ? "Redimensionner (côté gauche)" : "Redimensionner"}
          onMouseDown={(e) => handleMouseDown(e, 'left')}
          style={{
            borderRadius: '4px 0 0 4px' 
          }}
        />
      )}

      
        {/* Affichage du tag - Style Onglet Dépliant Coloré */}
        {appointment.tag && (
          <AppointmentTag 
            tagName={appointment?.tag.name}
            color={appointmentColor}
            textColor={appointmentTextColor}
            isHovered={isHovered}
            isResizing={isResizingRight}
          />
        )}


      {/* Image éventuelle */}
      {event?.image ? (
        <img
          src={event?.image.image}
          alt="Icône"
          className="w-8 h-8 object-cover"
        />
      ): (
        <div className="w-8 h-8 flex items-center justify-center rounded-full">
        </div>
      )}
      <div className='flex flex-col min-w-0 flex-1'>
        {/* Titre du rendez-vous */}
        <span 
          className={`appointment-text flex-grow font-semibold truncate max-w-full transition-colors duration-200 ${appointment?.tag ? 'pr-5' : ''}`}
          style={{ 
            color: isHovered ? appointmentColor : `${appointmentTextColor || '#FFFFFF'}`
          }}
        >
          {event?.label}
        </span>
        
        {/* Ligne du bas : Chargé d'affaire + Tag */}
        <div className="flex items-center gap-2 text-xs truncate max-w-full">
          <span 
            className="truncate transition-colors duration-200"
            style={{ 
              color: isHovered ? `${appointmentColor}` : `${appointmentTextColor || '#FFFFFF'}`
            }}
          >
            {chargeeAffaire}
          </span>
          
        </div>
      </div>
    


      {/* Handle de redimensionnement à droite */}
      {source === 'calendar' && (
        <div
          className={`absolute top-0 h-full cursor-ew-resize z-30 ${
            isSmallAppointment || !hasSpaceForBothHandles 
              ? 'right-0 w-1/3 bg-transparent' 
              : '-right-1 w-3'
          }`}
          title={isSmallAppointment ? "Redimensionner (côté droit)" : "Redimensionner"}
          onMouseDown={(e) => handleMouseDown(e, 'right')}
          style={{
            borderRadius: '0 4px 4px 0'
          }}
        />
      )}
    </div>
  );
};

export default memo(AppointmentItem);