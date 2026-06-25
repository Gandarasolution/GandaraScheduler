import { useCallback, useRef, useEffect } from 'react';
import { CELL_WIDTH } from '@/app/calendrier/utils/constants';
import { getRowId, parseRowId } from '@/app/calendrier/utils/domIds';

interface UseCalendarInteractionsParams {
  dayInTimeline: number[];
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
  onHoverMove?: (data: { colLeft: number}) => void;
}

export const useCalendarInteractions = ({
  dayInTimeline,
  mainScrollRef,
  columnEmployeeRef,
  onHoverMove,
}: UseCalendarInteractionsParams) => {
  
  const lastHoveredCol = useRef<number>(-1);
  const lastHoveredRowId = useRef<string | null>(null);
  const isDragging = useRef(false);
  const isSyncingScroll = useRef(false);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number | null>(null);
  const pendingPoint = useRef<{ x: number; y: number } | null>(null);

  const updateHighlight = useCallback((clientX: number, clientY: number, tableElement: HTMLElement) => {
    if (!tableElement) return;
    
    // Throttle using requestAnimationFrame but keep latest point
    if (rafId.current) {
      pendingPoint.current = { x: clientX, y: clientY };
      return;
    }

    pendingPoint.current = { x: clientX, y: clientY };

    

    const run = () => {
      rafId.current = null;
      const point = pendingPoint.current;
      pendingPoint.current = null;
      if (!point) return;

      const tableRect = tableElement.getBoundingClientRect();
      const mouseX = point.x - tableRect.left;
      const totalWidth = dayInTimeline.length * CELL_WIDTH;
      const withinX = mouseX >= 0 && mouseX <= totalWidth;
      const colIndex = Math.floor(mouseX / CELL_WIDTH);
      
            

      const elementAtPoint = document.elementFromPoint(point.x, point.y) as HTMLElement;
      const row = elementAtPoint?.closest('.calendar-row') as HTMLElement;
      const rowId = row ? row.id : null;
      
      //console.log('Row ID under mouse:', rowId);
      if (withinX && colIndex === lastHoveredCol.current && rowId === lastHoveredRowId.current) {
        return;
      }

      lastHoveredCol.current = withinX ? colIndex : -1;
      lastHoveredRowId.current = rowId;

      if (withinX) {
        const clampedCol = Math.min(Math.max(colIndex, 0), dayInTimeline.length - 1);
        const rowsToUpdate = tableElement.querySelectorAll('[data-hover-row="true"]');
        rowsToUpdate.forEach(r => (r as HTMLElement).removeAttribute('data-hover-row'));

        const rows = tableElement.querySelectorAll('.calendar-row');
        rows.forEach(r => {
          if (r.id === rowId) {                        
            r.setAttribute('data-hover-row', 'true');
          }
        });

        onHoverMove?.({ colLeft: clampedCol * CELL_WIDTH });
      } else {
        onHoverMove?.({ colLeft: -1 });
      }
      
      const employeesToUpdate = document.querySelectorAll('[data-hover="true"]');
      employeesToUpdate.forEach(emp => (emp as HTMLElement).removeAttribute('data-hover'));
      
      if (rowId) {
        const parsed = parseRowId(rowId);
        if (parsed && parsed.type === 'employee') {
          const employeeElement = document.querySelector(
            `.employee-row-item[data-employee-id="${parsed.id}"]`
          ) as HTMLElement;
          if (employeeElement) {
            employeeElement.setAttribute('data-hover', 'true');
          }
        }
      }

      if (pendingPoint.current) {
        rafId.current = requestAnimationFrame(run);
      }
    };

    rafId.current = requestAnimationFrame(run);
  }, [dayInTimeline, mainScrollRef, onHoverMove]);

  const updateHighlightedEmployeeRow = useCallback((employeeId: number | null) => {
    console.log('Updating highlighted employee row for employeeId:', employeeId);
      const tableElement = tableRef.current;
      if (!tableElement) return;
  
      const rows = tableElement.querySelectorAll('.calendar-row');    
      rows.forEach(row => {      
        if (row.id === getRowId('employee', employeeId || 0)) {              
          row.setAttribute('data-hover-row', 'true');
        } else {
          row.removeAttribute('data-hover-row');
        }
      });
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const table = e.currentTarget as HTMLElement;
    if (!table) return;

    updateHighlight(e.clientX, e.clientY, table);
  }, [updateHighlight]);

  const handleMouseOut = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      document.querySelectorAll('[data-hover="true"]').forEach(emp => {
        (emp as HTMLElement).removeAttribute('data-hover');
      });
      const rowsToUpdate = (tableRef.current?.querySelectorAll('[data-hover-row="true"]') || []);
      rowsToUpdate.forEach(r => (r as HTMLElement).removeAttribute('data-hover-row'));
      onHoverMove?.({ colLeft: -1});
    }
  }, [onHoverMove]);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (!isDragging.current || !tableRef.current) return;

      updateHighlight(e.clientX, e.clientY, tableRef.current);
    };

    const handleDragStart = () => {
      isDragging.current = true;
    };

    const handleDragEnd = () => {
      isDragging.current = false;
      onHoverMove?.({ colLeft: -1});
      document.querySelectorAll('[data-hover="true"]').forEach(emp => {
        (emp as HTMLElement).removeAttribute('data-hover');
      });
      const rowsToUpdate = (tableRef.current?.querySelectorAll('[data-hover-row="true"]') || []);
      rowsToUpdate.forEach(r => (r as HTMLElement).removeAttribute('data-hover-row'));
      lastHoveredCol.current = -1;
      lastHoveredRowId.current = null;
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      pendingPoint.current = null;
    };
  }, [updateHighlight, onHoverMove]);

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
  }, [mainScrollRef, columnEmployeeRef]);

  return {
    tableRef,
    updateHighlightedEmployeeRow,
    handleMouseMove,
    handleMouseOut,
    handleScrollY
  };
};
