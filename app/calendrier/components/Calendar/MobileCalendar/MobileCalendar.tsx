/**
 * @fileoverview Composant principal de la grille calendrier mobile
 * 
 * Point d'entrée de la vue mobile avec gestion des rendez-vous,
 * navigation par swipe, notifications et formulaire d'ajout.
 * 
 * @author Gandara Solutions
 * @version 2.0.0
 */

import React, { useEffect, useState , Suspense, useMemo } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, Bell, MoreHorizontal, LogOut, X } from 'lucide-react';

// Types
import { Appointment, Item, User } from '../../../types/index';

// Composants

import {
  AppointmentForm
} from '@/app/calendrier/components';

import { EmployeeSelector, MobileCalendarGrid, NotificationPanel, AppointmentList} from './index';
import SearchOverlay from '../../modals/SearchOverlay';

// Hooks & Utils
import { useNotifications, useCalendarWorker } from '../../../hooks';
import { getNotificationsByUserId } from '@/app/datasource';
import { HALF_DAY_INTERVALS } from '../../../utils/constants';

// Lazy loading des composants lourds

// ===== TYPES =====

interface MobileCalendarGridProps {
  employees: User[];
  appointments: Appointment[];
  user: User;
  items: Item[];
  onAddAppointment?: (appointment: Appointment, item: Item, includeAllNonWorkingDays: boolean) => void;
}

// ===== COMPOSANT PRINCIPAL =====

export const MobileCalendar: React.FC<MobileCalendarGridProps> = ({ 
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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [monthlyAppointments, setMonthlyAppointments] = useState<Appointment[]>([]);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  // ----- HOOKS PERSONNALISÉS -----
  const { notifications, unreadCount, addNotification, markAsRead, removeNotification, clearAll } = useNotifications();
  const worker = useCalendarWorker();
  

  // ----- GESTION DES DROITS D'ACCÈS -----
  const isAdmin = user.role === 'admin';
  
  
  const visibleEmployees = isAdmin 
    ? employees 
    : employees.filter(emp => emp.id === user.id);
  
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(() => {
    if (!isAdmin) {
      return visibleEmployees.find(emp => emp.id === user.id) || null;
    }
    // Pour les admins, commencer sans sélection pour voir tous les rendez-vous
    return null;
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
        filteredApps = appointments.filter(app => app.employee.id === user.id);
      }
      
      const filtered = filteredApps.filter(app => {
        const matchesEmployee = !selectedEmployee || app.employee.id === selectedEmployee.id;
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
      addNotification('info', 'Bienvenue', `Bonjour ${user.nom} ${user.prenom} !`);
    }, 500);
  }, []);

  // ----- HANDLERS -----
  
  const handleLogout = () => {
    alert("Déconnexion...");
  };

  const handleOpenAddAppointment = () => {
    if (isAdmin) {
      setShowSearchModal(true);
    }
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setShowSearchModal(false);
    setShowAppointmentForm(true);
  };

  const handleSaveAppointment = (appointment: Appointment, item: Item, includeAllNonWorkingDays: boolean) => {
    if (onAddAppointment) {
      onAddAppointment(appointment, item, includeAllNonWorkingDays);
      addNotification('success', 'Rendez-vous créé', 'Le rendez-vous a été ajouté avec succès');
    }
    setShowAppointmentForm(false);
    setSelectedItem(null);
  };

  const handleCloseMenus = () => {
    setShowLogout(false);
    setShowNotifications(false);
  };

  // Filtrage des items pour la recherche
  const filteredItems = useMemo(() => {
    if (!searchInput.trim()) return [];
    
    const search = searchInput.toLowerCase();
    return items.filter(item => {
      const matchLabel = item.label?.toLowerCase().includes(search);
      const matchCode = item.code?.toLowerCase().includes(search);
      
      // Propriétés spécifiques aux ChantierItem
      if (item.type === 'chantier') {
        const chantierItem = item as any;
        return matchLabel || matchCode ||
          chantierItem.identifiant?.toLowerCase().includes(search) ||
          chantierItem.libelle?.toLowerCase().includes(search);
      }
      
      return matchLabel || matchCode;
    });
  }, [items, searchInput]);

  // ----- FACTORIES -----
  
  const createEmptyAppointment = (id?: number): Appointment => {
    const startOfSelectedDay = new Date(selectedDate).setHours(8, 0, 0, 0);
    const endOfSelectedDay = new Date(selectedDate).setHours(17, 0, 0, 0);
    
    return {
      id: id ?? -1,
      description: '',
      startDate: startOfSelectedDay,
      endDate: endOfSelectedDay,
      employee: selectedEmployee || employees[0] || null,
      type: 'chantier',
      EventId: 0,
      priority: 0,
    };
  };

  const createEmptyItem = (): Item => {
    if (selectedItem) {
      return selectedItem;
    }
    
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
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Mobile Mockup Container */}
      <div 
        className="w-full max-w-[400px] h-full rounded-[3rem] sm:border-[8px] sm:shadow-2xl overflow-hidden relative flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--bg-secondary)'
        }}
      >
        
        {/* Header */}
        <header 
          className="pt-8 px-6 pb-2 flex items-center justify-between z-10 relative"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {/* User Menu */}
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowLogout(!showLogout);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 rounded-full pr-3 pl-1 py-1 transition-colors"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div 
                className="relative w-8 h-8 rounded-full overflow-hidden"
                style={{ borderWidth: '1px', borderColor: 'var(--border-light)' }}
              >
                <img 
                  src={user.image?.image || '/default-avatar.png'}
                  alt="User"
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
              <span 
                className="text-sm font-semibold hidden sm:inline-block"
                style={{ color: 'var(--text-primary)' }}
              >
                {user.nom} {user.prenom}
              </span>
            </button>
            
            {showLogout && (
              <div 
                className="absolute top-full left-0 mt-2 rounded-xl py-1 w-40 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50" 
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  boxShadow: 'var(--shadow-lg)',
                  borderWidth: '1px',
                  borderColor: 'var(--border-light)'
                }}
              >
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm flex items-center transition-colors"
                  style={{ color: 'var(--color-error)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-error-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
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
              className="transition-colors relative"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-4 h-4 text-[8px] font-bold rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--color-error)',
                    color: 'var(--text-inverse)',
                    borderWidth: '2px',
                    borderColor: 'var(--bg-secondary)'
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* More Options */}
            <button 
              className="transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
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
        <main 
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          
          {/* Employee Selector - visible seulement pour les admins */}
          {isAdmin && (
            <EmployeeSelector 
              employees={visibleEmployees}
              selectedEmployee={selectedEmployee}
              onSelect={setSelectedEmployee}
            />
          )}

          {/* Calendar */}
          <MobileCalendarGrid 
            currentDate={currentDate}
            selectedDate={selectedDate}
            appointments={monthlyAppointments}
            onDateSelect={setSelectedDate}
            onChange={setCurrentDate}
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
          <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none flex justify-center items-end h-32"
            style={{
              backgroundImage: `linear-gradient(to top, var(--bg-secondary), transparent)`
            }}
          >
            <div 
              className="pointer-events-auto flex items-center justify-center px-8 w-full rounded-full p-2 mb-2"
              style={{
                //backgroundColor: 'var(--bg-secondary)',
                //boxShadow: 'var(--shadow-md)'
              }}
            >
              <button 
                onClick={handleOpenAddAppointment}
                className="w-14 h-14 rounded-full text-white flex items-center justify-center transform -translate-y-6 transition-transform active:scale-95"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  boxShadow: 'var(--shadow-lg)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1.5rem) scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1.5rem) scale(1)';
                }}
              >
                <Plus size={28} />
              </button>
            </div>
          </div>
        )}

        {/* Modal de recherche d'événement */}
        {isAdmin && showSearchModal && (
          <SearchOverlay
            isOpen={showSearchModal}
            onClose={() => {
              setShowSearchModal(false);
              setSearchInput('');
            }}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            items={filteredItems}
            placeholder="Rechercher un chantier, paie, congé..."
            emptyStateConfig={{
              noInput: {
                icon: (
                  <svg className="w-16 h-16 mx-auto mb-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
                title: "Rechercher un événement",
                description: "Tapez pour rechercher un chantier, paie ou congé"
              },
              noResults: {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="w-16 h-16 mx-auto mb-4 text-gray-400" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                  </svg>
                ),
                title: "Aucun résultat",
                description: "Aucun événement ne correspond à votre recherche"
              }
            }}
            renderItem={(item) => {
              const itemData = item as any as Item;
              const isChantier = itemData.type === 'chantier';
              const chantierData = isChantier ? itemData as any : null;
              
              return (
                <div className="flex-1 py-3 px-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: itemData.color }}
                    />
                    <div className="flex-1">
                      <p 
                        className="font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {itemData.label}
                      </p>
                      {isChantier && (chantierData?.code || chantierData?.identifiant) && (
                        <p 
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {[chantierData.code, chantierData.identifiant].filter(Boolean).join(' - ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
            onItemAction={(item) => handleSelectItem(item as any as Item)}
            actionLabel="+"
            enableDragDetection={false}
            maxWidth="md"
          />
        )}

        {/* Modal d'ajout de rendez-vous */}
        {isAdmin && showAppointmentForm && (
          <div 
            className="fixed inset-0 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200"
            style={{ backgroundColor: 'var(--bg-overlay)' }}
            onClick={() => {
              setShowAppointmentForm(false);
              setSelectedItem(null);
            }}
          >
            <div 
              className="rounded-t-[2.5rem] sm:rounded-3xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--bg-card)',
                boxShadow: 'var(--shadow-2xl)'
              }}
            >
              {/* Header du modal */}
              <div 
                className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderBottom: '1px solid var(--border-light)'
                }}
              >
                <h2 
                  className="text-xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {selectedItem ? 'Nouveau rendez-vous' : 'Nouveau rendez-vous'}
                </h2>
                <button 
                  onClick={() => {
                    setShowAppointmentForm(false);
                    setSelectedItem(null);
                  }}
                  className="w-10 h-10 rounded-full transition-colors flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                >
                  <X size={20} style={{ color: 'var(--text-secondary)' }} />
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
                  isMobile={true}
                  onSave={handleSaveAppointment}
                  onClose={() => {
                    setShowAppointmentForm(false);
                    setSelectedItem(null);
                  }}
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