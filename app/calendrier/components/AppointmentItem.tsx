"use client";
import React,{ useState, useRef, use, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Appointment } from '../types';
import { addMinutes, differenceInMinutes, setMinutes, setHours } from 'date-fns';
import { CELL_WIDTH } from '../pages/index'
import { is } from 'date-fns/locale';

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
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const initialX = useRef(0);
  const initialStart = useRef<Date>(appointment.startDate);
  const initialEnd = useRef<Date>(appointment.endDate);
  
  // Largeur d'une cellule (intervalle)
  const INTERVAL_WIDTH = CELL_WIDTH/2;


  // Nombre d'intervalles (matin/après-midi) entre start et end
  const getIntervalCount = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    // 1 intervalle = 4h = 14400000 ms (ex: 8h-12h ou 13h-17h)
    return Math.max(1, Math.round(diff / (4 * 60 * 60 * 1000)));
  };
  

  function addInterval(date: Date, n: number) {
    
    const h = date.getHours();
    let next = new Date(date);
    for (let i = 0; i < Math.abs(n); i++) {
      if (n > 0) {
        // Avance d'un intervalle
        if (h >= 17 ) {
            next.setDate(next.getDate() + 1);
            next.setHours(9, 0, 0, 0); // après-midi -> matin du lendemain
        } 
        //Les intervalles sont 9-13 / 13-17
        else if (h >= 9 && h < 13) {
          next.setHours(13, 0, 0, 0); // matin -> après-midi
        }
        
      } else {
        // Recule d'un intervalle
        if (h < 9) {
          next.setDate(next.getDate() - 1);
          next.setHours(17, 0, 0, 0); // matin -> après-midi du jour précédent
        } else if (h >= 13 && h < 17) {
          next.setHours(9, 0, 0, 0); // après-midi -> matin
        } 
      }
    }
    
    return next;
  }

  const handleMouseDown = (e: React.MouseEvent, handleType: 'left' | 'right') => {
     e.stopPropagation();
    initialX.current = e.clientX;
    initialStart.current = appointment.startDate;
    initialEnd.current = appointment.endDate;
    setTempStart(appointment.startDate);
    setTempEnd(appointment.endDate);
    if (handleType === 'left') setIsResizingLeft(true);
    else setIsResizingRight(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingLeft && !isResizingRight) return;
    const dx = e.clientX - initialX.current;
    let intervalsMoved = Math.round(dx / INTERVAL_WIDTH);

    // Pour éviter les petits déplacements involontaires
    if (Math.abs(dx) < INTERVAL_WIDTH / 2) intervalsMoved = 0;

    let newStartDate = initialStart.current;
    let newEndDate = initialEnd.current;

    

    if (isResizingLeft && intervalsMoved !== 0) {
      newStartDate = addInterval(initialStart.current, intervalsMoved);
      
      // Ne pas dépasser la fin
      if (newStartDate >= appointment.endDate) newStartDate = new Date(appointment.endDate.getTime() - 4 * 60 * 60 * 1000);
      setTempStart(newStartDate);

    }
    if (isResizingRight && intervalsMoved !== 0) {
      newEndDate = addInterval(appointment.endDate, intervalsMoved);

      // console.log('intervalsMoved: ' + intervalsMoved);
      
      // console.log(`New End Date: ${newEndDate}`);
      // console.log(`Initial Start: ${appointment.endDate}`);
      

      //console.log(intervalCount, calcultedWidth);
      
      // Ne pas précéder le début
      if (newEndDate <= appointment.startDate) newEndDate = new Date(appointment.startDate.getTime() + 4 * 60 * 60 * 1000);
      setTempEnd(newEndDate);
    }
  };

  const handleMouseUp = () => {
    if (tempStart && tempEnd) {
      onResize(appointment.id, tempStart, tempEnd);
    }
    setIsResizingLeft(false);
    setIsResizingRight(false);
    setTempStart(null);
    setTempEnd(null);
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
  }, [isResizingLeft, isResizingRight, tempStart, tempEnd]);


   // Affichage en temps réel
  const start = tempStart ?? appointment.startDate;
  const end = tempEnd ?? appointment.endDate;

  console.log(`Start: ${start}, End: ${end}`);
  

  const intervalCount = getIntervalCount(start, end);

  console.log(intervalCount);
  

  const calcultedWidth = intervalCount * INTERVAL_WIDTH;
  console.log(`Interval Count: ${intervalCount}, Calculated Width: ${calcultedWidth}`);
  

  return (
    <div
      ref={(node) => {
        if (node) drag(node);
      }}
      onClick={onClick}
      className={`
        relative bg-green-100 border border-green-500 rounded p-1 text-sm
        flex flex-shrink-0 items-center gap-1 overflow-x-hidden whitespace-nowrap text-ellipsis
        cursor-grab transition-opacity duration-100 w-24 h-10 z-20
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
      title={appointment.title}
      style={{
        width: `${calcultedWidth}px`,
        minWidth: `${INTERVAL_WIDTH}px`,
        zIndex: isResizingLeft || isResizingRight ? 100 : 20,
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