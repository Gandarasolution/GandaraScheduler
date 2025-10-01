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
import React, { useState, useRef, memo, useEffect, useCallback, use } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import {Appointment, HalfDayInterval, Evenement } from '../types';
import { addDays, eachDayOfInterval, isWeekend } from 'date-fns';
import { CELL_WIDTH, HALF_DAY_INTERVALS, CELL_HEIGHT, DAY_INTERVALS } from '../utils/constants';
import { useSelectedAppointment } from '../context/SelectedAppointmentContext';
import { useSelectedCell } from '../context/SelectedCellContext';

/**
 * Interface définissant les propriétés du composant AppointmentItem
 * @interface AppointmentItemProps
 */
interface AppointmentItemProps {
  /** Rendez-vous à afficher avec position verticale */
  appointment: Appointment & { top: number };
  /** Indique si l'affichage est en mode journée complète */
  isFullDay: boolean;
  /** Indique si l'interface est en mode mobile */
  isMobile: boolean;
  /** Inclure les week-ends dans le calcul de durée (optionnel) */
  includeWeekend?: boolean;
  /** Type d'événement associé au rendez-vous */
  event: Evenement;
  /** Informations de l'employé assigné */
  employee: { id: number; name: string };
  /** Source d'appel du composant */
  source?: 'calendar' | 'demo';
  /** Callback appelé lors du double-clic */
  onDoubleClick: () => void;
  /** Callback appelé lors du redimensionnement */
  onResize: (id: number, newStart: Date, newEnd: Date, resizeDirection: 'left' | 'right') => void;
  /** Callback appelé lors du clic droit (menu contextuel) */
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
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
  employee,
  includeWeekend,
  source = 'calendar',
  onDoubleClick,
  onResize,
  handleContextMenu,
}) => {
  // États pour le redimensionnement et le drag & drop
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragStart, setDragStart] = useState<Date>(appointment.startDate);
  const [dragEnd, setDragEnd] = useState<Date>(appointment.endDate);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartRef = useRef<Date>(appointment.startDate);
  const dragEndRef = useRef<Date>(appointment.endDate);
  const initialX = useRef(0);
  
  // if (appointment.id > 10000) {
  //   console.log("appointment", appointment);
  //   console.log("event", event);
  // }

  // Contextes pour la sélection
  const { selectedCell, setSelectedCell } = useSelectedCell();
  const { selectedAppointment, setSelectedAppointment } = useSelectedAppointment();
  const isSelected = selectedAppointment?.id === appointment.id;

  // Largeur d'un intervalle selon le type de rendez-vous
  const INTERVAL_WIDTH = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
  // Durée d'un intervalle en millisecondes
  const INTERVAL_DURATION = isFullDay 
    ? (DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour) * 60 * 60 * 1000 
    : (HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour) * 60 * 60 * 1000;
    
  // Calcule le nombre d'intervalles (matin/après-midi) entre deux dates, en sautant les week-ends si besoin
  const getIntervalCount = useCallback((start: Date, end: Date) => {
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
    let count = 0;
    let current = new Date(start);
    const forward = end >= start;
    const compare = (a: Date, b: Date) => forward ? a < b : a > b;

    while (compare(current, end)) {
      if (includeWeekend || (!isWeekend(current))) {
        count++;
      }
      // Avance/recul d'un intervalle
      let idx = intervals.findIndex(interval =>
        current.getHours() >= interval.startHour && current.getHours() < interval.endHour
      );
      if (idx === -1) idx = 0;
      if (forward) {
        idx++;
        if (idx >= intervals.length) {
          idx = 0;
          current = addDays(current, 1);
          current.setHours(intervals[idx].startHour, 0, 0, 0);
        } else {
          current.setHours(intervals[idx].startHour, 0, 0, 0);
        }
      } else {
        idx--;
        if (idx < 0) {
          idx = intervals.length - 1;
          current = addDays(current, -1);
          current.setHours(intervals[idx].startHour, 0, 0, 0);
        } else {
          current.setHours(intervals[idx].startHour, 0, 0, 0);
        }
      }
    }
    return Math.max(1, count);
  }, [includeWeekend, isFullDay]);

  const intervalCount = getIntervalCount(dragStart, dragEnd);
  
  // Détection des petits rendez-vous (une seule case)
  const isSmallAppointment = intervalCount <= 1;
  const appointmentWidthPx = intervalCount * INTERVAL_WIDTH;
  const hasSpaceForBothHandles = appointmentWidthPx >= 60; // Minimum 60px pour avoir les deux handles

  // Largeur calculée du rendez-vous (responsive mobile/desktop)
  const calculatedWidth = isMobile 
    ? (intervalCount >= 2 && !isFullDay ? '200%' : '100%') 
    : `${intervalCount * INTERVAL_WIDTH}px`;

  // Drag & drop avec react-dnd
  const [{ isDragging }, drag] = useDrag({
    type: 'appointment',
    item: () => ({
      id: appointment.id,
      type: 'appointment',
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      dragOffset,
    }),
    canDrag: () => !isResizingLeft && !isResizingRight,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Savoir si un élément est en train d'être déplacé
  const isAnyDragging = useDragLayer((monitor) => monitor.isDragging());
  
  // Décalage horizontal du bloc (en px)
  const offsetIntervals = Math.floor((dragStart.getTime() - appointment.startDate.getTime()) / INTERVAL_DURATION);
  const offsetPx = offsetIntervals * INTERVAL_WIDTH;

  // Capture la position du clic dans le bloc (en px)
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
  }, []);

  // Met à jour la date de début lors du resize
  const setDragStartSafe = useCallback((date: Date) => {
    dragStartRef.current = date;
    setDragStart(date);
  }, []);
  // Met à jour la date de fin lors du resize
  const setDragEndSafe = useCallback((date: Date) => {
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
  const addInterval = useCallback((date: Date, n: number, intervals: HalfDayInterval[]): Date => {
    let next = new Date(date);
    let idx = intervals.findIndex(interval =>
      next.getHours() >= interval.startHour && next.getHours() < interval.endHour
    );
    if (idx === -1) idx = 0;
    let step = n >= 0 ? 1 : -1;
    let remaining = Math.abs(n);
    while (remaining > 0) {
      idx += step;
      if (idx >= intervals.length) {
        idx = 0;
        next = addDays(next, 1);
      } else if (idx < 0) {
        idx = intervals.length - 1;
        next = addDays(next, -1);
      }
      // Si on ne veut pas inclure les week-ends, saute samedi/dimanche
      if (!includeWeekend) {
        while (next.getDay() === 0 || next.getDay() === 6) {
          next = addDays(next, step);
        }
      }
      remaining--;
    }
    next.setHours(intervals[idx].startHour, 0, 0, 0);
    return next;
  }, [includeWeekend]);

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
    setDragStart(appointment.startDate);
    setDragEnd(appointment.endDate);
    if (handleType === 'left') setIsResizingLeft(true);
    else setIsResizingRight(true);
  }, [appointment.startDate, appointment.endDate]);

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

    const currentDx = e.clientX - initialX.current + (INTERVAL_WIDTH / 2);
    let intervalsMoved = Math.round(currentDx / INTERVAL_WIDTH);
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;

    if (isResizingLeft) {
      let newStartDate = addInterval(appointment.startDate, intervalsMoved, intervals);
      if (newStartDate >= dragEndRef.current) {
        newStartDate = addInterval(dragEndRef.current, -1, intervals);
      }
      setDragStartSafe(newStartDate);
    }
    if (isResizingRight) {
      let newEndDate = addInterval(appointment.endDate, intervalsMoved, intervals);
      if (newEndDate <= dragStartRef.current) {
        newEndDate = addInterval(dragStartRef.current, 1, intervals);
      }
      setDragEndSafe(newEndDate);
    }
  }, [isResizingLeft, isResizingRight, appointment.startDate, appointment.endDate, addInterval, setDragStartSafe, setDragEndSafe]);


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
    let newEndDate = dragEndRef.current;
    if (!includeWeekend && (appointment.endDate > dragEndRef.current || appointment.startDate < dragStartRef.current)) {
      const days = eachDayOfInterval({
        start: dragStartRef.current,
        end: addDays(dragEndRef.current, 1), // Inclut le dernier jour
      });
      // Nombre de jours qui sont un week-end (samedi ou dimanche)
      const intervalsPerDay = isFullDay ? DAY_INTERVALS.length : HALF_DAY_INTERVALS.length;
      const workedIntervals = (days.length) * intervalsPerDay;
      newEndDate = addInterval(dragStartRef.current, workedIntervals, isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS);      
    }
   
    if (isResizingRight) {
      onResize(appointment.id, dragStartRef.current, newEndDate, 'right');
    }
    if (isResizingLeft) {
      onResize(appointment.id, dragStartRef.current, newEndDate, 'left');
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
    setDragStartSafe(appointment.startDate);
    setDragEndSafe(appointment.endDate);
  }, [appointment.startDate, appointment.endDate, setDragStartSafe, setDragEndSafe]);
  
  const appointmentColor = event.color || '#1E40AF';
  const appointmentBorderColor = event.borderColor || '#1E40AF';
  const appointmentTextColor = event.textColor || '#FFFFFF';

  return (
    <div
      key={appointment.id}
      ref={(node) => { if (node && source === 'calendar') drag(node); }} // Référence pour le drag & drop
      onClick={(e) => {
        e.stopPropagation();
        if (!isMobile) {
          setSelectedAppointment(appointment);
          setSelectedCell(null);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (! isMobile) {
          onDoubleClick();
        }
      }}
      onContextMenu={(e) => {
        // Calculer la cellule sous la souris lors du clic droit
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        // Calculer l'intervalle sous la souris
        const intervalIndex = Math.floor(mouseX / INTERVAL_WIDTH);
        const totalIntervals = getIntervalCount(appointment.startDate, appointment.endDate);
        const clampedIntervalIndex = Math.max(0, Math.min(intervalIndex, totalIntervals - 1));
        
        // Calculer la date correspondant à cet intervalle
        const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
        let targetDate = new Date(appointment.startDate);
        let currentIntervalCount = 0;
        
        // Parcourir les intervalles depuis le début du RDV jusqu'à celui sous la souris
        while (currentIntervalCount < clampedIntervalIndex) {
          // Trouver l'intervalle actuel
          let currentIntervalIdx = intervals.findIndex(interval =>
            targetDate.getHours() >= interval.startHour && targetDate.getHours() < interval.endHour
          );
          if (currentIntervalIdx === -1) currentIntervalIdx = 0;
          
          // Passer à l'intervalle suivant
          currentIntervalIdx++;
          if (currentIntervalIdx >= intervals.length) {
            // Passer au jour suivant
            targetDate = addDays(targetDate, 1);
            targetDate.setHours(intervals[0].startHour, 0, 0, 0);
            
            // Vérifier si on doit ignorer les week-ends
            while (!includeWeekend && isWeekend(targetDate)) {
              targetDate = addDays(targetDate, 1);
            }
          } else {
            // Rester sur le même jour, changer l'heure
            targetDate.setHours(intervals[currentIntervalIdx].startHour, 0, 0, 0);
          }
          currentIntervalCount++;
        }
        
        // Créer l'objet cellule correspondant à la position sous la souris
        const cellUnderMouse = {
          employeeId: appointment.employeeId as number,
          date: new Date(targetDate)
        };
        
        handleContextMenu(e, 'appointment', appointment, cellUnderMouse);
      }}
      onMouseDown={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        appointment-item rounded-xl text-sm shadow-md
        flex flex-shrink-0 items-center gap-2 overflow-visible whitespace-nowrap text-ellipsis
        transition-all z-20 h-11 group duration-200
        ${isDragging ? 'opacity-60 scale-95' : 'opacity-100'}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${isAnyDragging ? 'opacity-50 pointer-events-none' : ''}
        ${source === 'calendar' ? 'absolute cursor-grab' : 'block'}
        hover:shadow-xl
      `}
      title={event.label}
      style={{
        width: source === 'demo' ? '100%' : calculatedWidth,
        height: `${CELL_HEIGHT + 4}px`,
        minWidth: `${INTERVAL_WIDTH}px`,
        pointerEvents: isDragging ? 'none' : 'auto',
        left: `${offsetPx}px`,
        willChange: 'width, left',
        top: `${(appointment.top * CELL_HEIGHT) + (2 * appointment.top)}px`,
        backgroundColor: isHovered ? 'white' : appointmentColor,
        border: `2px solid ${appointmentBorderColor}`,
        transition: 'all 0.2s ease-in-out',
      }}
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

      {/* Image éventuelle */}
      {event.image ? (
        <img
          src={event.image}
          alt="Icône"
          className="w-8 h-8 object-cover"
        />
      ): (
        <div className="w-8 h-8 flex items-center justify-center rounded-full">
        </div>
      )}
      <div className='flex flex-col min-w-0'>
        {/* Titre du rendez-vous */}
        <span 
          className="appointment-text flex-grow font-semibold truncate max-w-full transition-colors duration-200"
          style={{ 
            color: isHovered ? appointmentColor : `${appointmentTextColor || '#FFFFFF'}`
          }}
        >
          {event.label.length > 20 ? event.label.slice(0, 20) + '…' : event.label}
        </span>
        <span 
          className="appointment-subtext text-xs truncate max-w-full transition-colors duration-200"
          style={{ 
            color: isHovered ? `${appointmentColor}` : `${appointmentTextColor || '#FFFFFF'}`
          }}
        >
          {employee.name}
        </span>
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