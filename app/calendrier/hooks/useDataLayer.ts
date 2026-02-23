import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Appointment, User, Item, CalendarConfig, Image, UserRole } from '../types';
import { ActiveFilters, createSearchAndFilterUtils } from '../utils/searchAndFilterUtils';
import { 
  getAppointments, 
  getEvenements, 
  initialTeams, 
  getImages
} from "../../datasource";
import { applyFiltersToEmployees, applyFiltersToAppointments, getFlatFilters } from "../utils/filters";
import { INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER, INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE } from '../utils/constants';
import { CategoryStructure } from '@/app/calendrier/components/Table/DataTableFrame';
import { useCalendarWorker } from './useCalendarWorker';


interface DataLayerProps {
  viewType: 'calendar' | 'chantier-table' | 'paie-table' | 'employee-table' | 'manual-event-table';
  searchQuery: string;
  filters: ActiveFilters;
  calendarConfig: CalendarConfig | null;
  globalEmployeesRef: React.RefObject<User[]>;
  userId: string;
  userIdNumber: number;
  userRole: UserRole;
  userName: string;
  enableCollaboration: boolean;
  isSearchOverlayOpen: boolean;
}

export const useDataLayer = ({ viewType, filters, searchQuery, calendarConfig, globalEmployeesRef, userId, userIdNumber, userRole, userName, enableCollaboration, isSearchOverlayOpen }: DataLayerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const worker = useCalendarWorker();
  
  // Données Sources (Refs pour éviter re-renders inutiles sur grosses données)
  const itemsRef = useRef<Item[]>(getEvenements());
  const appointmentsRef = useRef<Appointment[]>([]);
  
  // Données Filtrées (State pour l'UI)
  const [appointmentsVersion, setAppointmentsVersion] = useState(0); // Trigger manuel
  const [availableImages, setAvailableImages] = useState<Image[]>(getImages());
  const [workerFilteredAppointments, setWorkerFilteredAppointments] = useState<Appointment[]>([]);


  // Instanciation Utils
  const searchUtils = useMemo(() => createSearchAndFilterUtils(), []);

  // --- Filtrage Principal (Calendrier) ---
  const filteredEmployees = useMemo(() => {
    if (!calendarConfig || viewType === 'chantier-table' || viewType === 'paie-table') return globalEmployeesRef.current;

    if (viewType === 'calendar') {
      let employees = globalEmployeesRef.current.filter(emp => emp.type === 'employee' || emp.type === 'interim');
      
      // Filtrer par rôle : users et viewers ne voient que leur propre employé
      if (userRole === 'user' || userRole === 'viewer') {
        employees = employees.filter(emp => emp.id === userIdNumber);
      }
      
      return applyFiltersToEmployees(
        employees, 
        getFlatFilters(calendarConfig.filterCategories)
      );
    }

    return searchUtils.applyFiltersToEmployees(
      globalEmployeesRef.current,
      searchQuery,
      filters
    );

   
  }, [calendarConfig, searchQuery, appointmentsVersion, userRole, userIdNumber]);

  const filteredItems = useMemo(() => {
    if (!calendarConfig) return itemsRef.current;
    return searchUtils.applyFiltersToItem(
      itemsRef.current,
      searchQuery,
      filters
    );
  }, [calendarConfig, searchQuery, filters, searchUtils, appointmentsVersion]);

  const filteredAppointments = useMemo(() => {
    if (!calendarConfig || isSearchOverlayOpen) return appointmentsRef.current;
    // Logique de filtrage combinée (Types RDV + Filtres champs)
    let filtered = appointmentsRef.current;
    
    // Utiliser le worker pour le pré-filtrage si disponible et si gros volume
    // Sinon utiliser workerFilteredAppointments si déjà calculé
    if (workerFilteredAppointments.length > 0 && appointmentsRef.current.length > 500) {
      filtered = workerFilteredAppointments;
    }
    
    // Filtre par rôle utilisateur - users et viewers ne voient que leurs propres RDV
    if (userRole === 'user' || userRole === 'viewer') {
      filtered = filtered.filter(app => app.employee.id === userIdNumber);
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
                 const norm = app.type === 'chantier' ? 'Chantier' : app.type === 'absence' ? 'Absence' : 'Autre';
                 return selectedRdvTypes.includes(norm);
             });
         }
    }
    return applyFiltersToAppointments(filtered, getFlatFilters(calendarConfig.filterCategories), searchQuery, globalEmployeesRef.current);
  }, [calendarConfig, searchQuery, appointmentsVersion, workerFilteredAppointments, userRole, userIdNumber]); // Dépend de la version pour rafraichir
  
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
    // Simuler un appel API
    setTimeout(() => {
      const newAppointments = getAppointments(startDate, endDate);
      // Fusionner les nouveaux RDV avec les existants
      const existingIds = new Set(appointmentsRef.current.map(app => app.id));
      const mergedAppointments = [
        ...appointmentsRef.current,
        ...newAppointments.filter(app => !existingIds.has(app.id))
      ];
      appointmentsRef.current = mergedAppointments;
      setAppointmentsVersion(prev => prev + 1);
      setIsLoading(false);
    }, 500); // Simuler délai
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
     if (viewType === 'chantier-table') return filteredItems.filter(e => e.type === 'chantier');
     if (viewType === 'paie-table') return filteredItems.filter(e => e.type !== 'chantier');
     return filteredEmployees.map(emp => ({
        id: emp.id,
        image: emp.image,
        code: emp.code,
        nom: emp.nom,
        prenom: emp.prenom,
        type: emp.type,
        equipe: emp.equipe?.name || ''
     }));
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
    setAvailableImages([...availableImages, newImage]); // Ajout au début
    return newImage;
  };

  const updateEventImage = (id: number, newImage: Image) => {
    itemsRef.current = itemsRef.current.map(e => 
      e.id === id ? { ...e, image: newImage } : e
    );
    refreshData(); // Force le re-render
  };

  const updateEmployeeImage = (id: number, newImage: Image) => {
    globalEmployeesRef.current = globalEmployeesRef.current.map(emp => 
      emp.id === id ? { ...emp, image: newImage } : emp
    );
    refreshData();
  };

  const updateEmployeeGroup = (empId: number, groupId: number | null) => {
    globalEmployeesRef.current = globalEmployeesRef.current.map(emp => 
      emp.id === empId ? { ...emp, group: initialTeams.find(team => team.id === groupId) || undefined } : emp
    );
    refreshData();
  };

  const addManualEvent = (payload: { code: string; label: string; description: string; image?: Image; color: string; borderColor: string; textColor: string; actif: boolean; type: 'autre'; category: string; }) => {
    const newId = Date.now();
    const newItem: Item = {
      id: newId,
      label: payload.label,
      defaultDescription: payload.description,
      color: payload.color,
      borderColor: payload.borderColor,
      textColor: payload.textColor,
      code: payload.code,
      image: payload.image,
      type: payload.type,
      verrou: false,
      actif: payload.actif,
      category: payload.category,
      isManual: true
    } as Item;

    itemsRef.current = [newItem, ...itemsRef.current];
    refreshData();
    return newItem;
  };

  const updateManualEventCategory = (id: number, category: string) => {
    itemsRef.current = itemsRef.current.map(e =>
      (e.id === id && e.isManual) ? ({ ...e, category, isManual: true }) : e
    );
    refreshData();
  };

  const deleteManualEvent = (id: number) => {
    itemsRef.current = itemsRef.current.filter(e => !(e.id === id && e.isManual));
    refreshData();
  };

  const toggleManualEvent = (id: number) => {
    itemsRef.current = itemsRef.current.map(e =>
      e.id === id ? ({ ...e, actif: !(e as any).actif }) : e
    );
    refreshData();
  };


  return {
    isLoading,
    itemsRef,
    appointmentsRef,
    filteredEmployees,
    filteredAppointments,
    filteredItems,
    availableImages,
    initialTeams,
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