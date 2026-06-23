/**
 * @fileoverview Hook useAppointmentResize - Gestion du redimensionnement des rendez-vous
 * 
 * Centralise toute la logique de resize (gauche/droite) avec gestion des événements souris
 * 
 * @hook useAppointmentResize
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { isWeekend } from 'date-fns';
import { CELL_WIDTH, DAY_MS, DAY_INTERVALS, HALF_DAY_INTERVALS } from '../../utils/constants';
import { HalfDayInterval } from '../../types';
import evenementService from '@/app/service/evenement.service';

interface UseAppointmentResizeParams {
  appointmentId: number;
  startDate: number;
  endDate: number;
  priority: number;
  isFullDay: boolean;
  isDisplayWeekend: boolean;
  onAppointmentResize?: (
    id: number, 
    newStart: number, 
    newEnd: number, 
    resizeDirection: 'left' | 'right', 
    priority: number
  ) => void;
}

interface UseAppointmentResizeReturn {
  isResizingLeft: boolean;
  isResizingRight: boolean;
  dragStart: number;
  dragEnd: number;
  handleMouseDown: (e: React.MouseEvent, handleType: 'left' | 'right') => void;
}

/**
 * Hook pour gérer le redimensionnement d'un rendez-vous
 * 
 * Gère les événements mousedown, mousemove, mouseup pour le resize
 * Calcule les nouvelles dates en fonction du déplacement de la souris
 * 
 * @param params - Paramètres du resize
 * @returns État et handlers pour le resize
 */
export const useAppointmentResize = ({
  appointmentId,
  startDate,
  endDate,
  priority,
  isFullDay,
  isDisplayWeekend,
  onAppointmentResize,
}: UseAppointmentResizeParams): UseAppointmentResizeReturn => {
  
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragStart, setDragStart] = useState<number>(startDate);
  const [dragEnd, setDragEnd] = useState<number>(endDate);
  
  const dragStartRef = useRef<number>(startDate);
  const dragEndRef = useRef<number>(endDate);
  const initialX = useRef(0);

  const INTERVAL_WIDTH = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;

  // Synchroniser les refs avec les props
  useEffect(() => {
    dragStartRef.current = startDate;
    setDragStart(startDate);
  }, [startDate]);

  useEffect(() => {
    dragEndRef.current = endDate;
    setDragEnd(endDate);
  }, [endDate]);

  /**
   * Ajoute/retire un certain nombre d'intervalles à une date
   * Gère les week-ends si nécessaire
   */
  const addInterval = useCallback((date: number, n: number, intervals: HalfDayInterval[]): number => {      
    let currentTs = date;
    let currentHour = new Date(currentTs).getHours();
    let idx = intervals.findIndex(interval => 
        currentHour >= interval.startHour && currentHour < interval.endHour
    );
    if (idx === -1) idx = 0;
    const step = n >= 0 ? 1 : -1;
    let remaining = Math.abs(n);

    while (remaining > 0) {
        idx += step;
        if (idx > 0 ) {
            idx = 0;
            currentTs += isFullDay ? DAY_MS : DAY_MS/2; 
        } else if (idx <= 0) {
            idx = intervals.length - 1;
            currentTs -= isFullDay ? DAY_MS : DAY_MS/2; 
        }
        if (!isDisplayWeekend) {
            while (isWeekend(currentTs)) {
                currentTs += (step * (isFullDay ? DAY_MS : DAY_MS/2));
            }
        }
        remaining--;
    }
    return currentTs;
  }, [isDisplayWeekend, isFullDay]);

  /**
   * Gère le début du resize
   */
  const handleMouseDown = useCallback((e: React.MouseEvent, handleType: 'left' | 'right') => {
    e.stopPropagation();

    evenementService.unlockEvenement(appointmentId).catch((err) => {
          console.error('Erreur lors du déverrouillage du rendez-vous:', err);
    });

    initialX.current = e.clientX;
    setDragStart(startDate);
    setDragEnd(endDate);
    
    if (handleType === 'left') {
      setIsResizingLeft(true);
    } else {
      setIsResizingRight(true);
    }
    
  }, [startDate, endDate]);

  /**
   * Gère le mouvement pendant le resize
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (!isResizingLeft && !isResizingRight) return;
    
    const currentDx = e.clientX - initialX.current;
    let intervalsMoved = Math.round(currentDx / INTERVAL_WIDTH);
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;

    if (isResizingLeft) {
      let newStartDate = addInterval(startDate, intervalsMoved, intervals);
      // Empêcher que le début dépasse la fin
      if (newStartDate > dragEndRef.current) {
        newStartDate = addInterval(dragEndRef.current, 0, intervals);
      }
      
      dragStartRef.current = newStartDate;
      setDragStart(newStartDate);
    }
    if (isResizingRight) {
      
      let newEndDate = addInterval(endDate, intervalsMoved, intervals);
      // Empêcher que la fin soit avant le début
      if (newEndDate < dragStartRef.current) {
        newEndDate = addInterval(dragStartRef.current, 1, intervals);
      }    
      dragEndRef.current = newEndDate;
      setDragEnd(newEndDate);
    }
  }, [isResizingLeft, isResizingRight, startDate, endDate, isFullDay, addInterval, INTERVAL_WIDTH]);

  /**
   * Gère la fin du resize
   */
  const handleMouseUp = useCallback(() => {
    if (isResizingRight && onAppointmentResize) {
      onAppointmentResize(
        appointmentId, 
        dragStartRef.current, 
        dragEndRef.current, 
        'right', 
        priority
      );
    }
    
    if (isResizingLeft && onAppointmentResize) {      
      onAppointmentResize(
        appointmentId, 
        dragStartRef.current, 
        dragEndRef.current, 
        'left', 
        priority
      );
    }
    
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, [isResizingLeft, isResizingRight, onAppointmentResize, appointmentId, priority]);

  /**
   * Attacher/détacher les événements souris
   */
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

  return {
    isResizingLeft,
    isResizingRight,
    dragStart,
    dragEnd,
    handleMouseDown,
  };
};
