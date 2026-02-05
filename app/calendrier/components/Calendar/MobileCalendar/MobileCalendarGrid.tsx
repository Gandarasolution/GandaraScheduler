import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Appointment, Employee, Item, User } from '../../../types/index';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { Plus, Bell, MoreHorizontal, LogOut, ChevronDown, Search, Check, ChevronLeft, ChevronRight, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import AppointmentList from './AppointmentList';
import { fr } from 'date-fns/locale';
import { useNotifications } from '../../../hooks/useNotifiactions';
import { getNotificationsByUserId } from '@/app/datasource';
import AppointmentForm from '../../forms/AppointmentForm';
import { HALF_DAY_INTERVALS } from '../../../utils/constants';

interface MobileCalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  user: User;
  items: Item[];
  onAddAppointment?: (appointment: Appointment, item: Item, includeAllNonWorkingDays: boolean) => void;
}

const MobileCalendarGrid: React.FC<MobileCalendarGridProps> = ({ employees, appointments, user, items, onAddAppointment }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showLogout, setShowLogout] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);

  // Hook de notifications
  const { notifications, unreadCount, addNotification, markAsRead, removeNotification, clearAll } = useNotifications();
    
  // Gestion des droits d'accès
  const isAdmin = user.role === 'admin';
  
  // Filtrer les employés visibles selon le rôle
  const visibleEmployees = isAdmin 
    ? employees 
    : employees.filter(emp => emp.id === user.id);
  
  // Initialiser l'employé sélectionné selon le rôle
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(() => {
    if (!isAdmin) {
      // Si c'est un user, sélectionner automatiquement son propre profil
      return visibleEmployees.find(emp => emp.id === user.id) || null;
    }
    return employees[0] || null;
  });


  const handleLogout = () => {
    alert("Déconnexion...");
    // Logic for logout would go here
  };
  
  // Filtrer les rendez-vous du mois en cours et de l'employé sélectionné
  const monthlyAppointments = useMemo(() => {
    const monthStart = startOfMonth(currentDate).getTime();
    const monthEnd = endOfMonth(currentDate).getTime();
    
    // Filtrer selon les droits utilisateur
    let filteredApps = appointments;
    
    // Si l'utilisateur n'est pas admin, il ne voit que ses propres rendez-vous
    if (!isAdmin) {
      filteredApps = appointments.filter(app => app.employeeId === user.id);
    }
    
    return filteredApps.filter(app => {
      const matchesEmployee = !selectedEmployee || app.employeeId === selectedEmployee.id;
      const isInMonth = app.startDate <= monthEnd && app.endDate >= monthStart;
      return matchesEmployee && isInMonth;
    });
  }, [appointments, currentDate, selectedEmployee, isAdmin, user.id]);


  //console.log(monthlyAppointments.map(app => ({...app, startDate: new Date(app.startDate), endDate: new Date(app.endDate)})));
  
  const selectedDayAppointments = useMemo(() => {
    const selectedDayStart = new Date(selectedDate).setHours(0, 0, 0, 0);
    const selectedDayEnd = new Date(selectedDate).setHours(23, 59, 59, 999);
    
    return monthlyAppointments.filter(app => 
      app.startDate <= selectedDayEnd && app.endDate >= selectedDayStart
    );
  }, [monthlyAppointments, selectedDate]);

  // Ajouter les notifications depuis la base de données au montage du composant
  useEffect(() => {
    // Charger les notifications de l'utilisateur depuis la BDD fictive
    const userNotifications = getNotificationsByUserId(user.id);
    
    // Ajouter chaque notification au système
    userNotifications.forEach(notif => {
      addNotification(notif.type, notif.title, notif.message);
    });
    
    // Notification de bienvenue
    setTimeout(() => {
      addNotification('info', 'Bienvenue', `Bonjour ${user.name} !`);
    }, 500);
  }, []);

  // Gérer l'ouverture du modal d'ajout de rendez-vous
  const handleOpenAddAppointment = () => {
    if (isAdmin) {
      setShowAppointmentForm(true);
    }
  };

  // Gérer la sauvegarde d'un nouveau rendez-vous
  const handleSaveAppointment = (appointment: Appointment, item: Item, includeAllNonWorkingDays: boolean) => {
    if (onAddAppointment) {
      onAddAppointment(appointment, item, includeAllNonWorkingDays);
      addNotification('success', 'Rendez-vous créé', 'Le rendez-vous a été ajouté avec succès');
    }
    setShowAppointmentForm(false);
  };

  // Créer un rendez-vous vide pour le formulaire
  const createEmptyAppointment = (id?: number): Appointment => {
    const startOfSelectedDay = new Date(selectedDate).setHours(8, 0, 0, 0);
    const endOfSelectedDay = new Date(selectedDate).setHours(17, 0, 0, 0);
    
    return {
      id: id ?? -1,
      description: '',
      startDate: startOfSelectedDay,
      endDate: endOfSelectedDay,
      employeeId: selectedEmployee?.id || employees[0]?.id || 0,
      type: 'chantier',
      EventId: 0,
      priority: 0,
    };
  };

  // Créer un item vide pour le formulaire
  const createEmptyItem = (): Item => {
    return {
      id: 0,
      type: 'chantier',
      label: '',
      color: '#3953aaff',
      borderColor: '#2c4086',
      textColor: '#ffffff',
      code: '',
      identifiant: '',
      poleActivite: '',
      libelle: '',
      etat: 'En cours',
      chargeAffaire: '',
      chefChantier: '',
      dateOS: '',
      dateFin: '',
      TM: 0,
      HR: 0,
      SH: 0,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0,
    } as Item;
  };

  return (
    <div 
      className="h-full flex items-center justify-center p-4 sm:p-8"
      onClick={() => {
        setShowLogout(false);
        setShowNotifications(false);
      }}
    >
      {/* Mobile Mockup Container */}
      <div className="w-full max-w-[400px] bg-white sm:bg-gray-50 h-full rounded-[3rem] sm:border-[8px] sm:border-white sm:shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* Header */}
        <header className="pt-8 px-6 pb-2 flex items-center justify-between bg-white z-10 relative">
          <div className="relative">
            <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogout(!showLogout);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-full pr-3 pl-1 py-1 transition-colors"
            >
                <img src={user.image} alt="User" className="w-8 h-8 rounded-full border border-gray-100" />
                <span className="text-sm font-semibold text-gray-700 hidden sm:inline-block">{user.name}</span>
            </button>
            
            {showLogout && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-40 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50" onClick={(e) => e.stopPropagation()}>
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
          
          <div className="flex items-center gap-4 relative">
             <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                  setShowLogout(false);
                }}
                className="text-gray-400 hover:text-teal-500 transition-colors relative"
             >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
             </button>
             <button className="text-gray-400 hover:text-teal-500 transition-colors">
                <MoreHorizontal size={20} />
             </button>
             
             {/* Panneau de notifications */}
             {showNotifications && (
               <NotificationPanel 
                 notifications={notifications}
                 onClose={() => setShowNotifications(false)}
                 onMarkAsRead={markAsRead}
                 onRemove={removeNotification}
                 onClearAll={clearAll}
               />
             )}
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

          {/* Employee Selector - visible seulement pour les admins */}
          {isAdmin && (
            <EmployeeSelector 
              employees={visibleEmployees}
              selectedEmployee={selectedEmployee}
              onSelect={setSelectedEmployee}
            />
          )}

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

        {/* Floating Action Button & Bottom Bar Mock - Visible uniquement pour les admins */}
        {isAdmin && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none flex justify-center items-end h-32">
            <div className="pointer-events-auto flex items-center justify-center px-8 w-full bg-white rounded-full shadow-soft p-2 mb-2">
               

               {/* Big Plus Button */}
               <button 
                 onClick={handleOpenAddAppointment}
                 className="w-14 h-14 bg-teal-500 hover:bg-teal-600 rounded-full shadow-lg shadow-teal-500/40 text-white flex items-center justify-center transform -translate-y-6 transition-transform hover:scale-105 active:scale-95"
               >
                  <Plus size={28} />
               </button>
            </div>
          </div>
        )}

        {/* Modal d'ajout de rendez-vous - Visible uniquement pour les admins */}
        {isAdmin && showAppointmentForm && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200"
            onClick={() => setShowAppointmentForm(false)}
          >
            <div 
              className="bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header du modal mobile */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <h2 className="text-xl font-bold text-gray-800">Nouveau rendez-vous</h2>
                <button 
                  onClick={() => setShowAppointmentForm(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              
              {/* Contenu scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <AppointmentForm
                  appointments={appointments}
                  appointment={createEmptyAppointment(0)}
                  item={createEmptyItem()}
                  items={items}
                  employees={visibleEmployees}
                  HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
                  isFullDay={true}
                  nonWorkingDates={[]}
                  isReducedVersion={false}
                  onSave={handleSaveAppointment}
                  onClose={() => setShowAppointmentForm(false)}
                  handleOpenImageModal={() => {}}
                  handleAddDimension={() => {}}
                  handleEditDimension={() => {}}
                />
              </div>
            </div>
          </div>
        )}

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
    const start = new Date(day).setHours(0, 0, 0, 0);
    const end = new Date(day).setHours(23, 59, 59, 999);
    return appointments.some(app => app.startDate <= end && app.endDate >= start);
  };

  const getDayAppointmentCount = (day: number) => {
    const start = new Date(day).setHours(0, 0, 0, 0);
    const end = new Date(day).setHours(23, 59, 59, 999);

    return appointments.filter(app => app.startDate <= end && app.endDate >= start).length;
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
    <div className="px-6 mb-6 relative z-5" ref={wrapperRef}>
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


interface NotificationPanelProps {
  notifications: any[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  notifications, 
  onClose, 
  onMarkAsRead, 
  onRemove,
  onClearAll 
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-orange-500" />;
      case 'info':
      default:
        return <Info size={18} className="text-blue-500" />;
    }
  };


  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`;
    return format(date, 'dd/MM à HH:mm', { locale: fr });
  };

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-30"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
          <p className="text-xs text-gray-400">{notifications.length} notification{notifications.length > 1 ? 's' : ''}</p>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={() => onClearAll()}
            className="text-xs text-teal-500 hover:text-teal-600 font-medium"
          >
            Tout effacer
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 opacity-60">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Bell size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium text-sm">Aucune notification</p>
            <p className="text-xs text-gray-400 mt-1">Vous êtes à jour !</p>
          </div>
        ) : (
          <div className="py-2">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`px-6 py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!notif.isRead ? 'bg-teal-50/30' : ''}`}
                onClick={() => !notif.isRead && onMarkAsRead(notif.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-800 truncate">{notif.title}</h4>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(notif.id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">{formatTime(notif.timestamp)}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};