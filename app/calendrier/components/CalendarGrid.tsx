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

interface CalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  initialTeams: Groupe[];
  dayInTimeline: Date[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean; // Indique si la cellule représente une journée complète
  selectedCalendarId: number; // ID du calendrier sélectionné, si applicable
  nonWorkingDates: Date[]; // Dates non travaillées (week-ends, fériés, etc.)
  isMobile: boolean;
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void; // Fonction pour gérer le clic droit
}

/**
 * Composant React CalendarGrid
 * 
 * Affiche une grille de calendrier pour visualiser les rendez-vous des employés, regroupés par équipe,
 * sur une période donnée (timeline de jours). Gère l'affichage mobile et desktop, l'empilement des rendez-vous
 * qui se chevauchent, l'ouverture/fermeture des équipes, et l'interaction utilisateur (drag & drop, double-clic, etc.).
 * 
 * @component
 * @param {CalendarGridProps} props - Propriétés du composant
 * @param {Employee[]} props.employees - Liste des employés à afficher
 * @param {Appointment[]} props.appointments - Liste des rendez-vous à afficher
 * @param {Team[]} props.initialTeams - Liste initiale des équipes
 * @param {Date[]} props.dayInTimeline - Liste des jours affichés dans la timeline
 * @param {number[]} props.HALF_DAY_INTERVALS - Intervalles de demi-journée pour la grille
 * @param {boolean} props.isFullDay - Indique si la vue est en journée complète
 * @param {number} props.selectedCalendarId - Identifiant du calendrier sélectionné
 * @param {Date[]} props.nonWorkingDates - Liste des jours non travaillés
 * @param {boolean} props.isMobile - Indique si l'affichage est mobile
 * @param {Function} props.onAppointmentMoved - Callback lors du déplacement d'un rendez-vous
 * @param {Function} props.onCellDoubleClick - Callback lors du double-clic sur une cellule
 * @param {Function} props.onAppointmentDoubleClick - Callback lors du double-clic sur un rendez-vous
 * @param {Function} props.onExternalDragDrop - Callback lors d'un drag & drop externe
 * @param {Function} props.handleContextMenu - Callback lors de l'ouverture du menu contextuel
 * 
 * @returns {JSX.Element} Grille de calendrier interactive
 */

const CalendarGrid: React.FC<CalendarGridProps> = ({
  employees,
  appointments,
  initialTeams,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  selectedCalendarId,
  nonWorkingDates,
  isMobile,
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

  /**
   * Regroupe les employés par équipe en fonction de leur `groupId` et du calendrier sélectionné.
   *
   * - Pour chaque équipe dans `initialTeams`, ajoute une propriété `employees` contenant
   *   les employés dont le `groupId` correspond à l'identifiant de l'équipe et dont le
   *   `calendarId` correspond à l'identifiant du calendrier sélectionné.
   * - Ajoute une équipe spéciale "Sans équipe" pour les employés qui n'ont pas de `groupId`
   *   ou dont le `groupId` ne correspond à aucune équipe existante.
   * - Retourne uniquement les équipes qui ont au moins un employé.
   *
   * @param employees La liste complète des employés.
   * @param initialTeams La liste initiale des équipes.
   * @param selectedCalendarId L'identifiant du calendrier sélectionné.
   * @returns Un tableau d'équipes, chacune contenant ses employés associés.
   */
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

  /**
   * Calcule le nombre maximal de rendez-vous qui se chevauchent dans une liste donnée.
   *
   * @param overlapping - Tableau de rendez-vous (`Appointment[]`) à analyser pour les chevauchements.
   * 
   * Fonctionnement :
   * - Pour chaque rendez-vous de la liste, compte combien d'autres rendez-vous se chevauchent avec lui.
   * - Initialise `maxOverlap` à 0 pour suivre le nombre maximal de chevauchements trouvés.
   * - Parcourt chaque rendez-vous (`i`) :
   *   - Initialise `overlapCount` à 1 (le rendez-vous lui-même compte).
   *   - Parcourt les rendez-vous suivants (`j`) :
   *     - Vérifie si le rendez-vous `j` chevauche le rendez-vous `i` :
   *       - `overlapping[j].startDate < overlapping[i].endDate` : le début de `j` est avant la fin de `i`
   *       - `overlapping[j].endDate > overlapping[i].startDate` : la fin de `j` est après le début de `i`
   *     - Si oui, incrémente `overlapCount`.
   *   - Met à jour `maxOverlap` si `overlapCount` est supérieur à la valeur actuelle.
   * - Retourne le nombre maximal de chevauchements trouvé (au moins 1).
   *
   * @returns Le nombre maximal de rendez-vous qui se chevauchent dans la liste (au minimum 1).
   */
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
  const employeeHeights = useMemo(() => {
    // useMemo mémorise le résultat pour éviter des recalculs inutiles si les dépendances ne changent pas
    if (isMobile) {
      // Si on est sur mobile, on veut calculer la hauteur pour chaque employé et chaque jour
      // On initialise un tableau pour stocker les hauteurs calculées
      const heights: { employeeId: number; dayKey: number; height: number }[] = [];

      employees.forEach(employee => {
        // Pour chaque employé

        dayInTimeline.forEach(day => {
          // Pour chaque jour de la période affichée

          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          // On définit le début de la journée (00:00:00.000)

          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          // On définit la fin de la journée (23:59:59.999)

          const employeeAppointments = appointments.filter(
            app =>
              app.employeeId === employee.id &&
              app.startDate < dayEnd &&
              app.endDate > dayStart
          );
          // On filtre les rendez-vous de l'employé qui chevauchent ce jour

          const overlapping = getMaxOverlaps(employeeAppointments);
          // On calcule le nombre maximum de rendez-vous qui se chevauchent ce jour-là

          heights.push({
            employeeId: employee.id,
            dayKey: dayStart.getTime(),
            height:
              overlapping === 0
                ? CELL_HEIGHT
                : overlapping * CELL_HEIGHT + 2 * overlapping + 10,
          });
          // On ajoute un objet avec l'id de l'employé, la clé du jour, et la hauteur calculée
          // Si aucun chevauchement : hauteur par défaut, sinon on ajuste selon le nombre de chevauchements
        });
      });

      return heights;
      // On retourne le tableau des hauteurs pour chaque employé et chaque jour

    } else {
      // Sinon (desktop), on calcule une hauteur globale par employé sur toute la période

      return employees.map(employee => {
        // Pour chaque employé

        const employeeAppointments = appointments.filter(app => app.employeeId === employee.id);
        // On récupère tous ses rendez-vous

        const overlapping = getMaxOverlaps(employeeAppointments);
        // On calcule le nombre maximum de rendez-vous qui se chevauchent sur toute la période

        if (overlapping === 0) return { employeeId: employee.id, height: CELL_HEIGHT };
        // Si aucun chevauchement, hauteur par défaut

        return { employeeId: employee.id, height: (overlapping * CELL_HEIGHT) + (2 * overlapping) + 10, dayKey: undefined };
        // Sinon, on ajuste la hauteur selon le nombre de chevauchements
      });
    }
  }, [employees, appointments, getMaxOverlaps, dayInTimeline, isMobile]);
  // Les dépendances : recalcul si l'une d'elles change

  
  /**
   * Attribue à chaque rendez-vous (`Appointment`) un indice de "pile" (`top`) pour l'affichage dans une grille de calendrier,
   * en tenant compte des chevauchements entre rendez-vous pour chaque employé.
   *
   * @param appointments - Liste des rendez-vous à traiter.
   * @param isMobile - Indique si l'affichage est en mode mobile (pile par jour) ou desktop (pile globale).
   * @param dayInTimeline - Tableau des dates représentant chaque jour affiché dans la timeline.
   * @returns Un tableau de rendez-vous enrichis avec la propriété `top` (indice de pile) et, en mode mobile, `_dayKey` (identifiant du jour).
   *
   * @remarks
   * - En mode mobile, les rendez-vous sont empilés par jour et par employé : pour chaque jour, on calcule les chevauchements et on attribue un indice de pile.
   * - En mode desktop, l'empilement est calculé globalement sur toute la période pour chaque employé.
   * - La propriété `top` permet de positionner verticalement les rendez-vous qui se chevauchent dans la grille.
   * - La propriété `_dayKey` (uniquement en mobile) permet d'identifier le jour associé à la pile.
   *
   * @example
   * // Utilisation pour afficher les rendez-vous dans une grille :
   * const appointmentsWithTop = assignAppointmentTops(appointments, isMobile, , days);
   */
  const assignAppointmentTops = useCallback((appointments: Appointment[], isMobile: boolean, dayInTimeline: Date[]) => {
    const result: (Appointment & { top: number, _dayKey?: number })[] = [];

    employees.forEach(emp => {
      if (isMobile) {
        // Pour chaque jour, on empile les RDV qui se chevauchent ce jour-là
        dayInTimeline.forEach(day => {
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);

          // RDV de l'employé qui touchent ce jour
          const dayAppointments = appointments
            .filter(app =>
              app.employeeId === emp.id &&
              app.startDate < dayEnd && app.endDate > dayStart
            )
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

          // Empilement par chevauchement sur la journée
          const slots: Appointment[][] = [];
          dayAppointments.forEach(app => {
            let slotIndex = 0;
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
            // On ajoute la propriété top spécifique à ce jour
            result.push({ ...app, top: slotIndex, _dayKey: dayStart.getTime() });
          });
        });
      } else {
        // Desktop : logique d'empilement globale sur toute la période
        const sorted = [...appointments]
          .filter(app => app.employeeId === emp.id)
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const slots: Appointment[][] = [];
        sorted.forEach(app => {
          let slotIndex = 0;
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
          result.push({ ...app, top: slotIndex});
        });
      }
    });
    return result;
  }, [employees]);

  // Calcule les tops uniquement entre les rendez-vous de cet employé
  const appointmentsWithTop = assignAppointmentTops(appointments, isMobile, dayInTimeline);
  
  if (isMobile) {
    const displayEmployee = employees[0];
    return (
      <div className="relative h-full w-full font-inter"> {/* Enable vertical scrolling */}
      {/* Employee Header (fixed at top) */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex items-center justify-center rounded-b-xl shadow-lg">
        {displayEmployee.avatarUrl && (
          <img
            src={displayEmployee.avatarUrl}
            alt={displayEmployee.name}
            className="w-14 h-14 rounded-full mr-4 border-3 border-white shadow-md"
            onError={(e) => { e.currentTarget.src = `https://placehold.co/56x56/cccccc/333333?text=${displayEmployee.name.charAt(0)}`; }}
          />
        )}
        <span className="font-extrabold text-2xl tracking-wide">{displayEmployee.name}</span>
      </div>

      {/* Main content area - vertical list of days */}
      <div className="flex flex-col w-full">
        {dayInTimeline.map((day, index) => {
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          const dayEmployeeAppointments = appointmentsWithTop.filter((app) =>
            app.employeeId === displayEmployee.id &&
            app._dayKey === dayStart.getTime()
          );

          const rowHeight = isMobile
            ? employeeHeights.find(e => e.employeeId === displayEmployee.id && e.dayKey === dayStart.getTime())?.height ?? CELL_HEIGHT
            : employeeHeights.find(e => e.employeeId === displayEmployee.id)?.height ?? CELL_HEIGHT;
          return (
            <div key={`day-section-${format(day, 'yyyy-MM-dd')}`} className="border-b border-gray-200">
              {/* Date Header for each day */}
              <div
                className={`
                  flex flex-col items-center justify-center p-3 bg-gray-100 border-b border-gray-300
                  ${isWeekend(day) ? 'bg-gray-50 text-gray-600' : 'text-gray-800'}
                  ${isSameDay(day, new Date()) ? 'bg-blue-100 font-bold text-blue-700 shadow-sm' : ''}
                `}
              >
                <span className="text-xl font-bold">{format(day, 'EEEE d MMMM', { locale: fr })}</span>
                {day.getDay() === 1 && ( // Display week number only on Mondays
                  <span className="text-sm text-gray-500 mt-1">Semaine {getWeekNumber(day)}</span>
                )}
              </div>

              {/* DayCell for the single employee */}
              <DayCell
                day={day}
                employeeId={displayEmployee.id}
                appointments={dayEmployeeAppointments}
                intervals={HALF_DAY_INTERVALS}
                isFullDay={isFullDay}
                nonWorkingDates={nonWorkingDates}
                isMobile={isMobile}
                RowHeight={dayEmployeeAppointments.length > 0 ? rowHeight : CELL_HEIGHT}
                onAppointmentMoved={onAppointmentMoved}
                onCellDoubleClick={onCellDoubleClick}
                onAppointmentClick={onAppointmentDoubleClick}
                onExternalDragDrop={onExternalDragDrop}
                isWeekend={isWeekend(day)}
                handleContextMenu={handleContextMenu}
                isCellActive={true} // Always active for the displayed employee
              />
            </div>
          );
        })}
      </div>
    </div>
    )
  }
  else{
    return (
      <div className="relative h-full w-full">
        {/* Grille principale */}
        <div
          className="grid bg-white relative calendar-grid"
          style={{
            // Colonnes : 1 pour l'employé, puis X pour les jours
            gridTemplateColumns: `${EMPLOYEE_COLUMN_WIDTH}px repeat(${dayInTimeline.length}, ${CELL_WIDTH}px)`,
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
          <div className={`sticky top-0 left-0 z-30 bg-gray-200 border-b border-r border-gray-300 w-[${EMPLOYEE_COLUMN_WIDTH}px] employee-column`}></div>

          {/* En-tête des jours (ligne du haut) */}
          {dayInTimeline.map((day, index) => (
            <div
              key={`header-day-${format(day, 'yyyy-MM-dd')}`}
              className={`
                flex flex-col-reverse justify-end sticky top-0 z-20 bg-gray-200 
                border-b border-r border-gray-300 text-center text-sm font-semibold text-gray-700 p-1 
                ${isWeekend(day) ? 'bg-gray-100' : ''}
                day-cell
                `}
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
                  className={`sticky left-0 z-20 border-r border-gray-200 bg-gray-50 flex flex-row items-center justify-center flex-shrink-0 border-b border-gray-200 cursor-pointer employee-column`}
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
                      isMobile={isMobile}
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
                          flex flex-row items-center justify-center flex-shrink-0 border-b border-gray-200
                          employee-column
                        `
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
                          isMobile={isMobile}
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
  }
};

export default memo(CalendarGrid);