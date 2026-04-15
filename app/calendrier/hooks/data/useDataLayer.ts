import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Appointment, User, Item, CalendarConfig, Image, UserRole } from '../../types';
import { ActiveFilters, createSearchAndFilterUtils } from '../../utils/searchAndFilterUtils';
import evenementService from '@/app/service/evenement.service'; // NEW API SERVICE
import equipeService from '@/app/service/equipe.service';
import rubriqueService from '@/app/service/rubrique.service';
import { applyFiltersToEmployees, applyFiltersToAppointments, getFlatFilters } from "../../utils/filters";
import {
  INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER,
  INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MIN_QUERY_LENGTH,
} from '../../utils/constants';
import { CategoryStructure } from '@/app/calendrier/components/Table/DataTableFrame';
import { useCalendarWorker } from '@/app/calendrier/hooks/data/useCalendarWorker';
import { useResourceSearch } from '../search';
import { getCachedImages, subscribeToImageCache, upsertCachedImage } from '../../utils/imageCacheStore';


interface DataLayerProps {
  viewType: 'calendar' | 'chantier-table' | 'paie-table' | 'employee-table' | 'manual-event-table';
  searchQueryDimensions: string;
  searchInput: string;
  filters: ActiveFilters;
  calendarConfig: CalendarConfig | null;
  globalEmployeesRef: React.RefObject<User[]>;
  userIdNumber: number;
  userRole: UserRole;
  isSearchOverlayOpen: boolean;
}

export const useDataLayer = ({
  viewType,
  filters,
  searchInput,
  searchQueryDimensions,
  calendarConfig,
  globalEmployeesRef,
  userIdNumber,
  userRole,
  isSearchOverlayOpen,
}: DataLayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const worker = useCalendarWorker();
  const [teams, setTeams] = useState<any[]>([]);
  
  const itemsRef = useRef<Item[]>([]);
  const appointmentsRef = useRef<Appointment[]>([]);
  
  // Données Filtrées (State pour l'UI)
  const [appointmentsVersion, setAppointmentsVersion] = useState(0); // Trigger manuel
  const [availableImages, setAvailableImages] = useState<Image[]>(() => getCachedImages());
  const [workerFilteredAppointments, setWorkerFilteredAppointments] = useState<Appointment[]>([]); 
  const itemsSnapshot = useMemo(() => itemsRef.current, [appointmentsVersion]);

  const selectedRdvTypes = useMemo(() => {
    const selected = calendarConfig?.filterCategories?.evenements &&
      typeof calendarConfig.filterCategories.evenements === 'object' &&
      'selectedRdvTypes' in calendarConfig.filterCategories.evenements
      ? calendarConfig.filterCategories.evenements.selectedRdvTypes
      : [];

    return selected.map(type => type.toLowerCase());
  }, [calendarConfig]);


  const {
    results: remoteSearchResults,
    isSearching,
    error: searchError,
    retrySearch,
  } = useResourceSearch({
    query: searchQueryDimensions,
    types: selectedRdvTypes,
    limit: SEARCH_DEFAULT_LIMIT,
    fallbackItems: itemsSnapshot,
    enabled: searchQueryDimensions.trim().length >= SEARCH_MIN_QUERY_LENGTH, // Activer la recherche distante seulement si la query est suffisamment longue
  });

  useEffect(() => {
    const unsubscribe = subscribeToImageCache((images) => {
      setAvailableImages(images);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTeams = async () => {
      const response = await equipeService.getEquipes();
      if (!isMounted) return;

      if (response?.error === 0 && Array.isArray(response.data)) {
        setTeams(response.data);
        return;
      }

      const teamsFromEmployees = globalEmployeesRef.current
        .map(emp => emp.Equipe)
        .filter(Boolean)
        .filter((team, index, arr) => arr.findIndex(t => t?.Id === team?.Id) === index);
      setTeams(teamsFromEmployees as any[]);
    };

    loadTeams();

    return () => {
      isMounted = false;
    };
  }, [globalEmployeesRef]);


  // Instanciation Utils
  const searchUtils = useMemo(() => createSearchAndFilterUtils(), []);

  // --- Filtrage de base (sans recherche) ---
  // Ces mémos se recalculent uniquement quand les filtres changent, PAS à chaque searchQuery
  
  const baseFilteredEmployees = useMemo(() => {
    if (!calendarConfig || viewType === 'chantier-table' || viewType === 'paie-table') return globalEmployeesRef.current;
    
    if (viewType === 'calendar') {
      let employees = globalEmployeesRef.current.filter(emp => emp.Type === 'Salarie' || emp.Type === 'Interim');
      
      // Filtrer par rôle : users et viewers ne voient que leur propre employé
      if (userRole === 'user' || userRole === 'viewer') {
        employees = employees.filter(emp => emp.IdPersonnel === userIdNumber);
      }
      
      return applyFiltersToEmployees(
        employees, 
        getFlatFilters(calendarConfig.filterCategories)
      );
    }

    // Pour les vues tableaux, retourner les données brutes (filtrage avec recherche appliqué après)
    return globalEmployeesRef.current;
  }, [calendarConfig, appointmentsVersion, userRole, userIdNumber, viewType]);



  const baseFilteredAppointments = useMemo(() => {
    if (!calendarConfig || isSearchOverlayOpen) return appointmentsRef.current;
    // Logique de filtrage combinée (Types RDV + Filtres champs) SANS searchQuery
    let filtered = appointmentsRef.current;
    
    // Utiliser le worker pour le pré-filtrage si disponible et si gros volume
    if (workerFilteredAppointments.length > 0 && appointmentsRef.current.length > 500) {
      filtered = workerFilteredAppointments;
    }
    
    // Filtre par rôle utilisateur - users et viewers ne voient que leurs propres RDV
    if (userRole === 'user' || userRole === 'viewer') {
      filtered = filtered.filter(app => app.Employee.IdPersonnel === userIdNumber);
    }
    
    // Filtre par type de RDV (logique métier)
    const selectedRdvTypes = calendarConfig.filterCategories?.evenements &&
      typeof calendarConfig.filterCategories.evenements === 'object' &&
      'selectedRdvTypes' in calendarConfig.filterCategories.evenements
      ? calendarConfig.filterCategories.evenements.selectedRdvTypes
      : [];
    
    if (selectedRdvTypes.length > 0) {
         const allTypes = ['Chantier', 'Absence', 'Autre'];
         const isAllSelected = allTypes.every(t => selectedRdvTypes.includes(t));
         if (!isAllSelected) {
             filtered = filtered.filter(app => {
                 const norm = app.Type === 'chantier' ? 'Chantier' : app.Type === 'absence' ? 'Absence' : 'Autre';
                 return selectedRdvTypes.includes(norm);
             });
         }
    }
    // Appliquer les filtres SANS searchQuery pour avoir une base stable
    return applyFiltersToAppointments(filtered, getFlatFilters(calendarConfig.filterCategories), '', globalEmployeesRef.current);
  }, [calendarConfig, appointmentsVersion, workerFilteredAppointments, userRole, userIdNumber, isSearchOverlayOpen]);

  // --- Filtrage avec recherche (appliqué uniquement si searchQuery existe) ---
  // Ces mémos ne se recalculent que si searchQuery OU les données de base changent
  
  const filteredEmployees = useMemo(() => {
    // En mode calendar, les filtres sont déjà appliqués dans baseFilteredEmployees
    if (viewType === 'calendar') {
      return baseFilteredEmployees;
    }
    
    // Pour les autres vues, toujours appliquer les filtres et la recherche
    // La fonction applyFiltersToEmployees gère elle-même le cas où searchQuery est vide
    return searchUtils.applyFiltersToEmployees(
      baseFilteredEmployees,
      searchInput,
      filters
    );
  }, [baseFilteredEmployees, searchInput, viewType, searchUtils, filters]);


  const filteredAppointments = useMemo(() => {
    // Si pas de recherche, retourner la version de base
    if (!searchInput) {
      return baseFilteredAppointments;
    }
    
    // Appliquer la recherche sur les données déjà filtrées
    return applyFiltersToAppointments(baseFilteredAppointments, getFlatFilters(calendarConfig?.filterCategories), searchInput, globalEmployeesRef.current);
  }, [baseFilteredAppointments, searchInput, calendarConfig]);
  
  // Pré-filtrage avec Web Worker pour améliorer les performances (gros volumes)
  useEffect(() => {
    if (!worker.isReady || !calendarConfig || appointmentsRef.current.length <= 500) {
      // Pas besoin du worker pour petits volumes
      return;
    }
    
    const preFilterWithWorker = async () => {
      // Le worker peut faire un pré-filtrage basique
      // La logique métier complète est appliquée après
      const stats = await worker.calculateStats(appointmentsRef.current);
      
      // Pour l'instant, on stocke juste les données brutes
      // Le filtrage fin est fait dans le useMemo ci-dessus
      setWorkerFilteredAppointments(appointmentsRef.current);
    };
    
    preFilterWithWorker();
  }, [worker.isReady, appointmentsVersion, calendarConfig]);
    

  const loadAppointmentsInRange = useCallback(async (startDate: number, endDate: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      // APPEL API RÉEL
      const response = await evenementService.getEvenements(startDate, endDate);
      // Supposant que "response.data" contienne un tableau d'Appointment (ce qui vient de Axios)
      // Ajuste si la forme de ta réponse est du style { error: 0, data: [...] }
      const newAppointments = response.error === 0 ? response.data : [];

      // Fusionner les nouveaux RDV avec les existants
      const existingIds = new Set(appointmentsRef.current.map(app => app.IdPlanningEvenement));
      const mergedAppointments = [
        ...appointmentsRef.current,
        ...newAppointments.filter((app: Appointment) => !existingIds.has(app.IdPlanningEvenement))
      ];
      appointmentsRef.current = mergedAppointments;
      setAppointmentsVersion(prev => prev + 1);
    } catch (error) {
      console.error("Erreur lors du chargement des rendez-vous:", error);
    } finally {
      setIsLoading(false);
    }
    return true;
  }, []);

  // Effet pour charger les RDV initiaux
  useEffect(() => {
    const startDate = Date.now() - (INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE * 7 * 24 * 60 * 60 * 1000);
    const endDate = Date.now() + (INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER * 7 * 24 * 60 * 60 * 1000);
    loadAppointmentsInRange(startDate, endDate);
  }, [loadAppointmentsInRange]);

  // --- Filtrage Secondaire (Tableaux) ---
  // Cette fonction prépare les données pour DataTableFrame
  const getTableItems = () => {
    //  if (viewType === 'chantier-table') return filteredItems.filter(e => e.Type === 'projet');
    //  if (viewType === 'paie-table') return filteredItems.filter(e => e.Type !== 'paie');
    //  return filteredEmployees.map(emp => ({
    //     IdPersonnel: emp.IdPersonnel,
    //     image: emp.image,
    //     Code: emp.Code,
    //     Nom: emp.Nom,
    //     Prenom: emp.Prenom,
    //     Type: emp.Type,
    //     Equipe: emp.Equipe
    //  }) as User);

    return filteredEmployees.map(emp => ({
      IdPersonnel: emp.IdPersonnel,
      IdImage: emp.IdImage,
      Code: emp.Code,
      Nom: emp.Nom,
      Prenom: emp.Prenom,
      Type: emp.Type,
      Equipe: emp.Equipe
    }) as User);
  };

  const getTableStructure = (): CategoryStructure[] => {
      if (viewType === 'chantier-table') 
          return [
              {
                  key: 'IG',
                  label: 'Informations Générales', 
                  attributes: [
                      { key: 'image', label: '', sortable: false , width:50 },
                      { key: 'poleActivite',   label: 'Pôle', type:'string', width:120 },
                      { key: 'code',  label: 'Code', type:'string', width:85 },
                      { key: 'identifiant',  label: 'Identifiant', type:'string', width:125 },
                      { key: 'libelle' , label: 'Libellé', type:'string' },
                      { key: 'etat', label: 'État', type:'string', width:90 },
                      { key: 'chargeAffaire',  label: 'Chargé d\'Affaires', type:'string', width:140 },
                      { key: 'chefChantier',  label: 'Chef de Chantier', type:'string', width:140 },
                      { key: 'dateOS' , label: 'Date OS', type:'date', width:100 },
                      { key: 'dateFin', label: 'Date Fin', type:'date', width:100 }
                  ]
              },
              {
                  key: 'analyse',
                  label: 'Analyse Chantier',
                  attributes: [
                      { key: 'TM',  label: 'Temps Marché', type:'string', width:80},      // Temps Marché
                      { key: 'HR',  label: 'Heures Réalisées', type:'string' , width:90},       // Heures Réalisées
                      { key: 'SH',  label: 'Solde Heures', type:'string', width:80 },       // Solde Heure
                      { key: 'DPF',  label: 'Durée Planifiée', type:'string', width:85 },    // Durée Planifiée
                      { key: 'RPF',  label: 'Réalisé + Futur', type:'string', width:80 },  // Réalisé + Future
                      { key: 'AP',  label: 'Avancement Prévisionnel', type:'string', width:110 },       // Avancement Prév.
                      { key: 'SP',  label: 'Solde P.', type:'string', width:80}        // Solde Prév.
                  ]
              }
          ] 
      if (viewType === 'paie-table') 
          return [
              {
              key: 'all',
              label: '', 
              attributes: [
                  { key: 'verrou', label: 'Verrou', width: 80},
                  { key: 'image', label: '', sortable: false, width:50 },
                  { key: 'code', label: 'Code', width: 150},
                  { key: 'label', label: 'Libellé' },
                  { key: 'actif', label: 'ACTF', width: 70 },
                  { key: 'category', label: 'Catégorie', width: 300}
              ]
              }
          ]
      if (viewType === 'employee-table') 
          return [
              {
              key: 'all',
              label: '',
              attributes: [
                  { key: 'image', label: '', sortable: false, width:50 },
                  { key: 'code', label: 'Code' },
                  { key: 'nom', label: 'Nom' },
                  { key: 'prenom', label: 'Prénom'}, 
                  { key: 'equipe', label: 'Équipe' },
                  { key: 'type', label: 'Type'}
              ]
              }
          ]
      // Default: return empty structure when no matching viewType
      return [];
  };

  // --- Trigger de refresh ---
  const refreshData = useCallback(() => setAppointmentsVersion(prev => prev + 1), []);

  const addImage = (newImage: Image) => {
    upsertCachedImage(newImage);
    return newImage;
  };

  const updateEventImage = (id: number, newImage: Image) => {
    itemsRef.current = itemsRef.current.map(e => 
      e.IdPlanningRessource === id ? { ...e, image: newImage } : e
    );
    refreshData(); // Force le re-render
  };

  const updateEmployeeImage = (id: number, newImage: Image) => {
    globalEmployeesRef.current = globalEmployeesRef.current.map(emp => 
      emp.IdPersonnel === id ? { ...emp, image: newImage } : emp
    );
    refreshData();
  };

  const updateEmployeeGroup = (empId: number, groupId: number | null) => {
    const nextTeam = teams.find(team => team.id === groupId);
    globalEmployeesRef.current = globalEmployeesRef.current.map(emp => 
      emp.IdPersonnel === empId ? { ...emp, equipe: nextTeam || undefined } : emp
    );
    refreshData();
  };

  const addManualEvent = (payload: { code: string; label: string; description: string; image?: Image; color: string; borderColor: string; textColor: string; actif: boolean; type: 'autre'; category: string; }) => {
    const newId = Date.now();
    const newItem: Item = {
      IdPlanningRessource: newId,
      CodePlanningRessource: payload.code,
      LibellePlanningRessource: payload.label,
      AnnotationPlanningRessource: payload.description,
      CouleurFondPlanningRessource: payload.color,
      CouleurBordurePlanningRessource: payload.borderColor,
      CouleurTextePlanningRessource: payload.textColor,
      code: payload.code,
      image: payload.image,
      Type: 'autre',
      verrou: false,
      Actif: payload.actif,
      category: payload.category,
      isManual: true
    } as Item;

    itemsRef.current = [newItem, ...itemsRef.current];
    refreshData();
    return newItem;
  };

  const updateManualEventCategory = (id: number, category: string) => {
    itemsRef.current = itemsRef.current.map(e =>
      (e.IdPlanningRessource === id && e.isManual) ? ({ ...e, category, isManual: true }) : e
    );
    refreshData();
  };

  const deleteManualEvent = (id: number) => {
    itemsRef.current = itemsRef.current.filter(e => !(e.IdPlanningRessource === id && e.isManual));
    refreshData();
  };

  const toggleManualEvent = (id: number) => {
    itemsRef.current = itemsRef.current.map(e =>
      e.IdPlanningRessource === id ? ({ ...e, actif: !(e as any).actif }) : e
    );
    refreshData();
  };


  return {
    isLoading,
    isSearching,
    searchError,
    retrySearch,
    searchResults: remoteSearchResults,
    itemsRef,
    appointmentsRef,
    filteredEmployees,
    filteredAppointments,
    availableImages,
    initialTeams: teams,
    updateEmployeeGroup,
    addManualEvent,
    toggleManualEvent,
    updateManualEventCategory,
    deleteManualEvent,
    getTableItems,
    getTableStructure,
    refreshData,
    addImage,
    updateEventImage,
    updateEmployeeImage,
    loadAppointmentsInRange,
  };
};