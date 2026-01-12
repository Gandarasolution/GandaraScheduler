import React, { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Appointment, Employee, Groupe, CalendarConfig, Item, HalfDayInterval } from '../../types';
import { TimelineFrame } from './index';
import EmployeeRow from './EmployeeRow';
import GroupRow from './GroupRow';
import CustomSelectWithImage, { SelectOptionWithImage } from '../ui/CustomSelectWithImage';
import { 
  CELL_WIDTH, 
  CELL_HEIGHT,
  MARGIN_BETWEEN_TEAMS, 
  EMPLOYEE_GROUP_HEADER_PADDING_Y, 
  EMPLOYEE_GROUP_CONTENT_PADDING_BOTTOM, 
  EMPLOYEE_GROUP_HEADER_HEIGHT, 
  TIMELINE_HEADERITEMS_CELL_HEIGHT, 
  TIMELINE_HEADERGROUPS_CELL_HEIGHT, 
  CONTAINER_PADDING, 
  EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
  HOUR_MS,
  DAY_INTERVALS,
  INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE,
  INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER,
} from '../../utils/constants';
import { getDimensionItems, groupEmployeesByDimension, applyFiltersToEmployees } from '../../utils/filters';
import { isSameDay, isWeekend } from 'date-fns';
import { getNextWorkedDay, isHoliday } from '../../utils/dates';
import { getRowId } from '../../utils/domIds';
import { useScrollbarGrab } from '../../hooks/useScrollbarGrab';

interface DesktopCalendarGridProps {
  employees: Employee[];
  appointmentsWithTop: (Appointment & { top: number })[];
  employeeHeights: { employeeId: number; height: number }[];
  dayInTimeline: number[];
  initialTeams: Groupe[];
  calendarConfig: CalendarConfig;
  onCalendarConfigChange: (config: CalendarConfig) => void;
  availableConfigs: CalendarConfig[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  events: Item[];
  nonWorkingDates: number[];
  isDisplayWeekend: boolean;
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  handleScrollY: (e: React.UIEvent<HTMLDivElement>) => void;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
  tableRef: React.RefObject<HTMLDivElement | null>;
  handleMouseOver: (e: React.MouseEvent<HTMLElement>) => void;
  handleMouseOut: (e: React.MouseEvent<HTMLElement>) => void;
  onAppointmentMoved: (id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: number, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: number, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  updateHighlightedEmployeeRow: (employeeId: number | null) => void;
  selectedCell: { employeeId: number; date: number } | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
  hoverColumnLeft: number | null;
  onLoadAppointmentsInRange: (startDate: number, endDate: number) => void;
}

interface DragItem {
  id: number;
  type: 'appointment';
  title?: string;
  sourceType?: 'external';
  startDate: number;
  endDate: number;
  imageUrl: string;
  typeEvent: 'Chantier' | 'Absence' | 'Autre';
  dragOffset?: number;
}

const DesktopCalendarGrid: React.FC<DesktopCalendarGridProps> = ({
  employees,
  appointmentsWithTop,
  employeeHeights,
  dayInTimeline,
  initialTeams,
  calendarConfig,
  onCalendarConfigChange,
  availableConfigs,
  HALF_DAY_INTERVALS,
  isFullDay,
  events,
  nonWorkingDates,
  isDisplayWeekend,
  mainScrollRef,
  handleScrollY,
  columnEmployeeRef,
  tableRef,
  handleMouseOver,
  handleMouseOut,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
  updateHighlightedEmployeeRow,
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
  hoverColumnLeft,
  onLoadAppointmentsInRange
}) => {
  const [openItems, setOpenItems] = useState<(string | number)[]>([]);
  const [expandedOverlapRows, setExpandedOverlapRows] = useState<Record<number, boolean>>({});
  const [todayTs, setTodayTs] = useState<number | null>(null);
  const [viewport, setViewport] = useState<{ top: number; height: number; left: number; width: number }>({ 
      top: 0, 
      height: 0, 
      left: 0, 
      width: 0 
  });

  const isUserGrabbingScrollbar = useScrollbarGrab(mainScrollRef as React.RefObject<HTMLElement>);

  const dimensionItems = useMemo(() => {
    return getDimensionItems(calendarConfig.dimension, employees, initialTeams);
  }, [calendarConfig.dimension, employees, initialTeams]);

  const filteredEmployees = useMemo(() => {
    return applyFiltersToEmployees(employees, calendarConfig.filters);
  }, [employees, calendarConfig.filters]);

  const employeesByDimension = useMemo(() => {
    return groupEmployeesByDimension(filteredEmployees, calendarConfig.dimension, initialTeams);
  }, [filteredEmployees, calendarConfig.dimension, initialTeams]);
  

  const todayIndex = useMemo(() => {
    if (!todayTs) return -1;
    return dayInTimeline.findIndex(day => isSameDay(day, todayTs));
  }, [dayInTimeline, todayTs]);  

  // Flatten the data structure for virtualization
  const flatRows = useMemo(() => {
    const rows: Array<{ type: 'group' | 'employee', id: string | number, data: any, height: number }> = [];
    
    dimensionItems.forEach((item, idx) => {
      // Calculate group header height
      let inactiveRowHeight = EMPLOYEE_GROUP_HEADER_HEIGHT;
      
      if (idx > 0) {
        const prevItem = dimensionItems[idx - 1];
        const isPrevOpen = openItems.includes(prevItem.id);
        
        inactiveRowHeight += MARGIN_BETWEEN_TEAMS + EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE * 2;
        if (isPrevOpen) {
          inactiveRowHeight += EMPLOYEE_GROUP_CONTENT_PADDING_BOTTOM;
        }
      }
      
      rows.push({
        type: 'group',
        id: item.id,
        data: item,
        height: inactiveRowHeight
      });
      
      if (openItems.includes(item.id)) {
        const itemEmployees = employeesByDimension[item.id] || [];
        itemEmployees.forEach(employee => {
          const baseHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;
          const adjustedHeight = expandedOverlapRows[employee.id]
            ? baseHeight
            : Math.min(baseHeight, CELL_HEIGHT + 12);

          rows.push({
            type: 'employee',
            id: employee.id,
            data: employee,
            height: adjustedHeight
          });
        });
      }
    });
    
    return rows;
  }, [dimensionItems, openItems, employeesByDimension, employeeHeights, expandedOverlapRows]);

  const rowBoundaries = useMemo(() => {
    let offset = 0;
    return flatRows.map((row) => {
      const start = offset;
      offset += row.height;
      const domId = row.type === 'employee' ? getRowId('employee', row.id as number) : getRowId('group', row.id as string);
      return { ...row, start, end: offset, domId };
    });
  }, [flatRows]);

  const totalContentHeight = useMemo(() => {
    return rowBoundaries.length ? rowBoundaries[rowBoundaries.length - 1].end : 0;
  }, [rowBoundaries]);



  //Virtualization calcules 
  const headerHeight = TIMELINE_HEADERITEMS_CELL_HEIGHT + TIMELINE_HEADERGROUPS_CELL_HEIGHT + CONTAINER_PADDING;
  const contentViewportTop = Math.max(0, viewport.top - headerHeight);
  const contentViewportHeight = Math.max(0, viewport.height - headerHeight);
  const contentViewportBottom = contentViewportTop + contentViewportHeight;
  const OVERSCAN_Y = 400;
  const OVERSCAN_X = 400;

  const visibleRangeStart = useMemo(() => {
    const target = contentViewportTop - OVERSCAN_Y;
    for (let i = 0; i < rowBoundaries.length; i++) {
      if (rowBoundaries[i].end >= target) return i;
    }
    return 0;
  }, [contentViewportTop, rowBoundaries]);

  const visibleRangeEnd = useMemo(() => {
    const target = contentViewportBottom + OVERSCAN_Y;
    for (let i = rowBoundaries.length - 1; i >= 0; i--) {
      if (rowBoundaries[i].start <= target) return i;
    }
    return rowBoundaries.length - 1;
  }, [contentViewportBottom, rowBoundaries]);

  const visibleRows = useMemo(() => {
    if (!rowBoundaries.length) return [];
    const start = Math.max(0, visibleRangeStart);
    const end = Math.min(rowBoundaries.length - 1, visibleRangeEnd);
    if (start > end) return [];
    return rowBoundaries.slice(start, end + 1);
  }, [rowBoundaries, visibleRangeEnd, visibleRangeStart]);


  const { visibleWindowStart, visibleWindowEnd } = useMemo(() => {
    if (!dayInTimeline.length) return { visibleWindowStart: 0, visibleWindowEnd: 0 };
    
    // Pixel de début et de fin avec overscan
    const startPx = Math.max(0, viewport.left - OVERSCAN_X);
    const endPx = viewport.left + viewport.width + OVERSCAN_X;

    // Convertir les pixels en index de tableau
    const startIndex = Math.floor(startPx / CELL_WIDTH);
    const endIndex = Math.ceil(endPx / CELL_WIDTH);

    // Récupérer les timestamps correspondants
    // On s'assure de rester dans les bornes du tableau
    const safeStartIndex = Math.max(0, Math.min(startIndex, dayInTimeline.length - 1));
    const safeEndIndex = Math.max(0, Math.min(endIndex, dayInTimeline.length - 1));

    const startTs = dayInTimeline[safeStartIndex];
    // Pour la fin, on ajoute 24h pour être sûr d'inclure les RDV qui dépassent la journée
    const endTs = dayInTimeline[safeEndIndex] + (24 * 60 * 60 * 1000); 

    return { visibleWindowStart: startTs, visibleWindowEnd: endTs };
  }, [dayInTimeline, viewport.left, viewport.width]);

  const visibleWindowStartInitial = useRef(0);
  const visibleWindowEndInitial = useRef(0);

// Drag and Drop logic
  const [, dropRef] = useDrop(() => ({
    accept: ['appointment', 'external-item'],
    drop: (item: DragItem, monitor) => {
      if (!tableRef.current || rowBoundaries.length === 0 || dayInTimeline.length === 0) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const tableRect = tableRef.current.getBoundingClientRect();
      const relativeX = clientOffset.x - tableRect.left ;
      const relativeY = clientOffset.y - tableRect.top;

      const totalHeight = rowBoundaries[rowBoundaries.length - 1]?.end ?? 0;
      if (relativeX < 0 || relativeY < 0 || relativeY > totalHeight) return;

      const intervalsPerDay = Math.max(1, HALF_DAY_INTERVALS.length);
      const slotWidth = CELL_WIDTH / intervalsPerDay;
      const totalIntervals = dayInTimeline.length * intervalsPerDay;
      if (totalIntervals <= 0) return;

      const adjustedX = Math.min(
        Math.max(relativeX - (item.dragOffset ?? 0), 0),
        totalIntervals * slotWidth - 1
      );

      const intervalIndex = Math.min(
        Math.max(Math.floor(adjustedX / slotWidth), 0),
        totalIntervals - 1
      );
      const dayIndex = Math.min(Math.floor(intervalIndex / intervalsPerDay), dayInTimeline.length - 1);
      const intervalInDay = intervalIndex % intervalsPerDay;

      const targetRow = rowBoundaries.find((row) => relativeY >= row.start && relativeY < row.end);
      if (!targetRow || targetRow.type !== 'employee') return;

      const targetDayTs = dayInTimeline[dayIndex];
      
      const intervalConfig = HALF_DAY_INTERVALS[intervalInDay] ?? HALF_DAY_INTERVALS[0];
      let targetDate = targetDayTs + intervalConfig.startHour * HOUR_MS;
      let targetInterval: 'morning' | 'afternoon' = intervalConfig.name as 'morning' | 'afternoon';

      const weekend = isWeekend(targetDayTs);
      const holiday = isHoliday(targetDayTs);
      const isNonWorking = nonWorkingDates.some((date) => isSameDay(date, targetDayTs));

      if (weekend || holiday || isNonWorking) {
        targetDate = getNextWorkedDay(targetDate, isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS, nonWorkingDates);
        targetInterval = 'morning';
      }

      if (item.sourceType === 'external') {
        onExternalDragDrop(
          item.title || 'Nouveau rendez-vous',
          targetDate,
          targetInterval,
          Number(targetRow.id),
          item.imageUrl || '',
          item.typeEvent
        );
        return;
      }

      const duration = item.endDate - item.startDate;
      const newEnd = targetDate + duration;
      
      

      onAppointmentMoved(item.id, targetDate, newEnd, Number(targetRow.id));
    },
  }), [DAY_INTERVALS, HALF_DAY_INTERVALS, dayInTimeline, getNextWorkedDay, isFullDay, nonWorkingDates, onAppointmentMoved, onExternalDragDrop, rowBoundaries]);

  const setTableRef = useCallback((node: HTMLDivElement | null) => {
    tableRef.current = node;
    dropRef(node);
  }, [dropRef, tableRef]);

  const handleGridContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!tableRef.current || !rowBoundaries.length || !dayInTimeline.length) return;

    const tableRect = tableRef.current.getBoundingClientRect();
    const relativeX = e.clientX - tableRect.left;
    const relativeY = e.clientY - tableRect.top;

    if (relativeX < 0 || relativeY < 0 || relativeY > totalContentHeight) return;

    const dayIndex = Math.floor(relativeX / CELL_WIDTH);
    if (dayIndex < 0 || dayIndex >= dayInTimeline.length) return;

    const targetRow = rowBoundaries.find((row) => relativeY >= row.start && relativeY < row.end);
    if (!targetRow || targetRow.type !== 'employee') return;

    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
    const intervalWidth = CELL_WIDTH / Math.max(1, intervals.length);
    const offsetInDay = relativeX - dayIndex * CELL_WIDTH;
    const intervalIndex = Math.min(
      intervals.length - 1,
      Math.max(0, Math.floor(offsetInDay / intervalWidth))
    );
    const intervalStartHour = intervals[intervalIndex]?.startHour ?? 0;
    const targetDate = dayInTimeline[dayIndex] + intervalStartHour * HOUR_MS;

    handleContextMenu(e, 'cell', null, { employeeId: Number(targetRow.id), date: targetDate });
  }, [HALF_DAY_INTERVALS, DAY_INTERVALS, CELL_WIDTH, HOUR_MS, dayInTimeline, handleContextMenu, isFullDay, rowBoundaries, tableRef, totalContentHeight]);

  const { holidayColumns, weekendColumns, nonWorkingColumns } = useMemo(() => {
    const holidays: { left: number; key: number }[] = [];
    const weekends: { left: number; key: number }[] = [];
    const nonWorking: { left: number; key: number }[] = [];

    dayInTimeline.forEach((day, index) => {
      const left = index * CELL_WIDTH;
      const isFerie = isHoliday(day);
      const isWk = isWeekend(day);
      const isNonWorking = nonWorkingDates.some((d) => isSameDay(d, day));

      if (isFerie) {
        holidays.push({ left, key: day });
        return; // priorité au férié, pas besoin d'ajouter d'autres surcouches
      }

      if (isWk) {
        weekends.push({ left, key: day });
      }

      if (isNonWorking) {
        nonWorking.push({ left, key: day });
      }
    });

    return { holidayColumns: holidays, weekendColumns: weekends, nonWorkingColumns: nonWorking };
  }, [dayInTimeline, nonWorkingDates]);


  const selectOptions: SelectOptionWithImage[] = useMemo(() => {
    return availableConfigs.map(config => ({
      id: config.id,
      name: config.name,
      value: config.id,
    }));
  }, [availableConfigs]);

  const appointmentsByEmployee = useMemo(() => {
    const map: Record<number, (Appointment & { top: number })[]> = {};

    // 1. Initialiser les tableaux (optionnel, mais plus propre)
    employees.forEach(emp => map[emp.id] = []);

    // 2. Remplir les tableaux (Complexité O(N) - Une seule passe)
    appointmentsWithTop.forEach(app => {
      // Sécurité si l'employé existe
      if (!map[app.employeeId]) map[app.employeeId] = [];
      
      // OPTIMISATION ULTIME : On peut déjà filtrer ici ce qui est hors écran
      // si on veut soulager les enfants (optionnel mais recommandé)
      if (app.endDate > visibleWindowStart && app.startDate < visibleWindowEnd) {
        map[app.employeeId].push(app);
      }
    });

    return map;
  }, [appointmentsWithTop, employees, visibleWindowStart, visibleWindowEnd]);

  const toggleItem = (itemId: string | number) => {
    setOpenItems(open =>
      open.includes(itemId)
        ? open.filter(id => id !== itemId)
        : [...open, itemId]
    );
  };

  const CustomArrow = ({isOpen}: {isOpen: boolean}) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      className={`bi bi-chevron-down ${isOpen ? 'rotate-180' : ''} transition-transform duration-200 ease-in-out text-[#84818a]`}
      viewBox="0 0 16 16"
    >
      <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
    </svg>
  );

  
  useEffect(() => {
    setTodayTs(Date.now());
  }, []);

  useEffect(() => {
    const node = mainScrollRef.current;
    if (!node) return;

    let rafId: number | null = null;

    const handleViewport = () => {
      // Si une frame est déjà prévue, on annule la précédente (throttle naturel)
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        setViewport({
          top: node.scrollTop,
          height: node.clientHeight,
          left: node.scrollLeft,
          width: node.clientWidth
        });
      });
    };

    handleViewport();
    node.addEventListener('scroll', handleViewport, { passive: true });
    return () => node.removeEventListener('scroll', handleViewport);
  }, [mainScrollRef]);

  useEffect(() => {
    setOpenItems(dimensionItems.map(item => item.id));
  }, [dimensionItems]);

  // Chargement des nouveux RDV lors du scroll horizontal
  useEffect(() => {
    if (visibleWindowStartInitial.current === 0 || visibleWindowEndInitial.current === 0) {
        visibleWindowStartInitial.current = visibleWindowStart;
        visibleWindowEndInitial.current = visibleWindowEnd;
        return; // On attend que les refs soient calées
    }

    if (isUserGrabbingScrollbar) return;

    // console.log(visibleWindowStart < visibleWindowStartInitial.current - (INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE - 2) * 7 * 24 * 60 * 60 * 1000 );
    // console.log(visibleWindowEnd > visibleWindowEndInitial.current + (INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER - 2) * 7 * 24 * 60 * 60 * 1000);
    console.log(visibleWindowEnd);
    console.log(visibleWindowEndInitial.current );
    
    
    
    // Calcul des constantes en ms pour la lisibilité
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
    // Seuil de déclenchement (ex: 2 semaines avant la fin des données connues)
    const THRESHOLD_BEFORE = (INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE - 2) * MS_PER_WEEK;
    const THRESHOLD_AFTER = (INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER - 2) * MS_PER_WEEK;

    // Calcul des bornes de chargement (ce qu'on va demander à l'API)
    // ex: On charge 4 semaines avant/après
    const LOAD_BUFFER_BEFORE = INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE * MS_PER_WEEK;
    const LOAD_BUFFER_AFTER = INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER * MS_PER_WEEK;

    // --- LOGIQUE DE DÉTECTION ---

    const isOutOfBoundLeft = visibleWindowStart < (visibleWindowStartInitial.current - THRESHOLD_BEFORE);
    const isOutOfBoundRight = visibleWindowEnd > (visibleWindowEndInitial.current + THRESHOLD_AFTER);

    if (isOutOfBoundLeft || isOutOfBoundRight) {
      
      // 1. Calculer les nouvelles bornes à charger
      // On se base sur la vue actuelle (visibleWindow) +/- le gros buffer de chargement
      const newLoadStart = visibleWindowStart - LOAD_BUFFER_BEFORE;
      const newLoadEnd = visibleWindowEnd + LOAD_BUFFER_AFTER;

      // 2. Charger les données
      onLoadAppointmentsInRange(newLoadStart, newLoadEnd);

      // 3. IMPORTANT : Mettre à jour les Refs pour repousser la "frontière"
      // Si on ne fait pas ça, au prochain render, isOutOfBound sera encore true !
      
      // On ne met à jour que le côté qui a déclenché le chargement (ou les deux)
      if (isOutOfBoundLeft) visibleWindowStartInitial.current = newLoadStart;
      if (isOutOfBoundRight) visibleWindowEndInitial.current = newLoadEnd;
    }


  }, [visibleWindowStart, visibleWindowEnd, onLoadAppointmentsInRange, isUserGrabbingScrollbar]);

  return (
    <div className="relative flex h-full flex-row calendar-grid" data-testid="calendar-grid">
      <div
        className="min-w-80 max-w-80 pl-2 bg-transparent flex flex-col sticky left-0 z-50 pr-7 overflow-y-scroll scrollbar-hide"
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleScrollY}
        ref={columnEmployeeRef}
      >
        <div 
          className={`sticky top-0 z-10 flex items-center bg-bg-primary justify-center flex-shrink-0`}
          style={{
            height: TIMELINE_HEADERITEMS_CELL_HEIGHT + TIMELINE_HEADERGROUPS_CELL_HEIGHT + CONTAINER_PADDING
          }}
        >
          <div className="custom-select-wrapper relative inline-block w-full">
            <CustomSelectWithImage
              options={selectOptions}
              value={calendarConfig.id}
              onChange={(value) => {
                const selectedConfig = availableConfigs.find(config => config.id === value);                  
                if (selectedConfig) {
                  onCalendarConfigChange(selectedConfig);
                }
              }}
              illustrationImage={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 10 80 80" width="25" height="25">
                  <defs>
                    <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00c6ff"/>
                      <stop offset="100%" stopColor="#0072ff"/>
                    </linearGradient>
                    <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8e2de2"/>
                      <stop offset="100%" stopColor="#4a00e0"/>
                    </linearGradient>
                  </defs>
                  <path d="M20 40 Q50 10 80 40 L60 50 Q40 60 20 40 Z" fill="url(#gradBlue)"/>
                  <path d="M20 60 Q50 90 80 60 L60 50 Q40 40 20 60 Z" fill="url(#gradPurple)"/>
                </svg>
              }
              placeholder="Sélectionner un calendrier"
              customArrow={<CustomArrow isOpen={false} />}
              className='py-3 px-4 w-full'
            />
          </div>
        </div>
        {dimensionItems.map((item) => {
          const isOpen = openItems.includes(item.id);
          const itemEmployees = employeesByDimension[item.id] || [];
          
          if (itemEmployees.length === 0) return null;
          
          return (
            <div
              key={item.id}
              className="rounded-4xl bg-white border-default bg-bg-secondary text-primary"
              style={{ 
                marginBottom: MARGIN_BETWEEN_TEAMS, borderWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE 
              }}
            >
              <button
                className="flex justify-between items-center w-full px-4 rounded-t-2xl focus:outline-none cursor-pointer"
                style={{ paddingTop: EMPLOYEE_GROUP_HEADER_PADDING_Y, paddingBottom: EMPLOYEE_GROUP_HEADER_PADDING_Y }}
                onClick={() => toggleItem(item.id)}
                type="button"
              >
                <div className="flex items-center gap-4">
                  <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="18" height="18" viewBox="0 0 510 510" enableBackground="new 0 0 510 510"  xmlSpace="preserve">
                    <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                      <g>
                        <g id="play-install">
                          <path d="M459,114.75H357v-51l-51-51H204l-51,51v51H51c-28.05,0-51,22.95-51,51v280.5c0,28.05,22.95,51,51,51h408&#10;&#9;&#9;&#9;c28.05,0,51-22.95,51-51v-280.5C510,137.7,487.05,114.75,459,114.75z M204,63.75h102v51H204V63.75z M216.75,408l-89.25-89.25&#10;&#9;&#9;&#9;l35.7-35.7l53.55,53.55L349.35,204l35.7,35.7L216.75,408z" fill="#00957f" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
                        </g>
                      </g>
                    </g>
                  </svg>
                  <span className="poppins font-bold">{item.name}</span>
                </div>
                <CustomArrow isOpen={isOpen} />
              </button>
              <div 
                className={`flex flex-col px-4 transition-all duration-200 ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'}`}
                style={{ paddingBottom: isOpen ? EMPLOYEE_GROUP_CONTENT_PADDING_BOTTOM : 0 }}
                onMouseOver={(e) => {
                  const target = (e.target as HTMLElement).closest('[data-employee-id]');
                  if (target) {
                    const id = target.getAttribute('data-employee-id');
                    if (id) updateHighlightedEmployeeRow(parseInt(id));
                  }
                }}
              >
                {isOpen && itemEmployees.map((employee) => {
                  const rows = flatRows.filter(r => r.type === 'employee' && r.id === employee.id);
                  const employeeRowHeight = rows.find(e => e.id === employee.id)?.height ?? CELL_HEIGHT;
                  return (
                    <div
                      key={employee.id}
                      className="flex items-center group gap-2 px-2 rounded-2xl cursor-pointer hover:bg-primary-ultra-light employee-row-item"
                      style={{ height: employeeRowHeight, alignItems: 'center' }}
                      data-employee-id={employee.id}
                    >
                      <div className="relative">
                        <img
                          src={employee.image?.image ?? `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`}
                          alt={employee.name}
                          className={`w-8 h-8 rounded-full border-1 shadow ${employee.type === 'interim' ? 'border-interim' : 'border-employee'}`}
                          onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`; }}
                        />
                        {employee.type === 'interim' && (
                          <span className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-full bg-interim border-2 border-white"></span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="poppins text-[16px] font-inherit group-hover:font-semibold">{employee.name + ' ' + employee.firstName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <TimelineFrame
        dayInTimeline={dayInTimeline}
        mainScrollRef={mainScrollRef}
        onScroll={(e) => {
          handleScrollY(e);              
        }}
        todayLineColor="#ffcdde"
      >
        {isUserGrabbingScrollbar && (
          <div 
            className="absolute top-0 left-0 bg-black opacity-30 pointer-events-none z-20" 
            style={{
              width:`${dayInTimeline.length * CELL_WIDTH}px`,
              height: totalContentHeight,
              top: TIMELINE_HEADERGROUPS_CELL_HEIGHT + TIMELINE_HEADERITEMS_CELL_HEIGHT
            }}
          />
        )}
        
        <div 
          className="calendar-table bg-bg-secondary relative"
          style={{
            width: `${dayInTimeline.length * CELL_WIDTH}px`,
            position: 'relative',
            height: totalContentHeight
          }}
          onMouseMove={handleMouseOver}
          onMouseOut={handleMouseOut}
          onContextMenu={handleGridContextMenu}
          ref={setTableRef}
        >
            {weekendColumns.map((col) => (
              <div
                key={`weekend-${col.key}`}
                className="pointer-events-none absolute top-0 bottom-0 WEEKEND"
                style={{ left: col.left, width: CELL_WIDTH}}
              />
            ))}
            {nonWorkingColumns.filter(col => col.left + CELL_WIDTH >= viewport.left - OVERSCAN_X && col.left <= viewport.left + viewport.width + OVERSCAN_X).map((col) => (
              <div
                key={`nonworking-${col.key}`}
                className="pointer-events-none absolute top-0 bottom-0 NON-WORKING"
                style={{ left: col.left, width: CELL_WIDTH}}
              />
            ))}
          {holidayColumns.filter(col => col.left + CELL_WIDTH >= viewport.left - OVERSCAN_X && col.left <= viewport.left + viewport.width + OVERSCAN_X).map((col) => (
            <div
              key={col.key}
              className="pointer-events-none absolute top-0 bottom-0 FERIE"
              style={{ left: col.left, width: CELL_WIDTH}}
            />
          ))}
          {hoverColumnLeft !== null && (
            <>
              <div
                className="pointer-events-none absolute top-0 bottom-0 bg-cell-hover z-10"
                style={{ left: hoverColumnLeft, width: CELL_WIDTH, marginLeft: -0 }}
              />
            </>
          )}
          {visibleRows.map((row) => {
            const commonProps = {
              style: {
                width: '100%',
                position: 'absolute' as const,
                top: row.start,
                height: row.height,
                left: 0,
                right: 0,
              },
            };

            return row.type === 'group' ? (
              <GroupRow
                key={row.id}
                {...commonProps}
                itemId={row.id}
                dayInTimeline={dayInTimeline}
                rowHeight={row.height}
                todayIndex={todayIndex}
                isFullDay={isFullDay}
              />
            ) : (
              <EmployeeRow
                key={row.id}
                {...commonProps}
                employee={row.data}
                dayInTimeline={dayInTimeline}
                appointments={isUserGrabbingScrollbar ? [] : (appointmentsByEmployee[row.id as number] || [])}
                rowHeight={row.height}
                isFullDay={isFullDay}
                events={events}
                visibleWindowStart={visibleWindowStart}
                visibleWindowEnd={visibleWindowEnd}
                nonWorkingDates={nonWorkingDates}
                isDisplayWeekend={isDisplayWeekend}
                onAppointmentMoved={onAppointmentMoved}
                onCellDoubleClick={onCellDoubleClick}
                onAppointmentDoubleClick={onAppointmentDoubleClick}
                onExternalDragDrop={onExternalDragDrop}
                handleContextMenu={handleContextMenu}
                todayIndex={todayIndex}
                selectedCell={selectedCell}
                selectedAppointmentId={selectedAppointmentId}
                onSelectCell={onSelectCell}
                onSelectAppointment={onSelectAppointment}
                isOverlapExpanded={!!expandedOverlapRows[row.id as number]}
                onExpandOverlaps={() => setExpandedOverlapRows((prev) => ({ ...prev, [row.id as number]: true }))}
                onCollapseOverlaps={() => setExpandedOverlapRows((prev) => ({ ...prev, [row.id as number]: false }))}
              />
            );
          })}
        </div>
      </TimelineFrame>
    </div>
  );
};

export default memo(DesktopCalendarGrid);
