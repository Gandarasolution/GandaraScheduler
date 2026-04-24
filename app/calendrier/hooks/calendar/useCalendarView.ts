import { useState, useEffect, useRef } from 'react';
import { CalendarConfig, User } from '../../types'; // Assumed type
import { ActiveFilters } from '@/app/calendrier/utils/searchAndFilterUtils'; // Assumed type
import { useCalendarConfig } from '@/app/calendrier'; // Le hook existant
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from '../../utils/constants';
import loadConfig from 'next/dist/server/config';

export const useCalendarView = (employeesRef: any, user: User) => {
  // --- Préférences persistantes (localStorage) ---
  const getStoredBool = (key: string, def: boolean) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key) === 'true';
    }
    return def;
  };
  const [isMobile, setIsMobile] = useState(false);

  const [isDisplayWeekend, setIsDisplayWeekend] = useState(() => getStoredBool('isDisplayWeekend', false));
  const [includeWeekend, setIncludeWeekend] = useState(true); // Pas de persistence pour celui-ci, c'est une option temporaire
  const [isExpanded, setIsExpanded] = useState(() => getStoredBool('isExpanded', false));
  const [isFullDay, setIsFullDay] = useState(() => getStoredBool('isFullDay', false));
  const [respectNonWorkingDays, setRespectNonWorkingDays] = useState(true);
  const [tagPlacement, setTagPlacement] = useState<'hover' | 'fixed'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (localStorage.getItem('tagPlacement') as 'hover' | 'fixed') || 'hover';
    }
    return 'hover';
  });
  
  const [viewType, setViewType] = useState<'calendar' | 'chantier-table' | 'paie-table' | 'employee-table' | 'manual-event-table'>(() => {        
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('viewType');
      const savedView = (saved as any) || 'calendar';
      
      // Bloquer l'accès aux vues interdites pour users et viewers
      if ((user?.role === 'user' || user?.role === 'viewer') && 
          (savedView === 'paie-table' || savedView === 'manual-event-table')) {
        return 'calendar';
      }
      
      return savedView;
    }
    return 'calendar';
  });

  // --- États UI Volatiles ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ empty: [] });
  const [selectedDate, setSelectedDate] = useState<number>(new Date().setHours(0,0,0,0));
  const [modalInfo, setModalInfo] = useState<{ message: string, color: string } | null>(null);
  const [nonWorkingDates, setNonWorkingDates] = useState<number[]>([]);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [dimensionSearchInput, setDimensionsSearchInput] = useState<string>('');

  // --- Hook de configuration existant ---
  const calendarConfigHook = useCalendarConfig({ employees: employeesRef, user });
  const [currentCalendarConfig, setCurrentCalendarConfig] = useState<CalendarConfig | null>(null);

   // État local pour le menu déroulant des vues
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);


  // --- Setters avec persistence ---
  const toggleSet = (key: string, setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean) => {
    setter(value);
    setTimeout(() => localStorage.setItem(key, JSON.stringify(value)), 0);
  };

  // --- Auto-init configuration ---
  useEffect(() => {

    if (calendarConfigHook.getAvailableConfigs.length > 0 && !currentCalendarConfig) {      
      setCurrentCalendarConfig(calendarConfigHook.getAvailableConfigs[0]);
    }
  }, [calendarConfigHook.getAvailableConfigs, currentCalendarConfig]);

  // --- Detection Mobile ---
  useEffect(() => {
    const handleResize = () => {
      const isTrue = window.innerWidth < 640;
      setIsMobile(isTrue);

      if (isTrue) {
        setViewType('calendar');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSearchInput('');
  }, [viewType]);

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isViewDropdownOpen && viewDropdownRef.current) {
        const target = event.target as HTMLElement;
        if (!viewDropdownRef.current.contains(target)) {
          setIsViewDropdownOpen(false);
        }
      }
    };

    if (isViewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isViewDropdownOpen]);
    

  return {
    // États
    isDisplayWeekend, setIsDisplayWeekend: (v: boolean) => toggleSet('isDisplayWeekend', setIsDisplayWeekend, v),
    includeWeekend, setIncludeWeekend: (v: boolean) => toggleSet('includeWeekend', setIncludeWeekend, v),
    isExpanded, setIsExpanded: (v: boolean) => toggleSet('isExpanded', setIsExpanded, v),
    isFullDay, setIsFullDay: (v: boolean) => toggleSet('isFullDay', setIsFullDay, v),
    respectNonWorkingDays, setRespectNonWorkingDays: (v: boolean) => toggleSet('respectNonWorkingDays', setRespectNonWorkingDays, v),
    tagPlacement, setTagPlacement: (v: 'hover' | 'fixed') => {
      setTagPlacement(v);
      setTimeout(() => localStorage.setItem('tagPlacement', v), 0);
    },
    viewType, setViewType: (v: any) => {
        // Bloquer l'accès à paie-table et manual-event-table pour users et viewers
        if ((user.role === 'user' || user.role === 'viewer') && 
            (v === 'paie-table' || v === 'manual-event-table')) {
          // Rediriger vers calendar
          setViewType('calendar');
          setTimeout(() => localStorage.setItem('viewType', 'calendar'), 0);
          return;
        }
        setViewType(v);
        setTimeout(() => localStorage.setItem('viewType', v), 0);
    },
    isViewDropdownOpen, setIsViewDropdownOpen,
    viewDropdownRef,
    
    isMobile,
    isSettingsOpen, setIsSettingsOpen,
    isFilterModalOpen, setIsFilterModalOpen,
    isSearchOverlayOpen, setIsSearchOverlayOpen,
    activeFilters, setActiveFilters,
    selectedDate, setSelectedDate,
    modalInfo, setModalInfo,
    nonWorkingDates, setNonWorkingDates,
    isNotificationsPanelOpen, setIsNotificationsPanelOpen,
    searchInput, setSearchInput,
    dimensionSearchInput, setDimensionsSearchInput,
    
    // Config Calendar
    calendarConfigHook,
    currentCalendarConfig,
    setCurrentCalendarConfig,
    availableConfigs: calendarConfigHook.getAvailableConfigs,


    loadConfigs: calendarConfigHook.loadConfigs,

    // Helpers pour constants
    constants: {
        // Ces valeurs peuvent être calculées ici ou importées
        intervals: isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS
    }
  };
};