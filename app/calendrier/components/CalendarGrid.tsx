"use client";
import React, {useState, useMemo, memo}from 'react';
import {
  format,
  isSameDay,
  isWeekend,
} from 'date-fns';
import DayCell from './DayCell'; // Cellule individuelle du calendrier
import { Appointment, Employee, HalfDayInterval, Groupe } from '../types';
import { fr } from 'date-fns/locale';
import {EMPLOYEE_COLUMN_WIDTH, CELL_WIDTH, CELL_HEIGHT, sizeCell, TEAM_HEADER_HEIGHT} from '../pages/index'; // Constantes de style

interface CalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  initialTeams: Groupe[];
  dayInTimeline: Date[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number) => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon") => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number) => void;
  createAppointment: (title: string, startDate: Date, endDate: Date, employeeId: number, imageUrl?: string) => void;
}

// Grille principale du calendrier, affiche les équipes, employés, jours et rendez-vous
const CalendarGrid: React.FC<CalendarGridProps> = ({
  employees,
  appointments,
  initialTeams,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentClick,
  onExternalDragDrop,
  createAppointment
}) => {
 
  // État pour gérer les équipes ouvertes (affichées)
  const [openTeams, setOpenTeams] = useState<number[]>(initialTeams.map(team => team.id));
  // Trouve l'index du jour courant dans la timeline
  const todayIndex = dayInTimeline.findIndex(day => 
    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  // Regroupe les employés par équipe
  const employeesByTeam = useMemo(() => 
    initialTeams.map(team => ({
      ...team,
      employees: employees.filter(emp => emp.groupId === team.id)
    })
  ), [employees, initialTeams]);
  
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

  return (
    <div className="relative h-full w-full">
      {/* Grille principale */}
      <div
        className="grid bg-white relative"
        style={{
          // Colonnes : 1 pour l'employé, puis X pour les jours
          gridTemplateColumns: `${EMPLOYEE_COLUMN_WIDTH} repeat(${dayInTimeline.length}, ${CELL_WIDTH}px)`,
          // Lignes : 1 pour l'en-tête, puis X pour chaque employé
          gridTemplateRows: `auto repeat(${employees.length}, minmax(${CELL_HEIGHT}px, auto))`,
          width: `calc(${EMPLOYEE_COLUMN_WIDTH} + ${dayInTimeline.length} * ${CELL_WIDTH}px)`,
          minHeight: `calc(auto + ${employees.length} * ${CELL_HEIGHT}px)`,
        }}
      >
        {/* Ligne rouge verticale pour la date du jour */}
        {todayIndex !== -1 && (
          <div
            style={{
              position: 'absolute',
              left: `calc(${EMPLOYEE_COLUMN_WIDTH} + ${todayIndex + 0.5} * ${CELL_WIDTH}px)`,
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
        <div className={`sticky top-0 left-0 z-30 bg-gray-200 border-b border-r border-gray-300 w-[${EMPLOYEE_COLUMN_WIDTH}]`}></div>

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
            <span className="block text-xs text-gray-500">{format(day, 'yyyy', { locale: fr })}</span>
          </div>
        ))}

        {/* Pour chaque équipe */}
        {employeesByTeam.map((team) => (
          <React.Fragment key={team.id} >
            {/* Ligne d'en-tête de l'équipe */}
            <React.Fragment key={team.id}>
              <div 
                className={`${sizeCell} sticky left-0 z-20 border-r border-gray-200 bg-gray-50 flex flex-row items-center justify-center flex-shrink-0 border-b border-gray-200 cursor-pointer`}
                onClick={() => toggleTeam(team.id)}
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
                    onAppointmentClick={onAppointmentClick}
                    onExternalDragDrop={onExternalDragDrop}
                    isWeekend={isWeekend(day)}
                  />
                );
              })}
            </React.Fragment>
            {/* Pour chaque employé de l'équipe (si l'équipe est ouverte) */}
            {openTeams.includes(team.id) && (
              team.employees.map((employee) =>(
                <React.Fragment key={employee.id}>
                  {/* Colonne de l'employé (fixe à gauche) */}
                  <div className={`${sizeCell} sticky left-0 z-20 p-2 border-r border-gray-200 bg-gray-50 flex flex-row items-center justify-center flex-shrink-0 border-b border-gray-200`}>
                    {employee.avatarUrl && (
                      <img src={employee.avatarUrl} alt={employee.name} className="w-10 h-10 rounded-full mb-1 mr-2" />
                    )}
                    <span className="font-semibold text-sm text-gray-800 text-center">{employee.name}</span>
                  </div>
                  {/* Cellules de jour pour cet employé */}
                  {dayInTimeline.map((day) => {
                    // Filtre les rendez-vous de cet employé pour ce jour
                    const dayEmployeeAppointments = appointments.filter((app) =>
                      isSameDay(app.startDate, day) && app.employeeId === employee.id
                    );
                    return (
                      <DayCell
                        key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
                        day={day}
                        employeeId={employee.id}
                        appointments={dayEmployeeAppointments}
                        intervals={HALF_DAY_INTERVALS}
                        onAppointmentMoved={onAppointmentMoved}
                        onCellDoubleClick={onCellDoubleClick}
                        onAppointmentClick={onAppointmentClick}
                        onExternalDragDrop={onExternalDragDrop}
                        isWeekend={isWeekend(day)}
                        createAppointment={createAppointment}
                      />
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default memo(CalendarGrid);