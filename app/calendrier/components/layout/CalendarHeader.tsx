import { CONTROL_PANEL_META_BY_KEY, CONTROL_PANEL_CATEGORIES, UserMenu } from '../index';
import { Appointment } from '../../types';
import React, { memo, useEffect, useState, useRef, useMemo } from 'react';
import DatePicker from '../ui/DatePicker';
import { useAuth } from '../../hooks/utils/AuthContext';
import ChantierViewsControl, { ChantierViewsControlProps } from '../Table/ChantierViewsControl';
import { useCalendarView } from '../../hooks';

const SelectedCheck = () => (
  <div
    className="
      w-6 h-6
      shrink-0
      rounded-full
      bg-primary-500
      flex items-center justify-center
    "
  >
    <svg
      className="w-3.5 h-3.5 text-white"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  </div>
);

interface ViewMenuItem {
  id: string;
  label: string;
  headerTitle?: string;
  icon: React.ReactNode;
  isAllowed: (hasPermission: (moduleId: number, actionId: number) => boolean) => boolean;
  isActive?: (viewType: string) => boolean;
  action: 'setView' | 'openSettings';
  target: string;
}

const VIEW_MENU_SECTIONS: ViewMenuItem[][] = [
  [
    {
      id: 'calendar',
      label: 'Planning',
      headerTitle: 'Planning',
      action: 'setView',
      target: 'calendar',
      isAllowed: () => true,
      isActive: (viewType) => viewType === 'calendar',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
        </svg>
      ),
    },
  ],
  [
    {
      id: 'chantier-table',
      label: 'Liste des chantiers',
      headerTitle: 'Liste des chantiers',
      action: 'setView',
      target: 'chantier-table',
      isAllowed: (hasPermission) => hasPermission(232, 3),
      isActive: (viewType) => viewType === 'chantier-table',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
          <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zM1 2v2h4V2H1zm4 3H1v3h4V5zm0 4H1v3h4V9zm0 4H1v2a1 1 0 0 0 1 1h3v-3zm5-8H6v3h4V4zm0 4H6v3h4V8z" />
        </svg>
      ),
    },
    {
      id: 'paie-table',
      label: 'Rubrique Sociale',
      headerTitle: 'Rubrique Paie',
      action: 'setView',
      target: 'paie-table',
      isAllowed: (hasPermission) => hasPermission(231, 3),
      isActive: (viewType) => viewType === 'paie-table',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
          <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3zm13-1H2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM2 5v7h12V5H2z" />
          <path d="M6 8a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 8zm0 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z" />
        </svg>
      ),
    },
    {
      id: 'manual-event-table',
      label: 'Événements manuels',
      headerTitle: 'Rubrique personnalisée',
      action: 'setView',
      target: 'manual-event-table',
      isAllowed: (hasPermission) => hasPermission(233, 3),
      isActive: (viewType) => viewType === 'manual-event-table',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 4h16a1 1 0 011 1v10a1 1 0 01-1 1h-6.586l-3.707 3.707A1 1 0 018 19v-3H4a1 1 0 01-1-1V5a1 1 0 011-1zm1 2v8h4a1 1 0 011 1v1.586L12.586 15H19V6H5zm2 2h10v2H7V8zm0 3h7v2H7v-2z" />
        </svg>
      ),
    },
  ],
  [
    {
      id: 'employee-table',
      label: 'Liste du personnel',
      headerTitle: 'Liste du personnel',
      action: 'setView',
      target: 'employee-table',
      isAllowed: (hasPermission) => hasPermission(234, 3),
      isActive: (viewType) => viewType === 'employee-table',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ),
    },
    {
      id: 'teams-management',
      label: CONTROL_PANEL_META_BY_KEY.teamsManagement.label,
      action: 'openSettings',
      target: CONTROL_PANEL_META_BY_KEY.teamsManagement.key,
      isAllowed: (hasPermission) => CONTROL_PANEL_META_BY_KEY.teamsManagement.isAllowed(hasPermission),
      icon: CONTROL_PANEL_META_BY_KEY.teamsManagement.icon,
    },
  ],
];

interface CalendarHeaderProps {
  theme: string;
  user: any;
  notifications: any;
  handleAddModal: (appointment: Appointment) => void;
  onNavigateDate: (date: number) => void;
  chantierViewsControlProps?: ChantierViewsControlProps;
}

export const CalendarHeader = memo(({
  theme,
  user,
  notifications,
  handleAddModal,
  onNavigateDate,
  chantierViewsControlProps,
}: CalendarHeaderProps) => {
  const {
    viewType, setViewType,
    isExpanded, setIsExpanded,
    searchInput, setSearchInput,
    setIsControlPanelModalOpen,
    isNotificationsPanelOpen, setIsNotificationsPanelOpen,
    setIsSearchOverlayOpen,
    isViewDropdownOpen, setIsViewDropdownOpen,
    viewDropdownRef,
    isDisplayWeekend, setIsDisplayWeekend,
    isFullDay, setIsFullDay,
    selectedDate, setSelectedDate,
  } = useCalendarView();

  const { hasPermission } = useAuth();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpDropdownRef = useRef<HTMLDivElement>(null);

  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  const clientLogo = localStorage.getItem('client_logo_url');
  const logoSrc = clientLogo || `/assets/logo-${theme}.svg`;

  // Sections de vues autorisées pour l'utilisateur courant
  const visibleViewSections = useMemo(() => {
    return VIEW_MENU_SECTIONS
      .map((section) => section.filter((item) => item.isAllowed(hasPermission)))
      .filter((section) => section.length > 0);
  }, [hasPermission]);

  const hasMultipleViews = visibleViewSections.flat().length > 1;

  // Titre dynamique du bandeau inférieur basé sur la vue active
  const currentHeaderTitle = useMemo(() => {
    const activeItem = VIEW_MENU_SECTIONS.flat().find(
      (item) => item.action === 'setView' && item.target === viewType
    );
    return activeItem?.headerTitle || 'Planning';
  }, [viewType]);

  // Fermeture centralisée des menus (clic extérieur + touche Échap)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(target)) {
        setIsSettingsDropdownOpen(false);
      }
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(target)) {
        setIsViewDropdownOpen(false);
      }
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(target)) {
        setIsHelpOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsDropdownOpen(false);
        setIsViewDropdownOpen(false);
        setIsHelpOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setIsViewDropdownOpen]);

  const openControlPanel = (category: string) => {
    sessionStorage.setItem('activeSettingsCategory', category);
    setIsSettingsDropdownOpen(false);
    setIsControlPanelModalOpen(true);
  };

  const handleSelectViewItem = (item: ViewMenuItem) => {
    if (item.action === 'setView') {
      setViewType(item.target as any);
    } else if (item.action === 'openSettings') {
      openControlPanel(item.target);
    }
    setIsViewDropdownOpen(false);
  };

  const controlPanelDropdownItems = CONTROL_PANEL_CATEGORIES.filter(
    (cat) => cat.menuLocation === 'settings' && cat.isAllowed(hasPermission)
  );

  return (
    <div className="flex flex-col items-center pr-9">
      <div className="flex flex-row w-full">
        {/* LOGO */}
        <div
          className={`pl-7 p-2 w-80 ${!isExpanded ? 'h-[80px]' : 'h-full'} transition-[padding] duration-300 ease-in-out`}
        >
          <img
            src={logoSrc}
            alt="Logo"
            className="h-20 w-auto mb-2 cursor-pointer object-contain"
            onClick={() => setViewType('calendar')}
          />
        </div>

        {/* BARRE CENTRALE (Recherche & Actions Globales) */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 h-[82px]">
          <div className="flex items-center justify-between w-full h-[50px]">
            {/* Barre de Recherche */}
            {viewType !== 'calendar' && (
              <div className="flex flex-col gap-1">
                <div className="relative w-72 max-w-full">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400 bg-icon" aria-hidden="true" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                    </svg>
                  </div>
                  <input
                    type="search"
                    id="search"
                    className="block w-full p-3 pl-8 text-base placeholder:bg-icon bg-icon rounded-xl transition focus:outline-0 poppins text-[14px]"
                    placeholder="Rechercher"
                    value={searchInput || ''}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Boutons d'Actions (Droite) */}
            <div className="flex items-center gap-3 ml-auto">
              {/* Bouton Expansion */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer"
                title={isExpanded ? 'Réduire' : 'Options avancées'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  fill="currentColor"
                  className={`transition-transform duration-300 bi bi-chevron-up bg-icon ${!isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 16 16"
                >
                  <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z" />
                </svg>
              </button>

              {/* Bouton Retour Planning (visible si hors calendar) */}
              {viewType !== 'calendar' && (
                <button
                  type="button"
                  className="p-3 rounded-full hover:bg-primary-100 transition cursor-pointer"
                  onClick={() => setViewType('calendar')}
                  title="Planning"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="20 20 60 60" width="25" height="25">
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
                </button>
              )}

              {/* Menu Paramètres */}
              {controlPanelDropdownItems.length > 0 && (
                <div className="relative" ref={settingsDropdownRef}>
                  <button
                    type="button"
                    aria-expanded={isSettingsDropdownOpen}
                    aria-haspopup="menu"
                    className={`p-3 rounded-full transition cursor-pointer ${
                      isSettingsDropdownOpen ? 'bg-primary-100 text-primary' : 'hover:bg-primary-100'
                    }`}
                    onClick={() => {
                      setIsViewDropdownOpen(false);
                      setIsHelpOpen(false);
                      setIsSettingsDropdownOpen(!isSettingsDropdownOpen);
                    }}
                    title="Paramètres"
                  >
                    <svg id="Glyph" enableBackground="new 0 0 32 32" height="25" viewBox="0 0 32 32" width="25" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bg-icon">
                      <path id="XMLID_273_" d="m27.526 18.036-.526-.304c-.626-.361-1-1.009-1-1.732s.374-1.371 1-1.732l.526-.304c1.436-.83 1.927-2.662 1.098-4.098l-1-1.732c-.827-1.433-2.666-1.925-4.098-1.098l-.526.303c-.626.362-1.375.362-2 0-.626-.362-1-1.009-1-1.732v-.607c0-1.654-1.346-3-3-3h-2c-1.654 0-3 1.346-3 3v.608c0 .723-.374 1.37-1 1.732-.626.361-1.374.362-2 0l-.526-.304c-1.432-.827-3.271-.335-4.099 1.098l-1 1.732c-.829 1.436-.338 3.269 1.098 4.098l.527.304c.626.361 1 1.009 1 1.732s-.374 1.371-1 1.732l-.526.304c-1.436.829-1.927 2.662-1.098 4.098l1 1.732c.828 1.433 2.667 1.925 4.098 1.098l.526-.303c.626-.363 1.374-.361 2 0 .626.362 1 1.009 1 1.732v.607c0 1.654 1.346 3 3 3h2c1.654 0 3-1.346 3-3v-.608c0-.723.374-1.37 1-1.732.625-.361 1.374-.362 2 0l.526.304c1.432.826 3.271.334 4.098-1.098l1-1.732c.829-1.436.338-3.269-1.098-4.098zm-11.526 2.964c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z" />
                    </svg>
                  </button>

                  {isSettingsDropdownOpen && (
                    <div
                      role="menu"
                      className="absolute top-full right-0 mt-2 w-[280px] bg-secondary rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.18)] border border-light z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200"
                    >
                      <div className="px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white">
                        <h3 className="text-sm font-semibold">Paramètres</h3>
                      </div>

                      <div className="py-2 px-2">
                        {controlPanelDropdownItems.map((item) => (
                          <React.Fragment key={item.key}>
                            {item.dividerBefore && <div className="mx-2 my-2 h-px bg-gray-200" />}
                            <button
                              type="button"
                              role="menuitem"
                              className="w-full px-3 py-2.5 rounded-xl text-left flex items-center gap-3 transition-all duration-150 group text-primary hover:bg-primary-500-50 cursor-pointer"
                              onClick={() => openControlPanel(item.key)}
                            >
                              <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-all duration-150 text-primary group-hover:bg-primary-500 group-hover:!text-white">
                                {item.icon}
                              </div>
                              <span className="flex-1 text-sm font-medium">{item.label}</span>
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Menu Sélection de Vue */}
              {hasMultipleViews && (
                <div className="relative" ref={viewDropdownRef}>
                  <button
                    type="button"
                    aria-expanded={isViewDropdownOpen}
                    aria-haspopup="menu"
                    className={`p-3 rounded-full transition cursor-pointer ${
                      isViewDropdownOpen ? 'bg-primary-100 text-primary' : 'hover:bg-primary-100'
                    }`}
                    onClick={() => {
                      setIsSettingsDropdownOpen(false);
                      setIsHelpOpen(false);
                      setIsViewDropdownOpen(!isViewDropdownOpen);
                    }}
                    title="Changer d’espace"
                  >
                    <svg id="Layer_1" enableBackground="new 0 0 512 512" height="25" viewBox="0 0 512 512" width="25" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bg-icon">
                      <path clipRule="evenodd" d="m40.583 21h71.806c10.771 0 19.583 8.812 19.583 19.583v71.806c0 10.771-8.812 19.583-19.583 19.583h-71.806c-10.771 0-19.583-8.812-19.583-19.583v-71.806c0-10.771 8.812-19.583 19.583-19.583zm159.931 19.583v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm-359.028 179.514v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm-359.028 179.514v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583z" />
                    </svg>
                  </button>

                  {isViewDropdownOpen && (
                    <div
                      role="menu"
                      className="
                        absolute top-full right-0 mt-2 -left-30
                        w-64
                        bg-secondary
                        rounded-2xl
                        shadow-[0_12px_35px_rgba(0,0,0,0.18)]
                        border border-light
                        z-50
                        overflow-hidden
                        animate-in slide-in-from-top-2 duration-200
                      "
                    >
                      {/* HEADER */}
                      <div className="px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white">
                        <h3 className="text-sm font-semibold">Changer d’espace</h3>
                      </div>

                      {/* OPTIONS PAR SECTIONS */}
                      <div className="py-2 px-2">
                        {visibleViewSections.map((section, sectionIndex) => (
                          <React.Fragment key={sectionIndex}>
                            {sectionIndex > 0 && <div className="mx-2 my-2 h-px bg-gray-200" />}
                            <div className="flex flex-col gap-1">
                              {section.map((item) => {
                                const active = item.isActive?.(viewType) ?? false;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    role="menuitem"
                                    aria-current={active ? 'page' : undefined}
                                    onClick={() => handleSelectViewItem(item)}
                                    className={`
                                      w-full px-3 py-2.5 rounded-xl text-left
                                      flex items-center gap-3 transition-all duration-150 group cursor-pointer
                                      ${
                                        active
                                          ? 'bg-primary-100 text-primary'
                                          : 'text-primary hover:bg-primary-500-50'
                                      }
                                    `}
                                  >
                                    <div
                                      className={`
                                        w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-all duration-150
                                        ${
                                          active
                                            ? 'bg-primary-500 text-white'
                                            : 'text-primary group-hover:bg-primary-500 group-hover:!text-white'
                                        }
                                      `}
                                    >
                                      {item.icon}
                                    </div>

                                    <span className="flex-1 text-sm font-medium">{item.label}</span>

                                    {active && <SelectedCheck />}
                                  </button>
                                );
                              })}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bouton Notifications */}
              {false && (
                <button
                  type="button"
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary-100 transition cursor-pointer"
                  onClick={() => setIsNotificationsPanelOpen(!isNotificationsPanelOpen)}
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <div className="relative flex items-center justify-center">
                    <svg
                      id="Layer_1"
                      enableBackground="new 0 0 100 100"
                      viewBox="0 0 100 100"
                      xmlns="http://www.w3.org/2000/svg"
                      width="25"
                      height="25"
                      fill="currentColor"
                      className="bg-icon"
                    >
                      <path d="m84.9384384 78.6478882h-69.8768778c-4.2446356 0-6.8042536-4.7139664-4.4792337-8.2760315l4.8991413-7.4587746c2.6900654-4.0955315 4.1233788-8.8885002 4.1233788-13.7884827v-6.9935493c0-14.3977032 10.0250931-26.4705181 23.462925-29.5846062v-3.1142158c-.0000001-3.8393617 3.1142158-6.9322281 6.932228-6.9322281 1.9197464 0 3.6474648.7678463 4.9058571 2.0263696 1.237175 1.2583933 2.026371 2.9861126 2.026371 4.9058585v3.1142168c5.631134 1.2797441 10.622261 4.1380129 14.5683823 8.0839968 5.5030289 5.5031605 8.8945465 13.0966091 8.8945465 21.5006084v6.9935493c0 4.8999825 1.4333115 9.6929512 4.1233749 13.7884827l4.8991394 7.4587746c2.3250198 3.5620651-.2345962 8.2760315-4.4792328 8.2760315z" />
                      <path d="m50.0000114 97.5h-.0000229c-6.6999817 0-12.1313858-5.4314041-12.1313858-12.1313858v-.4888229h24.2627945v.4888229c0 6.6999817-5.4314041 12.1313858-12.1313858 12.1313858z" />
                    </svg>
                    {notifications.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
                    )}
                  </div>
                </button>
              )}

              {/* Bouton Aide */}
              <div className="relative" ref={helpDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsDropdownOpen(false);
                    setIsViewDropdownOpen(false);
                    setIsHelpOpen((open) => !open);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isHelpOpen ? 'bg-primary-100 text-primary' : 'hover:bg-primary-100'
                  }`}
                  title="Aide et raccourcis clavier"
                  aria-label="Aide et raccourcis clavier"
                  aria-expanded={isHelpOpen}
                >
                  <span className="text-xl font-semibold bg-icon leading-none">?</span>
                </button>
                {isHelpOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-default bg-secondary p-3 shadow-lg">
                    <h3 className="mb-2 text-sm font-semibold">Raccourcis clavier</h3>
                    <div className="space-y-1 text-sm">
                      {[
                        ['Ctrl + C', 'Copier'],
                        ['Ctrl + V', 'Coller'],
                        ['Ctrl + Z', 'Annuler'],
                        ['Ctrl + F', 'Rechercher'],
                        ['Suppr', 'Supprimer'],
                      ].map(([shortcut, label]) => (
                        <div key={shortcut} className="flex items-center justify-between gap-3">
                          <span>{label}</span>
                          <kbd className="rounded border border-default px-1.5 py-0.5 text-xs">{shortcut}</kbd>
                        </div>
                      ))}
                      <div className="mx-2 my-2 h-px bg-primary-100" />
                      <span>Version 25.11.2026</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Menu Utilisateur */}
              <div className="p-4 transition relative">
                <UserMenu user={user} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRE D'OUTILS INFERIEURE (Titres, Filtres, Date) - Visible si Expanded */}
      <div className={`flex items-center justify-between w-full ${!isExpanded ? 'hidden' : 'h-[50px]'}`}>
        <div className={`${viewType === 'calendar' ? 'ml-80' : 'ml-7'}`}>
          <p className={`text-5xl poppins text-primary ${viewType !== 'calendar' ? 'mt-[20px]' : ''}`}>
            {currentHeaderTitle}
          </p>
        </div>

        <div className="flex flex-row items-center gap-4">
          <div className="flex flex-row items-center gap-2">
            {viewType === 'calendar' && (
              <div className="w-44">
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    onNavigateDate(date);
                  }}
                  format="dd/MM/yyyy"
                  placeholder="Sélectionner une date"
                  inputClassName="bg-secondary text-primary border-default border rounded-2xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary transition w-38"
                />
              </div>
            )}
          </div>

          {viewType === 'chantier-table' && chantierViewsControlProps && (
            <ChantierViewsControl {...chantierViewsControlProps} compact />
          )}

          {/* Toggle Weekend / Full Day */}
          {viewType === 'calendar' && (
            <div className="border border-default rounded-xl flex items-center multi-op">
              <button
                type="button"
                className="transition btn-header cursor-pointer border-r border-default px-3 py-2"
                onClick={() => setIsDisplayWeekend(!isDisplayWeekend)}
                title={isDisplayWeekend ? 'Masquer le week-end' : 'Afficher le week-end'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className={'bg-icon bi bi-calendar-event transition duration-200 ' + (!isDisplayWeekend ? ' text-primary-500' : 'text-gray-500')} viewBox="0 0 16 16">
                  <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z" />
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                </svg>
              </button>
              <button
                type="button"
                className="transition cursor-pointer btn-header border-default px-3 py-2"
                onClick={() => setIsFullDay(!isFullDay)}
                title={isFullDay ? 'Mode demi-journée' : 'Mode journée complète'}
              >
                {!isFullDay ? (
                  <svg id="Layer_1" enableBackground="new 0 0 32 32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bg-icon">
                    <path d="m27 3v26c0 .5527344-.4472656 1-1 1h-8c-.5527344 0-1-.4472656-1-1v-26c0-.5527344.4472656-1 1-1h8c.5527344 0 1 .4472656 1 1zm-13-1h-8c-.5527344 0-1 .4472656-1 1v26c0 .5527344.4472656 1 1 1h8c.5527344 0 1-.4472656 1-1v-26c0-.5527344-.4472656-1-1-1z" />
                  </svg>
                ) : (
                  <svg id="Layer_1" height="20" viewBox="0 0 512 512" width="20" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bg-icon">
                    <rect height="480" rx="10.695" width="108.343" x="201.828" y="16" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Bouton Ajouter Évènement / Ressource */}
          {(hasPermission(231, 3) || hasPermission(232, 3) || hasPermission(233, 3)) && (viewType === 'calendar' || viewType === 'manual-event-table') && (
            <button
              className="transition px-3 py-2 rounded-2xl cursor-pointer text-white font-semibold shadow active:scale-95 pointer-events-auto bg-primary-500"
              type="button"
              onClick={() =>
                viewType === 'calendar'
                  ? setIsSearchOverlayOpen(true)
                  : handleAddModal({
                      IdPlanningEvenement: -1,
                      AnnotationPlanningEvenement: '',
                      DebutPlanningEvenement: 0,
                      FinPlanningEvenement: 1,
                      IdEmploye: -1,
                      IdPlanningRessource: -1,
                      isLocked: false,
                    })
              }
              title={viewType === 'calendar' ? 'Ajouter un évènement' : 'Ajouter une ressource'}
            >
              {viewType === 'calendar' ? '+ Ajouter un évènement' : '+ Ajouter une ressource'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});