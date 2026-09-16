/**
 * @fileoverview Composant principal de la grille calendrier mobile
 * 
 * Point d'entrée de la vue mobile avec gestion des rendez-vous,
 * navigation par swipe, notifications et formulaire d'ajout.
 * 
 * @author Gandara Solutions
 * @version 2.0.0
 */

import React from 'react';
import { Plus, Bell, MoreHorizontal, LogOut, X } from 'lucide-react';

// Types
import { Appointment, Equipe, Item, User, MobileAppointmentDisplayConfig } from '../../../types/index';
import { HALF_DAY_INTERVALS } from '../../../utils/constants';
import type { Notification } from '../../../types';
import { AppointmentForm } from '@/app/calendrier/components';

// Composants

import { EmployeeSelector, MobileCalendarGrid, NotificationPanel, AppointmentList} from './index';
import SearchOverlay from '../../modals/SearchOverlay';

// Lazy loading des composants lourds

// ===== TYPES =====

export interface MobileCalendarState {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  showLogout: boolean;
  setShowLogout: (value: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (value: boolean) => void;
  showAppointmentForm: boolean;
  setShowAppointmentForm: (value: boolean) => void;
  showSearchModal: boolean;
  setShowSearchModal: (value: boolean) => void;
  selectedItem: Item | null;
  setSelectedItem: (item: Item | null) => void;
  monthlyAppointments: Appointment[];
  selectedDayAppointments: Appointment[];
  selectedEmployee: User | null;
  setSelectedEmployee: (employee: User) => void;
  visibleEmployees: User[];
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (ids: string[]) => void | Promise<void>;
  logout: () => void;
  hasPermission: (permissionId: number) => boolean;
  handleOpenAddAppointment: () => void;
  searchOverlayItems: (query: string) => Promise<any>;
  handleSelectItem: (item: Item) => void;
  handleSaveAppointment: (appointment: Appointment, item: Item, includeAllNonWorkingDays: boolean) => Promise<{ success: boolean }>;
  createEmptyAppointment: (id?: number) => Appointment;
  createEmptyItem: () => Item;
}

interface MobileCalendarGridProps {
  employees: User[];
  teams: Record<number, Equipe>;
  appointments: Appointment[];
  user: User;
  items: Item[];
  nonWorkingDates: Record<string, number>;
  mobileAppointmentDisplay: MobileAppointmentDisplayConfig;
  mobileState: MobileCalendarState;
}

// ===== COMPOSANT PRINCIPAL =====

export const MobileCalendar: React.FC<MobileCalendarGridProps> = ({ 
  employees, 
  teams,
  appointments, 
  user,
  items, 
  nonWorkingDates,
  mobileAppointmentDisplay,
  mobileState
}) => {
  const {
    selectedDate, setSelectedDate, showLogout, setShowLogout,
    showNotifications, setShowNotifications, showAppointmentForm,
    setShowAppointmentForm, showSearchModal, setShowSearchModal,
    selectedItem, setSelectedItem, monthlyAppointments, selectedDayAppointments,
    selectedEmployee, setSelectedEmployee, visibleEmployees, notifications,
    unreadCount, markAsRead, logout, hasPermission, handleOpenAddAppointment, searchOverlayItems,
    handleSelectItem, handleSaveAppointment, createEmptyAppointment, createEmptyItem,
  } = mobileState;

  const handleCloseMenus = () => {
    setShowLogout(false);
    setShowNotifications(false);
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
                  src={user.Image || `https://placehold.co/32x32/cccccc/333333?text=${user.Nom.charAt(0)}`}
                  alt="Avatar"
                  className="w-8 h-8 object-cover"
                />
              </div>
              <span 
                className="text-sm font-semibold hidden sm:inline-block"
                style={{ color: 'var(--text-primary)' }}
              >
                {user.Nom} {user.Prenom}
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
                  onClick={() => logout()}
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
                e.currentTarget.style.color = 'var(--color-primary-500)';
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
                e.currentTarget.style.color = 'var(--color-primary-500)';
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
                variant="mobile"
              />
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main 
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          
          {/* Employee Selector - visible seulement pour les admins et managers */}
          {(hasPermission(22) || hasPermission(23)) && employees.length > 0 && (
            <EmployeeSelector 
              employees={visibleEmployees}
              teams={teams}
              selectedEmployee={selectedEmployee}
              onSelect={setSelectedEmployee}
            />
          )}

          {/* Calendar */}
          <MobileCalendarGrid 
            currentDate={selectedDate}
            selectedDate={selectedDate}
            appointments={monthlyAppointments}
            onDateSelect={setSelectedDate}
          />

          {/* Appointments Detail */}
          <AppointmentList 
            appointments={selectedDayAppointments}
            selectedDate={selectedDate}
            items={items}
            employees={employees}
            displayConfig={mobileAppointmentDisplay}
          />
        </main>

        {/* Floating Action Button - Visible pour les admins et managers */}
        {(hasPermission(22) || hasPermission(23)) && (
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
                className="w-14 h-14 rounded-full text-white flex items-center justify-center transform  transition-transform active:scale-95"
                style={{
                  backgroundColor: 'var(--color-primary-500)',
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
        {(hasPermission(22) || hasPermission(23)) && showSearchModal && (
          <SearchOverlay
            isOpen={showSearchModal}
            onClose={() => {
              setShowSearchModal(false);
            }}
            onSearch={searchOverlayItems}
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
              const isChantier = itemData.Type === 'Projet';
              const chantierData = isChantier ? itemData as any : null;
              
              return (
                <div className="flex-1 py-3 px-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: itemData.CouleurFondPlanningRessource }}
                    />
                    <div className="flex-1">
                      <p 
                        className="font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {itemData.LibellePlanningRessource}
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
        {(hasPermission(22) || hasPermission(23)) && showAppointmentForm && (
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
                  employees={visibleEmployees}
                  HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
                  isFullDay={true}
                  nonWorkingDates={nonWorkingDates}
                  isReducedVersion={false}
                  isMobile={true}
                  onSave={handleSaveAppointment}
                  onClose={() => {
                    setShowAppointmentForm(false);
                    setSelectedItem(null);
                  }}
                  handleOpenImageModal={() => {}}
                  handleAddManualRessource={async (_dimension) => ({ success: true })}
                  handleEditRessource={async (_dimension) => ({ success: true })}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MobileCalendar;