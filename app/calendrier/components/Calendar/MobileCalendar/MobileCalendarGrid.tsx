/**
 * @fileoverview Composant principal de la grille calendrier mobile
 * 
 * Point d'entrée de la vue mobile avec gestion des rendez-vous,
 * navigation par swipe, notifications et formulaire d'ajout.
 * 
 * @author Gandara Solutions
 * @version 2.0.0
 */

import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, Bell, MoreHorizontal, LogOut, X } from 'lucide-react';

// Types
import { Appointment, Employee, Item, User } from '../../../types/index';

// Composants
import AppointmentList from './AppointmentList';
import { EmployeeSelector } from './EmployeeSelector';
import { MonthSelector } from './MonthSelector';
import { CalendarGrid } from './CalendarGrid';
import { NotificationPanel } from './NotificationPanel';

// Hooks & Utils
import { useNotifications, useCalendarWorker } from '../../../hooks';
import { useSwipe } from '../../../hooks';
import { getNotificationsByUserId } from '@/app/datasource';
import { HALF_DAY_INTERVALS } from '../../../utils/constants';

// Lazy loading des composants lourds
const AppointmentForm = lazy(() => import('../../forms/AppointmentForm'));

// ===== TYPES =====

interface MobileCalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  user: User;
  items: Item[];
  onAddAppointment?: (appointment: Appointment, item: Item, includeAllNonWorkingDays: boolean) => void;
}

// ===== COMPOSANT PRINCIPAL =====

export const MobileCalendarGrid: React.FC<MobileCalendarGridProps> = ({ 
  employees, 
  appointments, 
  user, 
  items, 
  onAddAppointment 
}) => {
  // ----- ÉTATS LOCAUX -----
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showLogout, setShowLogout] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [monthlyAppointments, setMonthlyAppointments] = useState<Appointment[]>([]);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  // ----- HOOKS PERSONNALISÉS -----
  const { notifications, unreadCount, addNotification, markAsRead, removeNotification, clearAll } = useNotifications();
  const worker = useCalendarWorker();
  
  // Hook de swipe pour changer de mois
  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => setCurrentDate(prev => addMonths(prev, 1)),
    onSwipeRight: () => setCurrentDate(prev => subMonths(prev, 1)),
  }, { minSwipeDistance: 75, preventScroll: true });
    
  // ----- GESTION DES DROITS D'ACCÈS -----
  const isAdmin = user.role === 'admin';
  
  const visibleEmployees = isAdmin 
    ? employees 
    : employees.filter(emp => emp.id === user.id);
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(() => {
    if (!isAdmin) {
      return visibleEmployees.find(emp => emp.id === user.id) || null;
    }
    return employees[0] || null;
  });

  // ----- FILTRAGE DES RENDEZ-VOUS (Web Worker) -----
  
  // Filtrage mensuel avec Web Worker
  useEffect(() => {
    if (!worker.isReady) {
      // Fallback synchrone si worker non prêt
      const monthStart = startOfMonth(currentDate).getTime();
      const monthEnd = endOfMonth(currentDate).getTime();
      
      let filteredApps = appointments;
      
      if (!isAdmin) {
        filteredApps = appointments.filter(app => app.employeeId === user.id);
      }
      
      const filtered = filteredApps.filter(app => {
        const matchesEmployee = !selectedEmployee || app.employeeId === selectedEmployee.id;
        const isInMonth = app.startDate <= monthEnd && app.endDate >= monthStart;
        return matchesEmployee && isInMonth;
      });
      
      setMonthlyAppointments(filtered);
      return;
    }
    
    // Utiliser le Web Worker pour les calculs
    const filterAppointments = async () => {
      setIsLoadingAppointments(true);
      
      const filtered = await worker.filterMonthlyAppointments(
        appointments,
        currentDate,
        selectedEmployee,
        isAdmin,
        user.id
      );
      
      if (filtered) {
        setMonthlyAppointments(filtered);
      }
      
      setIsLoadingAppointments(false);
    };
    
    filterAppointments();
  }, [worker.isReady, appointments, currentDate, selectedEmployee, isAdmin, user.id]);

  // Filtrage journalier avec Web Worker
  useEffect(() => {
    if (!worker.isReady) {
      // Fallback synchrone
      const selectedDayStart = new Date(selectedDate).setHours(0, 0, 0, 0);
      const selectedDayEnd = new Date(selectedDate).setHours(23, 59, 59, 999);
      
      const filtered = monthlyAppointments.filter(app => 
        app.startDate <= selectedDayEnd && app.endDate >= selectedDayStart
      );
      
      setSelectedDayAppointments(filtered);
      return;
    }
    
    // Utiliser le Web Worker
    const filterDaily = async () => {
      const filtered = await worker.filterDailyAppointments(
        monthlyAppointments,
        selectedDate
      );
      
      if (filtered) {
        setSelectedDayAppointments(filtered);
      }
    };
    
    filterDaily();
  }, [worker.isReady, monthlyAppointments, selectedDate]);

  // ----- EFFETS DE BORD -----
  
  // Charger les notifications au montage
  useEffect(() => {
    const userNotifications = getNotificationsByUserId(user.id);
    
    userNotifications.forEach(notif => {
      addNotification(notif.type, notif.title, notif.message);
    });
    
    setTimeout(() => {
      addNotification('info', 'Bienvenue', `Bonjour ${user.name} !`);
    }, 500);
  }, []);

  // ----- HANDLERS -----
  
  const handleLogout = () => {
    alert("Déconnexion...");
  };

  const handleOpenAddAppointment = () => {
    if (isAdmin) {
      setShowAppointmentForm(true);
    }
  };

  const handleSaveAppointment = (appointment: Appointment, item: Item, includeAllNonWorkingDays: boolean) => {
    if (onAddAppointment) {
      onAddAppointment(appointment, item, includeAllNonWorkingDays);
      addNotification('success', 'Rendez-vous créé', 'Le rendez-vous a été ajouté avec succès');
    }
    setShowAppointmentForm(false);
  };

  const handleCloseMenus = () => {
    setShowLogout(false);
    setShowNotifications(false);
  };

  // ----- FACTORIES -----
  
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

  // ----- RENDU =====
  
  return (
    <div 
      className="h-full flex items-center justify-center p-4 sm:p-8"
      onClick={handleCloseMenus}
    >
      {/* Mobile Mockup Container */}
      <div 
        ref={swipeRef}
        className="w-full max-w-[400px] bg-white sm:bg-gray-50 h-full rounded-[3rem] sm:border-[8px] sm:border-white sm:shadow-2xl overflow-hidden relative flex flex-col"
      >
        
        {/* Header */}
        <header className="pt-8 px-6 pb-2 flex items-center justify-between bg-white z-10 relative">
          {/* User Menu */}
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowLogout(!showLogout);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 hover:bg-gray-50 rounded-full pr-3 pl-1 py-1 transition-colors"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-100">
                <img 
                  src={user.image || '/default-avatar.png'}
                  alt="User"
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
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
          
          {/* Actions */}
          <div className="flex items-center gap-4 relative">
            {/* Notifications */}
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
            
            {/* More Options */}
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

        {/* Floating Action Button - Visible uniquement pour les admins */}
        {isAdmin && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none flex justify-center items-end h-32">
            <div className="pointer-events-auto flex items-center justify-center px-8 w-full bg-white rounded-full shadow-soft p-2 mb-2">
              <button 
                onClick={handleOpenAddAppointment}
                className="w-14 h-14 bg-teal-500 hover:bg-teal-600 rounded-full shadow-lg shadow-teal-500/40 text-white flex items-center justify-center transform -translate-y-6 transition-transform hover:scale-105 active:scale-95"
              >
                <Plus size={28} />
              </button>
            </div>
          </div>
        )}

        {/* Modal d'ajout de rendez-vous */}
        {isAdmin && showAppointmentForm && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200"
            onClick={() => setShowAppointmentForm(false)}
          >
            <div 
              className="bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header du modal */}
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
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                  </div>
                }>
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
                </Suspense>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MobileCalendarGrid;