"use client";
import React,{ useState, useRef, use, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Appointment } from '../types';
import { add, addDays, set } from 'date-fns';
import { CELL_WIDTH, HALF_DAY_INTERVALS} from '../pages/index'
import { off } from 'process';

interface AppointmentItemProps {
  appointment: Appointment;
  onClick: () => void;
  onResize: (id: number, newStart: Date, newEnd: Date) => void;
}

const AppointmentItem: React.FC<AppointmentItemProps> = ({ appointment, onClick, onResize }) => {

  const [{ isDragging }, drag] = useDrag({
    type: 'appointment',
    item: { 
      id: appointment.id, 
      type: 'appointment',
      startDate: appointment.startDate,
      endDate: appointment.endDate,
    },
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
   // Affichage en temps réel
  const intervalCount = getIntervalCount(dragStart, dragEnd);
  const calcultedWidth = intervalCount * INTERVAL_WIDTH;
  let offsetIntervals = Math.floor((dragStart.getTime() - appointment.startDate.getTime()) / HALF_DAY_DURATION);
  let offsetPx = offsetIntervals * INTERVAL_WIDTH;

  if (appointment.id === 1) {
    // console.log('diff', dragStart.getTime() - appointment.endDate.getTime());
    // console.log(dragStart, appointment.endDate);
  };

  // console.log(new Date(2025, 5, 24, 11, 0, 0, 0).getTime() - new Date(2025, 5, 24, 0, 0, 0, 0).getTime());
  // console.log(new Date(2025, 5, 23, 23, 0, 0, 0).getTime() - new Date(2025, 5, 24, 0, 0, 0, 0).getTime());
  
  
  
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
        else if (h === morning.startHour) {
          next.setHours(afternoon.startHour, 0, 0, 0); // matin -> après-midi
        }
        else if (h === afternoon.startHour) {
          next = addDays(next, 1); // Après-midi -> matin du lendemain
          next.setHours(morning.startHour, 0, 0, 0); // après-midi -> fin de l'après-midi
        }
        
      } else {        
        // Recule d'un intervalle
        if (h === morning.endHour) {
          next = addDays(next, -1); // Matin -> après-midi du jour précédent
          next.setHours(afternoon.endHour, 0, 0, 0);
        } else if (h === afternoon.endHour) {
          next.setHours(morning.endHour, 0, 0, 0); // après-midi -> matin
        } 
        else if (h === afternoon.startHour) {
          next.setHours(morning.startHour, 0, 0, 0); // après-midi -> matin
        } else if (h === morning.startHour) {
          next = addDays(next, -1); // Matin -> après-midi du jour précédent
          next.setHours(afternoon.startHour, 0, 0, 0);
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
    e.preventDefault();
    if (!isResizingLeft && !isResizingRight) return;

    // Calcule la différence en pixels depuis le clic initial de la souris.
    const currentDx = e.clientX - initialX.current;

    // Détermine le nombre d'intervalles déplacés en fonction du déplacement total actuel.
    // Nous voulons calculer le déplacement total depuis le *début* de l'opération de redimensionnement.
    let intervalsMoved = Math.round(currentDx / INTERVAL_WIDTH);

    // Initialise les nouvelles dates de début et de fin avec les valeurs actuelles des refs
    // pour que les calculs subséquents se basent sur l'état courant et non l'état initial.
    let newStartDate = dragStartRef.current;
    let newEndDate = dragEndRef.current;

    console.log(intervalsMoved);
    

    if (isResizingLeft) {      
        // Lors du redimensionnement à gauche, nous ajustons la date de début.
        // `intervalsMoved` sera négatif si le déplacement est vers la gauche, positif vers la droite.
        newStartDate = addInterval(appointment.startDate, intervalsMoved); // Baser sur la date de début originale
        
        // S'assurer que la nouvelle date de début ne dépasse pas la date de fin actuelle
        // moins une durée minimale pour éviter une durée nulle ou négative.
        // L'ajustement est de 1 intervalle pour assurer une durée minimale.
        console.log(newStartDate, dragEndRef.current);
        console.log(newStartDate >= dragEndRef.current);
        
        if (newStartDate >= dragEndRef.current) {
            newStartDate = addInterval(newStartDate, -1);
        }
        console.log('newStartDate', newStartDate);
        
        setDragStartSafe(newStartDate);
    }

    if (isResizingRight) {
        // Lors du redimensionnement à droite, nous ajustons la date de fin.
        // `intervalsMoved` sera positif si le déplacement est vers la droite, négatif vers la gauche.
        newEndDate = addInterval(appointment.endDate, intervalsMoved); // Baser sur la date de fin originale

        // S'assurer que la nouvelle date de fin ne précède pas la date de début actuelle
        // plus une durée minimale pour éviter une durée nulle ou négative.
        // L'ajustement est de 1 intervalle pour assurer une durée minimale.
        if (newEndDate <= dragStartRef.current) {
            newEndDate = addInterval(newEndDate, 1);
        }
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

 

  return (
    <div
      ref={(node) => {
        if (node) drag(node);
      }}
      onClick={onClick}
      className={`
        relative bg-green-100 border border-green-500 rounded p-1 text-sm
        flex flex-shrink-0 items-center gap-1 overflow-x-hidden whitespace-nowrap text-ellipsis
        cursor-grab transition-opacity duration-100 w-24 h-10 z-10 transition-[width, left]
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
      title={appointment.title}
      style={{
        width: `${calcultedWidth}px`,
        minWidth: `${INTERVAL_WIDTH}px`,
        pointerEvents: isDragging ? 'none' : 'auto',
        left: `${offsetPx}px`, 
        position: 'absolute',
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