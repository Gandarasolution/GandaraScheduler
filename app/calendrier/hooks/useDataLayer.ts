import { useState, useRef, useEffect, useMemo } from 'react';
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
  viewType: string;
  filters: ActiveFilters;
  calendarConfig: CalendarConfig | null;
}

export const useDataLayer = ({ viewType, filters, calendarConfig }: DataLayerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Données Sources (Refs pour éviter re-renders inutiles sur grosses données)
  const employeesRef = useRef<Employee[]>(getEmployees());
  const itemsRef = useRef<Item[]>(getEvenements());
  const appointmentsRef = useRef<Appointment[]>(initialAppointments);
  
  // Données Filtrées (State pour l'UI)
  const [filteredEvent, setFilteredEvent] = useState<Item[]>(itemsRef.current);
  const [appointmentsVersion, setAppointmentsVersion] = useState(0); // Trigger manuel
  const [availableImages, setAvailableImages] = useState<Image[]>(getImages());


  // Instanciation Utils
  const searchUtils = useMemo(() => createSearchAndFilterUtils(), []);

  // --- Filtrage Principal (Calendrier) ---
  const filteredEmployees = useMemo(() => {
    if (!calendarConfig) return employeesRef.current;
    return applyFiltersToEmployees(
        employeesRef.current.filter(emp => emp.type === 'employee' || emp.type === 'interim'), 
        calendarConfig.filters
    );
  }, [calendarConfig]);

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
    return applyFiltersToAppointments(filtered, calendarConfig.filters, employeesRef.current);
  }, [calendarConfig, appointmentsVersion]); // Dépend de la version pour rafraichir

  // --- Filtrage Secondaire (Tableaux) ---
  // Cette fonction prépare les données pour DataTableFrame
  const getTableItems = () => {
     if (viewType === 'chantier-table') return filteredEvent.filter(e => e.type === 'chantier');
     if (viewType === 'paie-table') return filteredEvent.filter(e => e.type !== 'chantier');
     return employeesRef.current.map(emp => ({
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
        // Ici tu peux retourner les structures de colonnes définies dans le fichier original
        // Je simplifie pour l'exemple, mais copie le tableau `categoriesStructure` ici

        if (viewType === 'chantier-table') 
            return [
                {
                    key: 'IG',
                    label: 'Informations Générales', 
                    attributes: [
                        { key: 'image', label: 'Image', isFixed: true },
                        { key: 'poleActivite',   label: 'Pôle', type:'string' },
                        { key: 'code',  label: 'Code', type:'string' },
                        { key: 'identifiant',  label: 'Identifiant', type:'string' },
                        { key: 'libelle' , label: 'Libellé', type:'string' },
                        { key: 'etat', label: 'État', type:'string' },
                        { key: 'chargeAffaire',  label: 'Chargé Aff.', type:'string' },
                        { key: 'chefChantier',  label: 'Chef Ch.', type:'string' },
                        { key: 'dateOS' , label: 'Date OS', type:'date' },
                        { key: 'dateFin', label: 'Date Fin', type:'date' }
                    ]
                },
                {
                    key: 'analyse',
                    label: 'Analyse Chantier',
                    attributes: [
                        { key: 'TM',  label: 'T. Marché', type:'string' },      // Temps Marché
                        { key: 'HR',  label: 'H. Réal.', type:'string' },       // Heures Réalisées
                        { key: 'SH',  label: 'Solde H.', type:'string' },       // Solde Heure
                        { key: 'DPF',  label: 'D. Planif.', type:'string' },    // Durée Planifiée
                        { key: 'RPF',  label: 'Réal. + Fut.', type:'string' },  // Réalisé + Future
                        { key: 'AP',  label: 'Avanc. %', type:'string' },       // Avancement Prév.
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
                    { key: 'image', label: 'Image', isFixed: true },
                    { key: 'code', label: 'Code' },
                    { key: 'label', label: 'Libellé' },
                    { key: 'actif', label: 'ACTF' },
                    { key: 'category', label: 'Catégorie' }
                ]
                }
            ]
        if (viewType === 'employee-table') 
            return [
                {
                key: 'all',
                label: '',
                attributes: [
                    { key: 'image', label: 'Image', isFixed: true },
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
  const refreshData = () => setAppointmentsVersion(prev => prev + 1);

  const addImage = (newImage: Image) => {
    setAvailableImages([...availableImages, newImage]); // Ajout au début
  };

  const updateEventImage = (id: number, newImageUrl: string) => {
    itemsRef.current = itemsRef.current.map(e => 
      e.id === id ? { ...e, image: newImageUrl } : e
    );
    refreshData(); // Force le re-render
  };

  const updateEmployeeImage = (id: number, newImageUrl: string) => {
    employeesRef.current = employeesRef.current.map(emp => 
      emp.id === id ? { ...emp, image: newImageUrl } : emp
    );
    refreshData();
  };

  return {
    isLoading,
    employeesRef,
    itemsRef,
    appointmentsRef,
    filteredEmployees,
    filteredAppointments,
    filteredEvent, setFilteredEvent,
    availableImages,
    initialTeams,
    getTableItems,
    getTableStructure,
    refreshData,
    addImage,
    updateEventImage,
    updateEmployeeImage
  };
};