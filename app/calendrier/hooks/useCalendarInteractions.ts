import { useCallback, useRef, useEffect } from 'react';
import { CELL_WIDTH } from '../utils/constants';

interface UseCalendarInteractionsParams {
  dayInTimeline: Date[];
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
}

export const useCalendarInteractions = ({
  dayInTimeline,
  mainScrollRef,
  columnEmployeeRef,
}: UseCalendarInteractionsParams) => {
  
  const lastHoveredCol = useRef<number>(-1);
  const lastHoveredRowId = useRef<string | null>(null);
  const isDragging = useRef(false);
  const isSyncingScroll = useRef(false);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const updateHighlight = useCallback((clientX: number, clientY: number, tableElement: HTMLTableElement) => {
    if (!tableElement) return;
    
    const tableRect = tableElement.getBoundingClientRect();
    const mouseX = clientX - tableRect.left;
    const colIndex = Math.floor(mouseX / CELL_WIDTH);
    
    const elementAtPoint = document.elementFromPoint(clientX, clientY) as HTMLElement;
    const cell = elementAtPoint?.closest('.calendar-cell') as HTMLElement ;
    
    const row = cell?.closest('.calendar-row') as HTMLElement;
    const rowId = row ? row.id : null;
    
    if (colIndex === lastHoveredCol.current && rowId === lastHoveredRowId.current) {
      return;
    }
    
    lastHoveredCol.current = colIndex;
    lastHoveredRowId.current = rowId;
    
    requestAnimationFrame(() => {
      if (colIndex >= 0 && colIndex < dayInTimeline.length) {
        const cellsToUpdate = tableElement.querySelectorAll('[data-hover-col="true"]');
        cellsToUpdate.forEach(c => (c as HTMLElement).removeAttribute('data-hover-col'));
        const rowsToUpdate = tableElement.querySelectorAll('[data-hover-row="true"]');
        rowsToUpdate.forEach(r => (r as HTMLElement).removeAttribute('data-hover-row'));
        
        const rows = tableElement.querySelectorAll('.calendar-row');
        rows.forEach(r => {
          if (r.id === rowId) {                        
            r.setAttribute('data-hover-row', 'true');
          }
          const cellInCol = r.children[colIndex] as HTMLElement;
          if (cellInCol) {
            cellInCol.setAttribute('data-hover-col', 'true');
          }
        });
      }
      
      const employeesToUpdate = document.querySelectorAll('[data-hover="true"]');
      employeesToUpdate.forEach(emp => (emp as HTMLElement).removeAttribute('data-hover'));
      
      if (rowId && rowId.startsWith('row-employee-')) {
        const employeeId = rowId.replace('row-employee-', '');
        const employeeElement = document.querySelector(
          `.employee-row-item[data-employee-id="${employeeId}"]`
        ) as HTMLElement;
        if (employeeElement) {
          employeeElement.setAttribute('data-hover', 'true');
        }
      }
    });
  }, [dayInTimeline]);

  const updateHighlightedEmployeeRow = (employeeId: number | null) => {
      const tableElement = tableRef.current;
      if (!tableElement) return;
  
      const rows = tableElement.querySelectorAll('.calendar-row');    
      rows.forEach(row => {      
        if (row.id === `row-employee-${employeeId}`) {              
          row.setAttribute('data-hover-row', 'true');
        } else {
          row.removeAttribute('data-hover-row');
        }
      });
  };
  

  const handleMouseOver = useCallback((e: React.MouseEvent<HTMLElement> ) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('.calendar-cell') as HTMLElement;
    
    if (!cell || !cell.classList.contains('calendar-cell')) return;
    
    const table = e.currentTarget as HTMLTableElement;
    if (!table) return;
    
    updateHighlight(e.clientX, e.clientY, table);
  }, [updateHighlight]);

  const handleMouseOut = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      const table = e.currentTarget as HTMLTableElement;
      if (table) {
        table.querySelectorAll('[data-hover-col="true"]').forEach(c => {
          (c as HTMLElement).removeAttribute('data-hover-col');
        });
      }
      
      document.querySelectorAll('[data-hover="true"]').forEach(emp => {
        (emp as HTMLElement).removeAttribute('data-hover');
      });
    }
  }, []);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      console.log(!tableRef.current);
      
      if (!isDragging.current || !tableRef.current) return;

      console.log('ca passe');
      
      updateHighlight(e.clientX, e.clientY, tableRef.current);
    };

    const handleDragStart = () => {
      isDragging.current = true;
    };

    const handleDragEnd = () => {
      isDragging.current = false;
      if (tableRef.current) {
        tableRef.current.querySelectorAll('[data-hover-col="true"]').forEach(c => {
          (c as HTMLElement).removeAttribute('data-hover-col');
        });
      }
      document.querySelectorAll('[data-hover="true"]').forEach(emp => {
        (emp as HTMLElement).removeAttribute('data-hover');
      });
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
    };
  }, [updateHighlight]);

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
    handleMouseOver,
    handleMouseOut,
    handleScrollY
  };
};
