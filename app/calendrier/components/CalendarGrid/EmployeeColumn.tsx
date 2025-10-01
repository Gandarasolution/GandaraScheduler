/**
 * @fileoverview Composant pour la colonne des employés en mode desktop
 * Affiche la liste des employés regroupés par dimension avec sélecteur de configuration
 * 
 * @component EmployeeColumn
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React from 'react';
import { Employee, CalendarConfig } from '../../types';
import { MARGIN_BETWEEN_TEAMS } from '../../utils/constants';
import CustomSelectWithImage, { SelectOptionWithImage } from '../CustomSelectWithImage';

interface EmployeeColumnProps {
  dimensionItems: Array<{id: string | number; name: string}>;
  employeesByDimension: Record<string | number, Employee[]>;
  openItems: (string | number)[];
  toggleItem: (itemId: string | number) => void;
  employeeHeights: Array<{employeeId: number; height: number; dayKey?: number}>;
  calendarConfig: CalendarConfig;
  availableConfigs: CalendarConfig[];
  onCalendarConfigChange: (config: CalendarConfig) => void;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const EmployeeColumn: React.FC<EmployeeColumnProps> = ({
  dimensionItems,
  employeesByDimension,
  openItems,
  toggleItem,
  employeeHeights,
  calendarConfig,
  availableConfigs,
  onCalendarConfigChange,
  columnEmployeeRef,
  onScroll
}) => {
  // Convertir availableConfigs en format SelectOptionWithImage
  const selectOptions: SelectOptionWithImage[] = availableConfigs.map(config => ({
    id: config.id,
    name: config.name,
    value: config.id,
  }));

  // Flèche personnalisée pour le select
  const CustomArrow = ({isOpen}: {isOpen: boolean}) => (
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

  return (
    <div
      className="min-w-80 max-w-80 pl-2 flex flex-col sticky left-0 z-50 pr-7 overflow-y-scroll scrollbar-hide"
      style={{
        backgroundColor: '#f3f7f8',
        scrollbarGutter: 'stable',
      }}
      onScroll={onScroll}
      ref={columnEmployeeRef}
    >
      {/* En-tête avec sélecteur de configuration */}
      <div 
        className="h-[112px] sticky top-0 z-10 flex items-center justify-center pb-2 flex-shrink-0"
        style={{
          backgroundColor: '#f3f7f8',
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

      {/* Liste des dimensions et employés */}
      {dimensionItems.map((item) => {
        const isOpen = openItems.includes(item.id);
        const itemEmployees = employeesByDimension[item.id] || [];
        
        if (itemEmployees.length === 0) return null;
        
        return (
          <div
            key={item.id}
            className="rounded-4xl bg-white border border-gray-100"
            style={{ marginBottom: MARGIN_BETWEEN_TEAMS }}
          >
            <button
              className="flex justify-between items-center w-full px-4 py-2 rounded-t-2xl focus:outline-none"
              onClick={() => toggleItem(item.id)}
              type="button"
            >
              <div className="flex items-center gap-4">
                <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="18" height="18" viewBox="0 0 510 510" enableBackground="new 0 0 510 510" xmlSpace="preserve">
                  <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                    <g>
                      <g id="play-install">
                        <path d="M459,114.75H357v-51l-51-51H204l-51,51v51H51c-28.05,0-51,22.95-51,51v280.5c0,28.05,22.95,51,51,51h408&#10;&#9;&#9;&#9;c28.05,0,51-22.95,51-51v-280.5C510,137.7,487.05,114.75,459,114.75z M204,63.75h102v51H204V63.75z M216.75,408l-89.25-89.25&#10;&#9;&#9;&#9;l35.7-35.7l53.55,53.55L349.35,204l35.7,35.7L216.75,408z" fill="#00957f" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
                      </g>
                    </g>
                  </g>
                </svg>
                <span className="poppins font-bold">{item.name}</span>
              </div>
              <CustomArrow isOpen={isOpen} />
            </button>
            
            <div className={`flex flex-col px-4 pb-2 transition-all duration-200 ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'}`}>
              {isOpen && itemEmployees.map((employee) => {
                const employeeRowHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? 50;
                return (
                  <div
                    key={employee.id}
                    className="flex items-center group gap-2 px-2 rounded-2xl cursor-pointer transition hover:bg-[#e7f4f2] employee-row-item"
                    style={{ height: employeeRowHeight, alignItems: 'center' }}
                    data-employee-id={employee.id}
                  >
                    <div className="relative">
                      <img
                        src={employee.avatar ?? `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`}
                        alt={employee.name}
                        className={`w-8 h-8 rounded-full border-1 shadow ${employee.type === 'interim' ? 'border-[#e6b11a]' : 'border-[#4baea4]'}`}
                        onError={(e) => { 
                          e.currentTarget.src = `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`; 
                        }}
                      />
                      {employee.type === 'interim' && (
                        <span className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-full bg-[#e6b11a] border-2 border-white"></span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="poppins text-[16px] font-inherit group-hover:font-semibold">{employee.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeColumn;