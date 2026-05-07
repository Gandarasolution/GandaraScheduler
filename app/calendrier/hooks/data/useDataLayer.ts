import { useState, useRef, useEffect, useMemo, useCallback, use } from 'react';
import { Appointment, User, Item, CalendarConfig, Image, UserRole } from '../../types';
import { ActiveFilters, createSearchAndFilterUtils } from '../../utils/searchAndFilterUtils';
import evenementService from '@/app/service/evenement.service'; // NEW API SERVICE
import equipeService from '@/app/service/equipe.service';
import rubriqueService from '@/app/service/ressource.service';
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
  const [isLoading, setIsLoading] = useState(false);
  const worker = useCalendarWorker();
  const [teams, setTeams] = useState<any[]>([]);
  
  const itemsRef = useRef<Item[]>([]);
  const appointmentsRef = useRef<Appointment[]>([]);
  
  // Données Filtrées (State pour l'UI)
  const [appointmentsVersion, setAppointmentsVersion] = useState(0); // Trigger manuel
  const [availableImages, setAvailableImages] = useState<Image[]>(() => getCachedImages());
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

  const loadTeams = useCallback(async () => {
    const response = await equipeService.getEquipes();

    if (response?.error === 0 && Array.isArray(response.data)) {
      setTeams(response.data);
      return response.data;
    }

    const teamsFromEmployees = globalEmployeesRef.current
      .map(emp => emp.Equipe)
      .filter(Boolean)
      .filter((team, index, arr) => arr.findIndex(t => t?.Id === team?.Id) === index);
    setTeams(teamsFromEmployees as any[]);
    return teamsFromEmployees;
  }, [globalEmployeesRef]);


  // Instanciation Utils
  const searchUtils = useMemo(() => createSearchAndFilterUtils(), []);

  const addMissingResourcesToCache = useCallback((resources: Item[]) => {
    if (!Array.isArray(resources) || resources.length === 0) return;

    const existingIds = new Set(itemsRef.current.map(item => Number(item.IdPlanningRessource)));
    const toAdd = resources.filter((resource) => {
      const resourceId = Number(resource?.IdPlanningRessource);
      return Number.isFinite(resourceId) && !existingIds.has(resourceId);
    });

    if (toAdd.length > 0) {
      itemsRef.current = [...itemsRef.current, ...toAdd];
    }
  }, []);

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
    // Toujours retourner une nouvelle instance d'array afin que les composants
    // mémorisés (React.memo) détectent le changement et se re-render.
    if (!calendarConfig || isSearchOverlayOpen) return appointmentsRef.current.slice();
    // Logique de filtrage combinée (Types RDV + Filtres champs) SANS searchQuery
    let filtered = appointmentsRef.current;
    
    // Filtre par rôle utilisateur - users et viewers ne voient que leurs propres RDV
    if (userRole === 'user' || userRole === 'viewer') {
      filtered = filtered.filter(app => app.IdEmploye === userIdNumber);
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
                const item = itemsSnapshot.find(i => i.IdPlanningRessource === app.IdPlanningRessource);
                  if (!item) return false; // Si pas de ressource associée, on exclut le RDV (ou on peut choisir de l'inclure)
                const norm = item?.Type;
                return selectedRdvTypes.includes(norm);
             });
         }
    }
    // Appliquer les filtres SANS searchQuery pour avoir une base stable
    return applyFiltersToAppointments(filtered, getFlatFilters(calendarConfig.filterCategories), globalEmployeesRef.current);
  }, [calendarConfig, appointmentsVersion, userRole, userIdNumber, isSearchOverlayOpen, itemsSnapshot]);

    
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

    return baseFilteredAppointments.filter(appointment => {
      if (searchInput) {
        const query = searchInput.toLowerCase();
        const appointmentMatches = 
        String(appointment.AnnotationPlanningEvenement).toLowerCase().includes(query)
        if (!appointmentMatches) {
          return false;
        }
      }
    });
  }, [baseFilteredAppointments, searchInput, calendarConfig, itemsSnapshot]);



  const loadAppointmentsInRange = useCallback(async (startDate: number, endDate: number): Promise<boolean> => {
    setIsLoading(true);    
    try {
      const response = await evenementService.getEvenements(startDate, endDate);
      const payloadData = response?.data;
      const newAppointments = response?.error === 0
        ? (Array.isArray(payloadData?.appointments)
            ? payloadData.appointments
            : []
          )
        : [];

      const newResources = response?.error === 0 && Array.isArray(payloadData?.ressources)
        ? payloadData.ressources
        : [];
        

      // Ajouter au cache uniquement les ressources absentes.
      addMissingResourcesToCache(newResources);

      appointmentsRef.current = newAppointments;
      setAppointmentsVersion(prev => prev + 1);
    } catch (error) {
      console.error("Erreur lors du chargement des rendez-vous:", error);
    } finally {
      setIsLoading(false);
    }
    return true;
  }, [addMissingResourcesToCache]);

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
                      { key: 'IdImage', label: '', sortable: false , width:50 },
                      { key: 'PoleActivite',   label: 'Pôle', type:'string', width:120 },
                      { key: 'CodePlanningRessource',  label: 'Code', type:'string', width:85 },
                      { key: 'Identifiant',  label: 'Identifiant', type:'string', width:125 },
                      { key: 'LibellePlanningRessource' , label: 'Libellé', type:'string' },
                      { key: 'Etat', label: 'État', type:'string', width:90 },
                      { key: 'ChargeAffaire',  label: 'Chargé d\'Affaires', type:'string', width:140 },
                      { key: 'ChefChantier',  label: 'Chef de Chantier', type:'string', width:140 },
                      { key: 'DateOS' , label: 'Date OS', type:'date', width:100 },
                      { key: 'DateFin', label: 'Date Fin', type:'date', width:100 }
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
      Type: 'Rubrique Perso',
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
    loadTeams,
  };
};