import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Appointment, Employee, Item, CalendarConfig, Image } from '../types';
import { ActiveFilters, createSearchAndFilterUtils } from '../utils/searchAndFilterUtils';
import { 
  getEmployees, 
  initialAppointments, 
  getEvenements, 
  initialTeams, 
  getImages
} from "../../datasource";
import { applyFiltersToEmployees, applyFiltersToAppointments } from "../utils/filters";

interface DataLayerProps {
  viewType: 'calendar' | 'chantier-table' | 'paie-table' | 'employee-table' | 'manual-event-table';
  searchQuery: string;
  filters: ActiveFilters;
  calendarConfig: CalendarConfig | null;
  globalEmployeesRef: React.RefObject<Employee[]>;
}

export const useDataLayer = ({ viewType, filters, searchQuery, calendarConfig, globalEmployeesRef }: DataLayerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Données Sources (Refs pour éviter re-renders inutiles sur grosses données)
  const itemsRef = useRef<Item[]>(getEvenements());
  const appointmentsRef = useRef<Appointment[]>(initialAppointments);
  
  // Données Filtrées (State pour l'UI)
  const [appointmentsVersion, setAppointmentsVersion] = useState(0); // Trigger manuel
  const [availableImages, setAvailableImages] = useState<Image[]>(getImages());


  // Instanciation Utils
  const searchUtils = useMemo(() => createSearchAndFilterUtils(), []);

  // --- Filtrage Principal (Calendrier) ---
  const filteredEmployees = useMemo(() => {
    if (!calendarConfig || viewType === 'chantier-table' || viewType === 'paie-table') return globalEmployeesRef.current;

    if (viewType === 'calendar') {
      return applyFiltersToEmployees(
        globalEmployeesRef.current.filter(emp => emp.type === 'employee' || emp.type === 'interim'), 
        calendarConfig.filters
      );
    }

    return searchUtils.applyFiltersToEmployees(
      globalEmployeesRef.current,
      searchQuery,
      filters
    );

   
  }, [calendarConfig, searchQuery, appointmentsVersion]);

  const filteredItems = useMemo(() => {
    if (!calendarConfig) return itemsRef.current;
    return searchUtils.applyFiltersToItem(
      itemsRef.current,
      searchQuery,
      filters
    );
  }, [calendarConfig, searchQuery, filters, searchUtils, appointmentsVersion]);

  const filteredAppointments = useMemo(() => {
    if (!calendarConfig) return appointmentsRef.current;
    // Logique de filtrage combinée (Types RDV + Filtres champs)
    let filtered = appointmentsRef.current;
    
    
    // Filtre par type de RDV
    if (calendarConfig.selectedRdvTypes?.length > 0) {
         const allTypes = ['Chantier', 'Absence', 'Autre'];
         const isAllSelected = allTypes.every(t => calendarConfig.selectedRdvTypes.includes(t));
         if (!isAllSelected) {
             filtered = filtered.filter(app => {
                 const norm = app.type === 'chantier' ? 'Chantier' : app.type === 'absence' ? 'Absence' : 'Autre';
                 return calendarConfig.selectedRdvTypes.includes(norm);
             });
         }
    }
    return applyFiltersToAppointments(filtered, calendarConfig.filters, searchQuery, globalEmployeesRef.current);
  }, [calendarConfig, searchQuery, appointmentsVersion]); // Dépend de la version pour rafraichir


  // useEffect(() => {
  //   console.log(filteredAppointments);
  // }, [filteredAppointments]);
    

  // --- Filtrage Secondaire (Tableaux) ---
  // Cette fonction prépare les données pour DataTableFrame
  const getTableItems = () => {
     if (viewType === 'chantier-table') return filteredItems.filter(e => e.type === 'chantier');
     if (viewType === 'paie-table') return filteredItems.filter(e => e.type !== 'chantier');
      if (viewType === 'manual-event-table') return filteredItems.filter(e => e.category === 'manual');
     return filteredEmployees.map(emp => ({
        id: emp.id,
        image: emp.image,
        code: emp.code,
        nom: emp.name,
        prenom: emp.firstName,
        type: emp.type,
        equipe: emp.group?.name || ''
     }));
  };

    const getTableStructure = () => {
        if (viewType === 'chantier-table') 
            return [
                {
                    key: 'IG',
                    label: 'Informations Générales', 
                    attributes: [
                        { key: 'image', label: '', isFixed: true, sortable: false },
                        { key: 'poleActivite',   label: 'Pôle', type:'string', width:120 },
                        { key: 'code',  label: 'Code', type:'string', width:85 },
                        { key: 'identifiant',  label: 'Identifiant', type:'string', width:125 },
                        { key: 'libelle' , label: 'Libellé', type:'string', width:280 },
                        { key: 'etat', label: 'État', type:'string' },
                        { key: 'chargeAffaire',  label: 'Chargé d\'Affaires', type:'string' },
                        { key: 'chefChantier',  label: 'Chef de Chantier', type:'string' },
                        { key: 'dateOS' , label: 'Date OS', type:'date' },
                        { key: 'dateFin', label: 'Date Fin', type:'date' }
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
                        { key: 'SP',  label: 'Solde P.', type:'string' }        // Solde Prév.
                    ]
                }
            ] 
        if (viewType === 'paie-table') 
            return [
                {
                key: 'all',
                label: '', 
                attributes: [
                    { key: 'verrou', label: 'Verrou' },
                    { key: 'image', label: '', isFixed: true, sortable: false },
                    { key: 'code', label: 'Code' },
                    { key: 'label', label: 'Libellé' },
                    { key: 'actif', label: 'ACTF' },
                    { key: 'category', label: 'Catégorie' }
                ]
                }
            ]
        if (viewType === 'manual-event-table') 
          return [
            {
            key: 'all',
            label: 'Événements manuels',
            attributes: [
              { key: 'image', label: '', isFixed: true, sortable: false },
              { key: 'label', label: 'Description', type:'string' },
              { key: 'actif', label: 'Actif', type:'boolean' }
            ]
            }
          ]
        if (viewType === 'employee-table') 
            return [
                {
                key: 'all',
                label: '',
                attributes: [
                    { key: 'image', label: '', isFixed: true, sortable: false },
                    { key: 'code', label: 'Code' },
                    { key: 'nom', label: 'Nom' },
                    { key: 'prenom', label: 'Prénom'}, 
                    { key: 'equipe', label: 'Équipe' },
                    { key: 'type', label: 'Type'}
                ]
                }
            ]
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

  const addManualEvent = (payload: { code: string; label: string; description: string; image?: Image; color: string; borderColor: string; textColor: string; actif: boolean; type: 'chantier' | 'autre'; }) => {
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
      category: 'manual'
    } as Item;

    itemsRef.current = [newItem, ...itemsRef.current];
    refreshData();
    return newItem;
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
    getTableItems,
    getTableStructure,
    refreshData,
    addImage,
    updateEventImage,
    updateEmployeeImage
  };
};