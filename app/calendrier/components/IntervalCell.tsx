"use client";
import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { format } from 'date-fns';
import AppointmentItem from './AppointmentItem';
import InfoBubble from './InfoBubble';
import { Appointment } from '../types';
import { CELL_WIDTH } from '../pages/index'

interface IntervalCellProps {
  date: Date;
  employeeId: number; // Peut être null si la cellule n'est pas active ou pour un jour sans employé
  intervalName: 'morning' | 'afternoon';
  intervalStart: Date;
  intervalEnd: Date;
  appointments: Appointment[];
  isCellActive?: boolean; // Pour gérer l'état actif de la cellule si nécessaire
  isWeekend: boolean; // Pour appliquer des styles de week-end si besoin
  isHoliday: boolean; // Pour appliquer des styles de jour férié si besoin
  holidays: { date: string }[]; // Liste des jours fériés, si nécessaire
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number) => void;
  onCellDoubleClick: (date: Date, employeeId: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number) => void;
}

interface DragItem {
  id: number;
  type: 'appointment';
  title?: string;
  sourceType?: 'external';
}


function getNextWeekday(date: Date): Date {
  let next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6); // 0 = dimanche, 6 = samedi
  return next;
}

const IntervalCell: React.FC<IntervalCellProps> = ({
  date,
  employeeId = 0,
  intervalName,
  intervalStart,
  intervalEnd,
  appointments = [],
  isCellActive = true,
  isWeekend,
  isHoliday,
  holidays = [],
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentClick,
  onExternalDragDrop,
}) => {
  const [showInfoBubble, setShowInfoBubble] = useState(false);
  const [bubbleContent, setBubbleContent] = useState('');
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['appointment', 'external-item'],
    drop: (item: DragItem, monitor) => {
      if (!isCellActive) {
        console.warn('Cell is not active, cannot drop item');
        return;
      }

      let targetDate = date;
      let targetInterval = intervalName;

      if (isWeekend) {
        targetDate = getNextWeekday(date);
        targetInterval = 'morning'; // Par défaut, on place les rendez-vous le matin du jour suivant
      }

      if (isHoliday) {
        
      }

      
      if (item.sourceType === 'external') {
        onExternalDragDrop(item.title || 'Nouveau rendez-vous', targetDate, targetInterval, employeeId);
      } else {
        onAppointmentMoved(item.id, intervalStart, intervalEnd, employeeId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isCellActive && isOver && canDrop;
  let bgColor = '';
  if (isActive) {
    bgColor = 'bg-green-100';
  } else if (employeeId === 0) {
    bgColor = 'bg-gray-200'; // Cellule inactive sans employé
  }

  const handleCellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (appointments.length > 0) {
      setBubbleContent(appointments.map((app) => app.title).join(', '));
    } else {
      setBubbleContent(`Créneau du ${format(date, 'dd/MM')} - ${intervalName === 'morning' ? 'Matin' : 'Après-midi'}`);
    }

    setShowInfoBubble(true);
    setBubblePosition({ x: event.clientX, y: event.clientY });

    setTimeout(() => setShowInfoBubble(false), 3000);
  };

  const handleCellDoubleClick = () => {
    onCellDoubleClick(date, employeeId);
  };

  return (
    <div
      ref={
        isCellActive ? (node) => {
          if (node) drop(node);
        } : undefined
      }
      onClick={handleCellClick}
      onDoubleClick={isCellActive && employeeId ? handleCellDoubleClick : undefined}
      className={`relative flex-1 border-b ${isCellActive ? 'border-r' : ''} ${!isCellActive && canDrop ? 'cursor-not-allowed' : ''} border-gray-200  ${bgColor} ${canDrop ? 'cursor-pointer' : ''}
                  flex flex-row items-start gap-1`}
      style={{width: CELL_WIDTH/2}}
    >
      {isCellActive && appointments.map((app) => (
        <AppointmentItem
          key={app.id}
          appointment={app}
          onClick={() => onAppointmentClick(app)}
          onResize={(id,newStartDate, newEndDate) => {
            // Mets à jour l'event dans le state global
            onAppointmentMoved(id, newStartDate, newEndDate, app.employeeId as number);
        }}
        />
      ))}

      {isCellActive && showInfoBubble && (
        <InfoBubble
          content={bubbleContent}
          position={bubblePosition}
          onClose={() => setShowInfoBubble(false)}
        />
      )}
    </div>
  );
};

export default IntervalCell;