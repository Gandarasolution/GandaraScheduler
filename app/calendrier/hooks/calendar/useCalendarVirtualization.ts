/**
 * @fileoverview Hook useCalendarVirtualization - Gestion de la virtualisation du calendrier
 * 
 * Centralise les calculs de virtualisation pour optimiser le rendu du calendrier:
 * - Construction de la liste plate des lignes (flatRows)
 * - Calcul des positions et dimensions (rowBoundaries)
 * - Détermination des lignes visibles (visibleRows)
 * 
 * @hook useCalendarVirtualization
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useMemo } from 'react';
import { User } from '../../types';
import { 
  CELL_HEIGHT, 
  ROW_HEIGHT, 
  EMPLOYEE_GROUP_HEADER_HEIGHT, 
  MARGIN_BETWEEN_TEAMS, 
  EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
  EMPLOYEE_GROUP_CONTENT_PADDING_BOTTOM
} from '../../utils/constants';
import { getRowId } from '../../utils/domIds';
import { HierarchicalGroupItem } from '../../utils/filters';

export interface FlatRow {
  type: 'group' | 'employee';
  id: string | number;
  uniqueKey: string;
  data: any;
  height: number;
}

export interface RowWithBoundaries extends FlatRow {
  start: number;
  end: number;
  domId: string;
}

interface UseCalendarVirtualizationParams {
  dimensionItems: HierarchicalGroupItem[];
  openItems: (string | number)[];
  employeesByDimension: Record<string | number, User[]>;
  employeeHeights: Array<{ employeeId: number; height: number }>;
  expandedOverlapRows: Record<number, boolean>;
  contentViewportTop: number;
  contentViewportBottom: number;
  overscanY?: number;
}

interface UseCalendarVirtualizationResult {
  flatRows: FlatRow[];
  rowBoundaries: RowWithBoundaries[];
  totalContentHeight: number;
  visibleRows: RowWithBoundaries[];
  visibleRangeStart: number;
  visibleRangeEnd: number;
}

/**
 * Hook de virtualisation du calendrier
 * Optimise le rendu en calculant uniquement les lignes visibles
 */
export const useCalendarVirtualization = ({
  dimensionItems,
  openItems,
  employeesByDimension,
  employeeHeights,
  expandedOverlapRows,
  contentViewportTop,
  contentViewportBottom,
  overscanY = 800,
}: UseCalendarVirtualizationParams): UseCalendarVirtualizationResult => {

  // Flatten the data structure for virtualization
  const flatRows = useMemo(() => {
    const rows: FlatRow[] = [];
    
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
            const baseHeight = employeeHeights.find(e => e.employeeId === employee.IdPersonnel)?.height ?? CELL_HEIGHT;
            const adjustedHeight = expandedOverlapRows[employee.IdPersonnel]
              ? baseHeight
              : Math.min(baseHeight, ROW_HEIGHT);
              
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
    
    // Traiter tous les items de dimension
    dimensionItems.forEach((item, idx) => {
      processHierarchicalItem(item, idx);
    });

    // Ajouter des lignes "Non assignés" si nécessaire pour remplir l'espace
    if (rows.length < 10 ) {
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
  }, [dimensionItems, openItems, employeesByDimension, employeeHeights, expandedOverlapRows]);

  // Calcul des positions de début et fin de chaque ligne
  const rowBoundaries = useMemo(() => {
    let offset = 0;
    return flatRows.map((row) => {
      const start = offset;
      offset += row.height;
      const domId = row.type === 'employee' ? getRowId('employee', row.id as number) : getRowId('group', row.id as string);
      return { ...row, start, end: offset, domId };
    });
  }, [flatRows]);

  // Hauteur totale du contenu
  const totalContentHeight = useMemo(() => {
    return rowBoundaries.length ? rowBoundaries[rowBoundaries.length - 1].end : 0;
  }, [rowBoundaries]);

  // Index de début de la zone visible (avec overscan)
  const visibleRangeStart = useMemo(() => {
    const target = contentViewportTop - overscanY;
    for (let i = 0; i < rowBoundaries.length; i++) {
      if (rowBoundaries[i].end >= target) return i;
    }
    return 0;
  }, [contentViewportTop, rowBoundaries, overscanY]);

  // Index de fin de la zone visible (avec overscan)
  const visibleRangeEnd = useMemo(() => {
    const target = contentViewportBottom + overscanY;
    for (let i = rowBoundaries.length - 1; i >= 0; i--) {
      if (rowBoundaries[i].start <= target) return i;
    }
    return rowBoundaries.length - 1;
  }, [contentViewportBottom, rowBoundaries, overscanY]);

  // Lignes visibles (slice de rowBoundaries)
  const visibleRows = useMemo(() => {
    if (!rowBoundaries.length) return [];
    const start = Math.max(0, visibleRangeStart);
    const end = Math.min(rowBoundaries.length - 1, visibleRangeEnd);
    if (start > end) return [];
    return rowBoundaries.slice(start, end + 1);
  }, [rowBoundaries, visibleRangeEnd, visibleRangeStart]);

  return {
    flatRows,
    rowBoundaries,
    totalContentHeight,
    visibleRows,
    visibleRangeStart,
    visibleRangeEnd,
  };
};
