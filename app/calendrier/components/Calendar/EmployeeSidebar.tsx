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

import React, { memo } from 'react';
import { User, CalendarConfig } from '../../types';
import CustomSelectWithImage, { SelectOptionWithImage } from '../ui/CustomSelectWithImage';
import {
  TIMELINE_HEADERITEMS_CELL_HEIGHT,
  CONTAINER_PADDING,
  EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
  MARGIN_BETWEEN_TEAMS,
  CELL_HEIGHT,
  EMPLOYEE_GROUP_HEADER_PADDING_Y,
} from '../../utils/constants';
import { getDimensionItemKey, HierarchicalGroupItem } from '../../utils/filters';
import { FlatRow } from '../../hooks';

interface EmployeeSidebarProps {
  dimensionItems: HierarchicalGroupItem[];
  employeesByDimension: Record<string | number, User[]>;
  flatRows: FlatRow[];
  openItems: (string | number)[];
  expandedOverlapRows: Record<number, boolean>;
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

const GroupIcon = () => (
  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 510 510"
    >
      <path
        d="M459,114.75H357v-51l-51-51H204l-51,51v51H51c-28.05,0-51,22.95-51,51v280.5c0,28.05,22.95,51,51,51h408c28.05,0,51-22.95,51-51v-280.5C510,137.7,487.05,114.75,459,114.75z M204,63.75h102v51H204V63.75z M216.75,408l-89.25-89.25l35.7-35.7l53.55,53.55L349.35,204l35.7,35.7L216.75,408z"
        fill="#00957f"
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
}) => {
  const selectOptions: SelectOptionWithImage[] = availableConfigs.map(config => ({
    id: config.IdPlanningVue,
    name: config.LibellePlanningVue,
    value: config.IdPlanningVue,
  }));

  const stickyTop = TIMELINE_HEADERITEMS_CELL_HEIGHT + CONTAINER_PADDING;

  const renderEmployee = (
    employee: User,
    reactKeyPrefix: string,
    indentLevel: 0 | 1 = 0
  ) => {
    const employeeRow = flatRows.find(
      row => row.type === 'employee' && Number(row.id) === Number(employee.IdPersonnel)
    );

    const employeeRowHeight = employeeRow?.height ?? CELL_HEIGHT;
    const isInactive = employee.Actif === false;

    return (
      <div
        key={`${reactKeyPrefix}-employee-${employee.IdPersonnel}`}
        className="flex cursor-pointer bg-primary-bg"
        style={{
          height: employeeRowHeight,
          alignItems: 'center',
          opacity: isInactive ? 0.5 : 1,
          paddingLeft: indentLevel === 1 ? 32 : 16,
          paddingRight: 12,
        }}
      >
        <div
          className="flex px-2 rounded-2xl w-full h-full gap-2 group items-center hover:bg-primary-50 transition-colors duration-150 employee-row-item"
          data-employee-id={employee.IdPersonnel}
          onMouseOver={() => updateHighlightedEmployeeRow(employee.IdPersonnel)}
          onContextMenu={(event) => onEmployeeContextMenu(event, employee)}
        >
          <div className="relative flex-shrink-0">
            <img
              src={employee.Image ?? `https://placehold.co/32x32/cccccc/333333?text=${employee.Nom.charAt(0)}`}
              alt={employee.Nom}
              loading="lazy"
              className={`w-8 h-8 rounded-full border shadow ${employee.Type === 'INTERIM' ? 'border-interim' : 'border-employee'} ${isInactive ? 'grayscale' : ''}`}
            />

            {employee.Type === 'INTERIM' && (
              <span
                className={`absolute -bottom-1 -right-1 block h-3 w-3 rounded-full border-2 border-white ${isInactive ? 'bg-gray-400' : 'bg-interim'}`}
              />
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <span
              className={`poppins text-[16px] font-inherit group-hover:font-semibold truncate ${isInactive ? 'text-gray-400' : ''}`}
            >
              {employee.Nom + ' ' + employee.Prenom}
            </span>
          </div>

          {expandedOverlapRows[employee.IdPersonnel] !== undefined && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (expandedOverlapRows[employee.IdPersonnel]) {
                  onCollapseRow(employee.IdPersonnel);
                } else {
                  onExpandRow(employee.IdPersonnel);
                }
              }}
              className="cursor-pointer text-[10px] font-semibold bg-white text-gray-700 border border-gray-200 rounded-full px-2 py-0.5 shadow-sm hover:bg-gray-50 transition"
              type="button"
              title={expandedOverlapRows[employee.IdPersonnel] ? 'Réduire les rendez-vous qui se chevauchent' : 'Développer pour afficher tous les rendez-vous qui se chevauchent'}
            >
              {expandedOverlapRows[employee.IdPersonnel] ? 'Réduire' : 'Développer'}
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
      <div key={String(child.id)} className="bg-primary-bg">
        {/*
          On conserve exactement CELL_HEIGHT pour rester aligné avec la virtualisation,
          mais le hover est contenu dans un bloc intérieur avec du padding horizontal.
        */}
        <div
          className="flex items-center bg-primary-bg"
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
            className="flex w-full items-center justify-between rounded-xl px-3 bg-secondary-bg hover:bg-primary-50 transition-colors duration-150 focus:outline-none cursor-pointer"
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
      className="min-w-80 max-w-80 pl-2 bg-transparent flex flex-col sticky left-0 z-50 pr-7 overflow-y-scroll scrollbar-hide"
      style={{ scrollbarGutter: 'stable' }}
      onScroll={handleScrollY}
      ref={columnEmployeeRef}
    >
      {/* Header avec sélecteur de calendrier */}
      <div
        className="sticky top-0 z-40 flex bg-page justify-center flex-shrink-0"
        style={{
          height: TIMELINE_HEADERITEMS_CELL_HEIGHT + CONTAINER_PADDING
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

        const style = isOpen
          ? {
              marginBottom: MARGIN_BETWEEN_TEAMS,
              borderLeftWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
              borderRightWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
            }
          : {
              marginBottom: MARGIN_BETWEEN_TEAMS,
              borderWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
              width: '100%',
            };

        return (
          <div
            key={String(item.id)}
            className="rounded-4xl border-default bg-primary-bg text-primary overflow-visible"
            style={style}
          >
            {/* Header niveau 1 */}
            <div
              className="sticky w-full"
              style={{
                top: stickyTop,
                zIndex: 30 - index
              }}
            >
              {isOpen && (
                <>
                  <div className="absolute top-0 -left-1 w-8 h-7 bg-page" />
                  <div className="absolute top-0 -right-1 w-7 h-7 bg-page" />
                </>
              )}

              <button
                className={`relative flex justify-between items-center px-4 ${
                  isOpen
                    ? 'rounded-t-4xl -ml-px border-default border-t border-r border-l w-[284px]'
                    : 'rounded-4xl w-full'
                } focus:outline-none cursor-pointer bg-primary-bg`}
                style={{
                  paddingTop: EMPLOYEE_GROUP_HEADER_PADDING_Y,
                  paddingBottom: EMPLOYEE_GROUP_HEADER_PADDING_Y,
                  height: CELL_HEIGHT,
                }}
                onClick={() => onToggleItem(item.id)}
                type="button"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <GroupIcon />
                  <span className="poppins font-bold truncate block">
                    {item.name}
                  </span>
                </div>

                <CustomArrow isOpen={isOpen} />
              </button>
            </div>

            {isOpen && (
              <>
                {hasChildren
                  ? item.children!.map(child => renderLevel2Group(child, index))
                  : itemEmployees.map(employee =>
                      renderEmployee(employee, String(item.id), 0)
                    )}

                {/*
                  On conserve la hauteur historique du footer pour ne pas modifier
                  la géométrie de la sidebar, mais on retire le gros bloc plein.
                  Il devient uniquement une terminaison visuelle légère.
                */}
                <div
                  className="sticky w-[284px] h-9"
                  style={{
                    bottom: 0,
                    zIndex: 30 - index,
                    marginLeft: -1,
                    marginBottom: -EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
                  }}
                >
                  <div className="absolute bottom-0 left-0 w-6 h-7 bg-page" />
                  <div className="absolute bottom-0 right-0 w-6 h-7 bg-page" />
                  <div className="relative w-full h-full bg-primary-bg border-b border-l border-r border-default rounded-b-4xl" />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default memo(EmployeeSidebar);
