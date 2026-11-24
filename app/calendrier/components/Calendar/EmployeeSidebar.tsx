/**
 * @fileoverview Composant EmployeeSidebar - Colonne de gauche du calendrier
 *
 * Affiche la liste hiérarchique des employés groupés avec:
 * - Sélecteur de configuration de calendrier
 * - Groupes repliables/dépliables
 * - Sous-groupes repliables/dépliables
 * - Liste des employés avec avatars
 * - Indicateurs d'état (intérim, inactif)
 */

import React, { CSSProperties, memo, useEffect, useRef, useState } from 'react';
import { User, CalendarConfig } from '../../types';
import CustomSelectWithImage, { SelectOptionWithImage } from '../ui/CustomSelectWithImage';
import {
  TIMELINE_HEADERITEMS_CELL_HEIGHT,
  CONTAINER_PADDING,
  EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
  MARGIN_BETWEEN_TEAMS,
  CELL_HEIGHT,
  EMPLOYEE_GROUP_HEADER_PADDING_Y,
  TIMELINE_HEADERGROUPS_CELL_HEIGHT,
} from '../../utils/constants';
import { getDimensionItemKey, HierarchicalGroupItem } from '../../utils/filters';
import { FlatRow } from '../../hooks';
import { GroupIcon } from '@/app/calendrier';
import { useAuth } from '../../hooks/utils/AuthContext';
import { Lock } from 'lucide-react';

interface EmployeeSidebarProps {
  dimensionItems: HierarchicalGroupItem[];
  employeesByDimension: Record<string | number, User[]>;
  flatRows: FlatRow[];
  visibleRows?: any[]; // Reçu du DesktopCalendarGrid
  totalContentHeight?: number; // Reçu du DesktopCalendarGrid
  openItems: (string | number)[];
  expandedOverlapRows: Record<number, boolean>;
  hiddenOverlapCounts: Record<number, number>;
  overlapDisplayMode: 'button' | 'count';
  onToggleItem: (itemId: string | number) => void;
  onCollapseRow: (employeeId: number) => void;
  onExpandRow: (employeeId: number) => void;
  onEmployeeContextMenu: (event: React.MouseEvent, employee: User) => void;
  calendarConfig: CalendarConfig | null;
  availableConfigs: CalendarConfig[];
  onCalendarConfigChange: (config: CalendarConfig) => void;
  updateHighlightedEmployeeRow: (employeeId: number) => void;
  handleScrollY: (e: React.UIEvent<HTMLDivElement>) => void;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
  overlappingEmployeeIds: Set<number>;
}

const CustomArrow = ({ isOpen, small = false }: { isOpen: boolean; small?: boolean }) => (
  <div className={`flex items-center justify-center flex-shrink-0 ${small ? 'w-4 h-4' : 'w-5 h-5'}`}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={small ? 13 : 16}
      height={small ? 13 : 16}
      fill="currentColor"
      className={`${isOpen ? 'rotate-180' : ''} transition-transform duration-200 ease-in-out text-[#84818a]`}
      viewBox="0 0 16 16"
    >
      <path
        fillRule="evenodd"
        d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"
      />
    </svg>
  </div>
);


const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
  dimensionItems,
  employeesByDimension,
  flatRows,
  openItems,
  expandedOverlapRows,
  hiddenOverlapCounts,
  overlapDisplayMode,
  onToggleItem,
  onCollapseRow,
  onExpandRow,
  onEmployeeContextMenu,
  calendarConfig,
  availableConfigs,
  onCalendarConfigChange,
  updateHighlightedEmployeeRow,
  handleScrollY,
  columnEmployeeRef,
  overlappingEmployeeIds,
}) => {

  const { user } = useAuth();

  const [hoveredTooltipEmployeeId, setHoveredTooltipEmployeeId] = useState<number | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnterEmployee = (employeeId: number) => {
    // Annule un éventuel timer précédent par sécurité
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredTooltipEmployeeId(employeeId);
    }, 500);
  };

  const handleMouseLeaveEmployee = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setHoveredTooltipEmployeeId(null);
  };

  // Nettoyage du timer si le composant est démonté
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);
  
  const selectOptions: SelectOptionWithImage[] = availableConfigs.map(config => ({
    id: config.IdPlanningVue,
    name: config.LibellePlanningVue,
    value: config.IdPlanningVue,
  }));

  const stickyTop = TIMELINE_HEADERGROUPS_CELL_HEIGHT + CONTAINER_PADDING;

  const renderEmployee = (
    employee: User,
    reactKeyPrefix: string,
    indentLevel: 0 | 1 = 0,
    item: HierarchicalGroupItem | null = null
  ) => {
    const employeeRow = flatRows.find(
      (row) => row.type === 'employee' && Number(row.id) === Number(employee.IdPersonnel)
    );

    const employeeRowHeight = employeeRow?.height ?? CELL_HEIGHT;
    const isInactive = employee.Actif === false;
    const hasOverlapInWindow = overlappingEmployeeIds.has(Number(employee.IdPersonnel));
    const isTooltipVisible = hoveredTooltipEmployeeId === Number(employee.IdPersonnel);

    // Vérification centralisée du verrou par un autre utilisateur
    const isLockedByOther = Boolean(
      employee.isLocked?.status &&
        Number(employee.isLocked.updatedById) !== Number(user?.IdPersonnel)
    );

    // Formatage de l'heure d'expiration du verrou (timestamp en ms)
    const lockExpirationTime =
      isLockedByOther && employee.isLocked?.timestamp
        ? new Date(employee.isLocked.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null;

    return (
      <div
        key={`${reactKeyPrefix}-employee-${employee.IdPersonnel}`}
        className="relative flex cursor-pointer bg-primary border-l border-r border-default"
        style={{
          height: employeeRowHeight,
          alignItems: 'center',
          opacity: isInactive ? 0.5 : 1,
          paddingLeft: indentLevel === 1 ? 32 : 16,
          paddingRight: 12,
        }}
        onMouseEnter={() => handleMouseEnterEmployee(Number(employee.IdPersonnel))}
        onMouseLeave={handleMouseLeaveEmployee}
      >
        {isTooltipVisible && (
          <div
            role="tooltip"
            className="absolute bottom-full left-4 mb-2 z-50 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          >
            <div>
              {employee.Nom} {employee.Prenom} - {employee.IdPersonnel}
            </div>
            {item?.name && <div>{item.name}</div>}

            {isLockedByOther && (
              <div className="mt-1 pt-1 border-t border-gray-700 flex items-center gap-1.5 text-amber-300">
                <Lock className="w-3 h-3 shrink-0" />
                <span>
                  Verrouillé par{' '}
                  <strong>
                    {employee.isLocked?.updatedByNom || `l'utilisateur #${employee.isLocked?.updatedById}`}
                  </strong>
                  {lockExpirationTime ? ` (jusqu'à ${lockExpirationTime})` : ''}
                </span>
              </div>
            )}

            {/* Flèche positionnée juste sous le tooltip */}
            <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
          </div>
        )}

        <div
          className={`flex px-2 rounded-2xl w-full h-full gap-2 group items-center transition-colors duration-150 employee-row-item ${
            isLockedByOther ? 'opacity-65 cursor-not-allowed' : 'hover:bg-primary-50'
          }`}
          data-employee-id={employee.IdPersonnel}
          onMouseOver={() => updateHighlightedEmployeeRow(employee.IdPersonnel)}
          onContextMenu={(event) => {
            if (isLockedByOther) return;
            onEmployeeContextMenu(event, employee);
          }}
        >
          <div className="relative flex-shrink-0">
            <img
              src={
                employee.Image ??
                `https://placehold.co/32x32/cccccc/333333?text=${employee.Nom.charAt(0)}`
              }
              alt={employee.Nom}
              loading="lazy"
              className={`w-8 h-8 rounded-full border shadow ${
                employee.Type === 'INTERIM' ? 'border-interim' : 'border-employee'
              } ${isInactive || isLockedByOther ? 'grayscale' : ''}`}
            />

            {employee.Type === 'INTERIM' && (
              <span
                className={`absolute -bottom-1 -right-1 block h-3 w-3 rounded-full border-2 border-white ${
                  isInactive || isLockedByOther ? 'bg-gray-400' : 'bg-interim'
                }`}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span
              className={`poppins text-[14px] font-inherit group-hover:font-semibold truncate ${
                isInactive ? 'text-gray-400' : ''
              }`}
            >
              {employee.Nom + ' ' + employee.Prenom}
            </span>
            {isLockedByOther && (
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="Employé verrouillé" />
            )}
          </div>

          {hasOverlapInWindow && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (expandedOverlapRows[employee.IdPersonnel]) {
                  onCollapseRow(employee.IdPersonnel);
                } else {
                  onExpandRow(employee.IdPersonnel);
                }
              }}
              className={`cursor-pointer ${
                overlapDisplayMode === 'count' ? '' : 'min-w-[75px]'
              } text-[10px] font-semibold bg-white text-gray-700 border border-gray-200 rounded-full px-2 py-0.5 shadow-sm hover:bg-gray-50 transition`}
              type="button"
              title={
                expandedOverlapRows[employee.IdPersonnel]
                  ? 'Réduire les rendez-vous qui se chevauchent'
                  : 'Développer pour afficher tous les rendez-vous qui se chevauchent'
              }
            >
              {overlapDisplayMode === 'count' ? (
                expandedOverlapRows[employee.IdPersonnel] ? (
                  'Réduire'
                ) : (
                  <>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                    +{`${hiddenOverlapCounts[employee.IdPersonnel] ?? 0}`}
                  </>
                )
              ) : expandedOverlapRows[employee.IdPersonnel] ? (
                'Réduire'
              ) : (
                'Développer'
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderLevel2Group = (
    child: HierarchicalGroupItem,
    parentIndex: number
  ) => {
    const childKey = getDimensionItemKey(child.id);
    const childOpen = openItems.includes(childKey);
    const childEmployees = employeesByDimension[String(child.id)] || [];

    if (childEmployees.length === 0) return null;

    return (
      <div key={String(child.id)} className="bg-primary">
        
        <div
          className="flex items-center bg-primary"
          style={{
            height: CELL_HEIGHT,
            paddingLeft: 18,
            paddingRight: 10,
            zIndex: 20 - parentIndex,
          }}
        >
          <div className="mr-2 h-6 w-px flex-shrink-0 border-l border-default" />

          <button
            type="button"
            onClick={() => onToggleItem(child.id)}
            className="flex w-full items-center justify-between rounded-xl px-3 bg-secondary hover:bg-primary-500-50 transition-colors duration-150 focus:outline-none cursor-pointer"
            style={{ height: Math.max(32, CELL_HEIGHT - 8) }}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="block w-2 h-2 rounded-full bg-[#00957f] flex-shrink-0" />

              <span className="poppins text-[14px] font-semibold truncate text-primary">
                {child.name}
              </span>
            </div>

            <CustomArrow isOpen={childOpen} small />
          </button>
        </div>

        {childOpen && (
          <div>
            {childEmployees.map(employee =>
              renderEmployee(employee, String(child.id), 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="min-w-85 max-w-85 pl-2 bg-transparent flex flex-col sticky left-0 z-50 pr-7 overflow-y-scroll scrollbar-hide h-full"
      style={{ scrollbarGutter: 'stable' }}
      onScroll={handleScrollY}
      ref={columnEmployeeRef}
    >
      {/* Header avec sélecteur de calendrier */}
      <div
        className="sticky top-0 z-40 flex bg-page justify-center flex-shrink-0"
        style={{
          height: TIMELINE_HEADERGROUPS_CELL_HEIGHT + CONTAINER_PADDING
        }}
      >
        {calendarConfig && (
          <div className="custom-select-wrapper relative inline-block w-full">
            <CustomSelectWithImage
              options={selectOptions}
              value={calendarConfig.IdPlanningVue}
              onChange={(value) => {
                const selectedConfig = availableConfigs.find(
                  config => config.IdPlanningVue === value
                );

                if (selectedConfig) {
                  onCalendarConfigChange(selectedConfig);
                }
              }}
              illustrationImage={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 10 80 80" width="25" height="25">
                  <defs>
                    <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00c6ff" />
                      <stop offset="100%" stopColor="#0072ff" />
                    </linearGradient>
                    <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8e2de2" />
                      <stop offset="100%" stopColor="#4a00e0" />
                    </linearGradient>
                  </defs>
                  <path d="M20 40 Q50 10 80 40 L60 50 Q40 60 20 40 Z" fill="url(#gradBlue)" />
                  <path d="M20 60 Q50 90 80 60 L60 50 Q40 40 20 60 Z" fill="url(#gradPurple)" />
                </svg>
              }
              placeholder="Sélectionner un calendrier"
              customArrow={<CustomArrow isOpen={false} />}
              className="py-3 px-4 w-full"
            />
          </div>
        )}
      </div>

      {/* Groupes niveau 1 */}
      {dimensionItems.map((item, index) => {
        const itemKey = getDimensionItemKey(item.id);
        const isOpen = openItems.includes(itemKey);
        const itemEmployees = employeesByDimension[String(item.id)] || [];
        const hasChildren = Boolean(item.children?.length);

        if (itemEmployees.length === 0) return null;

        const containerStyle: CSSProperties = {
          marginBottom: MARGIN_BETWEEN_TEAMS,
          width: isOpen ? '304px' : '100%',
          position: 'relative',
          zIndex: 30 - index
        };

        return (
          <div
            key={String(item.id)}
            className="text-primary flex flex-col"
            style={containerStyle}
          >
            {/* Header niveau 1 */}
            <div
              className="sticky w-full"
              style={{
                top: stickyTop,
                zIndex: 10
              }}
            >
              {/* Masques de fond pour la zone sticky */}
              <div className="absolute top-0 -left-[1px] w-8 h-8 bg-page" />
              <div className="absolute top-0 -right-[1px] w-8 h-8 bg-page" />

              <button
                // Ajout de "overflow-hidden" ici pour que le bouton rogne ses propres bords dans l'arrondi 4xl
                className={`relative z-10 flex justify-between items-center px-4 bg-primary focus:outline-none cursor-pointer ${
                  isOpen
                    ? 'rounded-t-4xl border-t border-r border-l border-default w-full'
                    : 'rounded-4xl border border-default w-full'
                }`}
                style={{
                  paddingTop: EMPLOYEE_GROUP_HEADER_PADDING_Y,
                  paddingBottom: EMPLOYEE_GROUP_HEADER_PADDING_Y,
                  height: TIMELINE_HEADERITEMS_CELL_HEIGHT,
                }}
                onClick={() => onToggleItem(item.id)}
                type="button"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <GroupIcon className="h-5 w-5 shrink-0" />
                  <span className="poppins font-bold truncate block">
                    {item.name}
                  </span>
                </div>
                <CustomArrow isOpen={isOpen} />
              </button>
            </div>

            {/* Contenu et Footer */}
            {isOpen && (
              <>
                {/* 3. Contenu */}
                

                  {hasChildren
                    ? item.children!.map(child => renderLevel2Group(child, index))
                    : itemEmployees.map(employee =>
                        renderEmployee(employee, String(item.id), 0, item)
                      )}
               
                
                {/* 4. Footer */}
                <div className="relative z-20 w-full h-5 bg-primary border-b border-l border-r border-default rounded-b-4xl overflow-hidden" />
                
                {/* Masques extérieurs placés juste en dessous pour cacher les excédents sur les côtés */}
                <div className="absolute bottom-0 -left-[1px] w-6 h-5 bg-page z-10 pointer-events-none" />
                <div className="absolute bottom-0 -right-[1px] w-6 h-5 bg-page z-10 pointer-events-none" />         
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default memo(EmployeeSidebar);
