import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { CalendarConfig, MobileAppointmentDisplayConfig, User } from '../../types';
import { ActiveFilters } from '@/app/calendrier/utils/searchAndFilterUtils';
import { useCalendarConfig } from '@/app/calendrier';
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from '../../utils/constants';
import { axiosAgent } from '@/app/service/axios.service';
import { calendarConfigService } from '@/app/service';
import { useAuth } from '../utils/AuthContext';

export type ViewType =
  | 'calendar'
  | 'chantier-table'
  | 'paie-table'
  | 'employee-table'
  | 'manual-event-table';

type MobileFieldOption = {
  Id: number;
  Libelle: string;
  Code: string;
  CaractereSpecial: boolean;
};

const DEFAULT_MOBILE_APPOINTMENT_DISPLAY: MobileAppointmentDisplayConfig = {
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

// --- Helpers localStorage sécurisés ---
const getStoredValue = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined' || !window.localStorage) return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    const raw = window.localStorage.getItem(key);
    if (raw === 'true') return true as unknown as T;
    if (raw === 'false') return false as unknown as T;
    return (raw as unknown as T) ?? defaultValue;
  }
};

const setStoredValue = <T,>(key: string, value: T): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Erreur lors de l'écriture dans localStorage (${key}) :`, error);
  }
};

// --- Normalisation de la config mobile ---
const normalizeMobileConfig = (config: any): MobileAppointmentDisplayConfig => {
  const readField = (field: any) => {
    if (typeof field === 'string') return { code: field, special: false, libelle: undefined };
    if (!field || typeof field !== 'object') return null;
    const code = field.CodeChamp ?? field.code ?? field.Code ?? field.field;
    if (typeof code !== 'string' || !code) return null;
    return {
      code,
      special: field.CaractereSpecial === true || field.estCaractereSpecial === true,
      libelle: field?.libelle ?? field.Libelle ?? field.label,
    };
  };

  const readFieldList = (value: any): Array<{ code: string; special: boolean; libelle?: string }> => {
    if (!Array.isArray(value)) return [];
    return value
      .flatMap((field) => (Array.isArray(field) ? readFieldList(field) : [readField(field)]))
      .filter((field): field is { code: string; special: boolean; libelle?: string } => field !== null);
  };

  const readColumn = (column: 'primaryFields' | 'secondaryFields') =>
    readFieldList(config?.[column]).map(({ code }) => code);

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
  const fieldLabels = Object.fromEntries(
    allFields
      .filter(({ libelle }) => typeof libelle === 'string' && libelle.trim())
      .map(({ code, libelle }) => [code, libelle!.trim()])
  );

  return {
    primaryFields: readColumn('primaryFields'),
    secondaryFields: readColumn('secondaryFields'),
    primaryFieldRows: readRows('primaryFields'),
    secondaryFieldRows: readRows('secondaryFields'),
    specialFields: [...new Set(allFields.filter(({ special }) => special).map(({ code }) => code))],
    fieldLabels,
  };
};

// --- Types du Context ---
type CalendarViewContextValue = {
  // Préférences & paramètres
  isDisplayWeekend: boolean;
  setIsDisplayWeekend: (v: boolean) => Promise<boolean>;
  includeWeekend: boolean;
  setIncludeWeekend: (v: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  isFullDay: boolean;
  setIsFullDay: (v: boolean) => Promise<boolean>;
  respectNonWorkingDays: boolean;
  setRespectNonWorkingDays: (v: boolean) => void;
  tagPlacement: 'hover' | 'fixed';
  setTagPlacement: (v: 'hover' | 'fixed') => Promise<boolean>;
  overlapDisplayMode: 'button' | 'count';
  setOverlapDisplayMode: (v: 'button' | 'count') => Promise<boolean>;
  getParametres: () => Promise<void>;
  setParametre: (idParametre: string, valeurParametre: string | number | boolean) => Promise<boolean>;

  // Affichage Mobile
  mobileAppointmentDisplay: MobileAppointmentDisplayConfig;
  mobileAppointmentFieldOptions: MobileFieldOption[];
  mobileAppointmentSettingsLoading: boolean;
  loadMobileAppointmentSettings: () => Promise<{ success: boolean; message?: string }>;
  handleSaveMobileAppointmentDisplay: (
    config: MobileAppointmentDisplayConfig
  ) => Promise<{ success: boolean; message?: string }>;

  // Vues & Navigation
  viewType: ViewType;
  setViewType: (v: ViewType) => void;
  isViewDropdownOpen: boolean;
  setIsViewDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  viewDropdownRef: React.RefObject<HTMLDivElement | null>;

  // Modales & États UI
  isMobile: boolean;
  isSettingsOpen: boolean;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isFilterModalOpen: boolean;
  setIsFilterModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSearchOverlayOpen: boolean;
  setIsSearchOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeFilters: ActiveFilters;
  setActiveFilters: React.Dispatch<React.SetStateAction<ActiveFilters>>;
  modalInfo: { message: string; color: string } | null;
  setModalInfo: React.Dispatch<React.SetStateAction<{ message: string; color: string } | null>>;
  isNotificationsPanelOpen: boolean;
  setIsNotificationsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
  dimensionSearchInput: string;
  setDimensionsSearchInput: React.Dispatch<React.SetStateAction<string>>;

  // Position calendrier
  selectedDate: number;
  setSelectedDate: React.Dispatch<React.SetStateAction<number>>;
  lastPositionEmployeeId: number | null;
  setLastPositionEmployeeId: React.Dispatch<React.SetStateAction<number | null>>;
  handleCalendarPositionChange: (position: { date?: number; idPersonnel?: number }) => void;
  lastPositionLoaded: boolean;

  // Config Calendar
  calendarConfigHook: ReturnType<typeof useCalendarConfig>;
  currentCalendarConfig: CalendarConfig | null;
  onCalendarConfigChange: (config: CalendarConfig) => void;
  availableConfigs: CalendarConfig[];
  setAvailableConfigs: React.Dispatch<React.SetStateAction<CalendarConfig[]>>;
  loadConfigs: (hasPermission: boolean) => Promise<void>;

  // Constantes calculées
  constants: {
    intervals: typeof DAY_INTERVALS | typeof HALF_DAY_INTERVALS;
  };
};

const CalendarViewContext = createContext<CalendarViewContextValue | null>(null);

type CalendarViewProviderProps = {
  idPlanning: number;
  user: User;
  isMobile: boolean;
  children: ReactNode;
};

export const CalendarViewProvider: React.FC<CalendarViewProviderProps> = ({
  idPlanning,
  user,
  isMobile,
  children,
}) => {
  const { hasPermission, currentVueId, setCurrentVueId } = useAuth();

  // --- États des préférences persistantes ---
  const [isDisplayWeekend, setIsDisplayWeekendState] = useState<boolean>(() =>
    getStoredValue('isDisplayWeekend', false)
  );
  const [includeWeekend, setIncludeWeekendState] = useState<boolean>(true);
  const [isExpanded, setIsExpandedState] = useState<boolean>(() => getStoredValue('isExpanded', false));
  const [isFullDay, setIsFullDayState] = useState<boolean>(() => getStoredValue('isFullDay', false));
  const [respectNonWorkingDays, setRespectNonWorkingDaysState] = useState<boolean>(true);
  const [tagPlacement, setTagPlacementState] = useState<'hover' | 'fixed'>(() =>
    getStoredValue<'hover' | 'fixed'>('tagPlacement', 'hover')
  );
  const [overlapDisplayMode, setOverlapDisplayModeState] = useState<'button' | 'count'>(() =>
    getStoredValue<'button' | 'count'>('overlapDisplayMode', 'button')
  );

  const [viewType, setViewTypeState] = useState<ViewType>(() => {
    const savedView = getStoredValue<ViewType>('viewType', 'calendar');
    if (!hasPermission(214, 23) && (savedView === 'paie-table' || savedView === 'manual-event-table')) {
      return 'calendar';
    }
    return savedView;
  });

  // --- Helper localStorage seul (pour les états purement locaux) ---
  const updatePersistedState = useCallback(
    <T,>(key: string, setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
      setter(value);
      setStoredValue(key, value);
    },
    []
  );

  // --- Helper Base de données + State + localStorage (avec rollback en cas d'échec) ---
  const saveDbParameter = useCallback(
    async <T,>(
      idParametre: string,
      dbValue: string | number | boolean,
      storageKey: string,
      setter: React.Dispatch<React.SetStateAction<T>>,
      newValue: T,
      previousValue: T
    ): Promise<boolean> => {
      // Mise à jour optimiste immédiate
      setter(newValue);
      setStoredValue(storageKey, newValue);

      try {
        const response = await calendarConfigService.setPlanningParametre(idParametre, dbValue);
        if (response && response.success === false) {
          console.error(`Erreur lors de l'enregistrement du paramètre ${idParametre} :`, response.message);
          // Rollback si le serveur refuse
          setter(previousValue);
          setStoredValue(storageKey, previousValue);
          return false;
        }
        return true;
      } catch (error) {
        console.error(`Erreur réseau lors de l'enregistrement du paramètre ${idParametre} :`, error);
        // Rollback en cas d'erreur réseau
        setter(previousValue);
        setStoredValue(storageKey, previousValue);
        return false;
      }
    },
    []
  );

  // --- Setters connectés à la base de données ---
  const setIsDisplayWeekend = useCallback(
    (v: boolean) =>
      saveDbParameter('Planning.AffichageWeekEnd', v, 'isDisplayWeekend', setIsDisplayWeekendState, v, isDisplayWeekend),
    [saveDbParameter, isDisplayWeekend]
  );

  const setIsFullDay = useCallback(
    (v: boolean) =>
      saveDbParameter('Planning.AffichageDemiJournée', v, 'isFullDay', setIsFullDayState, v, isFullDay),
    [saveDbParameter, isFullDay]
  );

  const setTagPlacement = useCallback(
    (v: 'hover' | 'fixed') =>
      saveDbParameter('Planning.PositionEtiquette', v, 'tagPlacement', setTagPlacementState, v, tagPlacement),
    [saveDbParameter, tagPlacement]
  );

  const setOverlapDisplayMode = useCallback(
    (v: 'button' | 'count') =>
      saveDbParameter(
        'Planning.AffichageMultiEvenement',
        v,
        'overlapDisplayMode',
        setOverlapDisplayModeState,
        v,
        overlapDisplayMode
      ),
    [saveDbParameter, overlapDisplayMode]
  );

  // --- Fonction générique exposée pour modifier n'importe quel paramètre en base ---
  const setParametre = useCallback(
    async (idParametre: string, valeurParametre: string | number | boolean): Promise<boolean> => {
      switch (idParametre) {
        case 'Planning.AffichageWeekEnd':
          return setIsDisplayWeekend(
            valeurParametre === 1 || valeurParametre === true || valeurParametre === '1' || valeurParametre === 'true'
          );
        case 'Planning.AffichageDemiJournée':
          return setIsFullDay(
            valeurParametre === 1 || valeurParametre === true || valeurParametre === '1' || valeurParametre === 'true'
          );
        case 'Planning.PositionEtiquette':
          return setTagPlacement(valeurParametre as 'hover' | 'fixed');
        case 'Planning.AffichageMultiEvenement':
          return setOverlapDisplayMode(valeurParametre as 'button' | 'count');
        default: {
          try {
            const response = await calendarConfigService.setPlanningParametre(idParametre, valeurParametre);
            return response?.success !== false;
          } catch (error) {
            console.error(`Erreur lors de la modification du paramètre ${idParametre} :`, error);
            return false;
          }
        }
      }
    },
    [setIsDisplayWeekend, setIsFullDay, setTagPlacement, setOverlapDisplayMode]
  );

  // --- Setters purement locaux ---
  const setIncludeWeekend = useCallback(
    (v: boolean) => updatePersistedState('includeWeekend', setIncludeWeekendState, v),
    [updatePersistedState]
  );
  const setIsExpanded = useCallback(
    (v: boolean) => updatePersistedState('isExpanded', setIsExpandedState, v),
    [updatePersistedState]
  );
  const setRespectNonWorkingDays = useCallback(
    (v: boolean) => updatePersistedState('respectNonWorkingDays', setRespectNonWorkingDaysState, v),
    [updatePersistedState]
  );

  const setViewType = useCallback(
    (v: ViewType) => {
      if (!hasPermission(214, 23) && (v === 'paie-table' || v === 'manual-event-table')) {
        updatePersistedState('viewType', setViewTypeState, 'calendar' as ViewType);
        return;
      }
      updatePersistedState('viewType', setViewTypeState, v);
    },
    [hasPermission, updatePersistedState]
  );

  // --- Synchronisation initiale des paramètres depuis la base ---
  const getParametres = useCallback(async () => {
    const listeIdParametres = [
      'Planning.AffichageWeekEnd',
      'Planning.AffichageDemiJournée',
      'Planning.PositionEtiquette',
      'Planning.AffichageMultiEvenement',
    ];
    try {
      const response = await calendarConfigService.getPlanningParameters(listeIdParametres);
      if (response?.success && Array.isArray(response.data)) {
        for (const param of response.data) {
          if (param?.idParametre && param?.valeurParametre !== undefined && param?.valeurParametre !== null) {
            switch (param.idParametre) {
              case 'Planning.AffichageWeekEnd':
                updatePersistedState(
                  'isDisplayWeekend',
                  setIsDisplayWeekendState,
                  param.valeurParametre === 1 ||
                    param.valeurParametre === true ||
                    param.valeurParametre === '1' ||
                    param.valeurParametre === 'true'
                );
                break;
              case 'Planning.AffichageDemiJournée':
                updatePersistedState(
                  'isFullDay',
                  setIsFullDayState,
                  param.valeurParametre === 1 ||
                    param.valeurParametre === true ||
                    param.valeurParametre === '1' ||
                    param.valeurParametre === 'true'
                );
                break;
              case 'Planning.PositionEtiquette':
                updatePersistedState(
                  'tagPlacement',
                  setTagPlacementState,
                  param.valeurParametre as 'hover' | 'fixed'
                );
                break;
              case 'Planning.AffichageMultiEvenement':
                updatePersistedState(
                  'overlapDisplayMode',
                  setOverlapDisplayModeState,
                  param.valeurParametre as 'count' | 'button'
                );
                break;
              default:
                console.log(`Paramètre non géré ${param.idParametre} : ${param.valeurParametre}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres du planning :', error);
    }
  }, [updatePersistedState]);

  // --- Configuration Mobile ---
  const mobileDisplayLoadedRef = useRef(false);
  const [mobileAppointmentDisplay, setMobileAppointmentDisplayState] =
    useState<MobileAppointmentDisplayConfig>(DEFAULT_MOBILE_APPOINTMENT_DISPLAY);
  const [mobileAppointmentFieldOptions, setMobileAppointmentFieldOptions] = useState<MobileFieldOption[]>([]);
  const [mobileAppointmentSettingsLoading, setMobileAppointmentSettingsLoading] = useState(false);

  // --- États UI Volatiles ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ empty: [] });
  const [modalInfo, setModalInfo] = useState<{ message: string; color: string } | null>(null);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [dimensionSearchInput, setDimensionsSearchInput] = useState<string>('');

  // --- Dropdown des vues ---
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  // --- Position Calendrier ---
  const lastPositionStorageKey = `calendar-last-position-${user?.IdPersonnel ?? 'anonymous'}-${idPlanning}`;
  const [lastPositionEmployeeId, setLastPositionEmployeeId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    if (isMobile || typeof window === 'undefined') return today;

    const storedPosition = window.localStorage.getItem(lastPositionStorageKey);
    let storedDate: number | null = null;

    if (storedPosition) {
      try {
        storedDate = Number(JSON.parse(storedPosition).date);
      } catch {
        storedDate = null;
      }
    } else {
      storedDate = Number(window.localStorage.getItem(`calendar-selected-date-${user?.IdPersonnel ?? 'anonymous'}`));
    }

    if (!storedDate || !Number.isFinite(storedDate) || storedDate <= 0) return today;

    const parsedDate = new Date(storedDate);
    return Number.isNaN(parsedDate.getTime()) ? today : parsedDate.setHours(0, 0, 0, 0);
  });

  useEffect(() => {
    if (!Number.isFinite(selectedDate) || selectedDate <= 0) return;
    setStoredValue(lastPositionStorageKey, {
      date: selectedDate,
      idPersonnel: lastPositionEmployeeId,
    });
  }, [lastPositionEmployeeId, selectedDate, lastPositionStorageKey]);

  const positionLoadedRef = useRef(false);
  const canSetLastPositionRef = useRef(false);
  const [lastPositionLoaded, setLastPositionLoaded] = useState(false);
  const pendingPositionRef = useRef<number | null>(null);
  const positionSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveLastPosition = useCallback(
    (position: { date: number; idPersonnel: number }) => {
      if (isMobile || !canSetLastPositionRef.current) return;

      pendingPositionRef.current = position.date;
      if (positionSaveTimeoutRef.current) clearTimeout(positionSaveTimeoutRef.current);

      positionSaveTimeoutRef.current = setTimeout(() => {
        const pendingPosition = pendingPositionRef.current;
        if (!pendingPosition) return;
        void calendarConfigService
          .setLastPositionForUser(pendingPosition)
          .then((response) => {
            if (response?.success === false) {
              console.error('Erreur lors de l’enregistrement de la dernière position du calendrier :', response.message);
            }
          })
          .catch((error) => {
            console.error('Erreur lors de l’enregistrement de la dernière position du calendrier :', error);
          });
      }, 1000);
    },
    [isMobile]
  );

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

      const localPosition = getStoredValue<{ date?: number; idPersonnel?: number } | null>(
        lastPositionStorageKey,
        null
      );
      const localEmployeeId = Number(localPosition?.idPersonnel);
      if (Number.isFinite(localEmployeeId) && localEmployeeId > 0) {
        setLastPositionEmployeeId(localEmployeeId);
      }

      try {
        const response = await calendarConfigService.getLastPositionForUser();
        if (cancelled) return;

        canSetLastPositionRef.current = response?.data?.canSetLastPosition === true;

        if (response?.success && response.data == null) {
          setSelectedDate(new Date().setHours(0, 0, 0, 0));
          setLastPositionEmployeeId(null);
          return;
        }

        const position = response?.data;
        const date = Number(
          position?.date ??
            position?.Date ??
            position?.DatePosition ??
            position?.dernierePosition ??
            position?.DernierePosition
        );
        const employeeId = Number(position?.idPersonnel ?? position?.IdPersonnel ?? position?.IdEmploye);

        if (response?.success && Number.isFinite(date) && date > 0) {
          setSelectedDate(new Date(date).setHours(0, 0, 0, 0));
          if (Number.isFinite(employeeId) && employeeId > 0) {
            setLastPositionEmployeeId(employeeId);
          }
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

  const handleCalendarPositionChange = useCallback(
    (position: { date?: number; idPersonnel?: number }) => {
      const date = position.date ?? selectedDate;
      const idPersonnel = position.idPersonnel ?? lastPositionEmployeeId;
      if (
        !positionLoadedRef.current ||
        !Number.isFinite(date) ||
        idPersonnel === null ||
        !Number.isFinite(idPersonnel) ||
        idPersonnel <= 0
      ) {
        return;
      }
      setSelectedDate(date);
      setLastPositionEmployeeId(idPersonnel);
      saveLastPosition({ date, idPersonnel });
    },
    [lastPositionEmployeeId, saveLastPosition, selectedDate]
  );

  useEffect(() => {
    if (!positionLoadedRef.current || !Number.isFinite(selectedDate) || !lastPositionEmployeeId) return;
    saveLastPosition({ date: selectedDate, idPersonnel: lastPositionEmployeeId });
  }, [lastPositionEmployeeId, saveLastPosition, selectedDate]);

  useEffect(
    () => () => {
      if (positionSaveTimeoutRef.current) clearTimeout(positionSaveTimeoutRef.current);
    },
    []
  );

  // --- Hook de configuration existant ---
  const [currentCalendarConfig, setCurrentCalendarConfig] = useState<CalendarConfig | null>(null);
  const calendarConfigHook = useCalendarConfig({ user, idPlanning, setCurrentCalendarConfig });

  useEffect(() => {
    if (viewType !== 'calendar' || currentVueId === null || currentVueId <= 0 || isMobile) return;
    if (currentCalendarConfig?.IdPlanningVue === currentVueId) return;

    void calendarConfigHook.loadConfigs(hasPermission(214, 23) || hasPermission(214, 22));
  }, [currentCalendarConfig?.IdPlanningVue, currentVueId, hasPermission, isMobile, viewType, calendarConfigHook]);

  // --- Chargement & sauvegarde mobile ---
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
        setMobileAppointmentDisplayState(DEFAULT_MOBILE_APPOINTMENT_DISPLAY);
      }
      mobileDisplayLoadedRef.current = true;
    };

    void loadMobileAppointmentDisplay();
    return () => {
      cancelled = true;
    };
  }, [user?.IdPersonnel, currentCalendarConfig?.IdPlanningVue, isMobile]);

  const loadMobileAppointmentSettings = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    if (!user?.IdPersonnel) {
      return {
        success: false,
        message: 'Impossible de charger les paramètres des rendez-vous mobiles : utilisateur non défini.',
      };
    }
    setMobileAppointmentSettingsLoading(true);
    try {
      const result = await calendarConfigService.getMobileAppointmentDisplayConfigSettings();
      if (result?.success === false || !result.data) {
        return {
          success: false,
          message: result?.message || 'Erreur lors du chargement des paramètres des rendez-vous mobiles.',
        };
      }

      const fields = Array.isArray(result.data) ? result.data : result.data.fields;
      if (Array.isArray(fields)) {
        setMobileAppointmentFieldOptions(
          fields
            .map((field: any) => ({
              Libelle: field.Libelle ?? field.label,
              Id: field.Id ?? field.id,
              Code: field.Code ?? field.code,
              CaractereSpecial: field.CaractereSpecial ?? field.specialCharacter ?? false,
            }))
            .filter(
              (field: { Code?: string; Libelle?: string; CaractereSpecial?: boolean; Id?: number }) =>
                field.Code &&
                field.Libelle &&
                typeof field.CaractereSpecial === 'boolean' &&
                typeof field.Id === 'number'
            )
        );
      }

      if (!isMobile) {
        const config = result.data.config ?? result.data.displayConfig ?? result.data;
        if (Array.isArray(config?.primaryFields) && Array.isArray(config?.secondaryFields)) {
          setMobileAppointmentDisplayState(normalizeMobileConfig(config));
          mobileDisplayLoadedRef.current = true;
        }
      }
    } finally {
      setMobileAppointmentSettingsLoading(false);
    }

    return { success: true };
  }, [user?.IdPersonnel, isMobile]);

  const handleSaveMobileAppointmentDisplay = useCallback(
    async (config: MobileAppointmentDisplayConfig): Promise<{ success: boolean; message?: string }> => {
      setMobileAppointmentDisplayState(config);

      if (!mobileDisplayLoadedRef.current || !user?.IdPersonnel) {
        return {
          success: false,
          message:
            'Impossible de sauvegarder la configuration des rendez-vous mobiles : utilisateur non défini ou configuration non chargée.',
        };
      }

      const toPlacements = (rows: string[][]) =>
        rows.flatMap((row, rowIndex) =>
          row.slice(0, 3).map((CodeChamp, position) => ({
            CodeChamp,
            Ligne: rowIndex + 1,
            Position: position + 1,
          }))
        );

      const result = await calendarConfigService.saveMobileAppointmentDisplayConfig({
        idPersonnel: user.IdPersonnel,
        primaryFields: toPlacements(config.primaryFieldRows || config.primaryFields.map((field) => [field])),
        secondaryFields: toPlacements(config.secondaryFieldRows || config.secondaryFields.map((field) => [field])),
      });

      if (!result?.success) {
        return {
          success: false,
          message: result?.message || 'Erreur lors de la sauvegarde de la configuration des rendez-vous mobiles.',
        };
      }

      return { success: true };
    },
    [user?.IdPersonnel]
  );

  const onCalendarConfigChange = useCallback(
    (config: CalendarConfig) => {
      console.log('Changement de configuration du calendrier :', config);
      calendarConfigService
        .setLastVueForUser(config.IdPlanningVue || -1)
        .then(() => {
          axiosAgent.defaults.headers.common['X-PlanningVue-Id'] = config.IdPlanningVue;
          setCurrentCalendarConfig(config);
          setCurrentVueId(config.IdPlanningVue || 0);
        })
        .catch((error) => {
          console.error('Error setting last view for user:', error);
        });
    },
    [setCurrentVueId]
  );

  // --- Effets UI ---
  useEffect(() => {
    setSearchInput('');
    setActiveFilters({ empty: [] });
  }, [viewType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isViewDropdownOpen && viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setIsViewDropdownOpen(false);
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
      updatePersistedState('viewType', setViewTypeState, 'calendar' as ViewType);
    }
  }, [isMobile, updatePersistedState]);

  const value = useMemo<CalendarViewContextValue>(
    () => ({
      isDisplayWeekend,
      setIsDisplayWeekend,
      includeWeekend,
      setIncludeWeekend,
      isExpanded,
      setIsExpanded,
      isFullDay,
      setIsFullDay,
      respectNonWorkingDays,
      setRespectNonWorkingDays,
      tagPlacement,
      setTagPlacement,
      overlapDisplayMode,
      setOverlapDisplayMode,
      getParametres,
      setParametre,

      mobileAppointmentDisplay,
      mobileAppointmentFieldOptions,
      mobileAppointmentSettingsLoading,
      loadMobileAppointmentSettings,
      handleSaveMobileAppointmentDisplay,

      viewType,
      setViewType,
      isViewDropdownOpen,
      setIsViewDropdownOpen,
      viewDropdownRef,

      isMobile,
      isSettingsOpen,
      setIsSettingsOpen,
      isFilterModalOpen,
      setIsFilterModalOpen,
      isSearchOverlayOpen,
      setIsSearchOverlayOpen,
      activeFilters,
      setActiveFilters,
      selectedDate,
      setSelectedDate,
      lastPositionEmployeeId,
      setLastPositionEmployeeId,
      handleCalendarPositionChange,
      lastPositionLoaded,
      modalInfo,
      setModalInfo,
      isNotificationsPanelOpen,
      setIsNotificationsPanelOpen,
      searchInput,
      setSearchInput,
      dimensionSearchInput,
      setDimensionsSearchInput,

      calendarConfigHook,
      currentCalendarConfig,
      onCalendarConfigChange,
      availableConfigs: calendarConfigHook.configs,
      setAvailableConfigs: calendarConfigHook.setConfigs,
      loadConfigs: calendarConfigHook.loadConfigs,

      constants: {
        intervals: isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      },
    }),
    [
      isDisplayWeekend,
      setIsDisplayWeekend,
      includeWeekend,
      setIncludeWeekend,
      isExpanded,
      setIsExpanded,
      isFullDay,
      setIsFullDay,
      respectNonWorkingDays,
      setRespectNonWorkingDays,
      tagPlacement,
      setTagPlacement,
      overlapDisplayMode,
      setOverlapDisplayMode,
      getParametres,
      setParametre,
      mobileAppointmentDisplay,
      mobileAppointmentFieldOptions,
      mobileAppointmentSettingsLoading,
      loadMobileAppointmentSettings,
      handleSaveMobileAppointmentDisplay,
      viewType,
      setViewType,
      isViewDropdownOpen,
      isMobile,
      isSettingsOpen,
      isFilterModalOpen,
      isSearchOverlayOpen,
      activeFilters,
      selectedDate,
      lastPositionEmployeeId,
      handleCalendarPositionChange,
      lastPositionLoaded,
      modalInfo,
      isNotificationsPanelOpen,
      searchInput,
      dimensionSearchInput,
      calendarConfigHook,
      currentCalendarConfig,
      onCalendarConfigChange,
    ]
  );

  return <CalendarViewContext.Provider value={value}>{children}</CalendarViewContext.Provider>;
};

export const useCalendarView = (): CalendarViewContextValue => {
  const context = useContext(CalendarViewContext);
  if (!context) {
    throw new Error('useCalendarView doit être utilisé à l’intérieur d’un CalendarViewProvider');
  }
  return context;
};