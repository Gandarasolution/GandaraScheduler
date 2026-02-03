import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Appointment, Employee, Item } from '../../../types/index';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { Plus, Bell, MoreHorizontal, LogOut, ChevronDown, Search, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import AppointmentList from './AppointmentList';
import { fr } from 'date-fns/locale';

interface MobileCalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  user: {
    id: number;
    name: string;
    role: string;
    theme: string;
    image: string;
  };
  items: Item[];
}

const MobileCalendarGrid: React.FC<MobileCalendarGridProps> = ({ employees, appointments, user, items }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(employees[0] || null);
  const [showLogout, setShowLogout] = useState(false);


  const handleLogout = () => {
    alert("Déconnexion...");
    // Logic for logout would go here
  };
  
  // Filtrer les rendez-vous du mois en cours et de l'employé sélectionné
  const monthlyAppointments = useMemo(() => {
    const monthStart = startOfMonth(currentDate).getTime();
    const monthEnd = endOfMonth(currentDate).getTime();
    
    return appointments.filter(app => {
      const matchesEmployee = !selectedEmployee || app.employeeId === selectedEmployee.id;
      const isInMonth = app.startDate <= monthEnd && app.endDate >= monthStart;
      return matchesEmployee && isInMonth;
    });
  }, [appointments, currentDate, selectedEmployee]);

  const selectedDayAppointments = useMemo(() => {
    const selectedDayStart = new Date(selectedDate).setHours(0, 0, 0, 0);
    const selectedDayEnd = new Date(selectedDate).setHours(23, 59, 59, 999);
    
    return monthlyAppointments.filter(app => 
      app.startDate <= selectedDayEnd && app.endDate >= selectedDayStart
    );
  }, [monthlyAppointments, selectedDate]);



  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-8"
      onClick={() => setShowLogout(false)}
    >
      {/* Mobile Mockup Container */}
      <div className="w-full max-w-[400px] bg-white sm:bg-gray-50 h-[850px] sm:h-[800px] rounded-[3rem] sm:border-[8px] sm:border-white sm:shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* Header */}
        <header className="pt-8 px-6 pb-2 flex items-center justify-between bg-white z-10">
          <div className="relative">
            <button 
                onClick={() => setShowLogout(!showLogout)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-full pr-3 pl-1 py-1 transition-colors"
            >
                <img src={user.image} alt="User" className="w-8 h-8 rounded-full border border-gray-100" />
                <span className="text-sm font-semibold text-gray-700 hidden sm:inline-block">{user.name}</span>
            </button>
            
            {showLogout && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-40 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                    <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center"
                    >
                        <LogOut size={14} className="mr-2" />
                        Se déconnecter
                    </button>
                </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
             <button className="text-gray-400 hover:text-teal-500 transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-400 rounded-full border-2 border-white"></span>
             </button>
             <button className="text-gray-400 hover:text-teal-500 transition-colors">
                <MoreHorizontal size={20} />
             </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar bg-gray-50/50">
          
          {/* Month Slider */}
          <div className="bg-white pb-2 rounded-b-[2.5rem] shadow-sm mb-4">
            <MonthSelector 
              currentDate={currentDate} 
              onChange={setCurrentDate} 
            />
          </div>

          {/* Employee Selector */}
          <EmployeeSelector 
            employees={employees}
            selectedEmployee={selectedEmployee}
            onSelect={setSelectedEmployee}
          />

          {/* Calendar */}
          <CalendarGrid 
            currentDate={currentDate}
            selectedDate={selectedDate}
            appointments={monthlyAppointments}
            onDateSelect={setSelectedDate}
          />

          {/* Appointments Detail */}
          <AppointmentList 
            appointments={selectedDayAppointments}
            selectedDate={selectedDate}
            items={items}
          />
        </main>

        {/* Floating Action Button & Bottom Bar Mock */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none flex justify-center items-end h-32">
          <div className="pointer-events-auto flex items-center justify-center px-8 w-full bg-white rounded-full shadow-soft p-2 mb-2">
             

             {/* Big Plus Button */}
             <button className="w-14 h-14 bg-teal-500 hover:bg-teal-600 rounded-full shadow-lg shadow-teal-500/40 text-white flex items-center justify-center transform -translate-y-6 transition-transform hover:scale-105 active:scale-95">
                <Plus size={28} />
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MobileCalendarGrid;



interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  appointments: Appointment[];
  onDateSelect: (date: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ 
  currentDate, 
  selectedDate, 
  appointments, 
  onDateSelect 
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  // Week starts on Monday (1) for France
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  // French week days starting Monday
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const hasAppointment = (day: number) => {
    return appointments.some(app => app.startDate <= day && app.endDate >= day);
  };

  const getDayAppointmentCount = (day: number) => {
    return appointments.filter(app => app.startDate <= day && app.endDate >= day).length;
  };

  return (
    <div className="px-6 pb-6">
      <div className="bg-white rounded-[2.5rem] p-6 shadow-soft">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-4">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-xs font-semibold text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-4 gap-x-1">
          {days.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const today = isToday(day);
            const hasApps = hasAppointment(day.getTime());
            const appCount = getDayAppointmentCount(day.getTime());

            return (
              <div 
                key={index} 
                className="flex flex-col items-center justify-center relative cursor-pointer"
                onClick={() => onDateSelect(day)}
              >
                <div 
                  className={`
                    w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300
                    ${isSelected 
                      ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30 transform scale-105' 
                      : (today ? 'text-teal-500 font-bold bg-teal-50' : 'text-gray-700 hover:bg-gray-50')
                    }
                    ${!isCurrentMonth ? 'opacity-20 text-gray-400' : ''}
                  `}
                >
                  {format(day, 'd')}
                </div>
                
                {/* Visual Indicator for Appointments */}
                <div className="h-1.5 mt-1 flex space-x-0.5">
                  {hasApps && isCurrentMonth && (
                    <span 
                      className={`
                        w-1.5 h-1.5 rounded-full 
                        ${isSelected ? 'bg-white/50' : (appCount > 2 ? 'bg-purple-400' : (appCount > 1 ? 'bg-yellow-400' : 'bg-teal-400'))}
                      `}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


interface EmployeeSelectorProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  onSelect: (employee: Employee) => void;
}

const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({ employees, selectedEmployee, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredEmployees = employees.filter(emp => 
    `${emp.name} ${emp.firstName}`.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="px-6 mb-6 relative z-20" ref={wrapperRef}>
      <div 
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 flex items-center cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="bg-teal-50 rounded-xl p-2.5 text-teal-600 mr-3">
            <Search size={20} />
        </div>
        
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Employé</p>
          <p className="text-sm font-semibold text-gray-800 truncate">
            {selectedEmployee ? `${selectedEmployee.name} ${selectedEmployee.firstName}` : 'Sélectionner...'}
          </p>
        </div>

        <div className="p-2 text-gray-400">
            <ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-6 right-6 top-full mt-2 bg-white rounded-3xl shadow-xl p-4 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <input 
            type="text"
            placeholder="Rechercher un nom..."
            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 mb-2 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1">
            {filteredEmployees.map(emp => (
              <div 
                key={emp.id}
                onClick={() => {
                  onSelect(emp);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`flex items-center p-2 rounded-xl cursor-pointer transition-colors ${selectedEmployee?.id === emp.id ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
              >
                <img 
                  src={emp.image?.image || `https://ui-avatars.com/api/?name=${emp.name}+${emp.firstName}&background=009580&color=fff`} 
                  alt={`${emp.name} ${emp.firstName}`} 
                  className="w-8 h-8 rounded-full object-cover mr-3" 
                />
                <div className="flex-1">
                    <p className={`text-sm font-medium ${selectedEmployee?.id === emp.id ? 'text-teal-700' : 'text-gray-700'}`}>{emp.name} {emp.firstName}</p>
                    <p className="text-xs text-gray-400">{emp.type === 'interim' ? 'Intérimaire' : 'Employé'}</p>
                </div>
                {selectedEmployee?.id === emp.id && <Check size={16} className="text-teal-500" />}
              </div>
            ))}
            {filteredEmployees.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">Aucun employé trouvé</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


interface MonthSelectorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ currentDate, onChange }) => {
  const handlePrev = () => onChange(subMonths(currentDate, 1));
  const handleNext = () => onChange(addMonths(currentDate, 1));

  return (
    <div className="flex items-center justify-between px-4 py-4 w-full">
      <button 
        onClick={handlePrev}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
      >
        <ChevronLeft size={24} />
      </button>
      
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-widest capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex space-x-1 mt-1">
            <span className="w-1 h-1 rounded-full bg-teal-500"></span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
};