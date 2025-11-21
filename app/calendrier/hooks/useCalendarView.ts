import { useState, useCallback, useEffect, useRef } from 'react';
import { CalendarConfig } from '../types'; // Assumed type
import { ActiveFilters } from '../utils/searchAndFilterUtils';
import { useCalendarConfig } from './useCalendarConfig'; // Le hook existant
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from '../utils/constants';

export const useCalendarView = (employeesRef: any) => {
  // --- Préférences persistantes (localStorage) ---
  const getStoredBool = (key: string, def: boolean) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key) === 'true';
    }
    return def;
  };

  const [isDisplayWeekend, setIsDisplayWeekend] = useState(() => getStoredBool('isDisplayWeekend', false));
  const [includeWeekend, setIncludeWeekend] = useState(() => getStoredBool('includeWeekend', false));
  const [isExpanded, setIsExpanded] = useState(() => getStoredBool('isExpanded', false));
  const [isFullDay, setIsFullDay] = useState(() => getStoredBool('isFullDay', false));
  const [respectNonWorkingDays, setRespectNonWorkingDays] = useState(() => getStoredBool('respectNonWorkingDays', false));
  
  const [viewType, setViewType] = useState<'calendar' | 'chantier-table' | 'paie-table' | 'employee-table'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('viewType');
      return (saved as any) || 'calendar';
    }
    return 'calendar';
  });

  // --- États UI Volatiles ---
  const [isMobile, setIsMobile] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ empty: [] });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [modalInfo, setModalInfo] = useState<{ message: string, color: string } | null>(null);
  const [nonWorkingDates, setNonWorkingDates] = useState<Date[]>([]);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [eventSearchInput, setEventSearchInput] = useState<string>('');

  // --- Hook de configuration existant ---
  const calendarConfigHook = useCalendarConfig({ employees: employeesRef });
  const [currentCalendarConfig, setCurrentCalendarConfig] = useState<CalendarConfig | null>(null);

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
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSearchInput('');
  }, [viewType]);

  return {
    // États
    isDisplayWeekend, setIsDisplayWeekend: (v: boolean) => toggleSet('isDisplayWeekend', setIsDisplayWeekend, v),
    includeWeekend, setIncludeWeekend: (v: boolean) => toggleSet('includeWeekend', setIncludeWeekend, v),
    isExpanded, setIsExpanded: (v: boolean) => toggleSet('isExpanded', setIsExpanded, v),
    isFullDay, setIsFullDay: (v: boolean) => toggleSet('isFullDay', setIsFullDay, v),
    respectNonWorkingDays, setRespectNonWorkingDays: (v: boolean) => toggleSet('respectNonWorkingDays', setRespectNonWorkingDays, v),
    viewType, setViewType: (v: any) => {
        setViewType(v);
        setTimeout(() => localStorage.setItem('viewType', v), 0);
    },
    
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
    eventSearchInput, setEventSearchInput,
    
    // Config Calendar
    calendarConfigHook,
    currentCalendarConfig,
    setCurrentCalendarConfig,
    availableConfigs: calendarConfigHook.getAvailableConfigs,

    // Helpers pour constants
    constants: {
        // Ces valeurs peuvent être calculées ici ou importées
        intervals: isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS
    }
  };
};