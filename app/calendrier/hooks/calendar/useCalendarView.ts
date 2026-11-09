import { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarConfig, MobileAppointmentDisplayConfig, User } from '../../types'; // Assumed type
import { ActiveFilters } from '@/app/calendrier/utils/searchAndFilterUtils'; // Assumed type
import { useCalendarConfig } from '@/app/calendrier'; // Le hook existant
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from '../../utils/constants';
import { axiosAgent } from '@/app/service/axios.service';
import { calendarConfigService } from '@/app/service';
import { useAuth } from '../utils/AuthContext';
import { useDayTypesContext } from '../data/dayTypesContext';


export const useCalendarView = (idPlanning: number, user: User, isMobile: boolean) => {

  const { hasPermission, currentVueId, setCurrentVueId } = useAuth();


  const defaultMobileAppointmentDisplay: MobileAppointmentDisplayConfig = {
    primaryFields: ['LibellePlanningRessource', 'Type'],
    secondaryFields: [
      'DebutPlanningEvenement',
      'FinPlanningEvenement',
      'AnnotationPlanningEvenement',
      'IdEmploye',
      'EtapeValidation',
      'Etiquette',
    ],
  };

  
  const normalizeMobileConfig = (config: any): MobileAppointmentDisplayConfig => {
    const readField = (field: any) => {
      if (typeof field === 'string') return { code: field, special: false };
      if (!field || typeof field !== 'object') return null;
      const code = field.CodeChamp ?? field.code ?? field.Code ?? field.field;
      if (typeof code !== 'string' || !code) return null;
      return {
        code,
        special: field.CaractereSpecial === true || field.estCaractereSpecial === true,
      };
    };
    const readFieldList = (value: any): Array<{ code: string; special: boolean }> => {
      if (!Array.isArray(value)) return [];
      return value
        .flatMap((field) => Array.isArray(field) ? readFieldList(field) : [readField(field)])
        .filter((field): field is { code: string; special: boolean } => field !== null);
    };

    const readColumn = (column: 'primaryFields' | 'secondaryFields') => {
      return readFieldList(config?.[column]).map(({ code }) => code);
    };

    const readRows = (column: 'primaryFields' | 'secondaryFields') => {
      const value = Array.isArray(config?.[column]) ? config[column] : [];
      if (!value.length) return [];
      if (Array.isArray(value[0])) {
        return value.map((row: any[]) => readFieldList(row).map(({ code }) => code));
      }
      if (typeof value[0] !== 'object') return value.map((field: string) => [field]);
      const rows = new Map<number, Array<{ field: string; position: number }>>();
      value.forEach((field: any) => {
        const parsed = readField(field);
        if (!parsed) return;
        const line = Number(field.Ligne ?? field.line);
        const position = Number(field.Position ?? field.position);
        const rowIndex = Number.isFinite(line) && line > 0 ? line : 1;
        const row = rows.get(rowIndex) || [];
        row.push({ field: parsed.code, position: Number.isFinite(position) ? position : row.length + 1 });
        rows.set(rowIndex, row);
      });
      return [...rows.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, row]) => row.sort((a, b) => a.position - b.position).map(({ field }) => field));
    };

    const allFields = [...readFieldList(config?.primaryFields), ...readFieldList(config?.secondaryFields)];
    return {
      primaryFields: readColumn('primaryFields'),
      secondaryFields: readColumn('secondaryFields'),
      primaryFieldRows: readRows('primaryFields'),
      secondaryFieldRows: readRows('secondaryFields'),
      specialFields: [...new Set(allFields.filter(({ special }) => special).map(({ code }) => code))],
    };
  };
  const mobileDisplayLoadedRef = useRef(false);
  const [mobileAppointmentFieldOptions, setMobileAppointmentFieldOptions] = useState<Array<{
                                                                                      Id: number;
                                                                                      Libelle: string;
                                                                                      Code: string;
                                                                                      CaractereSpecial: boolean;
                                                                                    }>>([]);
  const [mobileAppointmentSettingsLoading, setMobileAppointmentSettingsLoading] = useState(false);
  // --- Préférences persistantes ---
  const getStoredBool = (key: string, def: boolean) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key) === 'true';
    }
    return def;
  };

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
  const [overlapDisplayMode, setOverlapDisplayMode] = useState<'button' | 'count'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (localStorage.getItem('overlapDisplayMode') as 'button' | 'count') || 'button';
    }
    return 'button';
  });
  const [mobileAppointmentDisplay, setMobileAppointmentDisplayState] = useState<MobileAppointmentDisplayConfig>(defaultMobileAppointmentDisplay);
  
  const { setDayTypes } = useDayTypesContext();
  
  const [viewType, setViewType] = useState<'calendar' | 'chantier-table' | 'paie-table' | 'employee-table' | 'manual-event-table'>(() => {        
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('viewType');
      const savedView = (saved as any) || 'calendar';
      
      if (!hasPermission(214, 23) && (savedView === 'paie-table' || savedView === 'manual-event-table')) {
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
  const lastPositionStorageKey = `calendar-last-position-${user?.IdPersonnel ?? 'anonymous'}-${idPlanning}`;
  const [lastPositionEmployeeId, setLastPositionEmployeeId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(() => {
    const today = new Date().setHours(0, 0, 0, 0);

    if (isMobile || typeof window === 'undefined') return today;

    const storedPosition = window.localStorage.getItem(lastPositionStorageKey);
    const storedDate = storedPosition
      ? Number((() => {
        try {
          return JSON.parse(storedPosition).date;
        } catch {
          return null;
        }
      })())
      : Number(window.localStorage.getItem(`calendar-selected-date-${user?.IdPersonnel ?? 'anonymous'}`));
    if (!Number.isFinite(storedDate) || storedDate <= 0) return today;

    const parsedDate = new Date(storedDate);
    return Number.isNaN(parsedDate.getTime())
      ? today
      : parsedDate.setHours(0, 0, 0, 0);
  });
  const [modalInfo, setModalInfo] = useState<{ message: string, color: string } | null>(null);
  const [nonWorkingDates, setNonWorkingDates] = useState<Record<string, {Id: number; TypeJourCode: string }>>({});
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [dimensionSearchInput, setDimensionsSearchInput] = useState<string>('');

  useEffect(() => {
    if (!Number.isFinite(selectedDate) || selectedDate <= 0) return;
    const currentPosition = {
      date: selectedDate,
      idPersonnel: lastPositionEmployeeId,
    };
    window.localStorage.setItem(lastPositionStorageKey, JSON.stringify(currentPosition));
  }, [lastPositionEmployeeId, selectedDate, lastPositionStorageKey]);

  const positionLoadedRef = useRef(false);
  const canSetLastPositionRef = useRef(false);
  const [lastPositionLoaded, setLastPositionLoaded] = useState(false);
  const pendingPositionRef = useRef<number| null>(null);
  const positionSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveLastPosition = useCallback((position: { date: number; idPersonnel: number }) => {
    if (isMobile || !canSetLastPositionRef.current) return;

    pendingPositionRef.current = position.date;
    if (positionSaveTimeoutRef.current) clearTimeout(positionSaveTimeoutRef.current);
    positionSaveTimeoutRef.current = setTimeout(() => {
      const pendingPosition = pendingPositionRef.current;
      if (!pendingPosition) return;
      void calendarConfigService.setLastPositionForUser(pendingPosition).then((response) => {
        if (response?.success === false) {
          console.error('Erreur lors de l’enregistrement de la dernière position du calendrier :', response.message);
        }
      }).catch((error) => {
        console.error('Erreur lors de l’enregistrement de la dernière position du calendrier :', error);
      });
    }, 1000); // 1 seconde de délai pour éviter les appels trop fréquents
  }, [isMobile]);

  useEffect(() => {
    if (!idPlanning || idPlanning <= 0 || !user?.IdPersonnel) return;

    let cancelled = false;
    positionLoadedRef.current = false;
    canSetLastPositionRef.current = false;
    setLastPositionLoaded(false);

    const loadLastPosition = async () => {
      if (isMobile) {
        setSelectedDate(new Date().setHours(0, 0, 0, 0));
        setLastPositionEmployeeId(null);
        positionLoadedRef.current = true;
        setLastPositionLoaded(true);
        return;
      }

      const storedPosition = window.localStorage.getItem(lastPositionStorageKey);
      if (storedPosition) {
        try {
          const localPosition = JSON.parse(storedPosition);
          const localEmployeeId = Number(localPosition?.idPersonnel);
          if (Number.isFinite(localEmployeeId) && localEmployeeId > 0) {
            setLastPositionEmployeeId(localEmployeeId);
          }
        } catch {
          console.error('La dernière position locale du calendrier est invalide.');
        }
      }

      try {
        const response = await calendarConfigService.getLastPositionForUser();
        if (cancelled) return;

        canSetLastPositionRef.current = response?.data?.canSetLastPosition === true;

        if (response?.success && response.data == null) {
          const today = new Date().setHours(0, 0, 0, 0);
          setSelectedDate(today);
          setLastPositionEmployeeId(null);
          return;
        }

        const position = response?.data;
        const date = Number(position?.date ?? position?.Date ?? position?.DatePosition ?? position?.dernierePosition ?? position?.DernierePosition);
        const employeeId = Number(position?.idPersonnel ?? position?.IdPersonnel ?? position?.IdEmploye);
        if (response?.success && Number.isFinite(date) && date > 0) {
          setSelectedDate(new Date(date).setHours(0, 0, 0, 0));
          if (Number.isFinite(employeeId) && employeeId > 0) setLastPositionEmployeeId(employeeId);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de la dernière position du calendrier :', error);
      } finally {
        if (!cancelled) {
          positionLoadedRef.current = true;
          setLastPositionLoaded(true);
        }
      }
    };

    void loadLastPosition();
    return () => {
      cancelled = true;
      if (positionSaveTimeoutRef.current) clearTimeout(positionSaveTimeoutRef.current);
    };
  }, [idPlanning, isMobile, lastPositionStorageKey, user?.IdPersonnel]);

  const handleCalendarPositionChange = useCallback((position: { date?: number; idPersonnel?: number }) => {
    const date = position.date ?? selectedDate;
    const idPersonnel = position.idPersonnel ?? lastPositionEmployeeId;
    if (
      !positionLoadedRef.current ||
      !Number.isFinite(date) ||
      idPersonnel === null ||
      !Number.isFinite(idPersonnel) ||
      idPersonnel <= 0
    ) return;
    setSelectedDate(date);
    setLastPositionEmployeeId(idPersonnel);
    saveLastPosition({ date, idPersonnel });
  }, [lastPositionEmployeeId, saveLastPosition, selectedDate]);

  useEffect(() => {
    if (!positionLoadedRef.current || !Number.isFinite(selectedDate) || !lastPositionEmployeeId) return;
    saveLastPosition({ date: selectedDate, idPersonnel: lastPositionEmployeeId });
  }, [lastPositionEmployeeId, saveLastPosition, selectedDate]);

  useEffect(() => () => {
    if (positionSaveTimeoutRef.current) clearTimeout(positionSaveTimeoutRef.current);
  }, []);



  // --- Hook de configuration existant ---
  const [currentCalendarConfig, setCurrentCalendarConfig] = useState<CalendarConfig | null>(null);
  const calendarConfigHook = useCalendarConfig({ user, idPlanning, setCurrentCalendarConfig });

  useEffect(() => {
    if (viewType !== 'calendar' || currentVueId !== 0 || !idPlanning || isMobile) return;

    let cancelled = false;
    const loadLastPlanningView = async () => {
      try {
        axiosAgent.defaults.headers.common['X-Planning-Id'] = idPlanning;
        const response = await calendarConfigService.getLastVueForUser();
        if (cancelled) return;

        const payload = response?.data;
        const rawViews = payload?.Configs ?? payload?.configs ?? payload;
        const views = Array.isArray(rawViews) ? rawViews : rawViews ? [rawViews] : [];
        const viewId = Number(
          views[0]?.IdPlanningVue
            ?? views[0]?.IdPlanningChantierVue
            ?? views[0]?.ValeurParametre
        );
        if (!Number.isFinite(viewId) || viewId <= 0) {
          throw new Error(response?.message || "Aucune vue planning n'est disponible.");
        }

        setCurrentVueId(viewId);
        axiosAgent.defaults.headers.common['X-PlanningVue-Id'] = viewId;
      } catch (error) {
        if (!cancelled) console.error("Impossible de charger la dernière vue du planning.", error);
      }
    };

    void loadLastPlanningView();
    return () => {
      cancelled = true;
    };
  }, [currentVueId, idPlanning, isMobile, setCurrentVueId, viewType]);

  useEffect(() => {
    if (viewType !== 'calendar' || currentVueId === null || currentVueId <= 0 || isMobile) return;
    if (currentCalendarConfig?.IdPlanningVue === currentVueId) return;

    void calendarConfigHook.loadConfigs(hasPermission(214, 23) || hasPermission(214, 22));
  }, [
    currentCalendarConfig?.IdPlanningVue,
    currentVueId,
    hasPermission,
    isMobile,
    viewType,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadMobileAppointmentDisplay = async () => {
      if (!isMobile || !user?.IdPersonnel) return;
      const result = await calendarConfigService.getMobileAppointmentDisplayConfig();
      if (cancelled) return;

      const config = result?.data;
      if (result?.success && config) {
        setMobileAppointmentDisplayState(normalizeMobileConfig(config));
      } else {
        setMobileAppointmentDisplayState(defaultMobileAppointmentDisplay);
      }
      mobileDisplayLoadedRef.current = true;
    };

    void loadMobileAppointmentDisplay();
    return () => {
      cancelled = true;
    };
  }, [user?.IdPersonnel, currentCalendarConfig?.IdPlanningVue, isMobile]);

  const loadMobileAppointmentSettings = useCallback(async () : Promise<{ success: boolean; message?: string }> => {
    if (!user?.IdPersonnel) return { success: false, message: 'Impossible de charger les paramètres des rendez-vous mobiles : utilisateur non défini.' };
    setMobileAppointmentSettingsLoading(true);
    try {
      const result = await calendarConfigService.getMobileAppointmentDisplayConfigSettings();
      if (result?.success === false || !result.data) return { success: false, message: result?.message || 'Erreur lors du chargement des paramètres des rendez-vous mobiles.' };

      const fields = Array.isArray(result.data) ? result.data : result.data.fields;
      if (Array.isArray(fields)) {
        setMobileAppointmentFieldOptions(fields.map((field: any) => ({
          Libelle: field.Libelle ?? field.label,
          Id: field.Id ?? field.id,
          Code: field.Code ?? field.code,
          CaractereSpecial: field.CaractereSpecial ?? field.specialCharacter ?? false,
        })).filter((field: { Code?: string; Libelle?: string; CaractereSpecial?: boolean; Id?: number }) => field.Code && field.Libelle && typeof field.CaractereSpecial === 'boolean' && typeof field.Id === 'number'));
      }

      if (!isMobile) {
        const config = result.data.config ?? result.data.displayConfig ?? result.data;
        if (Array.isArray(config.primaryFields) && Array.isArray(config.secondaryFields)) {
          setMobileAppointmentDisplayState(normalizeMobileConfig(config));
          mobileDisplayLoadedRef.current = true;
        }
      }
    } finally {
      setMobileAppointmentSettingsLoading(false);
    }

    return { success: true };
  }, [user?.IdPersonnel, isMobile]);


   // État local pour le menu déroulant des vues
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  const onCalendarConfigChange = (config: CalendarConfig) => {
    calendarConfigService.setLastVueForUser(config.IdPlanningVue || -1)
    .then(() => {
      //console.log(`Last view for user ${user.IdPersonnel} set to ${config.IdPlanningVue}`);
      axiosAgent.defaults.headers.common['X-PlanningVue-Id'] = config.IdPlanningVue;
      setCurrentCalendarConfig(config);
    }).catch((error) => {
      console.error('Error setting last view for user:', error);
    }); 
  }



  const loadNonWorkingDates = async ( years: number[] ): Promise<{ success: boolean; message: string }> => {
      const result = await calendarConfigService.getNonWorkingDates(years);
      //console.log('Résultat du chargement des jours non travaillés :', result);
      if (result?.success && result.data) {
        const nonWorkingDates = result.data.nonWorkingDates
        const recordData = Object.fromEntries(
          nonWorkingDates.map((item: { DatePlanningJourNontravaille: any; IdPlanningJourNontravaille: string; TypeJourCode: string; }) => [
              item.DatePlanningJourNontravaille, // La clé (string)
              { Id: Number(item.IdPlanningJourNontravaille), TypeJourCode: item.TypeJourCode } // La valeur (object)
          ])
        );

        // 2. On met à jour le state
        setNonWorkingDates(recordData);


        const dayTypes = result.data.typesNonWorkingDates;
        if (Array.isArray(dayTypes)) {
          setDayTypes(dayTypes);
        } else {
          console.warn('Les types de jours non travaillés ne sont pas au format attendu :', dayTypes);
        }


        return { success: true, message: 'Jours non travaillés chargés avec succès' };
      }else {
        return { success: false, message: result?.message || 'Erreur lors du chargement des jours non travaillés'};
      }
  };

  const handleSaveMobileAppointmentDisplay = async (config: MobileAppointmentDisplayConfig): Promise<{ success: boolean; message?: string }> => {
    setMobileAppointmentDisplayState(config);
      
    if (!mobileDisplayLoadedRef.current || !user?.IdPersonnel) return { success: false, message: 'Impossible de sauvegarder la configuration des rendez-vous mobiles : utilisateur non défini ou configuration non chargée.' };

    const toPlacements = (rows: string[][]) => rows.flatMap((row, rowIndex) =>
      row.slice(0, 3).map((CodeChamp, position) => ({
        CodeChamp,
        Ligne: rowIndex + 1,
        Position: position + 1,
      })),
    );
    const result = await calendarConfigService.saveMobileAppointmentDisplayConfig({
      idPersonnel: user.IdPersonnel,
      primaryFields: toPlacements(config.primaryFieldRows || config.primaryFields.map((field) => [field])),
      secondaryFields: toPlacements(config.secondaryFieldRows || config.secondaryFields.map((field) => [field])),
    });

    if (!result?.success) {
      return { success: false, message: result?.message || 'Erreur lors de la sauvegarde de la configuration des rendez-vous mobiles.' };
    }

    return { success: true };
  }


  // --- Setters avec persistence ---
  const toggleSet = (key: string, setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean) => {
    setter(value);
    setTimeout(() => localStorage.setItem(key, JSON.stringify(value)), 0);
  };
  

  useEffect(() => {
    setSearchInput('');
    setActiveFilters({ empty: [] });
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
    

  useEffect(() => {
    if (isMobile) {
      setViewType('calendar');
      setTimeout(() => localStorage.setItem('viewType', 'calendar'), 0);
    }
  }, [isMobile]);

  
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
    overlapDisplayMode, setOverlapDisplayMode: (v: 'button' | 'count') => {
      setOverlapDisplayMode(v);
      setTimeout(() => localStorage.setItem('overlapDisplayMode', v), 0);
    },
    mobileAppointmentDisplay,
    mobileAppointmentFieldOptions,
    mobileAppointmentSettingsLoading,
    loadMobileAppointmentSettings,
    handleSaveMobileAppointmentDisplay,
    viewType, setViewType: (v: any) => {
        // Bloquer l'accès à paie-table et manual-event-table pour users et viewers
        if (!hasPermission(214, 23) && 
            (v === 'paie-table' || v === 'manual-event-table')) {
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
    lastPositionEmployeeId, setLastPositionEmployeeId, handleCalendarPositionChange,
    lastPositionLoaded,
    modalInfo, setModalInfo,
    nonWorkingDates, setNonWorkingDates,
    isNotificationsPanelOpen, setIsNotificationsPanelOpen,
    searchInput, setSearchInput,
    dimensionSearchInput, setDimensionsSearchInput,
    
    // Config Calendar
    calendarConfigHook,
    currentCalendarConfig,
    onCalendarConfigChange,
    availableConfigs: calendarConfigHook.configs,
    setAvailableConfigs: calendarConfigHook.setConfigs,


    loadConfigs: calendarConfigHook.loadConfigs,
    loadNonWorkingDates,

    // Helpers pour constants
    constants: {
        // Ces valeurs peuvent être calculées ici ou importées
        intervals: isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS
    }
  };
};