"use client";
import React, {useState, useMemo, memo, useCallback, useRef, useEffect}from 'react';
import {
  format,
  isSameDay,
  isWeekend,
  isToday,
} from 'date-fns';
import DayCell from './DayCell'; // Cellule individuelle du calendrier
import { Appointment, Employee, HalfDayInterval, Groupe, CalendarConfig, DimensionItem } from '../types';
import { fr } from 'date-fns/locale';
import {CELL_WIDTH, CELL_HEIGHT, MARGIN_BETWEEN_TEAMS} from '../utils/constants'; // Constantes de style
import { getDimensionItems, groupEmployeesByDimension, applyFiltersToEmployees } from '../utils/filters';

interface CalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  initialTeams: Groupe[];
  dayInTimeline: Date[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean; // Indique si la cellule représente une journée complète
  //selectedCalendarId: number; // ID du calendrier sélectionné, si applicable
  nonWorkingDates: Date[]; // Dates non travaillées (week-ends, fériés, etc.)
  isMobile: boolean;
  includeWeekend: boolean; // Indique si les week-ends doivent être inclus dans la vue mobile
  mainScrollRef: React.RefObject<HTMLDivElement | null>; // Référence pour le scroll principal
  handleScroll: () => void; // Fonction de gestion du scroll
  calendarConfig: CalendarConfig; // Configuration du calendrier avec filtres et dimension
  onCalendarConfigChange: (config: CalendarConfig) => void; // Callback pour changer de configuration
  availableConfigs: CalendarConfig[]; // Configurations disponibles
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void; // Fonction pour gérer le clic droit
}

/**
 * Composant React CalendarGrid
 * * Affiche une grille de calendrier pour visualiser les rendez-vous des employés, regroupés par équipe,
 * sur une période donnée (timeline de jours). Gère l'affichage mobile et desktop, l'empilement des rendez-vous
 * qui se chevauchent, l'ouverture/fermeture des équipes, et l'interaction utilisateur (drag & drop, double-clic, etc.).
 * * @component
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
 * @param {boolean} props.includeWeekend - Indique si les week-ends sont visibles
 * @param {React.RefObject<HTMLDivElement>} props.mainScrollRef - Référence pour le scroll principal
 * @param {Function} props.onAppointmentMoved - Callback lors du déplacement d'un rendez-vous
 * @param {Function} props.handleScroll - Fonction de gestion du scroll
 * @param {Function} props.onCellDoubleClick - Callback lors du double-clic sur une cellule
 * @param {Function} props.onAppointmentDoubleClick - Callback lors du double-clic sur un rendez-vous
 * @param {Function} props.onExternalDragDrop - Callback lors d'un drag & drop externe
 * @param {Function} props.handleContextMenu - Callback lors de l'ouverture du menu contextuel
 * * @returns {JSX.Element} Grille de calendrier interactive
 */

const CalendarGrid: React.FC<CalendarGridProps> = ({
  employees,
  appointments,
  initialTeams,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
//  selectedCalendarId,
  nonWorkingDates,
  isMobile,
  includeWeekend,
  mainScrollRef,
  handleScroll,
  calendarConfig,
  onCalendarConfigChange,
  availableConfigs,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
}) => {

  
  // État pour gérer les éléments de dimension ouverts (affichés)
  const [openItems, setOpenItems] = useState<(string | number)[]>([]);

  const columnEmployeeRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Calculer les éléments de dimension basés sur la configuration
  const dimensionItems = useMemo(() => {
    return getDimensionItems(calendarConfig.dimension, employees, initialTeams);
  }, [calendarConfig.dimension, employees, initialTeams]);

  // Appliquer les filtres aux employés selon la configuration
  const filteredEmployees = useMemo(() => {
    return applyFiltersToEmployees(employees, calendarConfig.filters);
  }, [employees, calendarConfig.filters]);

  // Regrouper les employés filtrés selon la dimension
  const employeesByDimension = useMemo(() => {
    return groupEmployeesByDimension(filteredEmployees, calendarConfig.dimension, initialTeams);
  }, [filteredEmployees, calendarConfig.dimension, initialTeams]);

  // Initialiser les éléments ouverts quand les dimensionItems changent
  useEffect(() => {
    setOpenItems(dimensionItems.map(item => item.id));
  }, [dimensionItems]);


  // Trouve l'index du jour courant dans la timeline
  const todayIndex = dayInTimeline.findIndex(day => 
    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  /**
   * Regroupe les employés par équipe en fonction de leur `groupId` et du calendrier sélectionné.
   *
   * - Pour chaque équipe dans `initialTeams`, ajoute une propriété `employees` contenant
   * les employés dont le `groupId` correspond à l'identifiant de l'équipe et dont le
   * `calendarId` correspond à l'identifiant du calendrier sélectionné.
   * - Ajoute une équipe spéciale "Sans équipe" pour les employés qui n'ont pas de `groupId`
   * ou dont le `groupId` ne correspond à aucune équipe existante.
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
      employees: employees.filter(emp => emp.groupId === team.id)
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
  }, [employees, initialTeams]);
  
  
  // Ouvre/ferme un élément de dimension dans la vue
  const toggleItem = (itemId: string | number) => {
    setOpenItems(open =>
      open.includes(itemId)
        ? open.filter(id => id !== itemId)
        : [...open, itemId]
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
   * * Fonctionnement :
   * - Pour chaque rendez-vous de la liste, compte combien d'autres rendez-vous se chevauchent avec lui.
   * - Initialise `maxOverlap` à 0 pour suivre le nombre maximal de chevauchements trouvés.
   * - Parcourt chaque rendez-vous (`i`) :
   * - Initialise `overlapCount` à 1 (le rendez-vous lui-même compte).
   * - Parcourt les rendez-vous suivants (`j`) :
   * - Vérifie si le rendez-vous `j` chevauche le rendez-vous `i` :
   * - `overlapping[j].startDate < overlapping[i].endDate` : le début de `j` est avant la fin de `i`
   * - `overlapping[j].endDate > overlapping[i].startDate` : la fin de `j` est après le début de `i`
   * - Si oui, incrémente `overlapCount`.
   * - Met à jour `maxOverlap` si `overlapCount` est supérieur à la valeur actuelle.
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

      filteredEmployees.forEach(employee => {
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

      return filteredEmployees.map(employee => {
        // For each employee, get all their appointments
        const employeeAppointments = appointments.filter(app => app.employeeId === employee.id);
        
        // Find the maximum number of overlapping appointments for this employee across the entire timeline
        let maxOverallOverlap = 0;
        if (employeeAppointments.length > 0) {
            // Sort by start date to process events in order
            const sortedApps = [...employeeAppointments].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
            
            // Use a simple greedy approach to find max concurrent events
            const activeSlots: { endDate: Date, count: number }[] = [];
            sortedApps.forEach(app => {
                // Remove expired slots
                for (let i = activeSlots.length - 1; i >= 0; i--) {
                    if (activeSlots[i].endDate <= app.startDate) {
                        activeSlots.splice(i, 1);
                    }
                }
                
                // Try to place the current appointment in an existing slot
                let placed = false;
                for (let i = 0; i < activeSlots.length; i++) {
                    // Check if this slot's end date doesn't conflict
                    if (activeSlots[i].endDate <= app.startDate) { // Or more complex logic if appointments can split slots
                        activeSlots[i].endDate = app.endDate;
                        placed = true;
                        break;
                    }
                }
                
                // If not placed, create a new slot
                if (!placed) {
                    activeSlots.push({ endDate: app.endDate, count: activeSlots.length }); // Use count to assign 'top'
                }
                
                // Update max overlap based on current active slots
                maxOverallOverlap = Math.max(maxOverallOverlap, activeSlots.length);
            });
        }

        // If no appointments, default to CELL_HEIGHT. Otherwise, calculate based on max overlaps.
        const calculatedHeight = maxOverallOverlap === 0
            ? CELL_HEIGHT
            : (maxOverallOverlap * CELL_HEIGHT) + (2 * maxOverallOverlap) + 10; // 2*overlap for spacing, 10 for padding

        return { employeeId: employee.id, height: calculatedHeight, dayKey: undefined };
      });
    }
  }, [filteredEmployees, appointments, dayInTimeline, isMobile]);
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

    filteredEmployees.forEach(emp => {
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
  }, [filteredEmployees, appointments, dayInTimeline, isMobile]);

  // Calcule les tops uniquement entre les rendez-vous de cet employé
  const appointmentsWithTop = useMemo(() => {
    return assignAppointmentTops(appointments, isMobile, dayInTimeline);
  }, [assignAppointmentTops, appointments, isMobile, dayInTimeline]);

  // Calcule les mois et leur portée en jours
  const monthsInTimeline = useMemo(() => {
    const months: { name: string; span: number; key: string }[] = [];
    if (dayInTimeline.length === 0) return months;

    let currentMonth = format(dayInTimeline[0], 'yyyy-MM', { locale: fr });
    let currentMonthStartDayIndex = 0;

    dayInTimeline.forEach((day, index) => {
      const monthKey = format(day, 'yyyy-MM', { locale: fr });
      if (monthKey !== currentMonth) {
        months.push({
          name: format(dayInTimeline[currentMonthStartDayIndex], 'MMMM yyyy', { locale: fr }),
          span: index - currentMonthStartDayIndex,
          key: currentMonth,
        });
        currentMonth = monthKey;
        currentMonthStartDayIndex = index;
      }
      if (index === dayInTimeline.length - 1) {
        months.push({
          name: format(day, 'MMMM yyyy', { locale: fr }),
          span: index - currentMonthStartDayIndex + 1,
          key: currentMonth,
        });
      }
    });
    return months;
  }, [dayInTimeline]);

  
  const handleScrollY = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!mainScrollRef.current || !columnEmployeeRef.current) return;

    if (isSyncingScroll.current) {
      isSyncingScroll.current = false;
      return;
    }

    if (mainScrollRef.current === e.currentTarget) {
      isSyncingScroll.current = true;
      columnEmployeeRef.current.scrollTop = mainScrollRef.current.scrollTop;
    } else if (columnEmployeeRef.current === e.currentTarget) {
      isSyncingScroll.current = true;
      mainScrollRef.current.scrollTop = columnEmployeeRef.current.scrollTop;
    }
  }, []);
  
  if (isMobile) {
    const displayEmployee = employees[0];
    return (
      <div className="relative h-full w-full font-inter"> {/* Enable vertical scrolling */}
        {/* Employee Header (fixed at top) */}
        <div className="sticky top-0 z-30 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex items-center justify-center rounded-b-xl shadow-lg">
          {displayEmployee.avatar && (
            <img
              src={displayEmployee.avatar}
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
                  employee={displayEmployee}
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
  else return (
      <div className="relative flex h-full flex-row calendar-grid">
        {/* Colonne employés sticky à gauche */}
        <div
          className="min-w-80 max-w-80 pl-2 flex flex-col sticky left-0 z-50 pr-10 overflow-y-scroll scrollbar-hide"
          style={{
            backgroundColor: '#f3f7f8',
            scrollbarGutter: 'stable',
          }}
          onScroll={handleScrollY}
          ref={columnEmployeeRef}
        >
          <div 
            className="h-[112px] sticky top-0 z-10 flex items-center  justify-center pb-2 flex-shrink-0"
            style={{
              backgroundColor: '#f3f7f8',
            }}
          >
            <div className="custom-select-wrapper relative inline-block w-full">
              <select
                className='
                  border border-gray-300 rounded-2xl p-2 w-full h-[48px] text-gray-700 
                  poppins text-[14px] font-medium bg-white'
                style={{
                  appearance: 'none',
                }}
                value={calendarConfig.id}
                onChange={(e) => {
                  const selectedConfig = availableConfigs.find(config => config.id === parseInt(e.target.value));                  
                  if (selectedConfig) {
                    onCalendarConfigChange(selectedConfig);
                  }
                }}
              >
                {availableConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {dimensionItems.map((item) => {
            const isOpen = openItems.includes(item.id);
            const itemEmployees = employeesByDimension[item.id] || [];
            
            if (itemEmployees.length === 0) return null;
            
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-gray-100"
                style={{ marginBottom: MARGIN_BETWEEN_TEAMS }}
              >
                <button
                  className="flex justify-between items-center w-full px-4 py-2 rounded-t-2xl  focus:outline-none"
                  onClick={() => toggleItem(item.id)}
                  type="button"
                >
                  <div className="flex items-center gap-4">
                    <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="20" height="20" viewBox="0 0 510 510" enableBackground="new 0 0 510 510"  xmlSpace="preserve">
                      <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                        <g>
                          <g id="play-install">
                            <path d="M459,114.75H357v-51l-51-51H204l-51,51v51H51c-28.05,0-51,22.95-51,51v280.5c0,28.05,22.95,51,51,51h408&#10;&#9;&#9;&#9;c28.05,0,51-22.95,51-51v-280.5C510,137.7,487.05,114.75,459,114.75z M204,63.75h102v51H204V63.75z M216.75,408l-89.25-89.25&#10;&#9;&#9;&#9;l35.7-35.7l53.55,53.55L349.35,204l35.7,35.7L216.75,408z" fill="#00957f" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
                          </g>
                        </g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                      </g>
                    </svg>
                    <span className="poppins font-bold">{item.name}</span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="currentColor"
                    className={`bi bi-chevron-down ${isOpen ? 'rotate-180' : ''} transition-transform duration-200 ease-in-out`}
                    viewBox="0 0 16 16"
                  >
                    <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
                  </svg>
                </button>
                <div className={`flex flex-col px-4 pb-2 transition-all duration-200 ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'}`}>
                  {isOpen && itemEmployees.map((employee) => {
                    const employeeRowHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;
                    return (
                      <div
                        key={employee.id}
                        className="flex items-center group gap-2 px-2 rounded-2xl cursor-pointer transition hover:bg-[#e7f4f2]"
                        style={{ height: employeeRowHeight, alignItems: 'center' }}
                      >
                        <img
                          src={employee.avatar ?? `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`}
                          alt={employee.name}
                          className="w-8 h-8 rounded-full border-2 border-white shadow"
                          onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`; }}
                        />
                        <div className="flex flex-col">
                          <span className="poppins text-[16px] font-inherit group-hover:font-semibold">{employee.name}</span>
                          {calendarConfig.dimension !== 'employee' && (
                            <span className="poppins text-[12px] text-gray-500">{employee.contrat}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {/* Timeline principale : scroll horizontal indépendant, barre toujours visible */}
        <div className="flex-1 min-w-0 flex flex-col pr-7 rounded-2xl poppins">
          {/* Conteneur scrollable horizontal, hauteur fixe pour garder la barre visible */}
          <div className='p-4 border rounded-4xl bg-white w-full h-full border-[#dfdedeff]'>
            <div 
              className="
              relative w-full overflow-x-scroll overflow-y-auto 
              rounded-3xl scrollbar-hide border h-full border-[#dfdedeff]"
              style={{
                scrollbarGutter: 'stable',
              }}
              onScroll={(e) => {
                handleScroll();
                handleScrollY(e);              
              }}
              ref={mainScrollRef}
            >
              {/* Sticky month header */}
              <div
                className="grid sticky top-0 z-20 bg-white border-gray-300"
                style={{
                  gridTemplateColumns: `repeat(${dayInTimeline.length}, ${CELL_WIDTH}px)`,
                  minHeight: '40px',
                }}
              >
                {monthsInTimeline.map((month) => {
                  const o = month.name.split(' ');
                  const monthName = o[0].charAt(0).toUpperCase() + o[0].slice(1);
                  const year = o[1];
                  return (
                    <div
                      key={month.key}
                      className="
                        col-span-full flex items-center justify-start py-2 text-[14px] poppins
                        bg-gray-50 border-r border-gray-200 bg-white border-b
                      "
                      style={{ gridColumn: `span ${month.span}` }}
                    >
                      <div
                        className="sticky left-0 z-30 pl-4"
                        style={{ minWidth: 120 }} // ajuste la largeur si besoin
                      >
                        <span className='font-extrabold'>{monthName}</span>
                        <span className='text-gray-500 ml-1'>{' '}</span>
                        <span className='font-medium'>{year}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Sticky day header below month header */}
              <div
                className="grid sticky top-[40px] z-20 bg-white border-gray-300"
                style={{
                  gridTemplateColumns: `repeat(${dayInTimeline.length}, ${CELL_WIDTH}px)`,
                  minHeight: '56px',
                }}
              >
                {dayInTimeline.map((day, index) => (
                  <div
                    key={`header-day-${format(day, 'yyyy-MM-dd')}`}
                    className={`
                      flex flex-col justify-end border-b border-r border-gray-300 text-center text-sm font-semibold text-gray-700 p-1
                      ${(isToday(day) && 'bg-[#ffcdde]') || (isWeekend(day) ? 'bg-[#f6f6f6]' : 'bg-white')}
                      relative
                      day-cell
                    `}
                    style={{ 
                      width: CELL_WIDTH + 'px', 
                      height: 'auto',
                    }}
                  >
                    {/* Affiche le numéro de semaine en début de semaine */}
                    {day.getDay() === 1 && (
                      <span
                        className="absolute -top-4 -left-3 z-30 rounded-full p-2 flex items-center justify-center text-white font-bold"
                        style={{
                          width: '24px',
                          height: '24px',
                          background: '#23adde',
                        }}
                      >
                        {getWeekNumber(day)}
                      </span>
                    )}
                    <span className="block font-bold text-lg">{format(day, 'd', { locale: fr })}</span>
                    <span className="block text-xs text-gray-500">{
                      format(day, 'EEE', { locale: fr }).charAt(0).toUpperCase() 
                      + 
                      format(day, 'EEE', { locale: fr }).slice(1).replace('.', '')}
                    </span>
                  </div>
                ))}
              </div>
              {/* Main grid rows (not sticky) */}
              <div
                className="grid bg-white relative calendar-grid"
                style={{
                  gridTemplateColumns: `repeat(${dayInTimeline.length}, ${CELL_WIDTH}px)`,
                  width: `${dayInTimeline.length * CELL_WIDTH}px`,
                }}
              >
                {/* Ligne rouge verticale pour la date du jour */}
                {todayIndex !== -1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${todayIndex * CELL_WIDTH + CELL_WIDTH / 2}px`,
                      top: 0,
                      width: '3px',
                      height: '100%',
                      background: '#ffcdde',
                      zIndex: 10,
                      borderRadius: '2px',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Rows for each dimension item: inactive row, then employee rows */}
                {dimensionItems.map((item, idx) => {
                  const isOpen = openItems.includes(item.id);
                  const itemEmployees = employeesByDimension[item.id] || [];
                  
                  if (itemEmployees.length === 0) return null;
                  
                  return (
                    <React.Fragment key={item.id}>
                      {/* Inactive row for the dimension item */}
                      {dayInTimeline.map((day) => (
                        <DayCell
                          key={`inactive-${item.id}-${format(day, 'yyyy-MM-dd')}`}
                          day={day}
                          employee={{ id: 0, name: 'Inactive' }}
                          appointments={[]}
                          intervals={HALF_DAY_INTERVALS}
                          isFullDay={isFullDay}
                          RowHeight={idx === 0 ? CELL_HEIGHT : CELL_HEIGHT + MARGIN_BETWEEN_TEAMS + 8}
                          isMobile={isMobile}
                          nonWorkingDates={nonWorkingDates}
                          includeWeekend={includeWeekend}
                          onAppointmentMoved={onAppointmentMoved}
                          onCellDoubleClick={onCellDoubleClick}
                          onAppointmentClick={onAppointmentDoubleClick}
                          onExternalDragDrop={onExternalDragDrop}
                          isWeekend={isWeekend(day)}
                          handleContextMenu={handleContextMenu}
                          isCellActive={false}
                        />
                      ))}
                      {/* Employee rows for the dimension item */}
                      {isOpen && itemEmployees.map((employee) => {
                        const employeeRowHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;
                        return (
                          <React.Fragment key={employee.id}>
                            {dayInTimeline.map((day) => {
                              const dayEmployeeAppointments = appointmentsWithTop.filter((app) =>
                                isSameDay(app.startDate, day) && app.employeeId === employee.id
                              );
                              return (
                                <DayCell
                                  key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
                                  day={day}
                                  employee={{ id: employee.id, name: employee.name }}
                                  appointments={dayEmployeeAppointments}
                                  intervals={HALF_DAY_INTERVALS}
                                  isFullDay={isFullDay}
                                  RowHeight={employeeRowHeight}
                                  isMobile={isMobile}
                                  nonWorkingDates={nonWorkingDates}
                                  includeWeekend={includeWeekend}
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
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


export default memo(CalendarGrid, (prevProps, nextProps) => {
  // Mémorisation pour éviter les re-rendus inutiles
  return (
    prevProps.employees === nextProps.employees &&
    prevProps.appointments === nextProps.appointments &&
    prevProps.initialTeams === nextProps.initialTeams &&
    prevProps.dayInTimeline === nextProps.dayInTimeline &&
    prevProps.HALF_DAY_INTERVALS === nextProps.HALF_DAY_INTERVALS &&
    prevProps.isFullDay === nextProps.isFullDay &&
   //prevProps.selectedCalendarId === nextProps.selectedCalendarId &&
    prevProps.nonWorkingDates === nextProps.nonWorkingDates &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.includeWeekend === nextProps.includeWeekend
  );
});