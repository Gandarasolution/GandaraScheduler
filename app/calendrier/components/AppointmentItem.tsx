"use client";
import React, { useState, useRef, memo, useEffect, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { Appointment, HalfDayInterval } from '../types';
import { addDays } from 'date-fns';
import { CELL_WIDTH, HALF_DAY_INTERVALS, CELL_HEIGHT, DAY_INTERVALS } from '../utils/constants';
import { useSelectedAppointment } from '../context/SelectedAppointmentContext';
import { useSelectedCell } from '../context/SelectedCellContext';

interface AppointmentItemProps {
  appointment: Appointment & { top: number };
  isFullDay: boolean;
  onDoubleClick: () => void;
  onResize: (id: number, newStart: Date, newEnd: Date, resizeDirection: 'left' | 'right') => void;
  color?: string;
  
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null) => void;
}



const AppointmentItem: React.FC<AppointmentItemProps> = ({
  appointment,
  color,
  isFullDay,
  onDoubleClick,
  onResize,
  handleContextMenu,
}) => {
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragStart, setDragStart] = useState<Date>(appointment.startDate);
  const [dragEnd, setDragEnd] = useState<Date>(appointment.endDate);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const dragStartRef = useRef<Date>(appointment.startDate);
  const dragEndRef = useRef<Date>(appointment.endDate);
  const initialX = useRef(0);

  const { selectedCell, setSelectedCell } = useSelectedCell();
  const { selectedAppointment, setSelectedAppointment } = useSelectedAppointment();
  const isSelected = selectedAppointment?.id === appointment.id;

  const INTERVAL_WIDTH = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
  const INTERVAL_DURATION = isFullDay 
    ? (DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour) * 60 * 60 * 1000 
    : (HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour) * 60 * 60 * 1000;
    
  // Calcule le nombre d'intervalles (matin/après-midi) entre deux dates
  const getIntervalCount = useCallback((start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / INTERVAL_DURATION));
  }, []);
  const intervalCount = getIntervalCount(dragStart, dragEnd);
  const calculatedWidth = intervalCount * INTERVAL_WIDTH;

  // Drag & drop
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
  const handleMouseDown = useCallback((e: React.MouseEvent, handleType: 'left' | 'right') => {
    e.stopPropagation();
    initialX.current = e.clientX;
    setDragStart(appointment.startDate);
    setDragEnd(appointment.endDate);
    if (handleType === 'left') setIsResizingLeft(true);
    else setIsResizingRight(true);
  }, [appointment.startDate, appointment.endDate]);

  // Gère le déplacement de la souris lors du redimensionnement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (!isResizingLeft && !isResizingRight) return;
    const currentDx = e.clientX - initialX.current + (INTERVAL_WIDTH / 2);
    
    let intervalsMoved = Math.round(currentDx / INTERVAL_WIDTH);
    let newStartDate = dragStartRef.current;
    let newEndDate = dragEndRef.current;
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
    if (isResizingLeft) {
      newStartDate = addInterval(appointment.startDate, intervalsMoved, intervals);
      if (newStartDate >= dragEndRef.current) {
        newStartDate = addInterval(dragEndRef.current, -1, intervals);
      }
      setDragStartSafe(newStartDate);
    }
    if (isResizingRight) {
      newEndDate = addInterval(appointment.endDate, intervalsMoved, intervals);
      if (newEndDate <= dragStartRef.current) {
        newEndDate = addInterval(dragStartRef.current, 1, intervals);
      }
      setDragEndSafe(newEndDate);
    }
  }, [isResizingLeft, isResizingRight, appointment.startDate, appointment.endDate, addInterval, setDragStartSafe, setDragEndSafe]);

  // Lorsqu'on relâche la souris après un resize
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
      ref={(node) => { if (node) drag(node); }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedAppointment(appointment);
        setSelectedCell(null);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      onContextMenu={(e) => handleContextMenu(e, 'appointment', appointment)}
      className={`
        ${color}
        absolute rounded p-1 text-sm
        flex flex-shrink-0 items-center gap-1 overflow-x-hidden whitespace-nowrap text-ellipsis
        cursor-grab transition-opacity z-10 h-10
        border-l border-transparent
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isSelected ? `ring-2` : ''}
      `}
      title={appointment.title}
      style={{
        width: `${calculatedWidth}px`,
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