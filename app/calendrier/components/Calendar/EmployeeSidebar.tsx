/**
 * @fileoverview Composant EmployeeSidebar - Colonne de gauche du calendrier
 * 
 * Affiche la liste hiérarchique des employés groupés avec:
 * - Sélecteur de configuration de calendrier
 * - Groupes repliables/dépliables
 * - Liste des employés avec avatars
 * - Indicateurs d'état (intérim, inactif)
 * 
 * @component
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React, { memo } from 'react';
import { User, CalendarConfig } from '../../types';
import CustomSelectWithImage, { SelectOptionWithImage } from '../ui/CustomSelectWithImage';
import { 
  TIMELINE_HEADERITEMS_CELL_HEIGHT, 
  CONTAINER_PADDING,
  EMPLOYEE_GROUP_HEADER_PADDING_Y,
  EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
  MARGIN_BETWEEN_TEAMS,
  CELL_HEIGHT,
} from '../../utils/constants';
import { HierarchicalGroupItem } from '../../utils/filters';
import { FlatRow } from '../../hooks';

interface EmployeeSidebarProps {
  dimensionItems: HierarchicalGroupItem[];
  employeesByDimension: Record<string | number, User[]>;
  flatRows: FlatRow[];
  openItems: (string | number)[];
  expandedOverlapRows: Record<number, boolean>;
  onToggleItem: (itemId: string | number) => void;
  onCollapseRow: (employeeId: number) => void;
  calendarConfig: CalendarConfig;
  availableConfigs: CalendarConfig[];
  onCalendarConfigChange: (config: CalendarConfig) => void;
  updateHighlightedEmployeeRow: (employeeId: number) => void;
  handleScrollY: (e: React.UIEvent<HTMLDivElement>) => void;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
}

const CustomArrow = ({ isOpen }: { isOpen: boolean }) => (
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

const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
  dimensionItems,
  employeesByDimension,
  flatRows,
  openItems,
  expandedOverlapRows,
  onToggleItem,
  onCollapseRow,
  calendarConfig,
  availableConfigs,
  onCalendarConfigChange,
  updateHighlightedEmployeeRow,
  handleScrollY,
  columnEmployeeRef,
}) => {

  const selectOptions: SelectOptionWithImage[] = availableConfigs.map(config => ({
    id: config.id,
    name: config.name,
    value: config.id,
  }));

  return (
    <div
      className="min-w-80 max-w-80 pl-2 bg-transparent flex flex-col sticky left-0 z-50 pr-7 overflow-y-scroll scrollbar-hide"
      style={{ scrollbarGutter: 'stable' }}
      onScroll={handleScrollY}
      ref={columnEmployeeRef}
    >
      {/* Header avec sélecteur de calendrier */}
      <div 
        className={`sticky top-0 z-40 flex bg-page justify-center flex-shrink-0`}
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

      {/* Liste des groupes d'employés */}
      {dimensionItems.map((item, index) => {
        const isOpen = openItems.includes(item.id);
        const itemEmployees = employeesByDimension[item.id] || [];
        
        if (itemEmployees.length === 0) return null;
        
        const stickyTop = TIMELINE_HEADERITEMS_CELL_HEIGHT + CONTAINER_PADDING;

        const style = isOpen ? {
          marginBottom: MARGIN_BETWEEN_TEAMS, 
          borderLeftWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
          borderRightWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
        } : {
          marginBottom: MARGIN_BETWEEN_TEAMS, 
          borderWidth: EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE,
          width: '100%',
        };
        
        return (
          <div
            key={item.id}
            className="rounded-4xl border-default bg-primary-bg text-primary"
            style={style}
          >
            {/* Header du groupe */}
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
                className={`relative flex justify-between items-center px-4 ${isOpen ? 'rounded-t-4xl -ml-px border-default border-t border-r border-l w-[284px]' : 'rounded-4xl w-full'} focus:outline-none cursor-pointer bg-primary-bg`}
                style={{ 
                  paddingTop: EMPLOYEE_GROUP_HEADER_PADDING_Y, 
                  paddingBottom: EMPLOYEE_GROUP_HEADER_PADDING_Y,
                }}
                onClick={() => onToggleItem(item.id)}
                type="button"
              >
                <div className="flex items-center gap-4">
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
            
            {/* Liste des employés */}
            {isOpen && itemEmployees.map((employee) => {
              const rows = flatRows.filter(r => r.type === 'employee' && r.id === employee.id);
              const employeeRowHeight = rows.find(e => e.id === employee.id)?.height ?? CELL_HEIGHT;
              const isInactive = employee.actif === false;
              
              return (
                <div
                  key={employee.id}
                  className="flex px-4 cursor-pointer bg-primary-bg"
                  style={{ 
                    height: employeeRowHeight, 
                    alignItems: 'center',
                    top: stickyTop + EMPLOYEE_GROUP_HEADER_PADDING_Y * 2 + 24,
                    zIndex: 20 - index,
                    opacity: isInactive ? 0.5 : 1,
                  }}                    
                >
                  <div 
                    className="flex px-2 rounded-2xl w-full h-full gap-2 group items-center hover:bg-primary-50 employee-row-item"
                    data-employee-id={employee.id}
                    onMouseOver={() => {
                      updateHighlightedEmployeeRow(employee.id);
                    }}
                  >
                    <div className="relative">
                      <img
                        src={employee.image?.image ?? `https://placehold.co/32x32/cccccc/333333?text=${employee.nom.charAt(0)}`}
                        alt={employee.nom}
                        className={`w-8 h-8 rounded-full border shadow ${employee.type === 'interim' ? 'border-interim' : 'border-employee'} ${isInactive ? 'grayscale' : ''}`}
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
                          onCollapseRow(employee.id);
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
            
            {/* Footer du groupe (arrondi) */}
            {isOpen && (
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
                <div 
                  className="relative w-full h-full bg-primary-bg border-b border-l border-r border-default rounded-b-4xl"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default memo(EmployeeSidebar);
