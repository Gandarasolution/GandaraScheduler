import React, { useState, useMemo, useEffect } from 'react';
import { format, isSameDay, isWeekend } from 'date-fns';
import { Appointment, Employee, Groupe, CalendarConfig, Item, HalfDayInterval } from '../../types';
import { DayCell, TimelineFrame } from './index';
import CustomSelectWithImage, { SelectOptionWithImage } from '../ui/CustomSelectWithImage';
import { CELL_WIDTH, CELL_HEIGHT, MARGIN_BETWEEN_TEAMS } from '../../utils/constants';
import { getDimensionItems, groupEmployeesByDimension, applyFiltersToEmployees } from '../../utils/filters';

interface DesktopCalendarGridProps {
  employees: Employee[];
  appointmentsWithTop: (Appointment & { top: number })[];
  employeeHeights: { employeeId: number; height: number }[];
  dayInTimeline: Date[];
  initialTeams: Groupe[];
  calendarConfig: CalendarConfig;
  onCalendarConfigChange: (config: CalendarConfig) => void;
  availableConfigs: CalendarConfig[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  events: Item[];
  nonWorkingDates: Date[];
  isDisplayWeekend: boolean;
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  handleScrollY: (e: React.UIEvent<HTMLDivElement>) => void;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
  tableRef: React.RefObject<HTMLTableElement | null>;
  handleMouseOver: (e: React.MouseEvent<HTMLElement>) => void;
  handleMouseOut: (e: React.MouseEvent<HTMLElement>) => void;
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
}

const DesktopCalendarGrid: React.FC<DesktopCalendarGridProps> = ({
  employees,
  appointmentsWithTop,
  employeeHeights,
  dayInTimeline,
  initialTeams,
  calendarConfig,
  onCalendarConfigChange,
  availableConfigs,
  HALF_DAY_INTERVALS,
  isFullDay,
  events,
  nonWorkingDates,
  isDisplayWeekend,
  mainScrollRef,
  handleScroll,
  handleScrollY,
  columnEmployeeRef,
  tableRef,
  handleMouseOver,
  handleMouseOut,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
}) => {
  const [openItems, setOpenItems] = useState<(string | number)[]>([]);

  const dimensionItems = useMemo(() => {
    return getDimensionItems(calendarConfig.dimension, employees, initialTeams);
  }, [calendarConfig.dimension, employees, initialTeams]);

  const filteredEmployees = useMemo(() => {
    return applyFiltersToEmployees(employees, calendarConfig.filters);
  }, [employees, calendarConfig.filters]);

  const employeesByDimension = useMemo(() => {
    return groupEmployeesByDimension(filteredEmployees, calendarConfig.dimension, initialTeams);
  }, [filteredEmployees, calendarConfig.dimension, initialTeams]);

  const selectOptions: SelectOptionWithImage[] = useMemo(() => {
    return availableConfigs.map(config => ({
      id: config.id,
      name: config.name,
      value: config.id,
    }));
  }, [availableConfigs]);

  useEffect(() => {
    setOpenItems(dimensionItems.map(item => item.id));
  }, [dimensionItems]);

  const toggleItem = (itemId: string | number) => {
    setOpenItems(open =>
      open.includes(itemId)
        ? open.filter(id => id !== itemId)
        : [...open, itemId]
    );
  };

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
    <div className="relative flex h-full flex-row calendar-grid">
      <div
        className="min-w-80 max-w-80 pl-2 bg-transparent flex flex-col sticky left-0 z-50 pr-7 overflow-y-scroll scrollbar-hide"
        style={{ scrollbarGutter: 'stable' }}
        onScroll={handleScrollY}
        ref={columnEmployeeRef}
      >
        <div className="h-[112px] sticky top-0 z-10 flex items-center bg-bg-primary justify-center pb-2 flex-shrink-0">
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
        {dimensionItems.map((item) => {
          const isOpen = openItems.includes(item.id);
          const itemEmployees = employeesByDimension[item.id] || [];
          
          if (itemEmployees.length === 0) return null;
          
          return (
            <div
              key={item.id}
              className="rounded-4xl bg-white border border-default bg-bg-secondary text-primary"
              style={{ marginBottom: MARGIN_BETWEEN_TEAMS }}
            >
              <button
                className="flex justify-between items-center w-full px-4 py-2 rounded-t-2xl  focus:outline-none cursor-pointer"
                onClick={() => toggleItem(item.id)}
                type="button"
              >
                <div className="flex items-center gap-4">
                  <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="18" height="18" viewBox="0 0 510 510" enableBackground="new 0 0 510 510"  xmlSpace="preserve">
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
                  const employeeRowHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;
                  return (
                    <div
                      key={employee.id}
                      className="flex items-center group gap-2 px-2 rounded-2xl cursor-pointer hover:bg-primary-ultra-light employee-row-item"
                      style={{ height: employeeRowHeight, alignItems: 'center' }}
                      data-employee-id={employee.id}
                    >
                      <div className="relative">
                        <img
                          src={employee.image?.image ?? `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`}
                          alt={employee.name}
                          className={`w-8 h-8 rounded-full border-1 shadow ${employee.type === 'interim' ? 'border-interim' : 'border-employee'}`}
                          onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`; }}
                        />
                        {employee.type === 'interim' && (
                          <span className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-full bg-interim border-2 border-white"></span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="poppins text-[16px] font-inherit group-hover:font-semibold">{employee.name + ' ' + employee.firstName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <TimelineFrame
        dayInTimeline={dayInTimeline}
        mainScrollRef={mainScrollRef}
        onScroll={(e) => {
          handleScroll();
          handleScrollY(e);              
        }}
        showTodayLine={true}
        todayLineColor="#ffcdde"
      >
        <table 
          ref={tableRef}
          className="calendar-table bg-bg-secondary relative"
          style={{
            width: `${dayInTimeline.length * CELL_WIDTH}px`,
            tableLayout: 'fixed',
            borderCollapse: 'collapse'
          }}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        >
          <tbody>
            {dimensionItems.map((item, idx) => {
              const isOpen = openItems.includes(item.id);
              const itemEmployees = employeesByDimension[item.id] || [];
              
              if (itemEmployees.length === 0) return null;
              
              const rows = [];
              
              rows.push(
                <tr key={`inactive-row-${item.id}`} className="calendar-row inactive-row">
                  {dayInTimeline.map((day) => (
                    <td 
                      key={`inactive-${item.id}-${format(day, 'yyyy-MM-dd')}`}
                      className="calendar-cell p-0"
                      style={{ 
                        width: `${CELL_WIDTH}px`,
                        height: `${idx === 0 ? CELL_HEIGHT : CELL_HEIGHT + MARGIN_BETWEEN_TEAMS + 10}px`
                      }}
                    >
                      <DayCell
                        day={day}
                        employee={{ id: 0, name: 'Inactive' }}
                        appointments={[]}
                        intervals={HALF_DAY_INTERVALS}
                        isFullDay={isFullDay}
                        RowHeight={idx === 0 ? CELL_HEIGHT : CELL_HEIGHT + MARGIN_BETWEEN_TEAMS + 10}
                        isMobile={false}
                        events={events}
                        nonWorkingDates={nonWorkingDates}
                        isDisplayWeekend={isDisplayWeekend}
                        onAppointmentMoved={onAppointmentMoved}
                        onCellDoubleClick={onCellDoubleClick}
                        onAppointmentClick={onAppointmentDoubleClick}
                        onExternalDragDrop={onExternalDragDrop}
                        isWeekend={isWeekend(day)}
                        handleContextMenu={handleContextMenu}
                        isCellActive={false}
                      />
                    </td>
                  ))}
                </tr>
              );
              
              if (isOpen) {
                itemEmployees.forEach((employee) => {
                  const employeeRowHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;                        

                  rows.push(
                    <tr 
                      key={`employee-row-${employee.id}`} 
                      className="calendar-row employee-row" 
                      data-employee-id={employee.id}
                    >
                      {dayInTimeline.map((day) => {
                        const dayEmployeeAppointments = appointmentsWithTop.filter((app) =>
                          isSameDay(app.startDate, day) && app.employeeId === employee.id
                        );
                        
                        return (
                          <td 
                            key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
                            className="calendar-cell p-0"
                            style={{ 
                              width: `${CELL_WIDTH}px`,
                              height: `${employeeRowHeight}px`
                            }}
                          >
                            <DayCell
                              day={day}
                              employee={{ id: employee.id, name: employee.name }}
                              appointments={dayEmployeeAppointments}
                              intervals={HALF_DAY_INTERVALS}
                              isFullDay={isFullDay}
                              RowHeight={employeeRowHeight}
                              isMobile={false}
                              events={events}
                              nonWorkingDates={nonWorkingDates}
                              isDisplayWeekend={isDisplayWeekend}
                              onAppointmentMoved={onAppointmentMoved}
                              onCellDoubleClick={onCellDoubleClick}
                              onAppointmentClick={onAppointmentDoubleClick}
                              onExternalDragDrop={onExternalDragDrop}
                              isWeekend={isWeekend(day)}
                              handleContextMenu={handleContextMenu}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              }
              
              return rows;
            })}
          </tbody>
        </table>
      </TimelineFrame>
    </div>
  );
};

export default DesktopCalendarGrid;
