"use client";
import React, { useState, useRef, memo, useEffect, useCallback } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import { Appointment, HalfDayInterval } from '../types';
import { addDays } from 'date-fns';
import { CELL_WIDTH, HALF_DAY_INTERVALS, CELL_HEIGHT, DAY_INTERVALS } from '../utils/constants';
import { useSelectedAppointment } from '../context/SelectedAppointmentContext';
import { useSelectedCell } from '../context/SelectedCellContext';

interface AppointmentItemProps {
  appointment: Appointment & { top: number };
  isFullDay: boolean;
  isMobile: boolean;
  onDoubleClick: () => void;
  onResize: (id: number, newStart: Date, newEnd: Date, resizeDirection: 'left' | 'right') => void;
  color?: string;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null) => void;
}

/**
 * Composant React représentant un rendez-vous (Appointment) dans une vue calendrier.
 * 
 * Ce composant gère l'affichage, le redimensionnement (resize) et le déplacement (drag & drop)
 * d'un rendez-vous sur une grille horaire, en prenant en compte les différents types d'intervalles
 * (journée entière, demi-journée), la responsivité mobile/desktop, et la sélection/context menu.
 * 
 * Fonctionnalités principales :
 * - Affichage du rendez-vous avec couleur, titre, et image optionnelle.
 * - Redimensionnement du rendez-vous à gauche ou à droite via des poignées (handles).
 * - Déplacement du rendez-vous via drag & drop (intégration react-dnd).
 * - Sélection du rendez-vous et gestion du contexte (clic, double-clic, menu contextuel).
 * - Calcul dynamique de la largeur et de la position selon la durée et le type d'intervalle.
 * - Prise en charge du mode mobile (largeur adaptée).
 * 
 * Props :
 * @param {AppointmentItemProps} props - Propriétés du composant.
 * @param {Appointment} props.appointment - Données du rendez-vous à afficher.
 * @param {string} props.color - Couleur de fond du rendez-vous.
 * @param {boolean} props.isFullDay - Indique si le rendez-vous occupe la journée entière.
 * @param {boolean} props.isMobile - Indique si l'affichage est en mode mobile.
 * @param {() => void} props.onDoubleClick - Callback lors d'un double-clic sur le rendez-vous.
 * @param {(id: string, newStart: Date, newEnd: Date, direction: 'left' | 'right') => void} props.onResize - Callback lors du redimensionnement.
 * @param {(e: React.MouseEvent, type: 'appointment', appointment: Appointment) => void} props.handleContextMenu - Callback pour le menu contextuel.
 * 
 * Hooks/Context utilisés :
 * - useSelectedCell : Gestion de la sélection de cellule dans la grille.
 * - useSelectedAppointment : Gestion de la sélection du rendez-vous courant.
 * - useDrag, useDragLayer (react-dnd) : Gestion du drag & drop.
 * 
 * @returns {JSX.Element} Élément JSX représentant le rendez-vous interactif.
 */
const AppointmentItem: React.FC<AppointmentItemProps> = ({
  appointment,
  color,
  isFullDay,
  isMobile,
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
  const dragStartRef = useRef<Date>(appointment.startDate);
  const dragEndRef = useRef<Date>(appointment.endDate);
  const initialX = useRef(0);

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
    
  // Calcule le nombre d'intervalles (matin/après-midi) entre deux dates
  const getIntervalCount = useCallback((start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / INTERVAL_DURATION));
  }, []);
  const intervalCount = getIntervalCount(dragStart, dragEnd);

  // Largeur calculée du rendez-vous (responsive mobile/desktop)
  const calculatedWidth = isMobile ? (intervalCount >= 2 && !isFullDay ? '200%' : '100%') : `${intervalCount * INTERVAL_WIDTH}px`;

  // Drag & drop avec react-dnd
  const [{ isDragging }, drag] = useDrag({
    type: 'appointment',
    item: () => ({
      id: appointment.id,
      type: 'appointment',
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      dragOffset,
      width: calculatedWidth,
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
  const addInterval = useCallback((date: Date, n: number, intervals: HalfDayInterval[]): Date => {
    let next = new Date(date);
    // Trouve l'index de l'intervalle courant
    let idx = intervals.findIndex(interval =>
      next.getHours() >= interval.startHour && next.getHours() < interval.endHour
    );
    if (idx === -1) idx = 0; // fallback

    for (let i = 0; i < Math.abs(n); i++) {
      if (n > 0) {
        idx++;
        if (idx >= intervals.length) {
          idx = 0;
          next = addDays(next, 1);
        }
      } else {
        idx--;
        if (idx < 0) {
          idx = intervals.length - 1;
          next = addDays(next, -1);
        }
      }
    }
    // Positionne l'heure au début de l'intervalle cible
    next.setHours(intervals[idx].startHour, 0, 0, 0);
    return next;
  }, []);

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

  // Gère le déplacement de la souris lors du redimensionnement
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
    e.preventDefault(); // Empêche le comportement par défaut du navigateur
    if (!isResizingLeft && !isResizingRight) return; // Ne fait rien si aucun redimensionnement n'est actif

    // Calcule le déplacement horizontal de la souris depuis le début du redimensionnement
    const currentDx = e.clientX - initialX.current + (INTERVAL_WIDTH / 2);

    // Calcule le nombre d'intervalles (cellules) parcourus
    let intervalsMoved = Math.round(currentDx / INTERVAL_WIDTH);

    // Dates temporaires pour le calcul
    let newStartDate = dragStartRef.current;
    let newEndDate = dragEndRef.current;

    // Choisit le bon tableau d'intervalles selon le type de rendez-vous
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;

    // Si on redimensionne à gauche
    if (isResizingLeft) {
      // Calcule la nouvelle date de début
      newStartDate = addInterval(appointment.startDate, intervalsMoved, intervals);
      // Empêche la date de début de dépasser la date de fin
      if (newStartDate >= dragEndRef.current) {
        newStartDate = addInterval(dragEndRef.current, -1, intervals);
      }
      setDragStartSafe(newStartDate); // Met à jour la date de début
    }
    // Si on redimensionne à droite
    if (isResizingRight) {
      // Calcule la nouvelle date de fin
      newEndDate = addInterval(appointment.endDate, intervalsMoved, intervals);
      // Empêche la date de fin de précéder la date de début
      if (newEndDate <= dragStartRef.current) {
        newEndDate = addInterval(dragStartRef.current, 1, intervals);
      }
      setDragEndSafe(newEndDate); // Met à jour la date de fin
    }
  }, [isResizingLeft, isResizingRight, appointment.startDate, appointment.endDate, addInterval, setDragStartSafe, setDragEndSafe]);


  // Lorsqu'on relâche la souris après un resize
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
      onResize(appointment.id, dragStartRef.current, dragEndRef.current, 'right');
    }
    if (isResizingLeft) {
      onResize(appointment.id, dragStartRef.current, dragEndRef.current, 'left');
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
  
  return (
    <div
      key={appointment.id}
      ref={(node) => { if (node) drag(node); }} // Référence pour le drag & drop
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
      onContextMenu={(e) => handleContextMenu(e, 'appointment', appointment)}
      className={`
        ${color}
        absolute rounded p-1 text-sm
        flex flex-shrink-0 items-center gap-1 overflow-x-hidden whitespace-nowrap text-ellipsis
        cursor-grab transition-opacity z-10 h-10
        border-l border-transparent
        ${isDragging ? 'opacity-50 ' : 'opacity-100'}
        ${isSelected ? `ring-2` : ''}
        ${isAnyDragging ? 'opacity-50 pointer-events-none' : ''}
      `}
      title={appointment.title}
      style={{
        width: calculatedWidth,
        height: `${CELL_HEIGHT}px`,
        minWidth: `${INTERVAL_WIDTH}px`,
        pointerEvents: isDragging ? 'none' : 'auto',
        left: `${offsetPx}px`,
        willChange: 'width, left',
        top: `${(appointment.top * CELL_HEIGHT) + (2 * appointment.top)}px`, // Position verticale basée sur le top calculé
      }}
      onMouseDown={handleDragStart}
    >
      {/* Handle de redimensionnement à gauche */}
      <div
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
        title="Redimensionner"
        onMouseDown={(e) => handleMouseDown(e, 'left')}
      />
      {/* Image éventuelle */}
      {appointment.imageUrl && (
        <img
          src={appointment.imageUrl}
          alt="Icône"
          className="w-5 h-5 rounded-full object-cover"
        />
      )}
      {/* Titre du rendez-vous */}
      <span className="flex-grow text-gray-800 overflow-hidden">{appointment.title}</span>
      {/* Handle de redimensionnement à droite */}
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
        title="Redimensionner"
        onMouseDown={(e) => handleMouseDown(e, 'right')}
      />
    </div>
  );
};

export default memo(AppointmentItem);