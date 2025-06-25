"use client";
import React, { useState, useMemo, memo, useRef, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react';
import {
  format,
  isSameDay,
  isWeekend,
  addMonths,
  subMonths,
} from 'date-fns';
// import { VariableSizeGrid as Grid } from 'react-window'; // Supprimer react-window
// import AutoSizer from 'react-virtualized-auto-sizer'; // Supprimer react-virtualized-auto-sizer
import { useVirtualizer } from '@tanstack/react-virtual'; // Importer useVirtualizer de TanStack Virtual
import DayCell from './DayCell';
import { Appointment, Employee, Groupe, HalfDayInterval } from '../types';
import { fr } from 'date-fns/locale';
import { EMPLOYEE_COLUMN_WIDTH, DAY_CELL_WIDTH, DAY_CELL_HEIGHT, TEAM_HEADER_HEIGHT } from '../pages/index';

interface CalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  initialTeams: Groupe[];
  dayInTimeline: Date[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number) => void;
  onCellDoubleClick: (date: Date, employeeId: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number) => void;
  loadMoreDays: (direction: 'forward' | 'backward') => void;
}

// Utilisation de forwardRef pour permettre à HomePage d'accéder aux méthodes de la grille
const CalendarGrid = forwardRef<any, CalendarGridProps>(({
  employees,
  appointments,
  initialTeams,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentClick,
  onExternalDragDrop,
  loadMoreDays,
}, ref) => {
  const [openTeams, setOpenTeams] = useState<number[]>(initialTeams.map(team => team.id));

  // Refs pour les conteneurs défilables
  const parentRef = useRef<HTMLDivElement>(null); // Conteneur principal défilable pour le contenu de la grille
  const headerRef = useRef<HTMLDivElement>(null); // Défilement horizontal de l'en-tête
  const employeeColumnRef = useRef<HTMLDivElement>(null); // Défilement vertical de la colonne des employés

  // Exposer les méthodes de défilement via useImperativeHandle
  useImperativeHandle(ref, () => ({
    scrollTo: ({ columnIndex, rowIndex, align = 'auto' }: { columnIndex?: number; rowIndex?: number; align?: 'auto' | 'smart' | 'center' | 'end' | 'start' }) => {
      // Implémenter une logique de défilement personnalisée puisque les méthodes de react-window ont disparu
      // Cela impliquera d'obtenir l'offset de l'élément virtuel et de définir scrollLeft/scrollTop sur parentRef
      if (parentRef.current) {
        // Pour les colonnes, l'index 0 est l'en-tête de l'employé, donc décaler de 1
        if (columnIndex !== undefined && virtualColumn.getVirtualItems()[columnIndex - 1]) {
          parentRef.current.scrollLeft = virtualColumn.getVirtualItems()[columnIndex - 1].start;
        }
        // Pour les lignes, l'index 0 est l'en-tête des jours, donc décaler de 1
        if (rowIndex !== undefined && virtualRow.getVirtualItems()[rowIndex - 1]) {
          parentRef.current.scrollTop = virtualRow.getVirtualItems()[rowIndex - 1].start;
        }
      }
    },
  }));

  const employeesByTeam = useMemo(() =>
    initialTeams.map(team => ({
      ...team,
      employees: employees.filter(emp => emp.groupId === team.id)
    })
    ), [employees, initialTeams]);

  const toggleTeam = (teamId: number) => {
    setOpenTeams(open =>
      open.includes(teamId)
        ? open.filter(id => id !== teamId)
        : [...open, teamId]
    );
    // Lorsque les équipes sont basculées, les hauteurs des lignes peuvent changer, il faut donc "mesurer" à nouveau.
    // Cela force TanStack Virtual à recalculer les tailles et positions.
    virtualRow.measure();
  };

  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Calculer le nombre total de lignes (équipes + employés) pour la virtualisation
  const rowOffsetsAndHeights = useMemo(() => {
    // La première ligne est l'en-tête des jours, qui n'est pas virtualisée ici,
    // mais son hauteur est prise en compte dans le décalage initial des lignes virtuelles
    // pour que la virtualisation commence à la bonne position Y.
    // Pour TanStack Virtual, la `count` doit refléter le nombre d'éléments qu'il doit virtualiser.
    // Ici, nous virtualisons les lignes d'équipe et d'employé.
    // Nous construisons une liste d'objets pour aider `getStartOffset` et `estimateSize`.
    const rows: { type: 'team' | 'employee', id: number | string, height: number, data?: any }[] = [];

    for (const team of employeesByTeam) {
      rows.push({ type: 'team', id: `team-${team.id}`, height: TEAM_HEADER_HEIGHT, data: team });
      if (openTeams.includes(team.id)) {
        team.employees.forEach(emp => {
          rows.push({ type: 'employee', id: `employee-${emp.id}`, height: DAY_CELL_HEIGHT, data: emp });
        });
      }
    }
    return rows;
  }, [employeesByTeam, openTeams]);

  const virtualRow = useVirtualizer({
    count: rowOffsetsAndHeights.length, // Nombre total de lignes virtualisées (équipes + employés)
    getItemKey: (index) => rowOffsetsAndHeights[index]?.id ?? index,
    estimateSize: useCallback(index => rowOffsetsAndHeights[index]?.height || DAY_CELL_HEIGHT, [rowOffsetsAndHeights]),
    overscan: 5, // Charge des éléments supplémentaires en dehors de la vue pour un défilement plus fluide
    getScrollElement: () => parentRef.current, // L'élément qui gère le défilement vertical
  });

  const virtualColumn = useVirtualizer({
    count: dayInTimeline.length, // Nombre total de colonnes (jours) virtualisées
    estimateSize: () => DAY_CELL_WIDTH,
    overscan: 5,
    horizontal: true, // Indique une virtualisation horizontale
    getScrollElement: () => parentRef.current, // L'élément qui gère le défilement horizontal
  });

  // Synchroniser le défilement horizontal de l'en-tête des jours
  useEffect(() => {
    const parent = parentRef.current;
    const header = headerRef.current;

    const handleScroll = () => {
      if (parent && header) {
        header.scrollLeft = parent.scrollLeft;
      }
    };

    parent?.addEventListener('scroll', handleScroll);
    return () => parent?.removeEventListener('scroll', handleScroll);
  }, []);

  // Synchroniser le défilement vertical de la colonne des employés
  useEffect(() => {
    const parent = parentRef.current;
    const employeeColumn = employeeColumnRef.current;

    const handleScroll = () => {
      if (parent && employeeColumn) {
        employeeColumn.scrollTop = parent.scrollTop;
      }
    };

    parent?.addEventListener('scroll', handleScroll);
    return () => parent?.removeEventListener('scroll', handleScroll);
  }, []);

  // Gérer la logique de chargement de plus de jours (défilement infini)
  const handleScrollEnd = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    // const { scrollTop, scrollHeight, clientHeight } = e.currentTarget; // Pour un éventuel défilement vertical infini

    // Défilement horizontal pour charger plus de jours
    const scrollThresholdRight = scrollWidth - (clientWidth * 1.2); // Charger quand il reste 20% de l'écran à droite
    const scrollThresholdLeft = clientWidth * 0.2; // Charger quand on est à moins de 20% du début

    if (scrollLeft >= scrollThresholdRight) {
      loadMoreDays('forward');
    } else if (scrollLeft <= scrollThresholdLeft && scrollLeft > 0) {
      // S'assurer de ne pas déclencher au tout début (scrollLeft = 0)
      loadMoreDays('backward');
    }

    // Vous pouvez ajouter ici une logique de chargement vertical si nécessaire pour les employés/équipes
  }, [loadMoreDays]);

  return (
    <div className="relative h-full w-full overflow-hidden"> {/* Changé en overflow-hidden ici pour gérer le défilement des sections */}
      {/* Coin supérieur gauche (cellule vide) */}
      <div
        className="absolute top-0 left-0 z-40 bg-gray-200 border-b border-r border-gray-300"
        style={{ width: EMPLOYEE_COLUMN_WIDTH, height: TEAM_HEADER_HEIGHT }}
      ></div>

      {/* En-tête de date horizontale (sticky) */}
      <div
        ref={headerRef}
        className="absolute top-0 z-30 overflow-hidden" // overflow-hidden pour cacher le scrollbar de cette div
        style={{ left: EMPLOYEE_COLUMN_WIDTH, width: `calc(100% - ${EMPLOYEE_COLUMN_WIDTH})` }}
      >
        <div
          className="flex flex-row"
          style={{ width: virtualColumn.getTotalSize() }} // Définir la largeur totale pour accueillir toutes les colonnes virtuelles
        >
          {virtualColumn.getVirtualItems().map(virtualDay => {
            const day = dayInTimeline[virtualDay.index];
            if (!day) return null;

            return (
              <div
                key={`header-day-${format(day, 'yyyy-MM-dd')}`}
                className={`flex flex-col justify-end bg-gray-200 border-b border-r border-gray-300 text-center text-sm font-semibold text-gray-700 p-1 ${isWeekend(day) ? 'bg-gray-100' : ''}`}
                style={{
                  width: DAY_CELL_WIDTH,
                  height: TEAM_HEADER_HEIGHT,
                }}
              >
                {day.getDay() === 1 && ( // Afficher le numéro de semaine le lundi
                  <div className='bg-blue-400 text-white font-bold text-xs rounded-full px-2 py-0.5 mx-auto -mb-1'>
                    S.{getWeekNumber(day)}
                  </div>
                )}
                <span className="block font-bold text-lg">{format(day, 'd', { locale: fr })}</span>
                <span className="block text-xs text-gray-500">{format(day, 'MMM', { locale: fr })}</span>
                <span className="block text-xs text-gray-500">{format(day, 'yyyy', { locale: fr })}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Colonne verticale Employé/Équipe (sticky) */}
      <div
        ref={employeeColumnRef}
        className="absolute left-0 z-30 overflow-hidden" // overflow-hidden pour cacher le scrollbar de cette div
        style={{ top: TEAM_HEADER_HEIGHT, height: `calc(100% - ${TEAM_HEADER_HEIGHT})` }}
      >
        <div
          className="flex flex-col"
          style={{ height: virtualRow.getTotalSize() }} // Définir la hauteur totale pour accueillir toutes les lignes virtuelles
        >
          {virtualRow.getVirtualItems().map(virtualRowItem => {
            const rowData = rowOffsetsAndHeights[virtualRowItem.index];
            if (!rowData) return null;

            if (rowData.type === 'team') {
              const team = rowData.data;
              return (
                <div
                  key={rowData.id}
                  className="sticky left-0 z-20 border-r border-gray-200 bg-gray-50 flex flex-row items-center justify-center flex-shrink-0 border-b border-gray-200 cursor-pointer"
                  style={{
                    width: EMPLOYEE_COLUMN_WIDTH,
                    height: TEAM_HEADER_HEIGHT,
                  }}
                  onClick={() => toggleTeam(team!.id)}
                >
                  <div className="text-left p-2 font-bold">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="currentColor"
                      className={`bi bi-chevron-right ${openTeams.includes(team!.id) ? 'rotate-90' : ''} transition-transform duration-200 ease-in-out`}
                      viewBox="0 0 16 16"
                    >
                      <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708" />
                    </svg>
                  </div>
                  <span className="font-semibold text-sm text-gray-800 text-center">{team!.name}</span>
                </div>
              );
            } else if (rowData.type === 'employee') {
              const employee = rowData.data;
              return (
                <div
                  key={rowData.id}
                  className="sticky left-0 z-20 p-2 border-r border-gray-200 bg-gray-50 flex flex-row items-center justify-center flex-shrink-0 border-b border-gray-200"
                  style={{
                    width: EMPLOYEE_COLUMN_WIDTH,
                    height: DAY_CELL_HEIGHT,
                  }}
                >
                  {employee!.avatarUrl && (
                    <img src={employee!.avatarUrl} alt={employee!.name} className="w-10 h-10 rounded-full mb-1 mr-2" />
                  )}
                  <span className="font-semibold text-sm text-gray-800 text-center">{employee!.name}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Contenu principal de la grille (Zone défilable virtualisée) */}
      <div
        ref={parentRef}
        className="relative overflow-auto" // overflow-auto gère les barres de défilement pour cette section
        style={{
          marginLeft: EMPLOYEE_COLUMN_WIDTH,
          marginTop: TEAM_HEADER_HEIGHT,
          width: `calc(100% - ${EMPLOYEE_COLUMN_WIDTH})`,
          height: `calc(100% - ${TEAM_HEADER_HEIGHT})`,
        }}
        onScroll={handleScrollEnd} // Attacher le gestionnaire de défilement ici
      >
        <div
          style={{
            width: virtualColumn.getTotalSize(),
            height: virtualRow.getTotalSize(),
            position: 'relative', // Nécessaire pour le positionnement absolu des cellules
          }}
        >
          {virtualRow.getVirtualItems().map(virtualRowItem => {
            const rowData = rowOffsetsAndHeights[virtualRowItem.index];

            // Ne pas rendre les lignes d'en-tête ou d'équipe dans le contenu principal de la grille
            if (rowData.type === 'team') { // Pas de `header` car il est rendu séparément
              return null;
            }

            const currentEmployee = rowData.data as Employee;
            const employeeIdForCell = currentEmployee.id;

            return virtualColumn.getVirtualItems().map(virtualColItem => {
              const day = dayInTimeline[virtualColItem.index];
              if (!day) return null;

              const dayEmployeeAppointments = appointments.filter((app: Appointment) =>
                isSameDay(app.startDate, day) && app.employeeId === employeeIdForCell
              );

              return (
                <DayCell
                  key={`${format(day, 'yyyy-MM-dd')}-${employeeIdForCell}`}
                  day={day}
                  employeeId={employeeIdForCell}
                  appointments={dayEmployeeAppointments}
                  intervals={HALF_DAY_INTERVALS}
                  onAppointmentMoved={onAppointmentMoved}
                  onCellDoubleClick={onCellDoubleClick}
                  onAppointmentClick={onAppointmentClick}
                  onExternalDragDrop={onExternalDragDrop}
                  isWeekend={isWeekend(day)}
                  isCellActive={true} // Les lignes d'employés sont toujours actives pour les dépôts
                  style={{
                    position: 'absolute', // Positionnement absolu nécessaire pour le défilement virtuel
                    top: virtualRowItem.start, // Utilise le décalage calculé par TanStack Virtual
                    left: virtualColItem.start, // Utilise le décalage calculé par TanStack Virtual
                    width: DAY_CELL_WIDTH,
                    height: DAY_CELL_HEIGHT,
                  }}
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
});

export default memo(CalendarGrid);