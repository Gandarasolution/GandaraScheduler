import React, { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { Appointment, Groupe, CalendarConfig, Item, HalfDayInterval, User } from '../../types';
import { TimelineFrame } from './index';
import CalendarRows from './CalendarRows';
import EmployeeSidebar from './EmployeeSidebar';

import { 
  CELL_WIDTH, 
  TIMELINE_HEADERITEMS_CELL_HEIGHT, 
  TIMELINE_HEADERGROUPS_CELL_HEIGHT, 
  CONTAINER_PADDING,
  DAY_INTERVALS,
  HOUR_MS,
} from '../../utils/constants';
import { applyFiltersToEmployees, getHierarchicalDimensionItems, groupEmployeesHierarchically, getFlatFilters } from '../../utils/filters';
import { isSameDay } from 'date-fns';
import { useSmartScroll } from '../../hooks/interactions/useSmartScroll';
import { useAutoScrollOnDrag } from '../../hooks/interactions/useAutoScrollOnDrag';
import { 
  useCalendarLayout, 
  useCalendarVirtualization, 
  useCalendarColumns, 
  useCalendarDragDrop, 
  useCalendarDataLoader 
} from '../../hooks';

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
    const items = getHierarchicalDimensionItems(calendarConfig.Group, employees, initialTeams);
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

    const startTs = dayInTimeline[safeStartIndex] ?? 0;
    // Pour la fin, on ajoute 24h pour être sûr d'inclure les RDV qui dépassent la journée
    const endTs = (dayInTimeline[safeEndIndex] ?? 0) + (24 * 60 * 60 * 1000); 

    return { visibleWindowStart: startTs, visibleWindowEnd: endTs };
  }, [dayInTimeline, viewport.left, viewport.width]);

  const dimensionItems = useMemo(() => {
    return getHierarchicalDimensionItems(calendarConfig.Group, employees, initialTeams);
  }, [calendarConfig.Group, employees, initialTeams]);

  
  const filteredEmployees = useMemo(() => {
    const baseFiltered = applyFiltersToEmployees(employees, getFlatFilters(calendarConfig.filterCategories));
    
    // Filtrer les employés inactifs qui n'ont pas de rdv dans la fenêtre visible
    return baseFiltered.filter(emp => {
      // Si l'employé est actif (ou actif non défini = actif par défaut), le garder
      if (emp.Actif !== false) {
        return true;
      }
      
      // Si l'employé est inactif, vérifier s'il a des rdv dans la fenêtre visible
      const hasVisibleAppointments = appointmentsWithTop.some(app => 
        app.Employee.IdPersonnel === emp.IdPersonnel && 
        app.DebutPlanningEvenement > visibleWindowStart && 
        app.FinPlanningEvenement < visibleWindowEnd
      );
      
      return hasVisibleAppointments;
    });
  }, [employees, calendarConfig.filterCategories, appointmentsWithTop, visibleWindowStart, visibleWindowEnd]);

  const employeesByDimension = useMemo(() => {
    return groupEmployeesHierarchically(filteredEmployees, calendarConfig.Group, initialTeams);
  }, [filteredEmployees, calendarConfig.Group, initialTeams]);
  
  //console.log('emp', employeesByDimension);
  

  const todayIndex = useMemo(() => {
    if (!todayTs) return -1;
    return dayInTimeline.findIndex(day => isSameDay(day, todayTs));
  }, [dayInTimeline, todayTs]);  

  // Virtualisation avec hook dédié
  const { 
    flatRows, 
    rowBoundaries, 
    totalContentHeight, 
    visibleRows 
  } = useCalendarVirtualization({
    dimensionItems,
    openItems,
    employeesByDimension,
    employeeHeights,
    expandedOverlapRows,
    contentViewportTop,
    contentViewportBottom,
    overscanY: OVERSCAN_Y,
  });

  // Colonnes spéciales (week-ends, jours fériés, jours non travaillés)
  const { holidayColumns, weekendColumns, nonWorkingColumns } = useCalendarColumns({
    dayInTimeline,
    nonWorkingDates,
  });

  // Drag & Drop avec hook dédié
  const dropRef = useCalendarDragDrop({
    tableRef,
    rowBoundaries,
    dayInTimeline,
    HALF_DAY_INTERVALS,
    isFullDay,
    nonWorkingDates,
    appointmentsWithTop,
    onAppointmentMoved,
    onExternalDragDrop,
  });

  // Chargement des données
  useCalendarDataLoader({
    visibleWindowStart,
    visibleWindowEnd,
    isGrabbing,
    isScrolling,
    onLoadAppointmentsInRange: async (start, end) => {
      await onLoadAppointmentsInRange(start, end);
    },
  });

  const setTableRef = useCallback((node: HTMLDivElement | null) => {
    if (tableRef.current !== node) {
      tableRef.current = node;
    }
    dropRef(node);
  }, [dropRef]);

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
    const targetDate = (dayInTimeline[dayIndex] ?? 0) + intervalStartHour * HOUR_MS;

    handleContextMenu(e, 'cell', null, { employeeId: Number(targetRow.id), date: targetDate });
  }, [HALF_DAY_INTERVALS, dayInTimeline, handleContextMenu, isFullDay, rowBoundaries, totalContentHeight]);

  const previousAppointmentsMapRef = React.useRef<Record<number, (Appointment & { top: number })[]>>({});

  const appointmentsByEmployee = useMemo(() => {
    const map: Record<number, (Appointment & { top: number })[]> = {};

    employees.forEach(emp => { map[emp.IdPersonnel] = []; });

    appointmentsWithTop.forEach(app => {
      if (!map[app.Employee.IdPersonnel]) map[app.Employee.IdPersonnel] = [];
      map[app.Employee.IdPersonnel].push(app);
    });

    const prevMap = previousAppointmentsMapRef.current;
    let hasChanges = false;
    const finalMap: Record<number, (Appointment & { top: number })[]> = {};

    employees.forEach(emp => {
      const prevApps = prevMap[emp.IdPersonnel] || [];
      const newApps = map[emp.IdPersonnel];
      let rowChanged = prevApps.length !== newApps.length;

      if (!rowChanged) {
        for (let i = 0; i < newApps.length; i++) {
          if (
            prevApps[i].IdPlanningEvenement !== newApps[i].IdPlanningEvenement || 
            prevApps[i].DebutPlanningEvenement !== newApps[i].DebutPlanningEvenement || 
            prevApps[i].FinPlanningEvenement !== newApps[i].FinPlanningEvenement || 
            prevApps[i].top !== newApps[i].top || 
            prevApps[i].AnnotationPlanningEvenement !== newApps[i].AnnotationPlanningEvenement || 
            prevApps[i].Etiquette?.IdPlanningEtiquette !== newApps[i].Etiquette?.IdPlanningEtiquette
          ) {
            rowChanged = true;
            break;
          }
        }
      }

      if (rowChanged) {
        finalMap[emp.IdPersonnel] = newApps;
        hasChanges = true;
      } else {
        finalMap[emp.IdPersonnel] = prevApps; // Keep previous array reference!
      }
    });

    if (hasChanges || Object.keys(prevMap).length === 0) {
      previousAppointmentsMapRef.current = finalMap;
    }
    return finalMap;
  }, [appointmentsWithTop, employees]);

  const toggleItem = (itemId: string | number) => {
    setOpenItems(open =>
      open.includes(itemId)
        ? open.filter(id => id !== itemId)
        : [...open, itemId]
    );
  };

  const handleCollapseRow = useCallback((employeeId: number) => {
    setExpandedOverlapRows(prev => ({ ...prev, [employeeId]: false }));
    setCollapseTriggers(prev => ({ ...prev, [employeeId]: (prev[employeeId] || 0) + 1 }));
  }, []);

  
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
    const currentDimensionItems = getHierarchicalDimensionItems(calendarConfig.Group, employees, initialTeams);
    setOpenItems(currentDimensionItems.map(item => item.id));
    
  }, [calendarConfig.Group]);



  return (
    <div className="relative flex h-full flex-row calendar-grid" data-testid="calendar-grid">
      <EmployeeSidebar
        dimensionItems={dimensionItems}
        employeesByDimension={employeesByDimension}
        flatRows={flatRows}
        openItems={openItems}
        expandedOverlapRows={expandedOverlapRows}
        onToggleItem={toggleItem}
        onCollapseRow={handleCollapseRow}
        calendarConfig={calendarConfig}
        availableConfigs={availableConfigs}
        onCalendarConfigChange={onCalendarConfigChange}
        updateHighlightedEmployeeRow={updateHighlightedEmployeeRow}
        handleScrollY={handleScrollY}
        columnEmployeeRef={columnEmployeeRef}
      />
      
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
          className="calendar-table bg-secondary-bg relative"
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
            mainScrollRef={mainScrollRef as React.RefObject<HTMLDivElement>}
          />
        </div>
      </TimelineFrame>
    </div>
  );
};

export default memo(DesktopCalendarGrid);
