"use client";
import React,{ useState, useRef, use, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Appointment } from '../types';
import { addDays, set } from 'date-fns';
import { CELL_WIDTH, HALF_DAY_INTERVALS} from '../pages/index'

interface AppointmentItemProps {
  appointment: Appointment;
  onClick: () => void;
  onResize: (id: number, newStart: Date, newEnd: Date) => void;
}

const AppointmentItem: React.FC<AppointmentItemProps> = ({ appointment, onClick, onResize }) => {

  const [{ isDragging }, drag] = useDrag({
    type: 'appointment',
    item: { id: appointment.id, type: 'appointment' },
    canDrag(monitor) {
      // Empêche le glisser-déposer si le rendez-vous est en cours de redimensionnement
      return !isResizingLeft && !isResizingRight;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragStart, setDragStart] = useState<Date>(appointment.startDate);
  const [dragEnd, setDragEnd] = useState<Date>(appointment.endDate);
  const dragStartRef = useRef<Date>(appointment.startDate);
  const dragEndRef = useRef<Date>(appointment.endDate);
  const initialX = useRef(0);
  
  // Largeur d'une cellule (intervalle)
  const INTERVAL_WIDTH = CELL_WIDTH/2;
  const HALF_DAY_DURATION = 12 * 60 * 60 * 1000; // 12 heures en millisecondes


  // Nombre d'intervalles (matin/après-midi) entre start et end
  const getIntervalCount = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / HALF_DAY_DURATION)); // Au moins 1 intervalle
  };
  
  const setDragStartSafe = (date: Date) => {
    dragStartRef.current = date;
    setDragStart(date);
  };
  const setDragEndSafe = (date: Date) => {
    dragEndRef.current = date;
    setDragEnd(date);
  };

  function addInterval(date: Date, n: number) {

    const morning = HALF_DAY_INTERVALS[0];
    const afternoon = HALF_DAY_INTERVALS[1];

    let h;
    let next = new Date(date);
    for (let i = 0; i < Math.abs(n); i++) {
      h = next.getHours();
      if (n > 0) {
        // Avance d'un intervalle
        if (h === afternoon.endHour ) {
            next = addDays(next, 1); // Après-midi -> matin du lendemain
            next.setHours(morning.endHour, 0, 0, 0); // après-midi -> matin du lendemain  
        } 
        else if (h === morning.endHour) {          
          next.setHours(afternoon.endHour, 0, 0, 0); // matin -> après-midi
        }
        
      } else {
        // Recule d'un intervalle
        if (h === morning.startHour) {
          next = addDays(next, -1); // Matin -> après-midi du jour précédent
          next.setHours(afternoon.startHour, 0, 0, 0);
        } else if (h === afternoon.startHour) {
          next.setHours(morning.startHour, 0, 0, 0); // après-midi -> matin
        } 
      }
    }
    
    return next;
  }

  const handleMouseDown = (e: React.MouseEvent, handleType: 'left' | 'right') => {
     e.stopPropagation();
    initialX.current = e.clientX;
    setDragStart(appointment.startDate);
    setDragEnd(appointment.endDate);
    if (handleType === 'left') setIsResizingLeft(true);
    else setIsResizingRight(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingLeft && !isResizingRight) return;
    const dx = e.clientX - initialX.current;
    let intervalsMoved = Math.round(dx / INTERVAL_WIDTH);
    const initialStart = dragStartRef.current;
    const initialEnd = dragEndRef.current;

    // Pour éviter les petits déplacements involontaires
    if (Math.abs(dx) < INTERVAL_WIDTH / 2) intervalsMoved = 0;

    let newStartDate = initialStart;
    let newEndDate = initialEnd;


    if (isResizingLeft && intervalsMoved !== 0) {
      newStartDate = addInterval(initialStart, intervalsMoved);
      
      // Ne pas dépasser la fin
      if (newStartDate >= appointment.endDate) newStartDate = new Date(appointment.endDate.getTime() - 4 * 60 * 60 * 1000);
      setDragStartSafe(newStartDate);

    }
    if (isResizingRight && intervalsMoved !== 0) {      
      newEndDate = addInterval(appointment.endDate, intervalsMoved);
      
      // Ne pas précéder le début
      if (newEndDate <= appointment.startDate) newEndDate = new Date(appointment.startDate.getTime() + 4 * 60 * 60 * 1000);
      setDragEndSafe(newEndDate);
    }
  };

  const handleMouseUp = () => {
    if (dragStartRef.current && dragEndRef.current) {      
      onResize(appointment.id, dragStartRef.current, dragEndRef.current);
    }
    setIsResizingLeft(false);
    setIsResizingRight(false);
  };

   useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line
  }, [isResizingLeft, isResizingRight]);

  
  useEffect(() => {
    // Met à jour les dates de début et de fin en fonction des props
    setDragStartSafe(appointment.startDate);
    setDragEndSafe(appointment.endDate);
  }, [appointment.startDate, appointment.endDate]);

  // Affichage en temps réel
  const intervalCount = getIntervalCount(dragStart, dragEnd);
  const calcultedWidth = intervalCount * INTERVAL_WIDTH;

  return (
    <div
      ref={(node) => {
        if (node) drag(node);
      }}
      onClick={onClick}
      className={`
        relative bg-green-100 border border-green-500 rounded p-1 text-sm
        flex flex-shrink-0 items-center gap-1 overflow-x-hidden whitespace-nowrap text-ellipsis
        cursor-grab transition-opacity duration-100 w-24 h-10 z-10
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
      title={appointment.title}
      style={{
        width: `${calcultedWidth}px`,
        minWidth: `${INTERVAL_WIDTH}px`,
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-2 bg-green-400 cursor-ew-resize rounded-r opacity-0"
        style={{ zIndex: 10 }}
        title="Redimensionner"
        onMouseDown={(e) => handleMouseDown(e, 'left')}
      />
      {appointment.imageUrl && (
        <img
          src={appointment.imageUrl}
          alt="Icône"
          className="w-5 h-5 rounded-full object-cover"
        />
      )}
      <span className="flex-grow text-gray-800">{appointment.title}</span>
      {/* Handle de redimensionnement à droite */}
      <div
        className="absolute right-0 top-0 h-full w-2 bg-green-400 cursor-ew-resize rounded-r opacity-0"
        style={{ zIndex: 10 }}
        title="Redimensionner"
        onMouseDown={(e) => handleMouseDown(e, 'right')}
      />
    </div>
  );
};

export default AppointmentItem;