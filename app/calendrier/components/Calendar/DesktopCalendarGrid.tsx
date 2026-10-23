import React, { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Appointment, CalendarConfig, Item, HalfDayInterval, User, PoleActivite, Equipe } from '../../types';
import { TimelineFrame } from './index';
import CalendarRows from './CalendarRows';
import EmployeeSidebar from './EmployeeSidebar';

import { 
  CELL_WIDTH,  
  DAY_INTERVALS,
  HOUR_MS,
  CELL_HEIGHT,
  TIMELINE_HEADERGROUPS_CELL_HEIGHT,
  TIMELINE_HEADERITEMS_CELL_HEIGHT,
} from '../../utils/constants';
import { getRowId } from '../../utils/domIds';
import { getDimensionItemKey, getHierarchicalDimensionItems, groupEmployeesHierarchically } from '../../utils/filters';
import { isSameDay } from 'date-fns';
import { useSmartScroll } from '../../hooks/interactions/useSmartScroll';
import { useAutoScrollOnDrag } from '../../hooks/interactions/useAutoScrollOnDrag';
import { 
  useCalendarVirtualization, 
  useCalendarColumns, 
  useCalendarDragDrop, 
  useCalendarDataLoader 
} from '../../hooks';

interface DesktopCalendarGridProps {
  employees: User[];
  appointments: Appointment[];
  dayInTimeline: number[];
  initialTeams: Record<number, Equipe>;
  poleActivites: Record<number, PoleActivite>;
  calendarConfig: CalendarConfig | null;
  onCalendarConfigChange: (config: CalendarConfig) => void;
  availableConfigs: CalendarConfig[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  events: Record<number, Item>;
  nonWorkingDates: Record<string, {Id: number; TypeJourCode: string }>;
  isDisplayWeekend: boolean;
  tagPlacement?: 'hover' | 'fixed';
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  handleScrollY: (e: React.UIEvent<HTMLDivElement>) => void;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
  tableRef: React.RefObject<HTMLDivElement | null>;
  handleMouseOver: (e: React.MouseEvent<HTMLElement>) => void;
  handleMouseOut: (e: React.MouseEvent<HTMLElement>) => void;
  onAppointmentMoved: (data: { id: number; newStartDate: number; newEndDate: number; newEmployeeId: number; idRessource: number; resizeDirection?: 'left' | 'right' }, saveToHistory?: boolean, newPriority?: number) => void;
  onCellDoubleClick: (date: number, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (item: Item, date: number, intervalName: 'morning' | 'afternoon', employeeId: number, priority: number) => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  handleEmployeeContextMenu: (e: React.MouseEvent, employee: User) => void;
  updateHighlightedEmployeeRow: (employeeId: number | null) => void;
  selectedCell: { employeeId: number; date: number } | null;
  initialEmployeeId: number | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
  hoverColumnLeft: number | null;
  onLoadAppointmentsInRange: (startDate: number, endDate: number, employeeIds?: number[]) => Promise<boolean>;
  mouseUpAfterScroll: () => void;
  onLockedError: (message: string) => void;
  onCalendarPositionChange: (position: { date?: number; idPersonnel?: number }) => void;
}

const getAllDimensionItemKeys = (items: any[]): (string | number)[] => {
  return items.flatMap(item => [
    getDimensionItemKey(item.id),
    ...(item.children?.length ? getAllDimensionItemKeys(item.children) : []),
  ]);
};

const DesktopCalendarGrid: React.FC<DesktopCalendarGridProps> = ({
  employees, dayInTimeline, HALF_DAY_INTERVALS, isFullDay, nonWorkingDates, events, appointments,
  onAppointmentMoved, onAppointmentDoubleClick, onExternalDragDrop, handleContextMenu, handleEmployeeContextMenu,
  selectedCell, initialEmployeeId, selectedAppointmentId, onSelectCell, onSelectAppointment, calendarConfig,
  onCalendarConfigChange, availableConfigs, mainScrollRef, handleScrollY, columnEmployeeRef, tableRef, initialTeams,
  poleActivites, onLoadAppointmentsInRange, updateHighlightedEmployeeRow, handleMouseOver, handleMouseOut,
  hoverColumnLeft, isDisplayWeekend, tagPlacement = 'hover', onLockedError, onCalendarPositionChange, mouseUpAfterScroll
}) => {

  const employeeHeights = useMemo(() => {
    return employees.map(employee => {
      const employeeAppointments = appointments.filter(app => Number(app.IdEmploye) === Number(employee.IdPersonnel));
      let maxOverallOverlap = 0;
      if (employeeAppointments.length > 0) {
        const sortedApps = [...employeeAppointments].sort((a, b) => a.DebutPlanningEvenement - b.DebutPlanningEvenement);
        const activeSlots: { endDate: number }[] = [];
        sortedApps.forEach(app => {
          for (let i = activeSlots.length - 1; i >= 0; i--) {
            if (activeSlots[i].endDate <= app.DebutPlanningEvenement) activeSlots.splice(i, 1);
          }
          activeSlots.push({ endDate: app.FinPlanningEvenement });
          maxOverallOverlap = Math.max(maxOverallOverlap, activeSlots.length);
        });
      }
      
      const calculatedHeight = maxOverallOverlap > 1 
        ? (maxOverallOverlap * (CELL_HEIGHT + 6)) + (tagPlacement === 'fixed' ? 24 : 16)
        : CELL_HEIGHT + 16;

      return { employeeId: employee.IdPersonnel, height: calculatedHeight, dayKey: undefined };
    });
  }, [employees, appointments, tagPlacement]);

  const [expandedOverlapRows, setExpandedOverlapRows] = useState<Record<number, boolean>>({});
  const [collapseTriggers, setCollapseTriggers] = useState<Record<number, number>>({});
  const initialEmployeeScrolledRef = useRef<number | null>(null);
  const [todayTs, setTodayTs] = useState<number | null>(null);

  const { isGrabbing, isScrolling } = useSmartScroll(mainScrollRef as React.RefObject<HTMLElement>, mouseUpAfterScroll);

  useAutoScrollOnDrag({
    scrollContainerRef: mainScrollRef as React.RefObject<HTMLElement>,
    enabled: isGrabbing,
    edgeThreshold: 160,
    scrollSpeed: 10,
  });

  // Détection des employés ayant des chevauchements pour alimenter expandedOverlapRows
  const overlappingEmployeeIds = useMemo(() => {
    const ids = new Set<number>();
    const appointmentsByEmployee = new Map<number, Appointment[]>();

    appointments.forEach((appointment) => {
      const employeeId = Number(appointment.IdEmploye);
      const employeeAppointments = appointmentsByEmployee.get(employeeId) ?? [];
      employeeAppointments.push(appointment);
      appointmentsByEmployee.set(employeeId, employeeAppointments);
    });

    appointmentsByEmployee.forEach((employeeAppointments, employeeId) => {
      const sortedAppointments = [...employeeAppointments].sort(
        (a, b) => a.DebutPlanningEvenement - b.DebutPlanningEvenement
      );
      let latestEnd = 0;

      sortedAppointments.forEach((appointment) => {
        if (appointment.DebutPlanningEvenement < latestEnd) {
          ids.add(employeeId);
        }
        latestEnd = Math.max(latestEnd, appointment.FinPlanningEvenement);
      });
    });

    return ids;
  }, [appointments]);

  useEffect(() => {
    setExpandedOverlapRows((previous) => {
      const next: Record<number, boolean> = {};
      overlappingEmployeeIds.forEach((employeeId) => {
        next[employeeId] = previous[employeeId] ?? true;
      });
      return next;
    });
  }, [overlappingEmployeeIds]);

  const { visibleWindowStart, visibleWindowEnd } = useMemo(() => {
    if (!dayInTimeline.length || !mainScrollRef.current) return { visibleWindowStart: 0, visibleWindowEnd: 0 };
    const startPx = Math.max(0, mainScrollRef.current.scrollLeft - 400);
    const endPx = mainScrollRef.current.scrollLeft + mainScrollRef.current.clientWidth + 400;
    const startIndex = Math.max(0, Math.min(Math.floor(startPx / CELL_WIDTH), dayInTimeline.length - 1));
    const endIndex = Math.max(0, Math.min(Math.ceil(endPx / CELL_WIDTH), dayInTimeline.length - 1));
    
    return { 
      visibleWindowStart: dayInTimeline[startIndex] ?? 0, 
      visibleWindowEnd: (dayInTimeline[endIndex] ?? 0) + (24 * 60 * 60 * 1000) 
    };
  }, [dayInTimeline, mainScrollRef.current?.scrollLeft, mainScrollRef.current?.clientWidth]);

  const appointmentsInHorizontalWindow = useMemo(() => {
    return appointments.filter(app => app.FinPlanningEvenement > visibleWindowStart && app.DebutPlanningEvenement < visibleWindowEnd);
  }, [appointments, visibleWindowStart, visibleWindowEnd]);

  const visibleEmployeeIdsInWindow = useMemo(() => {
    const ids = new Set<number>();
    appointmentsInHorizontalWindow.forEach((app) => {
      if (app.DebutPlanningEvenement < visibleWindowEnd && app.FinPlanningEvenement > visibleWindowStart) ids.add(app.IdEmploye);
    });
    return ids;
  }, [appointmentsInHorizontalWindow, visibleWindowStart, visibleWindowEnd]);

  const filteredEmployees = useMemo(() => {
    if (!calendarConfig) return employees;
    return employees.filter(emp => emp.Actif !== false || visibleEmployeeIdsInWindow.has(emp.IdPersonnel));
  }, [employees, visibleEmployeeIdsInWindow, calendarConfig]);

  const dimensionItems = useMemo(() => {
    return getHierarchicalDimensionItems(calendarConfig?.Group, filteredEmployees, initialTeams, poleActivites);
  }, [calendarConfig?.Group, filteredEmployees, initialTeams, poleActivites]);

  const [openItems, setOpenItems] = useState<(string | number)[]>();

  useEffect(() => {
    setOpenItems(getAllDimensionItemKeys(dimensionItems));
  }, [dimensionItems]);

  const employeesByDimension = useMemo(() => {
    return groupEmployeesHierarchically(filteredEmployees, calendarConfig?.Group, initialTeams, poleActivites);
  }, [filteredEmployees, calendarConfig?.Group, initialTeams, poleActivites]);

  const flatRows = useCalendarVirtualization({
    dimensionItems, openItems: openItems || [], employeeHeights, expandedOverlapRows
  });

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => mainScrollRef.current,
    estimateSize: (index) => flatRows[index]?.height ?? CELL_HEIGHT,
    overscan: 25,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [expandedOverlapRows, employeeHeights, rowVirtualizer]);

  const visibleRows = rowVirtualizer.getVirtualItems().map((virtualRow) => {
    const row = flatRows[virtualRow.index];
    return {
      ...row,
      start: virtualRow.start,
      end: virtualRow.start + virtualRow.size,
      domId: row.type === 'employee' ? getRowId('employee', row.id as number) : getRowId('group', row.id as string)
    };
  });
  
  const totalContentHeight = rowVirtualizer.getTotalSize();

  const todayIndex = useMemo(() => {
    if (!todayTs) return -1;
    return dayInTimeline.findIndex(day => isSameDay(day, todayTs));
  }, [dayInTimeline, todayTs]);  

  const visibleEmployeeIds = useMemo(() => (
    visibleRows.filter((row) => row.type === 'employee').map((row) => Number(row.id))
  ), [visibleRows]);

  const { specialColumns } = useCalendarColumns({ dayInTimeline, nonWorkingDates });

  const dropRef = useCalendarDragDrop({
    tableRef, rowBoundaries: visibleRows, 
    dayInTimeline, HALF_DAY_INTERVALS, isFullDay, nonWorkingDates,
    appointments: appointmentsInHorizontalWindow, onAppointmentMoved, onExternalDragDrop,
  });

  useCalendarDataLoader({
    visibleWindowStart, visibleWindowEnd, isGrabbing, isScrolling, visibleEmployeeIds,
    onLoadAppointmentsInRange
  });

  const setTableRef = useCallback((node: HTMLDivElement | null) => {
    if (tableRef.current !== node) tableRef.current = node;
    dropRef(node);
  }, [dropRef]);

  const handleGridContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!tableRef.current || !visibleRows.length || !dayInTimeline.length) return;
    const tableRect = tableRef.current.getBoundingClientRect();
    const relativeX = e.clientX - tableRect.left;
    const relativeY = (e.clientY - tableRect.top) + (mainScrollRef.current?.scrollTop || 0);

    const dayIndex = Math.floor(relativeX / CELL_WIDTH);
    const targetRow = visibleRows.find((row) => relativeY >= row.start && relativeY < row.end);
    if (!targetRow || targetRow.type !== 'employee') return;

    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
    const offsetInDay = relativeX - dayIndex * CELL_WIDTH;
    const intervalIndex = Math.min(intervals.length - 1, Math.max(0, Math.floor(offsetInDay / (CELL_WIDTH / Math.max(1, intervals.length)))));
    const targetDate = (dayInTimeline[dayIndex] ?? 0) + (intervals[intervalIndex]?.startHour ?? 0) * HOUR_MS;

    handleContextMenu(e, 'cell', null, { employeeId: Number(targetRow.id), date: targetDate });
  }, [HALF_DAY_INTERVALS, dayInTimeline, handleContextMenu, isFullDay, visibleRows, mainScrollRef]);

  const appointmentsByEmployee = useMemo(() => {
    const map: Record<number, Appointment[]> = {};
    const employeeRowIds = new Set(visibleRows.filter(r => r.type === 'employee').map(r => Number(r.id)));
    
    visibleRows.forEach(row => { if (row.type === 'employee') map[Number(row.id)] = []; });
    appointmentsInHorizontalWindow.forEach(app => {
      if (employeeRowIds.has(Number(app.IdEmploye))) map[Number(app.IdEmploye)].push(app);
    });
    return map;
  }, [appointmentsInHorizontalWindow, visibleRows]);

  const toggleItem = (itemId: string | number) => {
    const itemKey = getDimensionItemKey(itemId);
    setOpenItems(open => open?.includes(itemKey) ? open.filter(id => id !== itemKey) : [...(open || []), itemKey]);
  };

  const handleCollapseRow = useCallback((employeeId: number) => {
    setExpandedOverlapRows(prev => ({ ...prev, [employeeId]: false }));
    setCollapseTriggers(prev => ({ ...prev, [employeeId]: (prev[employeeId] || 0) + 1 }));
  }, []);

  const handleExpandRow = useCallback((employeeId: number) => {
    setExpandedOverlapRows(prev => ({ ...prev, [employeeId]: true }));
  }, []);

  const handleSetRowExpansion = useCallback((employeeId: number, expanded: boolean) => {
    setExpandedOverlapRows((prev) => ({ ...prev, [employeeId]: expanded }));
  }, []);

  useEffect(() => { setTodayTs(Date.now()); }, []);

  useEffect(() => {
    if (!initialEmployeeId || !flatRows.length || !mainScrollRef.current) return;
    if (initialEmployeeScrolledRef.current === initialEmployeeId) return;
    
    const targetIndex = flatRows.findIndex(row => row.type === 'employee' && Number(row.id) === initialEmployeeId);
    if (targetIndex !== -1) {
      rowVirtualizer.scrollToIndex(targetIndex, { align: 'start' });
      initialEmployeeScrolledRef.current = initialEmployeeId;
    }
  }, [initialEmployeeId, flatRows, rowVirtualizer, mainScrollRef]);

  useEffect(() => { if (initialEmployeeId === null) initialEmployeeScrolledRef.current = null; }, [initialEmployeeId]);

  return (
    <div className="relative flex h-full flex-row calendar-grid" data-testid="calendar-grid">
      <EmployeeSidebar
        dimensionItems={dimensionItems}
        employeesByDimension={employeesByDimension}
        flatRows={flatRows}
        openItems={openItems || []}
        expandedOverlapRows={expandedOverlapRows}
        onToggleItem={toggleItem}
        onCollapseRow={handleCollapseRow}
        onExpandRow={handleExpandRow}
        onEmployeeContextMenu={handleEmployeeContextMenu}
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
        onScroll={handleScrollY}
        todayLineColor="#ffcdde"
        nonworkingDates={nonWorkingDates}
      >
        {isGrabbing && (
          <div 
            className="absolute left-0 bg-black opacity-30 pointer-events-none z-20" 
            style={{
              width: `${dayInTimeline.length * CELL_WIDTH}px`,
              height: totalContentHeight,
              top: TIMELINE_HEADERGROUPS_CELL_HEIGHT + TIMELINE_HEADERITEMS_CELL_HEIGHT
            }}
          />
        )}

        <div 
          className="calendar-table bg-secondary-bg relative"
          style={{ width: `${dayInTimeline.length * CELL_WIDTH}px`, position: 'relative', height: totalContentHeight }}
          onMouseMove={handleMouseOver}
          onMouseOut={handleMouseOut}
          onContextMenu={handleGridContextMenu}
          ref={setTableRef}
        >
          {specialColumns.map((col) => (
            <div 
              key={`overlay-${col.key}`} 
              className={`pointer-events-none absolute top-0 bottom-0 ${col.className}`} 
              style={{ 
                left: col.left, 
                width: CELL_WIDTH,
                backgroundColor: col.CouleurFond, // S'appliquera si défini via le contexte, sinon transparent/géré par CSS
                color: col.CouleurTexte
              }} 
            />
          ))}
          
          {hoverColumnLeft !== null && (
            <div className="pointer-events-none absolute top-0 bottom-0 bg-cell-hover z-10" style={{ left: hoverColumnLeft, width: CELL_WIDTH, marginLeft: -0 }} />
          )}

          <CalendarRows 
            visibleRows={visibleRows}
            dayInTimeline={dayInTimeline}
            todayIndex={todayIndex}
            isFullDay={isFullDay}
            isGrabbing={isGrabbing}
            appointmentsByEmployee={appointmentsByEmployee}
            EMPTY_APPOINTMENTS={[]}
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
            onLockedError={onLockedError}
          />
        </div>
      </TimelineFrame>
    </div>
  );
};

export default memo(DesktopCalendarGrid);