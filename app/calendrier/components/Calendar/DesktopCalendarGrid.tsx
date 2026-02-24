import React, { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Appointment, Groupe, CalendarConfig, Item, HalfDayInterval, User } from '../../types';
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
  ROW_HEIGHT,
} from '../../utils/constants';
import { applyFiltersToEmployees, getHierarchicalDimensionItems, groupEmployeesHierarchically, HierarchicalGroupItem, getFlatFilters } from '../../utils/filters';
import { isSameDay, isWeekend } from 'date-fns';
import { getNextWorkedDay, isHoliday } from '../../utils/dates';
import { getRowId } from '../../utils/domIds';
import { useSmartScroll } from '../../hooks/useSmartScroll';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
import { is } from 'date-fns/locale';
import { useCalendarLayout } from '../../hooks';


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

interface CalendarRowsProps {
  visibleRows: Array<{ type: 'group' | 'employee', id: string | number, uniqueKey: string, data: any, height: number, start: number, end: number, domId: string }>;
  dayInTimeline: number[];
  todayIndex: number;
  isFullDay: boolean;
  isGrabbing: boolean;
  appointmentsByEmployee: Record<number, (Appointment & { top: number })[]>;
  EMPTY_APPOINTMENTS: (Appointment & { top: number })[];
  events: Item[];
  visibleWindowStart: number;
  visibleWindowEnd: number;
  isDisplayWeekend: boolean;
  onAppointmentMoved: (id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection?: 'left' | 'right', saveToHistory?: boolean, newPriority?: number) => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  selectedCell: { employeeId: number; date: number } | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
  expandedOverlapRows: Record<number, boolean>;
  handleSetRowExpansion: (employeeId: number, expanded: boolean) => void;
  collapseTriggers: Record<number, number>;
  tagPlacement: 'hover' | 'fixed';
}

const CalendarRows = memo(({
  visibleRows,
  dayInTimeline,
  todayIndex,
  isFullDay,
  isGrabbing,
  appointmentsByEmployee,
  EMPTY_APPOINTMENTS,
  events,
  visibleWindowStart,
  visibleWindowEnd,
  isDisplayWeekend,
  onAppointmentMoved,
  onAppointmentDoubleClick,
  handleContextMenu,
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
  expandedOverlapRows,
  handleSetRowExpansion,
  collapseTriggers,
  tagPlacement
}: CalendarRowsProps) => {
  return (
    <>
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
            key={row.uniqueKey}
            {...commonProps}
            itemId={row.id}
            dayInTimeline={dayInTimeline}
            todayIndex={todayIndex}
            isFullDay={isFullDay}
          />
        ) : (
          <EmployeeRow
            key={row.uniqueKey}
            {...commonProps}
            employee={row.data}
            dayInTimeline={dayInTimeline}
            appointments={isGrabbing ? EMPTY_APPOINTMENTS : (appointmentsByEmployee[row.id as number] || EMPTY_APPOINTMENTS)}
            rowHeight={row.height}
            isFullDay={isFullDay}
            events={events}
            visibleWindowStart={visibleWindowStart}
            visibleWindowEnd={visibleWindowEnd}
            isDisplayWeekend={isDisplayWeekend}
            onAppointmentMoved={onAppointmentMoved}
            onAppointmentDoubleClick={onAppointmentDoubleClick}
            handleContextMenu={handleContextMenu}
            todayIndex={todayIndex}
            selectedCell={selectedCell}
            selectedAppointmentId={selectedAppointmentId}
            onSelectCell={onSelectCell}
            onSelectAppointment={onSelectAppointment}
            isOverlapExpanded={!!expandedOverlapRows[row.id as number]}
            onSetExpansion={handleSetRowExpansion}
            collapseTrigger={collapseTriggers[row.id as number]}
            tagPlacement={tagPlacement}
          />
        );
      })}
    </>
  );
});
CalendarRows.displayName = 'CalendarRows';

interface DesktopCalendarGridProps {
  employees: User[];
  appointments: Appointment[];
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
  tagPlacement?: 'hover' | 'fixed';
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  handleScrollY: (e: React.UIEvent<HTMLDivElement>) => void;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
  tableRef: React.RefObject<HTMLDivElement | null>;
  handleMouseOver: (e: React.MouseEvent<HTMLElement>) => void;
  handleMouseOut: (e: React.MouseEvent<HTMLElement>) => void;
  onAppointmentMoved: (id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection?: 'left' | 'right', saveToHistory?: boolean, newPriority?: number) => void;
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
  onLoadAppointmentsInRange: (startDate: number, endDate: number) => Promise<boolean>;
  mouseUpAfterScroll: () => void;
}


const DesktopCalendarGrid: React.FC<DesktopCalendarGridProps> = ({
  employees,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  events,
  appointments,
  onAppointmentMoved,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
  calendarConfig,
  onCalendarConfigChange,
  availableConfigs,
  mainScrollRef,
  handleScrollY,
  columnEmployeeRef,
  tableRef,
  initialTeams,
  onLoadAppointmentsInRange,
  updateHighlightedEmployeeRow,
  handleMouseOver,
  handleMouseOut,
  hoverColumnLeft,
  isDisplayWeekend,
  tagPlacement = 'hover',
  mouseUpAfterScroll
}) => {
  
 // Use custom hooks for logic
  const { employeeHeights, appointmentsWithTop } = useCalendarLayout({
    employees,
    appointments,
    tagPlacement
  });

  
  const [openItems, setOpenItems] = useState<(string | number)[]>(() => {
    const items = getHierarchicalDimensionItems(calendarConfig.groupingLevels, employees, initialTeams);
    return items.map(i => i.id);
  });  
  const [expandedOverlapRows, setExpandedOverlapRows] = useState<Record<number, boolean>>({});
  const [collapseTriggers, setCollapseTriggers] = useState<Record<number, number>>({});
  
  // Use a stable empty array reference
  const EMPTY_APPOINTMENTS = useMemo(() => [], []);

  const handleSetRowExpansion = useCallback((employeeId: number, expanded: boolean) => {
    setExpandedOverlapRows((prev) => ({ ...prev, [employeeId]: expanded }));
  }, []);

  const [todayTs, setTodayTs] = useState<number | null>(null);
  const [viewport, setViewport] = useState<{ top: number; height: number; left: number; width: number }>({ 
      top: 0, 
      height: 0, 
      left: 0, 
      width: 0 
  });
  const isLoadingRef = useRef(false);
  const visibleWindowStartInitial = useRef(0);
  const visibleWindowEndInitial = useRef(0);

  const { isGrabbing, isScrolling } = useSmartScroll(mainScrollRef as React.RefObject<HTMLElement>, mouseUpAfterScroll);

  // Auto-scroll pendant le drag quand on est proche des bords
  useAutoScrollOnDrag({
    scrollContainerRef: mainScrollRef as React.RefObject<HTMLElement>,
    enabled: isGrabbing,
    edgeThreshold: 160,
    scrollSpeed: 100,
  });

  //Virtualization calcules 
  const headerHeight = TIMELINE_HEADERITEMS_CELL_HEIGHT + TIMELINE_HEADERGROUPS_CELL_HEIGHT + CONTAINER_PADDING;
  const contentViewportTop = Math.max(0, viewport.top - headerHeight);
  const contentViewportHeight = Math.max(0, viewport.height - headerHeight);
  const contentViewportBottom = contentViewportTop + contentViewportHeight;
  const OVERSCAN_Y = 800;
  const OVERSCAN_X = 400;

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

  const dimensionItems = useMemo(() => {
    return getHierarchicalDimensionItems(calendarConfig.groupingLevels, employees, initialTeams);
  }, [calendarConfig.groupingLevels, employees, initialTeams]);

  const filteredEmployees = useMemo(() => {
    const baseFiltered = applyFiltersToEmployees(employees, getFlatFilters(calendarConfig.filterCategories));
    
    // Filtrer les employés inactifs qui n'ont pas de rdv dans la fenêtre visible
    return baseFiltered.filter(emp => {
      // Si l'employé est actif (ou actif non défini = actif par défaut), le garder
      if (emp.actif !== false) {
        return true;
      }
      
      // Si l'employé est inactif, vérifier s'il a des rdv dans la fenêtre visible
      const hasVisibleAppointments = appointmentsWithTop.some(app => 
        app.employee.id === emp.id && 
        app.endDate > visibleWindowStart && 
        app.startDate < visibleWindowEnd
      );
      
      return hasVisibleAppointments;
    });
  }, [employees, calendarConfig.filterCategories, appointmentsWithTop, visibleWindowStart, visibleWindowEnd]);

  const employeesByDimension = useMemo(() => {
    return groupEmployeesHierarchically(filteredEmployees, calendarConfig.groupingLevels, initialTeams);
  }, [filteredEmployees, calendarConfig.groupingLevels, initialTeams]);
  

  const todayIndex = useMemo(() => {
    if (!todayTs) return -1;
    return dayInTimeline.findIndex(day => isSameDay(day, todayTs));
  }, [dayInTimeline, todayTs]);  

  // Flatten the data structure for virtualization
  const flatRows = useMemo(() => {
    const rows: Array<{ type: 'group' | 'employee', id: string | number, uniqueKey: string, data: any, height: number }> = [];
    
    // Fonction récursive pour traiter les items hiérarchiques
    const processHierarchicalItem = (
      item: any, 
      idx: number, 
      isChild: boolean = false,
      parentIdx?: number,
      level: number = 1
    ) => {
      // Calculate group header height
      let inactiveRowHeight = EMPLOYEE_GROUP_HEADER_HEIGHT;
      
      if (idx > 0 && !isChild) {
        const prevSiblingIdx = isChild && parentIdx !== undefined ? parentIdx : idx - 1;
        const prevItem = dimensionItems[prevSiblingIdx];
        const isPrevOpen = openItems.includes(prevItem.id);
        
        inactiveRowHeight += MARGIN_BETWEEN_TEAMS + EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE * 2;
        if (isPrevOpen) {
          inactiveRowHeight += EMPLOYEE_GROUP_CONTENT_PADDING_BOTTOM + 27;
        }
      }
      
      if (idx !== 0 || isChild) {
        rows.push({
          type: 'group',
          id: item.id,
          uniqueKey: `group-level${level}-${item.id}`,
          data: item,
          height: inactiveRowHeight 
        });
      }      
      
      if (openItems.includes(item.id)) {
        // Si l'item a des enfants (niveau 2), les traiter
        if (item.children && item.children.length > 0) {
          item.children.forEach((child: any, childIdx: number) => {
            processHierarchicalItem(child, childIdx, true, idx, level + 1);
          });
        } else {
          // Sinon, afficher les employés
          const itemEmployees = employeesByDimension[item.id] || [];
          itemEmployees.forEach(employee => {
            const baseHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;
            const adjustedHeight = expandedOverlapRows[employee.id]
              ? baseHeight
              : Math.min(baseHeight, ROW_HEIGHT);

            rows.push({
              type: 'employee',
              id: employee.id,
              uniqueKey: `employee-${employee.id}`,
              data: employee,
              height: adjustedHeight
            });
          });
        }
      }
    };
    
    // Traiter tous les items de dimension
    dimensionItems.forEach((item, idx) => {
      processHierarchicalItem(item, idx);
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
      const intervalWidth = CELL_WIDTH / intervalsPerDay;
      const totalIntervals = dayInTimeline.length * intervalsPerDay;
      if (totalIntervals <= 0) return;


      const dragOffset = item.dragOffset ?? 0;
      const adjustedX = Math.min(
        Math.max(relativeX - (relativeX % intervalWidth) - (dragOffset - (dragOffset % intervalWidth)), 0),
        totalIntervals * intervalWidth - 1
      );

      const intervalIndex = Math.min(
        Math.max(Math.floor(adjustedX / intervalWidth), 0),
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
      
      // Gestion de la priorité : détecter sur quel rdv (position Y) l'utilisateur drop
      const targetEmployeeId = Number(targetRow.id);
      
      // Trouver tous les rdv qui chevauchent la nouvelle position
      const overlappingAppointments = appointmentsWithTop.filter(app => 
        app.id !== item.id &&
        app.employee.id === targetEmployeeId &&
        app.startDate < newEnd &&
        app.endDate > targetDate
      );

      let newPriority: number | undefined = undefined;
      
      if (overlappingAppointments.length > 0) {
        // Calculer la position Y relative à la ligne de l'employé
        const employeeRowY = relativeY - (targetRow.start || 0);
        
        // Déterminer sur quel rdv (quelle rangée/top) l'utilisateur dépose
        // Chaque rangée a une hauteur de CELL_HEIGHT + 2px de marge
        const targetPriorityIndex = Math.floor(employeeRowY / (CELL_HEIGHT + 2));

        // Récupérer l'item d'origine pour vérifier s'il était déjà présent dans cette zone
        const originalItem = appointmentsWithTop.find(a => a.id === item.id);
        const isAlreadyPresent = originalItem && 
                               originalItem.employee.id === targetEmployeeId && 
                               originalItem.startDate < newEnd && 
                               originalItem.endDate > targetDate;

        // Trouver les rdv qui est à cet index de top parmi les rdv qui chevauchent
        const rdvAtTargetPosition = overlappingAppointments
          .sort((a, b) => (a.priority || 0) - (b.priority || 0)) // Trier par priorité croissante
          .filter(app => (app.priority ?? 0) === targetPriorityIndex);
          
        const startDateRdvTarget = rdvAtTargetPosition[0]?.startDate;
        const endDateRdvTarget = rdvAtTargetPosition[rdvAtTargetPosition.length - 1]?.endDate;
        // Trouver les rdv qui chevauchent et qui ont la même priorité que l'original
        const rdvatOriginalPosition = appointmentsWithTop
          .filter(app =>
            app.id !== item.id &&
            app.employee.id === originalItem?.employee.id &&
            app.startDate < endDateRdvTarget &&
            app.endDate > startDateRdvTarget &&
            (app.priority ?? 0) === (originalItem?.priority ?? 0)
          );          
        
        if (isAlreadyPresent) {
          if (rdvAtTargetPosition.length > 0) {
            // Si le rdv est déjà présent dans les overlapping et qu'on drop sur un autre rdv : on interchange
            newPriority = (rdvAtTargetPosition[0].priority ?? 0);
            // On update les autre RDV pour prendre l'ancienne priorité du RDV déplacé
            rdvAtTargetPosition.forEach(appToMove => {
              onAppointmentMoved(
                appToMove.id,
                appToMove.startDate,
                appToMove.endDate,
                appToMove.employee.id,
                undefined,
                false,
                (originalItem?.priority ?? 0)
              );
            });

            if (rdvatOriginalPosition.length > 0) {
              // Si on a des rdv à la position originale, on doit réajuster leur priorité
              rdvatOriginalPosition.forEach(appToAdjust => {
                if (appToAdjust.id !== item.id) {
                  onAppointmentMoved(
                    appToAdjust.id,
                    appToAdjust.startDate,
                    appToAdjust.endDate,
                    appToAdjust.employee.id,
                    undefined,
                    false,
                    newPriority
                  );
                } 
              });
            }
          } else {
            // Si c'est vide, il prend la priorité de l'emplacement choisi 
            newPriority = targetPriorityIndex;
          }
        } else {
          // Si il n'est pas dans les rdv overlapper
          if (rdvAtTargetPosition.length > 0) {
            // Et qu'on drop sur un autre rdv -> sa prio + 1
             newPriority = (rdvAtTargetPosition[0].priority ?? 0) + 1;
          } else {
             newPriority = targetPriorityIndex;
          }
        }
      }

      //console.log(newPriority);  
      onAppointmentMoved(item.id, targetDate, newEnd, targetEmployeeId, 'right', true, newPriority);
    },
  }), [DAY_INTERVALS, HALF_DAY_INTERVALS, dayInTimeline, getNextWorkedDay, isFullDay, nonWorkingDates, onAppointmentMoved, onExternalDragDrop, rowBoundaries, appointmentsWithTop]);

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

    employees.forEach(emp => map[emp.id] = []);

    appointmentsWithTop.forEach(app => {
      // Opti: Removed window filtering to keep reference stable
      if (!map[app.employee.id]) map[app.employee.id] = [];
      map[app.employee.id].push(app);
    });

    return map;
  }, [appointmentsWithTop, employees]);

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



  // --- 1. FONCTION DE CHARGEMENT CENTRALISÉE ---
  // Cette fonction ne décide pas QUAND charger, mais COMMENT charger
  const checkAndLoadData = useCallback((forceCriticalCheck = false) => {
      if (isLoadingRef.current) return;

      // Configuration des seuils
      const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
      
      // "Soft Threshold" (Zone de confort) : Utilisé quand on s'arrête
      const SOFT_THRESHOLD_BEFORE = (INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE - 2) * MS_PER_WEEK;
      const SOFT_THRESHOLD_AFTER = (INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER - 2) * MS_PER_WEEK;

      // "Hard Threshold" (Zone critique) : Utilisé pendant le scroll continu
      // On charge si on est à moins de 3 jours du bord par exemple
      const HARD_THRESHOLD = 3 * 24 * 60 * 60 * 1000; 

      // On choisit le seuil selon le mode (Forcé/Critique ou Normal/Arrêt)
      const thresholdBefore = forceCriticalCheck ? HARD_THRESHOLD : SOFT_THRESHOLD_BEFORE;
      const thresholdAfter = forceCriticalCheck ? HARD_THRESHOLD : SOFT_THRESHOLD_AFTER;

      // Initialisation si vide
      if (visibleWindowStartInitial.current === 0) {
          visibleWindowStartInitial.current = visibleWindowStart;
          visibleWindowEndInitial.current = visibleWindowEnd;
          return;
      }

      // Vérification
      const isOutOfBoundLeft = visibleWindowStart < (visibleWindowStartInitial.current - thresholdBefore);
      const isOutOfBoundRight = visibleWindowEnd > (visibleWindowEndInitial.current + thresholdAfter);

      if (isOutOfBoundLeft || isOutOfBoundRight) {
          console.log(`Loading data... Mode: ${forceCriticalCheck ? 'CRITICAL' : 'SOFT_STOP'}`);
          isLoadingRef.current = true;

          const LOAD_BUFFER_BEFORE = INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE * MS_PER_WEEK;
          const LOAD_BUFFER_AFTER = INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER * MS_PER_WEEK;

          const newLoadStart = visibleWindowStart - LOAD_BUFFER_BEFORE;
          const newLoadEnd = visibleWindowEnd + LOAD_BUFFER_AFTER;

          onLoadAppointmentsInRange(newLoadStart, newLoadEnd).finally(() => {
              isLoadingRef.current = false;
          });

          // Update optimiste
          if (isOutOfBoundLeft) visibleWindowStartInitial.current = newLoadStart;
          if (isOutOfBoundRight) visibleWindowEndInitial.current = newLoadEnd;
      }
  }, [visibleWindowStart, visibleWindowEnd, onLoadAppointmentsInRange]);


  // --- 2. SCÉNARIO A : RELÂCHEMENT DU GRAB ---
  // On utilise un effet qui surveille isGrabbing.
  // Quand isGrabbing passe de true à false -> On vérifie.
  const prevIsGrabbing = useRef(false);
  useEffect(() => {
    if (prevIsGrabbing.current && !isGrabbing) {
       // L'utilisateur vient de lâcher la barre
       checkAndLoadData(false); // Vérification standard (Soft)
    }
    prevIsGrabbing.current = isGrabbing;
  }, [isGrabbing, checkAndLoadData]);


  // --- 3. SCÉNARIO B : ARRÊT DU SCROLL (Flèches/Molette) ---
  // Quand isScrolling passe de true à false -> On vérifie.
  const prevIsScrolling = useRef(false);
  useEffect(() => {
    if (prevIsScrolling.current && !isScrolling && !isGrabbing) {
       // L'utilisateur a arrêté de scroller (fin du timer)
       checkAndLoadData(false); // Vérification standard (Soft)       
    }
    prevIsScrolling.current = isScrolling;
  }, [isScrolling, isGrabbing, checkAndLoadData]);


  // --- 4. SCÉNARIO C : LIMITE CRITIQUE PENDANT LE SCROLL ---
  // Si l'utilisateur scrolle (flèches/molette) SANS s'arrêter,
  // on veut quand même charger si on arrive vraiment au bout des données chargées.
  useEffect(() => {
    if (isScrolling && !isGrabbing) {
       // On vérifie avec le mode "Critique" (seuils très courts)
       // Cela permet de charger "juste à temps" si l'utilisateur ne lâche pas la flèche
       checkAndLoadData(true); 
    }
  }, [visibleWindowStart, visibleWindowEnd, isScrolling, isGrabbing, checkAndLoadData]);

  
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
    // On recalcule les IDs basés sur la nouvelle config
    const currentDimensionItems = getHierarchicalDimensionItems(calendarConfig.groupingLevels, employees, initialTeams);
    setOpenItems(currentDimensionItems.map(item => item.id));
    
  }, [calendarConfig.groupingLevels]);



  return (
    <div className="relative flex h-full flex-row calendar-grid" data-testid="calendar-grid">
      <div
        className="min-w-80 max-w-80 pl-2 bg-transparent flex flex-col sticky left-0 z-50 pr-7 overflow-y-scroll scrollbar-hide"
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleScrollY}
        ref={columnEmployeeRef}
      >
        <div 
          className={`sticky top-0 z-40 flex bg-bg-primary justify-center flex-shrink-0`}
          style={{
            height: TIMELINE_HEADERITEMS_CELL_HEIGHT + CONTAINER_PADDING
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
        {dimensionItems.map((item, index) => {
          const isOpen = openItems.includes(item.id);
          const itemEmployees = employeesByDimension[item.id] || [];
          
          if (itemEmployees.length === 0) return null;
          
          // Calcul de la position sticky : header principal + hauteurs des headers précédents
          const stickyTop = TIMELINE_HEADERITEMS_CELL_HEIGHT + CONTAINER_PADDING;

          const style = isOpen ? {
              marginBottom: MARGIN_BETWEEN_TEAMS, 
              borderLeftWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
              borderRightWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
          } : {
              marginBottom: MARGIN_BETWEEN_TEAMS, 
              borderWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
              width: '100%',
          }
          
          return (
            <div
              key={item.id}
              className="rounded-4xl border-default bg-bg-primary text-primary"
              style={style}
            >
              {/* --- DÉBUT DU HEADER "SANDWICH" --- */}
              <div
                className="sticky w-full"
                style={{ 
                  top: stickyTop,
                  // Z-Index très haut pour être sûr d'être au-dessus de tout le reste (liste + footer)
                  zIndex: 30 - index 
                }}
              >
                {isOpen && (
                  <>
                    {/* 1. LES CACHES (Le "Pain" du dessous) 
                      Ils masquent les éléments qui défilent derrière les coins arrondis du haut. 
                      Important : Mettre la couleur de fond globale de la page (ex: bg-bg-primary) */}
                    <div className="absolute top-0 -left-1 w-8 h-7 bg-bg-primary" />
                    <div className="absolute top-0 -right-1 w-7 h-7 bg-bg-primary" />
                  </>
                )}
                

                {/* 2. LE BOUTON VISUEL (Le "Fromage" du dessus)
                    On retire 'sticky', 'top' et 'zIndex' d'ici car c'est le parent qui gère ça maintenant.
                    On ajoute 'relative' pour qu'il s'empile bien sur les caches. */}
                <button
                  className={`relative flex justify-between items-center  px-4 ${isOpen ? 'rounded-t-4xl -ml-px border-default border-t border-r border-l w-[284px]' : 'rounded-4xl w-full'} focus:outline-none cursor-pointer bg-bg-secondary`}
                  style={{ 
                    paddingTop: EMPLOYEE_GROUP_HEADER_PADDING_Y, 
                    paddingBottom: EMPLOYEE_GROUP_HEADER_PADDING_Y,
                  }}
                  onClick={() => toggleItem(item.id)}
                  type="button"
                >
                  <div className="flex items-center gap-4">
                    {/* ... Contenu de votre SVG et du Titre ... */}
                    <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="18" height="18" viewBox="0 0 510 510" enableBackground="new 0 0 510 510" xmlSpace="preserve">
                      <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                        <g>
                          <g id="play-install">
                            <path d="M459,114.75H357v-51l-51-51H204l-51,51v51H51c-28.05,0-51,22.95-51,51v280.5c0,28.05,22.95,51,51,51h408c28.05,0,51-22.95,51-51v-280.5C510,137.7,487.05,114.75,459,114.75z M204,63.75h102v51H204V63.75z M216.75,408l-89.25-89.25l35.7-35.7l53.55,53.55L349.35,204l35.7,35.7L216.75,408z" fill="#00957f" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
                          </g>
                        </g>
                      </g>
                    </svg>
                    <span className="poppins font-bold">{item.name}</span>
                  </div>
                  <CustomArrow isOpen={isOpen} />
                </button>
              </div>
              
              {isOpen && itemEmployees.map((employee) => {
                const rows = flatRows.filter(r => r.type === 'employee' && r.id === employee.id);
                const employeeRowHeight = rows.find(e => e.id === employee.id)?.height ?? CELL_HEIGHT;
                const isInactive = employee.actif === false;
                
                return (
                  <div
                    key={employee.id}
                    className="flex  px-4 cursor-pointer bg-bg-secondary"
                    style={{ 
                      height: employeeRowHeight, 
                      alignItems: 'center',
                      top: stickyTop + EMPLOYEE_GROUP_HEADER_PADDING_Y * 2 + 24,
                      zIndex: 20 - index,
                      opacity: isInactive ? 0.5 : 1,
                    }}                    
                  >
                    <div 
                      className="flex px-2 rounded-2xl w-full h-full gap-2 group items-center hover:bg-primary-ultra-light employee-row-item"
                      data-employee-id={employee.id}
                      onMouseOver={(e) => {
                        updateHighlightedEmployeeRow(employee.id);
                      }}
                    >
                      <div className="relative">
                        <img
                          src={employee.image?.image ?? `https://placehold.co/32x32/cccccc/333333?text=${employee.nom.charAt(0)}`}
                          alt={employee.nom}
                          className={`w-8 h-8 rounded-full border-1 shadow ${employee.type === 'interim' ? 'border-interim' : 'border-employee'} ${isInactive ? 'grayscale' : ''}`}
                          onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/cccccc/333333?text=${employee.nom.charAt(0)}`; }}
                        />
                        {employee.type === 'interim' && (
                          <span className={`absolute -bottom-1 -right-1 block h-3 w-3 rounded-full border-2 border-white ${isInactive ? 'bg-gray-400' : 'bg-interim'}`}></span>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`poppins text-[16px] font-inherit group-hover:font-semibold truncate ${isInactive ? 'text-gray-400' : ''}`}>{employee.nom + ' ' + employee.prenom}</span>
                      </div>
                      {expandedOverlapRows[employee.id] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedOverlapRows(prev => ({ ...prev, [employee.id]: false }));
                            setCollapseTriggers(prev => ({ ...prev, [employee.id]: (prev[employee.id] || 0) + 1 }));
                          }}
                          className="text-[10px] font-semibold bg-white text-gray-700 border border-gray-200 rounded-full px-2 py-0.5 shadow-sm hover:bg-gray-50 transition"
                          type="button"
                        >
                          Masquer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {isOpen && (
                <div 
                  // 1. LE CONTENEUR STICKY (Invisible, sert juste de calque supérieur)
                  className="sticky w-[284px] h-9"
                  style={{
                    bottom: 0,
                    zIndex: 30 - index, // Toujours au-dessus de la liste
                    marginLeft: -1,
                    marginBottom: -EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
                  }}
                >
                  {/* 2. LES CACHES (Le "Pain" du dessous) 
                      Ils masquent la liste qui défile. Couleur = Fond de la page globale. */}
                  <div className="absolute bottom-0 left-0 w-6 h-7 bg-bg-primary" />
                  <div className="absolute bottom-0 right-0 w-6 h-7 bg-bg-primary" />

                  {/* 3. LE VISUEL DU FOOTER (Le "Fromage" du dessus)
                      C'est lui qui a l'arrondi, la couleur et la bordure. 
                      Il se pose SUR les caches. */}
                  <div 
                    className="relative w-full h-full bg-bg-secondary border-b border-l border-r border-default rounded-b-4xl"
                    // Pas besoin de z-index ici, car le flux naturel le place après (donc sur) les caches
                  />
                </div>
              )}
              
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
        {isGrabbing && (
          <div 
            className="absolute top-0 left-0 bg-black opacity-30 pointer-events-none z-10" 
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
          <CalendarRows 
            visibleRows={visibleRows}
            dayInTimeline={dayInTimeline}
            todayIndex={todayIndex}
            isFullDay={isFullDay}
            isGrabbing={isGrabbing}
            appointmentsByEmployee={appointmentsByEmployee}
            EMPTY_APPOINTMENTS={EMPTY_APPOINTMENTS}
            events={events}
            visibleWindowStart={visibleWindowStart}
            visibleWindowEnd={visibleWindowEnd}
            isDisplayWeekend={isDisplayWeekend}
            onAppointmentMoved={onAppointmentMoved}
            onAppointmentDoubleClick={onAppointmentDoubleClick}
            handleContextMenu={handleContextMenu}
            selectedCell={selectedCell}
            selectedAppointmentId={selectedAppointmentId}
            onSelectCell={onSelectCell}
            onSelectAppointment={onSelectAppointment}
            expandedOverlapRows={expandedOverlapRows}
            handleSetRowExpansion={handleSetRowExpansion}
            tagPlacement={tagPlacement}
            collapseTriggers={collapseTriggers}
          />
        </div>
      </TimelineFrame>
    </div>
  );
};

export default memo(DesktopCalendarGrid);
