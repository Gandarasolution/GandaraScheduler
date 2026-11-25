import { useMemo } from 'react';
import {
  CELL_HEIGHT,
  ROW_HEIGHT,
  MARGIN_BETWEEN_TEAMS,
  EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
  TIMELINE_HEADERITEMS_CELL_HEIGHT,
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
  const openItemsSet = useMemo(() => new Set(openItems), [openItems]);

  const heightMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < employeeHeights.length; i++) {
      const entry = employeeHeights[i]!;
      map.set(entry.employeeId, entry.height);
    }
    return map;
  }, [employeeHeights]);

  return useMemo(() => {
    const rows: FlatRow[] = [];

    const processHierarchicalItem = (
      item: HierarchicalGroupItem,
      idx: number,
      isChild: boolean = false,
      level: number = 1
    ) => {
      let inactiveRowHeight = TIMELINE_HEADERITEMS_CELL_HEIGHT;

      if (idx > 0 && !isChild) {
        const prevItem = dimensionItems[idx - 1]!;
        const isPrevOpen = openItemsSet.has(getDimensionItemKey(prevItem.id));

        inactiveRowHeight += MARGIN_BETWEEN_TEAMS;
        if (isPrevOpen) {
          inactiveRowHeight += 20;
        }
      }

      if (idx !== 0 || isChild) {
        rows.push({
          type: 'group',
          id: item.id,
          uniqueKey: `group-level${level}-${item.id}`,
          data: item,
          height: inactiveRowHeight,
        });
      }

      if (openItemsSet.has(getDimensionItemKey(item.id))) {
        if (item.children && item.children.length > 0) {
          for (let childIdx = 0; childIdx < item.children.length; childIdx++) {
            processHierarchicalItem(item.children[childIdx]!, childIdx, true, level + 1);
          }
        } else {
          const itemEmployees = item.employees || [];
          for (let i = 0; i < itemEmployees.length; i++) {
            const employee = itemEmployees[i]!;
            const baseHeight = heightMap.get(employee.IdPersonnel) ?? CELL_HEIGHT;
            const adjustedHeight = expandedOverlapRows[employee.IdPersonnel]
              ? baseHeight
              : Math.min(baseHeight, ROW_HEIGHT);

            rows.push({
              type: 'employee',
              id: employee.IdPersonnel,
              uniqueKey: `employee-${employee.IdPersonnel}`,
              data: employee,
              height: adjustedHeight,
            });
          }
        }
      }
    };

    for (let idx = 0; idx < dimensionItems.length; idx++) {
      processHierarchicalItem(dimensionItems[idx]!, idx);
    }

    if (rows.length < 10) {
      const fillerHeight =
        TIMELINE_HEADERITEMS_CELL_HEIGHT + MARGIN_BETWEEN_TEAMS + EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE * 2;
      for (let i = rows.length; i < 10; i++) {
        rows.push({
          type: 'group',
          id: 'unassigned' + i,
          uniqueKey: 'group-unassigned' + i,
          data: { name: 'Non assignés' },
          height: fillerHeight,
        });
      }
    }

    return rows;
  }, [dimensionItems, openItemsSet, heightMap, expandedOverlapRows]);
};