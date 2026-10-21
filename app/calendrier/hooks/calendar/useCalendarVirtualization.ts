import { useMemo } from 'react';
import { 
  CELL_HEIGHT, 
  ROW_HEIGHT, 
  EMPLOYEE_GROUP_HEADER_HEIGHT, 
  MARGIN_BETWEEN_TEAMS, 
  EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
  EMPLOYEE_GROUP_CONTENT_PADDING_BOTTOM
} from '../../utils/constants';
import { getDimensionItemKey, HierarchicalGroupItem } from '../../utils/filters';

export interface FlatRow {
  type: 'group' | 'employee';
  id: string | number;
  uniqueKey: string;
  data: any;
  height: number;
}

interface UseCalendarVirtualizationParams {
  dimensionItems: HierarchicalGroupItem[];
  openItems: (string | number)[];
  employeeHeights: Array<{ employeeId: number; height: number }>;
  expandedOverlapRows: Record<number, boolean>;
}

export const useCalendarVirtualization = ({
  dimensionItems,
  openItems,
  employeeHeights,
  expandedOverlapRows,
}: UseCalendarVirtualizationParams): FlatRow[] => {

  return useMemo(() => {
    const rows: FlatRow[] = [];
    
    const processHierarchicalItem = (
      item: HierarchicalGroupItem, 
      idx: number, 
      isChild: boolean = false,
      parentIdx?: number,
      level: number = 1
    ) => {
      let inactiveRowHeight = EMPLOYEE_GROUP_HEADER_HEIGHT;
      
      if (idx > 0 && !isChild) {
        const prevSiblingIdx = isChild && parentIdx !== undefined ? parentIdx : idx - 1;
        const prevItem = dimensionItems[prevSiblingIdx];
        const isPrevOpen = openItems.includes(getDimensionItemKey(prevItem.id));
        
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
      
      if (openItems.includes(getDimensionItemKey(item.id))) {
        if (item.children && item.children.length > 0) {
          item.children.forEach((child: any, childIdx: number) => {
            processHierarchicalItem(child, childIdx, true, idx, level + 1);
          });
        } else {
          const itemEmployees = item.employees || [];
          itemEmployees.forEach(employee => {
            const baseHeight = employeeHeights.find(e => e.employeeId === employee.IdPersonnel)?.height ?? CELL_HEIGHT;
            const adjustedHeight = expandedOverlapRows[employee.IdPersonnel]
              ? baseHeight
              : Math.min(baseHeight, ROW_HEIGHT);
              
            if (Number(employee.IdPersonnel) === 1121) console.log(expandedOverlapRows);
            rows.push({
              type: 'employee',
              id: employee.IdPersonnel,
              uniqueKey: `employee-${employee.IdPersonnel}`,
              data: employee,
              height: adjustedHeight
            });
          });
        }
      }
    };
    
    dimensionItems.forEach((item, idx) => {
      processHierarchicalItem(item, idx);
    });

    if (rows.length < 10) {
      for (let i = rows.length; i < 10; i++) {
        rows.push({
          type: 'group',
          id: 'unassigned' + i,
          uniqueKey: 'group-unassigned' + i,
          data: { name: 'Non assignés' },
          height: EMPLOYEE_GROUP_HEADER_HEIGHT + MARGIN_BETWEEN_TEAMS + EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE * 2
        });
      }
    }
    
    return rows;
  }, [dimensionItems, openItems, employeeHeights, expandedOverlapRows]);
};