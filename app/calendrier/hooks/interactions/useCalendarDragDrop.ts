/**
 * @fileoverview Hook useCalendarDragDrop - Gestion du drag & drop du calendrier
 * 
 * Centralise la logique de drag & drop:
 * - Calcul de la position de drop (jour, intervalle, employé)
 * - Gestion des priorités lors du chevauchement
 * - Gestion des jours non travaillés
 * - Support des éléments externes
 * 
 * @hook useCalendarDragDrop
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { RefObject } from 'react';
import { useDrop } from 'react-dnd';
import { isSameDay, isWeekend } from 'date-fns';
import { Appointment, HalfDayInterval, Item } from '../../types';
import { CELL_WIDTH, CELL_HEIGHT, HOUR_MS, DAY_INTERVALS } from '../../utils/constants';
import { isHoliday, getNextWorkedDay } from '../../utils/dates';
import { RowWithBoundaries } from '@/app/calendrier';

interface DragItem {
  id: number;
  item?: Item;
  type: 'appointment';
  title?: string;
  sourceType?: 'external';
  startDate: number;
  endDate: number;
  imageUrl: string;
  typeEvent: 'Chantier' | 'Absence' | 'Autre';
  dragOffset?: number;
}

interface UseCalendarDragDropParams {
  tableRef: RefObject<HTMLDivElement | null>;
  rowBoundaries: RowWithBoundaries[];
  dayInTimeline: number[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  nonWorkingDates: number[];
  appointmentsWithTop: (Appointment & { top: number })[];
  onAppointmentMoved: (data: { id: number; newStartDate: number; newEndDate: number; newEmployeeId: number; item: Item; resizeDirection?: 'left' | 'right' }, saveToHistory?: boolean, newPriority?: number) => void;
  onExternalDragDrop: (item: Item, targetDate: number, targetInterval: 'morning' | 'afternoon', targetEmployeeId: number) => void;
}

/**
 * Hook pour gérer le drag & drop des rendez-vous
 * Retourne la référence à attacher à l'élément droppable
 */
export const useCalendarDragDrop = ({
  tableRef,
  rowBoundaries,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  appointmentsWithTop,
  onAppointmentMoved,
  onExternalDragDrop,
}: UseCalendarDragDropParams) => {

  const [, dropRef] = useDrop(() => ({
    accept: ['appointment', 'external-item'],
    drop: (item: DragItem, monitor) => {
      if (!tableRef.current || rowBoundaries.length === 0 || dayInTimeline.length === 0) return;
      
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const tableRect = tableRef.current.getBoundingClientRect();
      const relativeX = clientOffset.x - tableRect.left;
      const relativeY = clientOffset.y - tableRect.top;

      const totalHeight = rowBoundaries[rowBoundaries.length - 1]?.end ?? 0;
      if (relativeX < 0 || relativeY < 0 || relativeY > totalHeight) return;

      const intervalsPerDay = Math.max(1, HALF_DAY_INTERVALS.length);
      const intervalWidth = CELL_WIDTH / intervalsPerDay;
      const totalIntervals = dayInTimeline.length * intervalsPerDay;
      if (totalIntervals <= 0) return;

      const dragOffset = item.dragOffset ?? 0;
      const adjustedX = Math.min(
        Math.max(relativeX - (relativeX % intervalWidth) - (dragOffset - (dragOffset % intervalWidth)), 0),
        totalIntervals * intervalWidth - 1
      );

      const intervalIndex = Math.min(
        Math.max(Math.floor(adjustedX / intervalWidth), 0),
        totalIntervals - 1
      );

      const dayIndex = Math.min(Math.floor(intervalIndex / intervalsPerDay), dayInTimeline.length - 1);
      const intervalInDay = intervalIndex % intervalsPerDay;

      const targetRow = rowBoundaries.find((row) => relativeY >= row.start && relativeY < row.end);
      if (!targetRow || targetRow.type !== 'employee') return;

      const targetDayTs = dayInTimeline[dayIndex];
      
      const intervalConfig = HALF_DAY_INTERVALS[intervalInDay] ?? HALF_DAY_INTERVALS[0];
      let targetDate = targetDayTs + intervalConfig.startHour * HOUR_MS;
      let targetInterval: 'morning' | 'afternoon' = intervalConfig.name as 'morning' | 'afternoon';

      const weekend = isWeekend(targetDayTs);
      const holiday = isHoliday(targetDayTs);
      const isNonWorking = nonWorkingDates.some((date) => isSameDay(date, targetDayTs));

      if (weekend || holiday || isNonWorking) {
        targetDate = getNextWorkedDay(targetDate, isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS, nonWorkingDates);
        targetInterval = 'morning';
      }
      
      // Gestion des éléments externes
      if (item.sourceType === 'external') {
        const draggedItem = item.item;
        if (!draggedItem) return;

        onExternalDragDrop(
          draggedItem,
          targetDate,
          targetInterval,
          Number(targetRow.id),
        );
        return;
      }

      // Calcul de la durée et nouvelle fin
      const duration = item.endDate - item.startDate;
      const newEnd = targetDate + duration;
      const movedAppointment = appointmentsWithTop.find((a) => a.IdPlanningEvenement === item.id);
      
      // Gestion de la priorité : détecter sur quel rdv (position Y) l'utilisateur drop
      const targetEmployeeId = Number(targetRow.id);
      
      // Trouver tous les rdv qui chevauchent la nouvelle position
      const overlappingAppointments = appointmentsWithTop.filter(app => 
        app.IdPlanningEvenement !== item.id &&
        app.Employee.IdPersonnel === targetEmployeeId &&
        app.DebutPlanningEvenement < newEnd &&
        app.FinPlanningEvenement > targetDate
      );

      let newPriority: number | undefined = undefined;
      
      if (overlappingAppointments.length > 0) {
        // Calculer la position Y relative à la ligne de l'employé
        const employeeRowY = relativeY - (targetRow.start || 0);
        
        // Déterminer sur quel rdv (quelle rangée/top) l'utilisateur dépose
        const targetPriorityIndex = Math.floor(employeeRowY / (CELL_HEIGHT + 2));

        // Récupérer l'item d'origine
        const originalItem = appointmentsWithTop.find(a => a.IdPlanningEvenement === item.id);
        const isAlreadyPresent = originalItem && 
                               originalItem.Employee.IdPersonnel === targetEmployeeId && 
                               originalItem.DebutPlanningEvenement < newEnd && 
                               originalItem.FinPlanningEvenement > targetDate;

        // Trouver les rdv à la position cible
        const rdvAtTargetPosition = overlappingAppointments
          .sort((a, b) => (a.PlanningEvenementPriorite || 0) - (b.PlanningEvenementPriorite || 0))
          .filter(app => (app.PlanningEvenementPriorite ?? 0) === targetPriorityIndex);
          
        const startDateRdvTarget = rdvAtTargetPosition[0]?.DebutPlanningEvenement;
        const endDateRdvTarget = rdvAtTargetPosition[rdvAtTargetPosition.length - 1]?.FinPlanningEvenement;
        
        // Trouver les rdv à la position originale
        const rdvatOriginalPosition = appointmentsWithTop
          .filter(app =>
            app.IdPlanningEvenement !== item.id &&
            app.Employee.IdPersonnel === originalItem?.Employee.IdPersonnel &&
            app.DebutPlanningEvenement < endDateRdvTarget &&
            app.FinPlanningEvenement > startDateRdvTarget &&
            (app.PlanningEvenementPriorite ?? 0) === (originalItem?.PlanningEvenementPriorite ?? 0)
          );          
        
        if (isAlreadyPresent) {
          if (rdvAtTargetPosition.length > 0) {
            // Interchange des priorités
            newPriority = (rdvAtTargetPosition[0].PlanningEvenementPriorite ?? 0);
            
            rdvAtTargetPosition.forEach(appToMove => {
              onAppointmentMoved({
                id: appToMove.IdPlanningEvenement,
                newStartDate: appToMove.DebutPlanningEvenement,
                newEndDate: appToMove.FinPlanningEvenement,
                newEmployeeId: appToMove.Employee.IdPersonnel,
                item: appToMove.Ressource,
              }, false, (originalItem?.PlanningEvenementPriorite ?? 0));
            });

            if (rdvatOriginalPosition.length > 0) {
              rdvatOriginalPosition.forEach(appToAdjust => {
                if (appToAdjust.IdPlanningEvenement !== item.id) {
                  onAppointmentMoved({
                    id: appToAdjust.IdPlanningEvenement,
                    newStartDate: appToAdjust.DebutPlanningEvenement,
                    newEndDate: appToAdjust.FinPlanningEvenement,
                    newEmployeeId: appToAdjust.Employee.IdPersonnel,
                    item: appToAdjust.Ressource,
                  }, false, newPriority);
                } 
              });
            }
          } else {
            newPriority = targetPriorityIndex;
          }
        } else {
          if (rdvAtTargetPosition.length > 0) {
            newPriority = (rdvAtTargetPosition[0].PlanningEvenementPriorite ?? 0) + 1;
          } else {
            newPriority = targetPriorityIndex;
          }
        }
      }

      const droppedItem = item.item ?? movedAppointment?.Ressource;
      if (!droppedItem) return;

      onAppointmentMoved({
        id: item.id,
        newStartDate: targetDate,
        newEndDate: newEnd,
        newEmployeeId: targetEmployeeId,
        item: droppedItem,
        resizeDirection: 'right',
      }, true, newPriority);
    },
  }), [
    DAY_INTERVALS, 
    HALF_DAY_INTERVALS, 
    dayInTimeline, 
    isFullDay, 
    nonWorkingDates, 
    onAppointmentMoved, 
    onExternalDragDrop, 
    rowBoundaries, 
    appointmentsWithTop,
    tableRef
  ]);

  return dropRef;
};
