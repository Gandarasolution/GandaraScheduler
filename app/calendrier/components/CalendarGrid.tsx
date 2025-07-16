"use client";
import React, {useState, useMemo, memo, useCallback}from 'react';
import {
  format,
  isSameDay,
  isWeekend,
} from 'date-fns';
import DayCell from './DayCell'; // Cellule individuelle du calendrier
import { Appointment, Employee, HalfDayInterval, Groupe } from '../types';
import { fr } from 'date-fns/locale';
import {EMPLOYEE_COLUMN_WIDTH, CELL_WIDTH, CELL_HEIGHT} from '../utils/constants'; // Constantes de style
import { calendars } from '@/app/datasource';

interface CalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  initialTeams: Groupe[];
  dayInTimeline: Date[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean; // Indique si la cellule représente une journée complète
  selectedCalendarId: number; // ID du calendrier sélectionné, si applicable
  nonWorkingDates: Date[]; // Dates non travaillées (week-ends, fériés, etc.)
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void; // Fonction pour gérer le clic droit
}

// Grille principale du calendrier, affiche les équipes, employés, jours et rendez-vous
const CalendarGrid: React.FC<CalendarGridProps> = ({
  employees,
  appointments,
  initialTeams,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  selectedCalendarId,
  nonWorkingDates,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
}) => {

 
  // État pour gérer les équipes ouvertes (affichées)
  const [openTeams, setOpenTeams] = useState<number[]>(initialTeams.map(team => team.id));
  // Trouve l'index du jour courant dans la timeline
  const todayIndex = dayInTimeline.findIndex(day => 
    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  // Regroupe les employés par équipe
  const employeesByTeam = useMemo(() => {
    const teams = initialTeams.map(team => ({
      ...team,
      employees: employees.filter(emp => emp.groupId === team.id && emp.calendarId === selectedCalendarId)
    }));

    // Ajoute une "équipe" spéciale pour les employés sans team
    const noTeamEmployees = employees.filter(emp =>
      !emp.groupId || !initialTeams.some(team => team.id === emp.groupId)
    );
    if (noTeamEmployees.length > 0) {
      teams.push({
        id: -1,
        name: "Sans équipe",
        employees: noTeamEmployees,
      });
    }

    return teams.filter(team => team.employees.length > 0);
  }, [employees, initialTeams, selectedCalendarId]);
  
  
  // Ouvre/ferme une équipe dans la vue
  const toggleTeam = (teamId: number) => {
    setOpenTeams(open =>
      open.includes(teamId)
        ? open.filter(id => id !== teamId)
        : [...open, teamId]
    );
  };  

  // Calcule le numéro de semaine pour un jour donné
  const getWeekNumber = (d: Date) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const getMaxOverlaps = useCallback(
    (overlapping: Appointment[]) => {
    // Filtre les rendez-vous de l'employé qui touchent l'intervalle
    // Pour chaque rendez-vous, compte combien d'autres se chevauchent avec lui
    let maxOverlap = 0;
    for (let i = 0; i < overlapping.length; i++) {
      let overlapCount = 1;
      for (let j = i + 1; j < overlapping.length; j++) {
        if (i !== j &&
          overlapping[j].startDate < overlapping[i].endDate &&
          overlapping[j].endDate > overlapping[i].startDate
        ) {
          overlapCount++;
        }
      }
      if (overlapCount > maxOverlap) maxOverlap = overlapCount;
    }
    return Math.max(maxOverlap, 1);
  }, []);
  
  // Calcule la hauteur nécessaire pour chaque cellule employé/jour
  const employeeHeights = useMemo(() => 
    employees.map(employee => {
      const employeeAppointments = appointments.filter(app => app.employeeId === employee.id);
      const overlapping = getMaxOverlaps(employeeAppointments);
      return { employeeId: employee.id, height: (overlapping * CELL_HEIGHT) + (2 * overlapping) }; // +2 pour les marges
    }
  ), [employees, dayInTimeline, appointments, HALF_DAY_INTERVALS]);

  const assignAppointmentTops = useCallback((appointments: Appointment[]) => {
    // Résultat avec la propriété top
    const result: (Appointment & { top: number })[] = [];

    employees.forEach(emp => {
      // Trie les rendez-vous par date de début croissante
      const sorted = [...appointments]
        .filter(app => app.employeeId === emp.id)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      // Tableau des piles (slots)
      const slots: Appointment[][] = [];
      

      sorted.forEach(app => {
        let slotIndex = 0;
        // Cherche le premier slot libre (pas de chevauchement)
        while (
          slots[slotIndex] &&
          slots[slotIndex].some(other =>
            !(app.endDate <= other.startDate || app.startDate >= other.endDate)
          )
        ) {
          slotIndex++;
        }
        if (!slots[slotIndex]) slots[slotIndex] = [];
        slots[slotIndex].push(app);
        result.push({ ...app, top: slotIndex });
      });
    });    
    return result;
  },[]);

  // Calcule les tops uniquement entre les rendez-vous de cet employé
  const appointmentsWithTop = assignAppointmentTops(appointments);


  return (
    <div className="relative h-full w-full">
      {/* Grille principale */}
      <div
        className="grid bg-white relative"
        style={{
          // Colonnes : 1 pour l'employé, puis X pour les jours
          gridTemplateColumns: `${EMPLOYEE_COLUMN_WIDTH}px repeat(${dayInTimeline.length}, ${CELL_WIDTH}px)`,
          // Lignes : 1 pour l'en-tête, puis X pour chaque employé
          gridTemplateRows: `auto repeat(${employees.length}, minmax(${CELL_HEIGHT}px, auto))`,
          width: `calc(${EMPLOYEE_COLUMN_WIDTH}px + ${dayInTimeline.length} * ${CELL_WIDTH}px)`,
          minHeight: `calc(auto + ${employees.length} * ${CELL_HEIGHT}px)`,
        }}
      >
        {/* Ligne rouge verticale pour la date du jour */}
        {todayIndex !== -1 && (
          <div
            style={{
              position: 'absolute',
              left: `calc(${EMPLOYEE_COLUMN_WIDTH}px + ${todayIndex + 0.5} * ${CELL_WIDTH}px)`,
              top: 0,
              width: '2px',
              height: '100%',
              background: 'red',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Coin supérieur gauche vide (fixe) */}
        <div className={`sticky top-0 left-0 z-30 bg-gray-200 border-b border-r border-gray-300 w-[${EMPLOYEE_COLUMN_WIDTH}px]`}></div>

        {/* En-tête des jours (ligne du haut) */}
        {dayInTimeline.map((day, index) => (
          <div
            key={`header-day-${format(day, 'yyyy-MM-dd')}`}
            className={`flex flex-col-reverse justify-end sticky top-0 z-20 bg-gray-200 border-b border-r border-gray-300 text-center text-sm font-semibold text-gray-700 p-1 ${isWeekend(day) ? 'bg-gray-100' : ''}`}
          >
            {/* Affiche le numéro de semaine en début de semaine */}
            {day.getDay() === 1 && (
              <div className='bg-blue-400' style={{fontWeight: 'bold'}}>{getWeekNumber(day)}</div>
            )}
            <span className="block font-bold text-lg">{format(day, 'd', { locale: fr })}</span>
            <span className="block text-xs text-gray-500">{format(day, 'MMM', { locale: fr })}</span>
            {day.getDate() === 1 && <span className="block text-xs text-gray-500">{format(day, 'EEEE', { locale: fr })}</span>}
            <span className="block text-xs text-gray-500">{format(day, 'yyyy', { locale: fr })}</span>
          </div>
        ))}

        {/* Pour chaque équipe */}
        {employeesByTeam.map((team) => (
          <React.Fragment key={team.id} >
            {/* Ligne d'en-tête de l'équipe */}
            <React.Fragment key={team.id}>
              <div 
                className={`sticky left-0 z-20 border-r border-gray-200 bg-gray-50 flex flex-row items-center justify-center flex-shrink-0 border-b border-gray-200 cursor-pointer`}
                onClick={() => toggleTeam(team.id)}
                style={{ width: EMPLOYEE_COLUMN_WIDTH, height: CELL_HEIGHT }}
              >
                {/* Chevron pour ouvrir/fermer l'équipe */}
                <div className=" text-left p-2 font-bold">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    fill="currentColor" 
                    className={
                      `bi bi-chevron-right 
                      ${openTeams.includes(team.id) ? 'rotate-90' : ''}
                      transition-transform duration-200 ease-in-out
                      `
                    } 
                    viewBox="0 0 16 16"
                  >
                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
                  </svg>
                </div>
                <span className="font-semibold text-sm text-gray-800 text-center">{team.name}</span>
              </div>
              {/* Cellules vides pour l'équipe (ligne grisée) */}
              {dayInTimeline.map((day) => {
                return (
                  <DayCell
                    key={`${format(day, 'yyyy-MM-dd')}-${0}`}
                    day={day}
                    employeeId={0}
                    appointments={[]}
                    isCellActive={false}
                    intervals={HALF_DAY_INTERVALS}
                    onAppointmentMoved={onAppointmentMoved}
                    onCellDoubleClick={onCellDoubleClick}
                    onAppointmentClick={onAppointmentDoubleClick}
                    onExternalDragDrop={onExternalDragDrop}
                    isWeekend={isWeekend(day)}
                  />
                );
              })}
            </React.Fragment>
            {/* Pour chaque employé de l'équipe (si l'équipe est ouverte) */}
            {openTeams.includes(team.id) && (
              team.employees.map((employee) => {
                const rowHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;

                return (
                  <React.Fragment key={employee.id}>
                    {/* Colonne de l'employé (fixe à gauche) */}
                    <div 
                      className={`
                        sticky left-0 z-20 p-2 border-r border-gray-200 bg-gray-50 
                      flex flex-row items-center justify-center flex-shrink-0 border-b border-gray-200`
                    }
                    style={{ 
                      width: EMPLOYEE_COLUMN_WIDTH, 
                      height: Math.max(rowHeight, CELL_HEIGHT)
                    }}>
                    {employee.avatarUrl && (
                      <img 
                        src={employee.avatarUrl} 
                        alt={employee.name} 
                        className="w-8 h-8 rounded-full mb-1 mr-2"
                      />
                    )}
                    <span className="font-semibold text-sm text-gray-800 text-center">{employee.name}</span>
                  </div>
                  {/* Cellules de jour pour cet employé */}
                  {dayInTimeline.map((day) => {
                    const dayEmployeeAppointments = appointmentsWithTop.filter((app) =>
                      isSameDay(app.startDate, day) && app.employeeId === employee.id
                    );

    

                    return (
                      <DayCell
                        key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
                        day={day}
                        employeeId={employee.id}
                        appointments={dayEmployeeAppointments}
                        intervals={HALF_DAY_INTERVALS}
                        isFullDay={isFullDay}
                        RowHeight={rowHeight}
                        nonWorkingDates={nonWorkingDates}
                        onAppointmentMoved={onAppointmentMoved}
                        onCellDoubleClick={onCellDoubleClick}
                        onAppointmentClick={onAppointmentDoubleClick}
                        onExternalDragDrop={onExternalDragDrop}
                        isWeekend={isWeekend(day)}
                        handleContextMenu={handleContextMenu}
                      />
                    );
                  })}
                </React.Fragment>
              )})
            )}
          </React.Fragment>
        ))}
        
      </div>
    </div>
  );
};

export default memo(CalendarGrid);