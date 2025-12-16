"use client";
import React, { useState, memo, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { format, addDays, addHours } from 'date-fns';

import { InfoBubble, AppointmentItem } from '@/app/calendrier/components/index';




import { Appointment, Item } from '../../types';
import {
  CELL_WIDTH, 
  CELL_HEIGHT, 
  DAY_INTERVALS, 
  HALF_DAY_INTERVALS,
  
} from '../../utils/constants';
import { getNextWorkedDay } from '../../utils/dates';
import { useSelectedCell } from '../../context/SelectedCellContext';
import { useSelectedAppointment } from '../../context/SelectedAppointmentContext';

/**
 * IntervalCell
 * Représente une demi-journée (matin/après-midi) pour un employé à une date donnée.
 * Gère le drag & drop, l'affichage des rendez-vous, les interactions et le style selon le contexte.
 *
 * Props :
 * - date : Date de la cellule
 * - employeeId : ID de l'employé
 * - intervalName : 'morning' | 'afternoon'
 * - intervalStart, intervalEnd : bornes de l'intervalle
 * - appointments : rendez-vous à afficher
 * - isCellActive, isWeekend, isFerie : états de la cellule
 * - isHoliday : fonction utilitaire pour les jours fériés
 * - onAppointmentMoved, onCellDoubleClick, onAppointmentDoubleClick, onExternalDragDrop : callbacks
 * - handleContextMenu : gestion du clic droit
 */


  


// Props du composant IntervalCell
interface IntervalCellProps {
  date: Date;
  employee: { id: number; name: string };
  intervalName: 'morning' | 'afternoon';
  intervalStart: Date;
  intervalEnd: Date;
  appointments: (Appointment & { top: number })[];
  events: Item[];
  isCellActive?: boolean;
  isWeekend: boolean;
  isFerie: boolean;
  isFullDay: boolean; // Indique si la cellule représente une journée complète
  RowHeight?: number; // Hauteur de la ligne pour l'employé, si nécessaire
  nonWorkingDates: Date[]; // Dates non travaillées (week-ends, fériés, etc.)
  isNonWorkingDay: boolean; // Indique si la cellule représente un jour non travaillé
  isMobile: boolean; // Indique si l'affichage est en mode mobile
  isDisplayWeekend?: boolean; // Indique si les week-ends sont visibles.
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu?: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
}

// Type pour le drag & drop
interface DragItem {
  id: number;
  type: 'appointment';
  title?: string;
  sourceType?: 'external';
  startDate: Date;
  endDate: Date;
  imageUrl: string;
  typeEvent: 'Chantier' | 'Absence' | 'Autre';
  dragOffset?: number;
}

/**
 * Composant IntervalCell
 * 
 * Affiche une cellule d'intervalle horaire dans un calendrier, gère les rendez-vous, le drag & drop,
 * la sélection, l'affichage d'une bulle d'information, et les interactions utilisateur (clic, double-clic, menu contextuel).
 * 
 * @param {Object} props - Propriétés du composant
 * @param {Date} props.date - Date de la cellule
 * @param {{ id: number; name: string }} [props.employee={ id: 0, name: '' }] - Employé associé à la cellule
 * @param {string} props.intervalName - Nom de l'intervalle (ex : 'morning', 'afternoon')
 * @param {Date} props.intervalStart - Date/heure de début de l'intervalle
 * @param {Date} props.intervalEnd - Date/heure de fin de l'intervalle
 * @param {Appointment[]} [props.appointments=[]] - Liste des rendez-vous dans la cellule
 * @param {boolean} [props.isCellActive=true] - Indique si la cellule est active (modifiable)
 * @param {boolean} props.isWeekend - Indique si la cellule correspond à un week-end
 * @param {boolean} props.isFerie - Indique si la cellule correspond à un jour férié
 * @param {boolean} props.isFullDay - Indique si la cellule couvre toute la journée
 * @param {number} props.RowHeight - Hauteur de la ligne (en pixels)
 * @param {Date[]} props.nonWorkingDates - Liste des dates non travaillées
 * @param {boolean} props.isNonWorkingDay - Indique si la cellule est un jour non travaillé
 * @param {boolean} props.isMobile - Indique si l'affichage est mobile
 * @param {boolean} props.isDisplayWeekend - Indique si les week-ends sont visibles.
 * @param {Function} props.onAppointmentMoved - Callback lors du déplacement d'un rendez-vous
 * @param {Function} props.onCellDoubleClick - Callback lors du double-clic sur la cellule
 * @param {Function} props.onAppointmentDoubleClick - Callback lors du double-clic sur un rendez-vous
 * @param {Function} props.onExternalDragDrop - Callback lors du drop d'un élément externe
 * @param {Function} props.handleContextMenu - Callback pour le menu contextuel
 * 
 * @returns {JSX.Element} Cellule d'intervalle horaire avec gestion des rendez-vous et interactions utilisateur
 * 
 * @example
 * <IntervalCell
 *   date={new Date()}
 *   employee={{ id: 1, name: 'John Doe' }}
 *   intervalName="morning"
 *   intervalStart={new Date()}
 *   intervalEnd={new Date()}
 *   appointments={[]}
 *   isCellActive={true}
 *   isWeekend={false}
 *   isFerie={false}
 *   isFullDay={false}
 *   RowHeight={40}
 *   isDisplayWeekend={false}
 *   nonWorkingDates={[]}
 *   isNonWorkingDay={false}
 *   isMobile={false}
 *   onAppointmentMoved={...}
 *   onCellDoubleClick={...}
 *   onAppointmentDoubleClick={...}
 *   onExternalDragDrop={...}
 *   handleContextMenu={...}
 * />
 * 
 * @remarks
 * - Utilise react-dnd pour le drag & drop.
 * - Affiche une bulle d'information temporaire au clic.
 * - Permet la création de rendez-vous par double-clic.
 * - Gère les jours non travaillés, week-ends et jours fériés.
 * 
 * @ligne
 * // Gestion de l'état local pour la bulle d'info et sa position
 * // Utilisation de useDrop pour gérer le drag & drop sur la cellule
 * // Calcul du style de fond selon l'état de drop et d'activité
 * // Gestion du clic sur la cellule pour afficher la bulle d'info
 * // Gestion du double-clic pour créer un rendez-vous
 * // Rendu JSX de la cellule, des rendez-vous et de la bulle d'info
 */


// Props du composant IntervalCellView (UI pure)
interface IntervalCellViewProps extends IntervalCellProps {
  isSelected: boolean;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { date: Date; employeeId: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
}

/**
 * Composant IntervalCellView (Composant de présentation pur)
 * Gère le rendu, le drag & drop et les interactions locales.
 * Ne consomme PAS de contexte directement pour éviter les re-renders inutiles.
 */
const IntervalCellView: React.FC<IntervalCellViewProps> = memo(({
  date,
  employee = { id: 0, name: '' },
  intervalName,
  intervalStart,
  intervalEnd,
  appointments = [],
  isCellActive = true,
  isWeekend,
  isFerie,
  isFullDay,
  RowHeight,
  events,
  nonWorkingDates,
  isNonWorkingDay,
  isMobile,
  isDisplayWeekend,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
  isSelected,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment
}) => {
  // État pour la bulle d'info (affichée au clic)
  const [showInfoBubble, setShowInfoBubble] = useState(false);
  const [bubbleContent, setBubbleContent] = useState('');
  const bubblePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cellRef = useRef<HTMLDivElement>(null);

  // Gestion du drop (drag & drop)
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['appointment', 'external-item'],
    drop: (item: DragItem, monitor) => {
      if (!isCellActive) {
        console.warn('Cell is not active, cannot drop item');
        return;
      }

      let targetDate = intervalStart;
      let targetInterval = intervalName;
      // Si on a dragOffset et width, on centre l'event sur la cellule cible
      if (item.dragOffset !== undefined) {
        // Largeur d'une cellule (en px)
        const intervalWidth = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
        // Décalage en nombre de cellules (arrondi)
        const cellOffset = Math.ceil(-item.dragOffset / intervalWidth); // +1 pour centrer sur la cellule
        
        console.log('cellOffset', cellOffset);
        

        targetDate = isFullDay 
        ? addDays(intervalStart, cellOffset) 
        : addHours(
          intervalStart, 
          cellOffset * HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour
        );
              
        // Décale la date cible
        targetDate = getNextWorkedDay(targetDate, isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS, nonWorkingDates);
      }

      
      // Si la cellule est un week-end ou férié, on place sur le prochain jour ouvré
      if (isWeekend || isFerie || isNonWorkingDay ) {        
        targetDate = getNextWorkedDay(date, isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS, nonWorkingDates);
        targetInterval = 'morning'; // Par défaut, matin du prochain jour ouvré
      }
      
      if (item.sourceType === 'external') {        
        // Création d'un rendez-vous depuis une source externe
        onExternalDragDrop(
          item.title || 'Nouveau rendez-vous', 
          targetDate, 
          targetInterval, 
          employee.id,
          item.imageUrl,
          item.typeEvent
        );
      } else {
        // Déplacement d'un rendez-vous existant
        const diff = item.endDate.getTime() - item.startDate.getTime(); // Durée du rendez-vous
        const newDate = new Date(targetDate.getTime() + diff);        
        onAppointmentMoved(item.id, targetDate, newDate, employee.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  

  
  // Affiche une bulle d'info au clic sur la cellule
  const handleCellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!isCellActive || isWeekend || !employee.id) return;
    onSelectCell({ date: intervalStart, employeeId: employee.id });
    onSelectAppointment(null);
    setBubbleContent(`Créneau du ${format(date, 'dd/MM')} ${!isFullDay ? (intervalName === 'morning' ? '- Matin' : '- Après-midi') : ''}`);
    setShowInfoBubble(true);
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    bubblePosition.current = {
      x: rect.left,
      y: rect.top
    };    
    setTimeout(() => setShowInfoBubble(false), 3000);
  };

  // Double-clic pour créer un rendez-vous
  const handleCellDoubleClick = () => {    
    onCellDoubleClick(intervalStart, employee.id, isFullDay ? 'day' : intervalName);
  };

   const setRefs = (node: HTMLDivElement | null) => {
    // Assigner à ta ref personnelle
    cellRef.current = node;
    
    // Assigner à la ref de react-dnd (drop)
    if (isCellActive && node) {
      drop(node);
    }
  };

  return (
    <div
      ref={setRefs}
      onClick={handleCellClick}
      onDoubleClick={() =>{  
        if (isCellActive && !!employee.id) handleCellDoubleClick();
      }}
      className={`
        relative flex-1 border-r
        ${!isCellActive && canDrop ? 'cursor-not-allowed' : ''} border-light
        ${canDrop ? 'cursor-pointer' : ''}
        flex flex-row items-start gap-1
        ${isSelected ? 'bg-blue-200' : ''}
        interval-cell
        `
      }
      style={{
        width: !isMobile ? CELL_WIDTH / 2 : undefined,
        height: Math.max(CELL_HEIGHT, RowHeight ?? CELL_HEIGHT),
        willChange: 'background-color, border-color',
      }}
      onContextMenu={(e) => {
        handleContextMenu && !isWeekend && !isFerie ? handleContextMenu(e, 'cell', undefined, { employeeId: employee.id, date: intervalStart }) 
        : e.preventDefault();
      }}
      suppressHydrationWarning={true} // Pour éviter les erreurs de rendu côté serveur
    >
        {isCellActive && appointments.map((app) => {
          const event = events.find(et => et.id === app.EventId);
          const chargeeAffaire = event && event.type === 'chantier' ? event.chargeAffaire : '';          
          return (
            <AppointmentItem
              key={app.id}
              chargeeAffaire={chargeeAffaire || ''}
              appointment={app}
              isFullDay={isFullDay}
              isDisplayWeekend={isDisplayWeekend}
              event={events.find(et => et.id === app.EventId) as Item}
              onDoubleClick={() => {
                onAppointmentDoubleClick(app)
              }}
              onResize={(id, newStartDate, newEndDate, resizeDirection) => {
                onAppointmentMoved(id, newStartDate, newEndDate, app.employeeId as number, resizeDirection);
              }}
              handleContextMenu={handleContextMenu ?? (() => {})}
              isMobile={isMobile}
               onClick={() => {
              if (!isMobile) {
                onSelectAppointment(app);
                onSelectCell(null);
              }
            }}
            isSelected={selectedAppointmentId === app.id}
            />
          )
        })}
      {/* Affichage de la bulle d'info si besoin */}
      {isCellActive && showInfoBubble && (
        <InfoBubble
          content={bubbleContent}
          position={bubblePosition.current}
          onClose={() => setShowInfoBubble(false)}
        />
      )}
    </div>
  );
});

/**
 * Composant IntervalCell (Container)
 * Connecte le composant de présentation au contexte global.
 */
const IntervalCell: React.FC<IntervalCellProps> = (props) => {
  const { selectedAppointment, setSelectedAppointment } = useSelectedAppointment();
  const { selectedCell, setSelectedCell } = useSelectedCell();
  
  // Calcul des états dérivés pour éviter de passer tout le contexte
  const isSelected = selectedCell?.date.getTime() === props.intervalStart.getTime() && 
                     selectedCell?.employeeId === props.employee.id;
  
  return (
    <IntervalCellView
      {...props}
      isSelected={isSelected}
      selectedAppointmentId={selectedAppointment?.id}
      onSelectCell={setSelectedCell}
      onSelectAppointment={setSelectedAppointment}
    />
  );
};

export default memo(IntervalCell);