"use client";
import React,{ useState, useRef, memo, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Appointment } from '../types';
import { addDays} from 'date-fns';
import { CELL_WIDTH, HALF_DAY_INTERVALS} from '../pages/index'
import { useSelectedAppointment } from '../context/SelectedAppointmentContext';
import { useSelectedCell } from '../context/SelectedCellContext';

// Props du composant AppointmentItem
interface AppointmentItemProps {
  appointment: Appointment;
  onDoubleClick: () => void;
  onResize: (id: number, newStart: Date, newEnd: Date, resizeDirection: 'left' | 'right') => void;
  color?: string; // Couleur personnalisée
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null) => void; // Fonction pour gérer le clic droit
}

/**
 * Composant principal pour afficher et gérer un rendez-vous
 * Gère le drag & drop, le redimensionnement, l'affichage et la création fractionnée sur jours ouvrés.
 */
const AppointmentItem: React.FC<AppointmentItemProps> = ({ 
  appointment,
  color,
  onDoubleClick, 
  onResize, 
  handleContextMenu
}) => {
   // États pour le redimensionnement
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
  
  // Constantes pour le calcul de la largeur
  const INTERVAL_WIDTH = CELL_WIDTH/2;
  const HALF_DAY_DURATION = 12 * 60 * 60 * 1000; // 12h en ms

  // Calcule le nombre d'intervalles (matin/après-midi) entre deux dates
  const getIntervalCount = (start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / HALF_DAY_DURATION));
  };
  // Nombre d'intervalles pour l'affichage en temps réel
  const intervalCount = getIntervalCount(dragStart, dragEnd);
  const calcultedWidth = intervalCount * INTERVAL_WIDTH;

  // Gestion du drag & drop avec react-dnd
  const [{ isDragging }, drag] = useDrag({
    type: 'appointment',
    item: { 
      id: appointment.id, 
      type: 'appointment',
      startDate: appointment.startDate,
      endDate: appointment.endDate,
      dragOffset,
      width: calcultedWidth
    },
    canDrag(monitor) {
      // Empêche le drag si on est en train de redimensionner
      return !isResizingLeft && !isResizingRight;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Décalage horizontal du bloc (en px)
  let offsetIntervals = Math.floor((dragStart.getTime() - appointment.startDate.getTime()) / HALF_DAY_DURATION);
  let offsetPx = offsetIntervals * INTERVAL_WIDTH;

 
  
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    // Calcule la position du clic dans le bloc (en px)
    const rect = e.currentTarget.getBoundingClientRect();
    console.log(e.clientX - rect.left);
    
    setDragOffset(e.clientX - rect.left);
  };
  
  // Met à jour la date de début lors du resize
  const setDragStartSafe = (date: Date) => {
    dragStartRef.current = date;
    setDragStart(date);
  };
  // Met à jour la date de fin lors du resize
  const setDragEndSafe = (date: Date) => {
    dragEndRef.current = date;
    setDragEnd(date);
  };

  // Ajoute ou retire des intervalles (matin/après-midi) à une date
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

  // Débute le redimensionnement (gauche ou droite)
  const handleMouseDown = (e: React.MouseEvent, handleType: 'left' | 'right') => {
    e.stopPropagation();
    initialX.current = e.clientX;
    setDragStart(appointment.startDate);
    setDragEnd(appointment.endDate);
    if (handleType === 'left') setIsResizingLeft(true);
    else setIsResizingRight(true);
  };

  // Gère le déplacement de la souris lors du redimensionnement
  const handleMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    if (!isResizingLeft && !isResizingRight) return;

    // Calcule le déplacement en pixels
    const currentDx = e.clientX - initialX.current;
    let intervalsMoved = Math.round(currentDx / INTERVAL_WIDTH);

    // Calcule les nouvelles dates de début/fin
    let newStartDate = dragStartRef.current;
    let newEndDate = dragEndRef.current;    

    if (isResizingLeft) {
        newStartDate = addInterval(appointment.startDate, intervalsMoved);
        if (newStartDate >= dragEndRef.current) {
            newStartDate = addInterval(dragEndRef.current, -1);
        }
        setDragStartSafe(newStartDate);
    }

    if (isResizingRight) {
        newEndDate = addInterval(appointment.endDate, intervalsMoved);
        if (newEndDate <= dragStartRef.current) {
            newEndDate = addInterval(dragStartRef.current, 1);
        }
        setDragEndSafe(newEndDate);
    }
  };

  // Lorsqu'on relâche la souris après un resize
  const handleMouseUp = () => {    
    if (isResizingRight) {
      onResize(appointment.id, dragStartRef.current, dragEndRef.current, 'right');
    }
    if (isResizingLeft) {
      onResize(appointment.id, dragStartRef.current, dragEndRef.current, 'left');
    }
    setIsResizingLeft(false);
    setIsResizingRight(false);
  };

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
    // eslint-disable-next-line
  }, [isResizingLeft, isResizingRight, handleMouseMove]);

  // Met à jour les dates de drag si les props changent
  useEffect(() => {
    setDragStartSafe(appointment.startDate);
    setDragEndSafe(appointment.endDate);
  }, [appointment.startDate, appointment.endDate]);

  

  // Rendu du composant
  return (
    <>
      <div
        ref={(node) => {
          if (node) drag(node);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedAppointment(appointment);
          setSelectedCell(null)
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick()
        }}
        onContextMenu={(e) => handleContextMenu(e, 'appointment', appointment)}
        className={`
          ${color}
          relative rounded p-1 text-sm
          flex flex-shrink-0 items-center gap-1 overflow-x-hidden whitespace-nowrap text-ellipsis
          cursor-grab transition-opacity z-10 h-10
          border-l border-transparent border-r
          ${isDragging ? 'opacity-50' : 'opacity-100'}
          ${isSelected ? `ring-2` : ''}
        `}
        title={appointment.title}
        style={{
          width: `${calcultedWidth}px`,
          minWidth: `${INTERVAL_WIDTH}px`,
          pointerEvents: isDragging ? 'none' : 'auto',
          left: `${offsetPx}px`,
          willChange: 'width, left',
          }}
          onMouseDown={handleDragStart}
      >
        {/* Handle de redimensionnement à gauche */}
        <div
          className={`absolute left-0 top-0 h-full w-2 cursor-ew-resize`}
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
          className={`absolute right-0 top-0 h-full w-2 cursor-ew-resize`}
          title="Redimensionner"
          onMouseDown={(e) => handleMouseDown(e, 'right')}
        />
      </div>
    </>
  );
};

export default memo(AppointmentItem);