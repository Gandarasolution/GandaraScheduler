/**
 * @fileoverview Page principale du calendrier Gandara Scheduler
 * 
 * Cette page constitue le point d'entrée principal de l'application calendrier.
 * Elle orchestre tous les composants et gère l'état global de l'application.
 * 
 * Fonctionnalités principales :
 * - Interface responsive desktop/mobile
 * - Gestion complète des rendez-vous (CRUD)
 * - Système de drag & drop avec react-dnd
 * - Navigation temporelle avancée
 * - Filtrage et groupement des employés
 * - Historique des modifications (undo/redo)
 * - Menu contextuel et interactions avancées
 * - Génération automatique de données d'échantillon
 * 
 * Architecture :
 * - Vue desktop : grille horizontale multi-employés avec scroll
 * - Vue mobile : calendrier vertical optimisé tactile
 * - État centralisé avec React Context
 * - Logique métier séparée dans utils/
 * 
 * Composants principaux :
 * - CalendarGrid : grille principale avec timeline
 * - AppointmentForm : formulaire de création/édition
 * - AppointmentItem : affichage et interaction des RDV
 * - Modal : système de fenêtres modales
 * - Contexts : gestion d'état partagé
 * 
 * @page CalendarPage
 * @author Gandara Solutions
 * @version 1.0.0
 * @since 2025-08-08
 */

"use client";

// Imports React, hooks, DnD, date-fns, types, composants, et données
import '../styles/custom.scss';
import React, { useState, useCallback, useRef, useEffect, JSX, useMemo} from "react";
import { DndProvider, useDragDropManager } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  addDays,
  eachDayOfInterval,
  setHours,
  setMinutes,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
} from "date-fns";
import { Appointment, Employee, HistoryAction, Evenement, ChantierEvent, Filter, FilterType, DimensionType} from "../types";
import CalendarGrid from "../components/Calendar/CalendarGrid";
import DataTableFrame from "../components/Table/DataTableFrame";
import Modal from "../components/modals/Modal";
import AppointmentForm from "../components/AppointmentForm";
import SearchOverlay from "../components/modals/SearchOverlay";
import NotificationsPanel from "../components/modals/Notificationspanel";
import ConfigurationModal from "../components/modals/ConfigurationModal";
import AlertModal from "../components/modals/AlertModal";
import SettingsModal from "../components/modals/SettingsModal";
import RightClickComponent from "../components/RightClickComponent";
import FilterModal from "../components/modals/FilterModal";
import { ThemeSelector } from '../components/ThemeSelector';
import {
  initialTeams,
  initialEmployees,
  initialAppointments,
  colors,
  Evenements,
} from "../../datasource";
import { SelectedAppointmentContext } from "../context/SelectedAppointmentContext";
import { SelectedCellContext } from "../context/SelectedCellContext";
import { CELL_WIDTH, DAY_INTERVALS, DAYS_TO_ADD, HALF_DAY_INTERVALS, WINDOW_SIZE } from "../utils/constants";
import { getWorkedDayIntervals, isWeekend } from "../utils/dates";
import { CalendarConfig } from "../types";
import { applyFiltersToEmployees, applyFiltersToAppointments } from "../utils/filters";

// Imports des hooks personnalisés
import {
  useNotifications,
  useCalendarConfig,
} from "../hooks";

// Imports des utilitaires
import { createAppointmentUtils } from "../utils/appointmentUtils";
import { createSearchAndFilterUtils } from "../utils/searchAndFilterUtils";

// Imports des services
import { notificationService } from "../services";


import LogoUrlN from "../image/LOGO_couleur_police_noire.svg";
import LogoUrlB from "../image/LOGO_couleur_police_blanche.svg";
import { useTheme } from '../utils/themeManager';


/**
 * Composant NoSSR pour éviter les problèmes d'hydratation
 * Nécessaire pour les composants avec état côté client uniquement
 */
function NoSSR({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Page principale du calendrier (HomePage).
 *
 * Cette fonction composant React gère l'affichage et la logique de l'agenda/timeline des rendez-vous pour les employés.
 * Elle inclut la gestion des états principaux, la logique de création, modification, suppression, répétition et division des rendez-vous,
 * ainsi que l'affichage de la grille du calendrier, la gestion du scroll infini, des jours travaillés/non travaillés, 
 * du menu contextuel, des modales (création/édition/répétition), du drawer latéral pour le drag & drop, 
 * et des paramètres d'affichage.
 *
 * Principales fonctionnalités :
 * - Affichage d'une grille calendrier avec gestion des employés et des rendez-vous.
 * - Recherche, filtrage et sélection de rendez-vous.
 * - Création, édition, suppression, répétition, division et prolongation de rendez-vous.
 * - Gestion des jours non travaillés et des week-ends.
 * - Drag & drop pour ajouter des rendez-vous depuis un tiroir latéral.
 * - Menu contextuel (clic droit) pour actions rapides sur les cellules ou rendez-vous.
 * - Responsive : adaptation à l'affichage mobile.
 * - Paramètres d'affichage personnalisables (modal de réglages).
 * - Scroll horizontal infini avec ajout dynamique de jours.
 * - Gestion du presse-papier pour copier/coller des rendez-vous.
 * - Modales d'alerte et d'information utilisateur.
 *
 * @component
 * @returns {JSX.Element} L'interface complète de la page calendrier avec toutes ses fonctionnalités.
 */
export default function HomePage() {
  const { theme, setTheme, availableThemes } = useTheme();
  
  // --- ETATS PRINCIPAUX ---
  const [includeWeekend, setIncludeWeekend] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('includeWeekend') === 'true';
    }
    return false; // Valeur par défaut
  });
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('isExpanded') === 'true';
    }
    return false; // Valeur par défaut
  });
  const [isFullDay, setIsFullDay] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('isFullDay') === 'true';
    }
    return false; // Valeur par défaut
  });
  const [viewType, setViewType] = useState<'calendar' | 'chantier-table' | 'paie-table'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedView = window.localStorage.getItem('viewType');
      if (savedView === 'calendar' || savedView === 'chantier-table' || savedView === 'paie-table') {
        return savedView;
      }
    }
    return 'calendar'; // Valeur par défaut
  }); // État pour basculer entre les vues



  const [nonWorkingDates, setNonWorkingDates] = useState<Date[]>([]);
  const [newNonWorkingDate, setNewNonWorkingDate] = useState<string>("");
  const [dayInTimeline, setDayInTimeline] = useState<Date[]>([]);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const events = useRef<Evenement[]>(Evenements);
  const [filteredEvent, setFilteredEvent] = useState<Evenement[]>(Evenements);
  const [searchInput, setSearchInput] = useState<string>('');
  const isLoadingMoreDays = useRef(false);
  const employees = useRef<Employee[]>(initialEmployees);
  const [isLoading, setIsLoading] = useState(false);
  const isAutoScrolling = useRef(false);
  const isAddingLeft = useRef(false);
  const isAddingRight = useRef(false);
  const appointments = useRef<Appointment[]>(initialAppointments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentForm, setSelectedAppointmentForm] = useState<Appointment | null>(null);
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: Date; employeeId: number ; intervalName: "morning" | "afternoon" | "day"} | null>(null);
  const [repeatAppointmentData, setRepeatAppointmentData] = useState<{numberCount:number, repeatCount: number | null; repeatInterval: "day" | "week" | "month"; endDate: Date | null } | null>(null);
  const [extendAppointmentData, setExtendAppointmentData] = useState<Date | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number, item: { label: string; logo: JSX.Element; action: () => void; actif?: boolean }[]} | null>(null);
  const clipboardAppointment= useRef<Appointment | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; date: Date } | null>(null);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState<"Êtes-vous sûr de vouloir supprimer ce rendez-vous ?" | "Êtes-vous sûr de vouloir diviser ce rendez-vous ?">("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [modalInfo, setModalInfo] = useState<{ message: string, color: string } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // États pour le système de notifications (refactoré avec hook)
  const notifications = useNotifications();
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [eventSearchInput, setEventSearchInput] = useState<string>('');
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false); // État pour contrôler le menu déroulant
  const viewDropdownRef = useRef<HTMLDivElement>(null); // Ref pour le menu déroulant
  
  // États pour les filtres des chantiers
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    etat: string[];
    chargeAffaire: string[];
    chefChantier: string[];
  }>({
    etat: [],
    chargeAffaire: [],
    chefChantier: []
  });

  // 🚀 Hook personnalisé pour la gestion des configurations du calendrier
  const calendarConfig = useCalendarConfig({ employees });

  const history = useRef<HistoryAction[]>([]);
  const maxHistorySize = 50; // Limiter la taille de l'historique
  const isInitializing = useRef(true); // Flag pour éviter d'enregistrer les actions lors de l'initialisation
  const hasInitializedWeekend = useRef(false); // Flag pour éviter l'enregistrement lors du premier changement includeWeekend
  
  // Solution ultra-performante avec throttle optimisé et early exit
  const isProcessingInfiniteScroll = useRef(false);
  const lastScrollCheck = useRef(0);
  const isArrowKeyPressed = useRef(false);
  const arrowKeyDirection = useRef<'left' | 'right' | null>(null);
  const continuousScrollInterval = useRef<NodeJS.Timeout | null>(null);
  const isInfiniteScrollEnabled = useRef(false); // Désactivé par défaut jusqu'à la fin du scroll initial

  // Throttle ultra-performant avec requestAnimationFrame
  const throttledScrollHandler = useRef<(() => void) | null>(null);
  const lastScrollTop = useRef(0);

  const toggleSetIsFullDay = useCallback((value: boolean) => {
    setIsFullDay(value);
    // Sauvegarder dans localStorage de façon asynchrone après le rendu
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('isFullDay', JSON.stringify(value));
      }
    }, 0);
  }, []);
  const toggleSetIsExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
    // Sauvegarder dans localStorage de façon asynchrone après le rendu
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('isExpanded', JSON.stringify(value));
      }
    }, 0);
  }, []);
  const toggleSetIncludeWeekend = useCallback((value: boolean) => {
    setIncludeWeekend(value);
    // Sauvegarder dans localStorage de façon asynchrone après le rendu
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('includeWeekend', JSON.stringify(value));
      }
    }, 0);
  }, []);
  const toggleSetViewType = useCallback((value: 'calendar' | 'chantier-table' | 'paie-table') => {
    setViewType(value);
    // Sauvegarder dans localStorage de façon asynchrone après le rendu
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('viewType', value);
      }
    }, 0);
  }, []);



  // --- GESTION DES CONFIGURATIONS DE CALENDRIER ET FILTRES ---
  // Configuration du service de notifications
  useEffect(() => {
    notificationService.setNotificationCallback(notifications.addNotification);
  }, [notifications.addNotification]);

  // --- HOOKS PERSONNALISÉS ET UTILITAIRES ---
  
  // Utilitaires de gestion des rendez-vous
  const appointmentUtils = useMemo(() => createAppointmentUtils(), []);
  
  // Utilitaires de recherche et filtrage
  const searchUtils = useMemo(() => createSearchAndFilterUtils(), []);

  // Hook de gestion de l'historique (sera ajouté après avoir refactorisé les fonctions d'historique)
  // const history = useAppointmentHistory(appointments, handleResearch, notificationService.addNotification);

  // --- FONCTIONS DE GESTION DES CONFIGURATIONS PERSONNALISÉES ---
  const saveCustomConfig = useCallback((config: Omit<CalendarConfig, 'id'>) => {
    const newConfig: CalendarConfig = {
      ...config,
      id: Date.now() // ID unique basé sur timestamp
    };
    calendarConfig.addConfig(newConfig);
    notificationService.configSaved(config.name);
    return newConfig;
  }, [calendarConfig]);

  // État pour la configuration actuelle du calendrier
  const [currentCalendarConfig, setCurrentCalendarConfig] = useState<CalendarConfig | null>(null);

  // Calculer les configurations disponibles dynamiquement
  const availableConfigs = calendarConfig.getAvailableConfigs;

  const updateCustomConfig = useCallback((updatedConfig: CalendarConfig) => {
    calendarConfig.updateConfig(updatedConfig);
    
    // Si la configuration mise à jour est la configuration courante, la mettre à jour aussi
    if (currentCalendarConfig?.id === updatedConfig.id) {
      setCurrentCalendarConfig(updatedConfig);
    }
    
    notificationService.configUpdated(updatedConfig.name);
  }, [currentCalendarConfig?.id, calendarConfig]);

  const deleteCustomConfig = useCallback((configId: number) => {
    const configToDelete = calendarConfig.customConfigs.find(c => c.id === configId);
    calendarConfig.deleteConfig(configId);
    
    // Si la configuration supprimée était active, revenir à la première configuration
    if (currentCalendarConfig?.id === configId && availableConfigs.length > 0) {
      setCurrentCalendarConfig(availableConfigs[0]);
    }
    
    if (configToDelete) {
      notificationService.configDeleted(configToDelete.name);
    }
  }, [calendarConfig, currentCalendarConfig, availableConfigs]);

  const duplicateConfig = useCallback((config: CalendarConfig) => {
    const duplicatedConfig = {
      ...config,
      name: `${config.name} (copie)`,
      id: Date.now()
    };
    calendarConfig.addConfig(duplicatedConfig);
    notificationService.configDuplicated(config.name);
    return duplicatedConfig;
  }, [calendarConfig]);

  // Le comptage des notifications non lues est géré par le hook
  

  // Appliquer les filtres aux employés et rendez-vous selon la configuration
  const filteredEmployeesForCalendar = useMemo(() => {
    if (!currentCalendarConfig) return employees.current;
    return applyFiltersToEmployees(employees.current, currentCalendarConfig.filters);
  }, [currentCalendarConfig?.filters]);

  const filteredAppointmentsForCalendar = useMemo(() => {
    if (!currentCalendarConfig) return filteredAppointments;
    
    // Filtrer d'abord par types de RDV sélectionnés
    let filtered = filteredAppointments;
    
    // Appliquer le filtrage par types de RDV si certains types ne sont pas sélectionnés
    if (currentCalendarConfig.selectedRdvTypes && currentCalendarConfig.selectedRdvTypes.length > 0) {
      // Si tous les types ne sont pas sélectionnés, appliquer le filtrage
      const allTypes = ['Chantier', 'Absence', 'Autre'];
      const isAllSelected = allTypes.every(type => currentCalendarConfig.selectedRdvTypes.includes(type));
      
      if (!isAllSelected) {
        filtered = filteredAppointments.filter(appointment => {
          // Normaliser les types pour la comparaison (gérer les différences de casse et dénominations)
          const appointmentType = appointment.type;
          const normalizedType = appointmentType === 'chantier' ? 'Chantier' : 
                                appointmentType === 'absence' ? 'Absence' :
                                appointmentType === 'autre' ? 'Autre' : 'Autre';
          return currentCalendarConfig.selectedRdvTypes.includes(normalizedType);
        });
      }
    }
    
    // Puis appliquer les filtres de champs
    return applyFiltersToAppointments(filtered, currentCalendarConfig.filters, employees.current);
  }, [filteredAppointments, currentCalendarConfig?.filters, currentCalendarConfig?.selectedRdvTypes]);


  // --- PARAMÈTRES D'AFFICHAGE ET DE FILTRAGE ---
  const settings = [
    {
      category: "Calendrier",
      items: [
        {
          id: "nonWorkedDay", 
          label: "Dates non travaillées :", 
          type: "custom-non-working-dates", // type personnalisé
          nonWorkingDates,
          setNonWorkingDates,
          newNonWorkingDate,
          setNewNonWorkingDate,  
        }
      ]
    }
  ];

  // Fonction ultra-optimisée pour appliquer les filtres aux chantiers
  const applyFiltersToChantiers = useCallback(() => {
    // Cache des événements chantier pour éviter le filtrage répétitif
    const chantierEvents = events.current.filter(e => e.type === 'chantier') as ChantierEvent[];
    
    // Early exit si aucun filtre actif
    const hasSearch = !!searchInput;
    const hasFilters = activeFilters.etat.length > 0 || activeFilters.chargeAffaire.length > 0 || activeFilters.chefChantier.length > 0;
    
    if (!hasSearch && !hasFilters) {
      setFilteredEvent(chantierEvents);
      return;
    }
    
    // Pré-calculer la recherche en minuscules une seule fois
    const lowercasedQuery = hasSearch ? searchInput.toLowerCase() : '';
    
    // Convertir les filtres en Sets pour des lookups O(1)
    const etatSet = activeFilters.etat.length > 0 ? new Set(activeFilters.etat) : null;
    const chargeAffaireSet = activeFilters.chargeAffaire.length > 0 ? new Set(activeFilters.chargeAffaire) : null;
    const chefChantierSet = activeFilters.chefChantier.length > 0 ? new Set(activeFilters.chefChantier) : null;
    
    // Filtrage en une seule passe avec optimisations de court-circuit
    const filtered = chantierEvents.filter(chantier => {
      const attrs = chantier.attributs; // Cache de l'objet attributs
      
      // Test de recherche textuelle (avec court-circuit si pas de recherche)
      if (hasSearch) {
        const libelle = attrs.libelle.toLowerCase();
        const chefChantier = attrs.chefChantier.toLowerCase();
        const chargeAffaire = attrs.chargeAffaire.toLowerCase();
        
        if (!(libelle.includes(lowercasedQuery) || 
              chefChantier.includes(lowercasedQuery) || 
              chargeAffaire.includes(lowercasedQuery))) {
          return false;
        }
      }
      
      // Tests des filtres avec court-circuit (O(1) grâce aux Sets)
      return (!etatSet || etatSet.has(attrs.etat)) &&
             (!chargeAffaireSet || chargeAffaireSet.has(attrs.chargeAffaire)) &&
             (!chefChantierSet || chefChantierSet.has(attrs.chefChantier));
    });
    
    setFilteredEvent(filtered);
  }, [searchInput, activeFilters]);

  // Pattern optimisé : useRef pour données + useState pour rendu
  const handleResearch = useCallback(() => {
    // Utiliser queueMicrotask pour batcher les mises à jour UI
    queueMicrotask(() => {
      switch (viewType) {
        case 'calendar':
          // Optimisation : éviter l'appel si la recherche est vide et pas de changement
          if (!searchInput.trim()) {
            setFilteredAppointments(appointments.current);
          } else {
            const filteredApps = searchUtils.searchAppointments(
              appointments.current,
              events.current,
              searchInput
            );
            setFilteredAppointments(filteredApps);
          }
          break;
        
        case 'chantier-table':
          applyFiltersToChantiers();
          break;
        
        case 'paie-table':
          if (!searchInput.trim()) setFilteredEvent(events.current);
          else setFilteredEvent(events.current.filter(e => e.label.toLocaleLowerCase().includes(searchInput.toLowerCase())));
          break;
        
        default:
          // Gestion par défaut si nécessaire
          break;
      }
    });
  }, [searchInput, viewType, applyFiltersToChantiers, searchUtils]);

  // Fonction optimisée pour obtenir les valeurs uniques avec cache
  const getFilterOptions = useCallback(() => {
    const allChantiers = events.current.filter(e => e.type === 'chantier') as ChantierEvent[];
    
    // Optimisation : utiliser des Sets directement pour éviter la conversion
    const etatSet = new Set<string>();
    const chargeAffaireSet = new Set<string>();
    const chefChantierSet = new Set<string>();
    
    // Une seule boucle au lieu de trois map() séparés
    for (const chantier of allChantiers) {
      const attrs = chantier.attributs;
      etatSet.add(attrs.etat);
      chargeAffaireSet.add(attrs.chargeAffaire);
      chefChantierSet.add(attrs.chefChantier);
    }
    
    // Conversion et tri en une étape
    return {
      etats: Array.from(etatSet).sort(),
      chargeAffaires: Array.from(chargeAffaireSet).sort(),
      chefChantiers: Array.from(chefChantierSet).sort()
    };
  }, []);

  // Fonction pour réinitialiser tous les filtres
  const clearAllFilters = useCallback(() => {
    setActiveFilters({
      etat: [],
      chargeAffaire: [],
      chefChantier: []
    });
  }, []);

  // Création de rendez-vous répétés (refactorisé avec utilitaires)
  const createRepeatedAppointments = useCallback((repeatInterval: "day" | "week" | "month", repeatCount: number, endDate?: Date, numberCount?: number) => {
    if (!selectedAppointment) {
      console.warn("Aucun rendez-vous sélectionné pour la répétition.");
      return;
    }

    const newAppointments = appointmentUtils.createRepeatedAppointments({
      appointment: selectedAppointment,
      repeatInterval,
      repeatCount,
      endDate,
      numberCount,
      isFullDay,
      nonWorkingDates
    });

    // Ajouter les nouveaux rendez-vous à la liste
    appointments.current = [...appointments.current, ...newAppointments];
    handleResearch();
    notificationService.appointmentRepeated(newAppointments.length);
    setRepeatAppointmentData(null);
  }, [handleResearch, selectedAppointment, isFullDay, nonWorkingDates, appointmentUtils]);

  // --- FONCTIONS D'HISTORIQUE POUR CTRL+Z ---
  const addToHistory = useCallback((action: HistoryAction) => {
    history.current.push(action);
    // Limiter la taille de l'historique
    if (history.current.length > maxHistorySize) {
      history.current.shift();
    }
    
  }, []);

  const saveAppointmentState = useCallback((
    appointment: Appointment | null, 
    type: 'create' | 'update' | 'delete' | 'move' | 'resize_split', 
    previousAppointment?: Appointment,
    createdAppointments?: Appointment[]
  ) => {
    if (!appointment || isInitializing.current) return; // Ne pas enregistrer pendant l'initialisation
        
    addToHistory({
      type,
      timestamp: ++timestampCounter.current, // Timestamp stable et croissant
      appointment: { ...appointment },
      previousAppointment: previousAppointment ? { ...previousAppointment } : undefined,
      createdAppointments: createdAppointments ? createdAppointments.map(app => ({ ...app })) : undefined,
      appointments: appointments.current.map(app => ({ ...app })) // Sauvegarde complète pour sécurité
    });
  }, [addToHistory]);

  const onResize = useCallback(
    (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId?: number, saveToHistory: boolean = true) => {     
      const appointmentToResize = appointments.current.find(app => app.id === id);
      
      if (appointmentToResize && saveToHistory) {
        // Sauvegarder l'état précédent pour l'historique
        saveAppointmentState(appointmentToResize, 'update', { ...appointmentToResize });
      }

      appointments.current = appointments.current.map((app) =>
        app.id === id
          ? { ...app, startDate: newStartDate, endDate: newEndDate, employeeId: newEmployeeId || app.employeeId }
          : app
      );
      handleResearch(); // Met à jour la liste filtrée
    }, [handleResearch, saveAppointmentState]
  );

  const undoLastAction = useCallback(() => {    
    
    if (history.current.length === 0) {
      notificationService.warning('Aucune action', 'Aucune action à annuler');
      return;
    }

    const lastAction = history.current.pop();
    if (!lastAction) return;

    switch (lastAction.type) {
      case 'create':
        // Annuler une création = supprimer le rendez-vous
        if (lastAction.appointment) {
          appointments.current = appointments.current.filter(app => app.id !== lastAction.appointment!.id);
          notificationService.undoSuccess('Création');
        }
        break;

      case 'delete':
        // Annuler une suppression = restaurer le rendez-vous
        if (lastAction.appointment) {
          appointments.current = [...appointments.current, { ...lastAction.appointment }];
          notificationService.undoSuccess('Suppression');
        }
        break;

      case 'update':
        // Annuler une modification = restaurer l'ancien état
        if (lastAction.previousAppointment) {
          appointments.current = appointments.current.map(app =>
            app.id === lastAction.previousAppointment!.id ? { ...lastAction.previousAppointment! } : app
          );
          notificationService.undoSuccess('Modification');
        }
        break;

      case 'move':
        // Annuler un déplacement = restaurer la position précédente
        if (lastAction.previousAppointment) {
          appointments.current = appointments.current.map(app =>
            app.id === lastAction.previousAppointment!.id ? { ...lastAction.previousAppointment! } : app
          );
          notificationService.undoSuccess('Déplacement');
        }
        break;

      case 'resize_split':
        // Annuler un redimensionnement avec split
        if (lastAction.previousAppointment && lastAction.createdAppointments) {
          // Restaurer l'état original du RDV principal
          appointments.current = appointments.current.map(app =>
            app.id === lastAction.previousAppointment!.id ? { ...lastAction.previousAppointment! } : app
          );
          
          // Supprimer tous les RDV créés lors du split
          const createdIds = lastAction.createdAppointments.map(app => app.id);
          appointments.current = appointments.current.filter(app => !createdIds.includes(app.id));
          
          notificationService.undoSuccess('Division');
        }
        break;
    }

    // Forcer la mise à jour de l'affichage
    setTimeout(() => {
      handleResearch(); // Mettre à jour l'affichage
    }, 0);
  }, [handleResearch]);

  // Compteur pour générer des IDs uniques de façon déterministe
  const idCounter = useRef(10000); // Commencer à 10000 pour éviter les conflits avec les IDs existants
  const timestampCounter = useRef(1000); // Compteur pour les timestamps stables

  // Création d'un rendez-vous (utilisé lors du resize fractionné)
  const createAppointment = useCallback(
    (startDate: Date, endDate: Date, employeeId: number, eventId: number, saveToHistory: boolean = true, type: 'chantier' | 'absence' | 'autre', description?: string) => {
      // Générer un ID déterministe sans Date.now() ou Math.random()
      const id = ++idCounter.current;
      
      const newApp: Appointment = {
        id: id,
        description: description || `Nouvel rendez-vous`,
        startDate,
        endDate,
        employeeId,
        type: type,
        EventId: eventId,
      };
      appointments.current = [...appointments.current, newApp];
      
      // Enregistrer la création dans l'historique seulement si demandé
      if (saveToHistory) {
        saveAppointmentState(newApp, 'create');
      }
      
      handleResearch(); // Met à jour la liste filtrée
      return newApp; // Retourner le nouveau RDV créé
  }, [handleResearch, saveAppointmentState]);

  const copyAppointmentToClipboard = useCallback((app: Appointment) => {
    if (app) {
      clipboardAppointment.current = appointmentUtils.copyAppointment(app);
      notificationService.info('Rendez-vous copié', 'Le rendez-vous a été copié dans le presse-papier');
    } else {
      console.warn("Aucun rendez-vous sélectionné à copier.");
    }    
  }, [appointmentUtils]);

  const pasteAppointment = useCallback((cell: { employeeId: number; date: Date }) => {
    if (!clipboardAppointment.current) return;

    try {
      const newAppointments = appointmentUtils.pasteAppointment({
        clipboardAppointment: clipboardAppointment.current,
        targetCell: cell,
        isFullDay,
        nonWorkingDates
      });

      appointments.current = [...appointments.current, ...newAppointments];
      handleResearch();
      notificationService.appointmentCreated(newAppointments.length);
    } catch (error) {
      notificationService.error('Erreur', (error as Error).message);
    }
  }, [appointmentUtils, isFullDay, nonWorkingDates, handleResearch]);

  // Fonctions ultra-optimisées pour ajouter des jours
  const addDaysToRight = useCallback(() => {
    const scrollElement = mainScrollRef.current;
    if (!scrollElement) return;
    
    const previousScrollLeft = scrollElement.scrollLeft;
    
    setDayInTimeline((prevDays) => {
      const lastDay = prevDays[prevDays.length - 1];
      
      // Optimisation : pré-calculer le filtre week-end si nécessaire
      let newDays: Date[];
      if (includeWeekend) {
        // Pas de filtrage nécessaire - plus rapide
        newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(lastDay, i + 1));
      } else {
        // Optimisation : construire directement les jours ouvrés
        newDays = [];
        let currentDate = addDays(lastDay, 1);
        while (newDays.length < DAYS_TO_ADD) {
          if (!isWeekend(currentDate)) {
            newDays.push(currentDate);
          }
          currentDate = addDays(currentDate, 1);
        }
      }
      
      // Micro-tâche pour l'ajustement de scroll - plus rapide que requestAnimationFrame
      queueMicrotask(() => {
        if (scrollElement && scrollElement.isConnected) {
          const removedFromLeft = prevDays.length + newDays.length - WINDOW_SIZE;
          if (removedFromLeft > 0) {
            scrollElement.scrollLeft = previousScrollLeft - (removedFromLeft * CELL_WIDTH);
          }
        }
        
        // Reset immédiat pour les touches fléchées, différé sinon
        if (isArrowKeyPressed.current) {
          isProcessingInfiniteScroll.current = false;
        } else {
          setTimeout(() => { isProcessingInfiniteScroll.current = false; }, 100);
        }
      });
      
      return [...prevDays, ...newDays].slice(-WINDOW_SIZE);
    });
  }, [includeWeekend]);

  const addDaysToLeft = useCallback(() => {
    const scrollElement = mainScrollRef.current;
    if (!scrollElement) return;
    
    const previousScrollLeft = scrollElement.scrollLeft;
    
    setDayInTimeline((prevDays) => {
      const firstDay = prevDays[0];
      
      // Optimisation : construire les jours en ordre inverse plus efficacement
      let newDays: Date[];
      if (includeWeekend) {
        newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(firstDay, -(i + 1))).reverse();
      } else {
        // Optimisation : construire directement en évitant filter()
        newDays = [];
        let currentDate = addDays(firstDay, -1);
        while (newDays.length < DAYS_TO_ADD) {
          if (!isWeekend(currentDate)) {
            newDays.unshift(currentDate); // Insertion en début plus efficace qu'un reverse
          }
          currentDate = addDays(currentDate, -1);
        }
      }
      
      // Micro-tâche pour l'ajustement de scroll
      queueMicrotask(() => {
        if (scrollElement && scrollElement.isConnected) {
          scrollElement.scrollLeft = previousScrollLeft + (newDays.length * CELL_WIDTH);
        }
        
        // Reset optimisé
        if (isArrowKeyPressed.current) {
          isProcessingInfiniteScroll.current = false;
        } else {
          setTimeout(() => { isProcessingInfiniteScroll.current = false; }, 100);
        }
      });
      
      return [...newDays, ...prevDays].slice(0, WINDOW_SIZE);
    });
  }, [includeWeekend]);

  // Configuration du gestionnaire throttlé de scroll (initialisation inline)
  if (!throttledScrollHandler.current) {
    let rafId: number | null = null;
    let lastProcessTime = 0;
    throttledScrollHandler.current = () => {
      // Early exits pour économiser les cycles
      if (rafId || isProcessingInfiniteScroll.current || !isInfiniteScrollEnabled.current || isAutoScrolling.current) return;
      
      // Throttling plus agressif - max 60fps
      const now = performance.now();
      if (now - lastProcessTime < 16) return;
      
      rafId = requestAnimationFrame(() => {
        rafId = null;
        lastProcessTime = performance.now();
        
        const scrollElement = mainScrollRef.current;
        if (!scrollElement) return;

        // Cache des propriétés pour éviter les reflows multiples
        const { scrollLeft, scrollWidth, clientWidth, scrollTop } = scrollElement;
        
        // Skip si scroll vertical détecté
        if (Math.abs(scrollTop - lastScrollTop.current) > Math.abs(scrollLeft - (lastScrollCheck.current || scrollLeft))) {
          lastScrollTop.current = scrollTop;
          return;
        }

        // Throttling temporel optimisé
        const timeDelta = now - lastScrollCheck.current;
        const minInterval = isArrowKeyPressed.current ? 50 : 150;
        if (timeDelta < minInterval) return;
        
        lastScrollCheck.current = now;
        
        // Early exit optimisé
        if (scrollWidth <= clientWidth) return;
        
        // Calcul de pourcentage avec mise en cache
        const scrollableWidth = scrollWidth - clientWidth;
        const scrollPercentage = (scrollLeft / scrollableWidth) * 100;

        // Seuils optimisés
        const isArrowRight = isArrowKeyPressed.current && arrowKeyDirection.current === 'right';
        const isArrowLeft = isArrowKeyPressed.current && arrowKeyDirection.current === 'left';
        const rightThreshold = isArrowRight ? 85 : 92;
        const leftThreshold = isArrowLeft ? 15 : 8;
        
        if (scrollPercentage >= rightThreshold) {
          isProcessingInfiniteScroll.current = true;
          addDaysToRight();
        } else if (scrollPercentage <= leftThreshold) {
          isProcessingInfiniteScroll.current = true;
          addDaysToLeft();
        }
      });
    };
  }

  // Gestion du scroll ultra-optimisée avec throttling passif
  const handleScroll = useCallback(() => {
    // Appel du throttled handler avec protection
    if (throttledScrollHandler.current) {
      throttledScrollHandler.current();
    }
    
    // Optimisation : vérification edge-scroll allégée
    if (isInfiniteScrollEnabled.current && !isProcessingInfiniteScroll.current) {
      const scrollElement = mainScrollRef.current;
      if (scrollElement) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
        const scrollableWidth = scrollWidth - clientWidth;
        
        if (scrollableWidth > 0) {
          const scrollPercentage = (scrollLeft / scrollableWidth) * 100;
          
          // Reset rapide pour le scroll aux bords (évite les blocages)
          if (scrollPercentage >= 96 || scrollPercentage <= 4) {
            // Micro-tâche pour libérer plus rapidement
            queueMicrotask(() => {
              if (isProcessingInfiniteScroll.current) {
                isProcessingInfiniteScroll.current = false;
              }
            });
          }
        }
      }
    }
  }, []);

  // Fonction optimisée pour centrer sur une date
  const goToDate = useCallback((date: Date) => {
    const scrollElement = mainScrollRef.current;
    if (!scrollElement) return;
    
    setIsLoading(true);
    
    // Optimisation : calcul de l'intervalle en une fois
    const halfWindow = Math.floor(WINDOW_SIZE / 2);
    const startDate = addDays(date, -halfWindow);
    const endDate = addDays(date, halfWindow);
    
    let newTimeline: Date[];
    if (includeWeekend) {
      newTimeline = eachDayOfInterval({ start: startDate, end: endDate });
    } else {
      // Construction optimisée sans filter() pour de meilleures performances
      newTimeline = [];
      let currentDate = startDate;
      while (currentDate <= endDate) {
        if (!isWeekend(currentDate)) {
          newTimeline.push(currentDate);
        }
        currentDate = addDays(currentDate, 1);
      }
    }
    
    setDayInTimeline(newTimeline);

    // Optimisation : utiliser queueMicrotask pour un timing plus précis
    queueMicrotask(() => {
      // Attendre que le DOM soit mis à jour
      requestAnimationFrame(() => {
        const todayCell = document.getElementById(format(date, "yyyy-MM-dd"));
        if (todayCell && scrollElement.isConnected) {
          isAutoScrolling.current = true;
          
          // Calcul optimisé du scroll
          const cellRect = todayCell.getBoundingClientRect();
          const containerRect = scrollElement.getBoundingClientRect();
          const targetScrollLeft = 
            scrollElement.scrollLeft + 
            cellRect.left - containerRect.left - 
            (scrollElement.clientWidth - todayCell.clientWidth) / 2;
          
          scrollElement.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
          
          // Reset optimisé avec timeout plus court
          setTimeout(() => {
            isAutoScrolling.current = false;
            isInfiniteScrollEnabled.current = true;
          }, 800); // Réduit de 1000ms à 800ms
        }
        setSelectedDate(date);
        setIsLoading(false);
      });
    });
  }, [includeWeekend, selectedDate]);


  // Déplacement d'un rendez-vous (drag & drop ou resize) - Optimisé
  const moveAppointment = useCallback(
    (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection: 'left' | 'right' = 'right', saveToHistory: boolean = true) => {
      // Early exit - Rendez-vous non trouvé 
      const appointment = appointments.current.find((app) => app.id === id);
      if (!appointment) return;
      
      // Calcul optimisé des intervalles avec mise en cache des constantes
      const intervalType = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
      const days = getWorkedDayIntervals(
        newStartDate, 
        newEndDate,
        intervalType,
        !includeWeekend,
        nonWorkingDates
      );    
    
      // Early exit - Pas de jours travaillés dans l'intervalle
      if (days.length === 0) return;
      
      // Enregistrer l'état précédent uniquement si nécessaire (optimisation mémoire)
      const previousAppointment = saveToHistory ? { ...appointment } : null;
      
      // Préallouer le tableau avec la taille optimale
      const createdAppointments: Appointment[] = days.length > 1 ? new Array(days.length - 1) : [];
      let createdCount = 0;
      
      // Éviter la duplication de code avec une fonction helper optimisée
      const processIntervals = (startIndex: number, endIndex: number, step: number, mainIndex: number) => {
        // Traitement du rendez-vous principal
        const mainDay = days[mainIndex];
        const mainStart = resizeDirection === 'left' ? mainDay.start : newStartDate;
        const mainEnd = resizeDirection === 'right' ? mainDay.end : newEndDate;
        onResize(appointment.id, mainStart, mainEnd, newEmployeeId, false);
        
        // Traitement des intervalles supplémentaires
        for (let i = startIndex; i !== endIndex; i += step) {
          const day = days[i];
          const newApp = createAppointment?.(
            day.start, 
            day.end, 
            newEmployeeId, 
            appointment.EventId,
            false,
            appointment.type
          );
          if (newApp) {
            createdAppointments[createdCount++] = newApp;
          }
        }
      };
      
      // Traitement optimisé selon la direction
      if (resizeDirection === 'right') {
        processIntervals(1, days.length, 1, 0);
      } else {
        processIntervals(days.length - 2, -1, -1, days.length - 1);
      }
      
      // Ajuster la taille du tableau aux éléments réellement créés
      createdAppointments.length = createdCount;
      
      // Enregistrement dans l'historique avec micro-tâche pour améliorer les performances
      if (saveToHistory && previousAppointment) {
        queueMicrotask(() => {
          const updatedAppointment = appointments.current.find((app) => app.id === id);
          if (updatedAppointment) {
            const actionType = createdCount > 0 ? 'resize_split' : 'move';
            saveAppointmentState(
              updatedAppointment, 
              actionType, 
              previousAppointment, 
              createdCount > 0 ? createdAppointments : undefined
            );
          }
        });
      }
    },
    [onResize, createAppointment, isFullDay, DAY_INTERVALS, HALF_DAY_INTERVALS, includeWeekend, nonWorkingDates, saveAppointmentState]
  );


  const handleSaveEvent = useCallback((event: Evenement) => {    
    events.current = events.current.map(e =>
      e.id === event.id ? { ...e, ...event } : e
    );
    handleResearch(); // Met à jour la liste filtrée
  }, [handleResearch]);

  // Gestion de la création et édition de rendez-vous
  const handleSaveAppointment = useCallback(
    (appointment: Appointment, eventUpdate: Evenement, includeAllNonWorkingDays: boolean) => {

      events.current = events.current.map(e =>
        e.id === eventUpdate.id ? { ...e, ...eventUpdate } : e
      );
      const days = getWorkedDayIntervals(
        appointment.startDate, 
        appointment.endDate,
        isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
        includeAllNonWorkingDays,
        nonWorkingDates
      );        
            
      
      // Enregistrer l'état précédent pour l'historique
      let previousAppointment: Appointment | undefined;
      if (appointment.id) {
        previousAppointment = appointments.current.find(app => app.id === appointment.id);
      }
      
      const createdAppointments: Appointment[] = [];
      
      // Fonction utilitaire pour créer les rendez-vous supplémentaires
      const createExtraAppointments = (fromIndex = 1) => {
        days.slice(fromIndex).forEach(day => {          
          const newApp = createAppointment(
            day.start,
            day.end,
            appointment.employeeId as number,
            eventUpdate.id,
            true,
            appointment.type,
            appointment.description
          );
          if (newApp) {
            createdAppointments.push(newApp);
          }
        });
      };

      if (appointment.id) {        
        // Mise à jour du rendez-vous existant - ne traiter que le RDV en cours
        if (days.length > 0) {
          // Mettre à jour le rendez-vous principal avec le premier jour
          appointments.current = appointments.current.map(app => {
            if (app.id === appointment.id) {
              return {
                ...app,
                description: appointment.description || app.description,
                startDate: days[0].start,
                endDate: days[0].end,
                employeeId: appointment.employeeId,
                type: appointment.type,
                EventId: appointment.EventId,
              };   
            }
            return app;
          });
          
          // Créer des RDV supplémentaires pour les autres jours si nécessaire
          if (days.length > 1) {
            createExtraAppointments(1);
          }
        }
      } else {
        
        // Création d'un nouveau rendez-vous
        createExtraAppointments(0);
      }      
      // Enregistrer dans l'historique
      if (appointment.id && previousAppointment) {
        // C'est une mise à jour
        const updatedAppointment = appointments.current.find(app => app.id === appointment.id);
        if (updatedAppointment) {
          if (createdAppointments.length > 0) {
            // Resize avec split
            saveAppointmentState(updatedAppointment, 'resize_split', previousAppointment, createdAppointments);
          } else {
            saveAppointmentState(updatedAppointment, 'update', previousAppointment);
          }
        }
      }      
      handleResearch(); // Met à jour la liste filtrée
      setIsModalOpen(false);
      setSelectedAppointment(null);
      setNewAppointmentInfo(null);
    }, [handleResearch, createAppointment, isFullDay, nonWorkingDates, saveAppointmentState, handleSaveEvent]);


  const handleDeleteAppointmentConfirm = useCallback(() => {
    setAlertTitle("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?");
    setIsAlertVisible(true)
  }, []);

  const handleDeleteAppointment = useCallback((id? : number) => {
    if (!id) {
      console.warn("Aucun ID de rendez-vous fourni pour la suppression.");
      return;
    }
    
    // Trouver le rendez-vous à supprimer pour l'historique
    const appointmentToDelete = appointments.current.find(app => app.id === id);
    if (appointmentToDelete) {
      saveAppointmentState(appointmentToDelete, 'delete');
    }
    
    setIsAlertVisible(false);
    appointments.current = appointments.current.filter((app) => app.id !== id);
    handleResearch(); // Met à jour la liste filtrée
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, [handleResearch, saveAppointmentState]);

  const handleOpenEditModal = useCallback((appointment: Appointment) => {
    setSelectedAppointmentForm(appointment);
    setIsModalOpen(true);
  }, []);
  

  const handleDivideAppointmentConfirm = useCallback(() => {
    setAlertTitle("Êtes-vous sûr de vouloir diviser ce rendez-vous ?");
    setIsAlertVisible(true);
  }, []);

  const handleDivideAppointment = useCallback((id?: number) => {
    if (!id) return;

    const appointmentToDivide = appointments.current.find(app => app.id === id);
    if (!appointmentToDivide) return;

    // Sauvegarder l'état original pour l'historique
    const originalAppointment = { ...appointmentToDivide };

    const { startDate, endDate, employeeId } = appointmentToDivide;
    const totalDuration = endDate.getTime() - startDate.getTime();
    const timeInterval = isFullDay ? DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour : HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour;
    const nbOfIntervals = Math.floor(totalDuration / (timeInterval * 60 * 60 * 1000)); // Nombre d'intervalles de travail dans la durée totale;
    
    const EndDate = new Date(startDate.getTime() + (Math.floor(nbOfIntervals / 2) * (timeInterval * 60 * 60 * 1000)));

    // Redimensionner le RDV original (sans sauvegarder dans l'historique ici)
    onResize(id, startDate, EndDate, employeeId as number, false);
    
    // Créer le nouveau RDV (sans sauvegarder dans l'historique ici)
    const newAppointmentId = Date.now() + Math.floor(Math.random() * 1000);
    const newAppointment: Appointment = {
      id: newAppointmentId,
      description: appointmentToDivide.description,
      startDate: EndDate,
      endDate: endDate,
      employeeId: employeeId as number,
      type: appointmentToDivide.type,
      EventId: appointmentToDivide.EventId
    };

    // Ajouter le nouveau RDV sans passer par createAppointment pour éviter l'historique
    appointments.current.push(newAppointment);

    // Maintenant sauvegarder toute l'opération comme une action resize_split
    const modifiedOriginal = appointments.current.find(app => app.id === id);
    if (modifiedOriginal) {
      saveAppointmentState(originalAppointment, 'resize_split', originalAppointment, [newAppointment]);
    }

    handleResearch();
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, [onResize, isFullDay, saveAppointmentState, handleResearch]);

  const handleRepeat = useCallback(() => {
    if (!repeatAppointmentData) return;

    const { repeatCount, endDate, repeatInterval, numberCount} = repeatAppointmentData;
    
    // Créer des rendez-vous répétés
    createRepeatedAppointments(repeatInterval, repeatCount ?? 0, endDate ?? undefined, numberCount);
    setRepeatAppointmentData(null);
  }, [repeatAppointmentData, createRepeatedAppointments]);

  const handleExtend = useCallback(() =>{
    if (!extendAppointmentData || !selectedAppointment) return;

    moveAppointment(
      selectedAppointment.id, 
      selectedAppointment.startDate, 
      extendAppointmentData, 
      selectedAppointment.employeeId as number,
      selectedAppointment.endDate.getTime() < extendAppointmentData.getTime() ? 'right' : 'left'
    );

    setExtendAppointmentData(null);

  }, [extendAppointmentData, selectedAppointment, moveAppointment]);

  // Création d'un rendez-vous depuis un drag externe
  const createAppointmentFromDrag = useCallback(
    (title: string, date: Date, intervalName: "morning" | "afternoon" | "day", employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => {
      const startHour = intervalName === "day" ? DAY_INTERVALS[0].startHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].startHour : HALF_DAY_INTERVALS[1].startHour;
      const endHour = intervalName === "day" ? DAY_INTERVALS[0].endHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].endHour : HALF_DAY_INTERVALS[1].endHour;

      const startDate = setHours(setMinutes(new Date(date), 0), startHour);
      const endDate = setHours(setMinutes(new Date(date), 0), endHour);

      // Trouver l'ID de l'événement correspondant
      let eventTypeId = events.current.find(e => e.label === title)?.id;
      if (!eventTypeId) {
        console.warn(`Événement introuvable pour le titre : ${title}`);
        return;
      }

      createAppointment(
        startDate, 
        endDate, 
        employeeId, 
        eventTypeId,
        true,
        typeEvent.toLowerCase() as 'chantier' | 'absence' | 'autre'
      );
      
      // Fermer l'overlay après création
      setIsSearchOverlayOpen(false);
      setEventSearchInput('');
    },
    [createAppointment]
  );

  // Filtrer les événements en fonction de la recherche
  const filteredEvents = useMemo(() => {
    if (!eventSearchInput.trim()) return [];

    return events.current.filter(event =>
      event.label.toLowerCase().includes(eventSearchInput.toLowerCase())
    );
  }, [eventSearchInput]);

  // Mémorise la fonction de fermeture du menu contextuel
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Gère le clic droit pour afficher le menu contextuel
  const handleContextMenu = useCallback(
  (
    e: React.MouseEvent,
    origin: 'cell' | 'appointment',
    appointment?: Appointment | null,
    cell?: { employeeId: number; date: Date }
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (origin === 'appointment' && appointment && cell) {      
      setSelectedAppointment(appointment);
      setSelectedCell(cell);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        item: [
            {
            label: "Modifier",
            logo:
              <svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
                <g id="Layer_2" data-name="Layer 2">
                  <path d="m3.05 21.77a1.22 1.22 0 0 1 -.88-.36 1.28 1.28 0 0 1 -.33-1.19l1.16-4.58a1.61 1.61 0 0 1 .46-.81l13.23-13.25a2.82 2.82 0 0 1 3.89 0l1.42 1.42a2.75 2.75 0 0 1 0 3.88l-13.25 13.25a1.77 1.77 0 0 1 -.81.46l-4.58 1.14a1.1 1.1 0 0 1 -.31.04zm15.58-19.5a1.22 1.22 0 0 0 -.88.37l-13.24 13.24a.37.37 0 0 0 -.07.12l-1 4.18 4.18-1.05a.24.24 0 0 0 .11-.06l13.2-13.25a1.24 1.24 0 0 0 0-1.76l-1.41-1.42a1.26 1.26 0 0 0 -.89-.37z"/><path d="m19.62 8.94a.74.74 0 0 1 -.53-.22l-4.24-4.24a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06.74.74 0 0 1 -.53.22z"/>
                </g>
              </svg>
              ,
            action: () => {
              handleOpenEditModal(appointment);
            }
          },
          { 
            label: "Supprimer", 
            logo: 
              <svg id="Layer_1" enableBackground="new 0 0 512 512" height="24" viewBox="0 0 512 512" width="24" xmlns="http://www.w3.org/2000/svg">
                <g>
                  <path d="m479.867 111.4c0-25.99-21.145-47.134-47.135-47.134h-81.398v-9.101c0-30.417-24.748-55.165-55.168-55.165h-80.332c-30.42 0-55.168 24.748-55.168 55.166v9.101h-81.4c-25.989 0-47.133 21.144-47.133 47.134 0 20.745 13.478 38.39 32.133 44.671v300.761c0 30.419 24.748 55.167 55.167 55.167h273.133c30.419 0 55.166-24.748 55.166-55.167v-300.761c18.657-6.281 32.135-23.926 32.135-44.672zm-289.201-56.234c0-13.876 11.291-25.166 25.168-25.166h80.332c13.878 0 25.168 11.29 25.168 25.166v9.101h-130.668zm201.9 426.834h-273.132c-13.877 0-25.167-11.29-25.167-25.167v-298.3h323.466v298.3c-.001 13.877-11.29 25.167-25.167 25.167zm40.166-353.467h-353.466c-9.447 0-17.133-7.686-17.133-17.133 0-9.448 7.686-17.134 17.133-17.134h353.466c9.448 0 17.135 7.686 17.135 17.134s-7.686 17.133-17.135 17.133z"/><path d="m167.633 192.8c-8.284 0-15 6.716-15 15v224.934c0 8.284 6.716 15 15 15s15-6.716 15-15v-224.934c0-8.284-6.716-15-15-15z"/><path d="m256 192.8c-8.284 0-15 6.716-15 15v224.934c0 8.284 6.716 15 15 15s15-6.716 15-15v-224.934c0-8.284-6.716-15-15-15z"/><path d="m344.367 192.8c-8.284 0-15 6.716-15 15v224.934c0 8.284 6.716 15 15 15s15-6.716 15-15v-224.934c0-8.284-6.716-15-15-15z"/>
                </g>
              </svg>,
            action: () => {
              handleDeleteAppointmentConfirm(); // Appel de la fonction de suppression avec l'ID du rendez-vous sélectionné
            }
          },
          {
            label: 'Copier',
            logo:
              <svg id="Layer_1" height="24" viewBox="0 0 512 512" width="24" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1">
                <path d="m397.943 83.923h-11.735v-18.6a65.393 65.393 0 0 0 -65.319-65.323h-206.833a65.393 65.393 0 0 0 -65.319 65.319v297.439a65.393 65.393 0 0 0 65.319 65.319h11.736v18.6a65.393 65.393 0 0 0 65.319 65.323h206.832a65.393 65.393 0 0 0 65.32-65.319v-297.439a65.393 65.393 0 0 0 -65.32-65.319zm-283.887 308.154a29.353 29.353 0 0 1 -29.319-29.319v-297.439a29.352 29.352 0 0 1 29.319-29.319h206.833a29.352 29.352 0 0 1 29.319 29.319v18.6h-159.1a65.393 65.393 0 0 0 -65.319 65.319v242.839zm313.207 54.6a29.352 29.352 0 0 1 -29.32 29.323h-206.832a29.352 29.352 0 0 1 -29.319-29.319v-297.439a29.352 29.352 0 0 1 29.319-29.319h206.832a29.353 29.353 0 0 1 29.32 29.319z"/>
              </svg>,
            action: () => {
              copyAppointmentToClipboard(appointment);
            }
          },
          {
            label: 'Répéter',
            logo:
             <svg id="SVGRoot" height="24" viewBox="0 0 48 48" width="24" xmlns="http://www.w3.org/2000/svg">
              <path id="path4" d="m17 13c-6.0767 0-11 4.9233-11 11 0 2.3837.7554356 4.597737 2.0410156 6.398438a1.0001 1.0001 0 1 0 1.6269532-1.16211c-1.0515-1.4729-1.6679688-3.273728-1.6679688-5.236328 0-5.0033 3.9967-9 9-9h10v-2z" font-variant-ligatures="normal" font-variant-position="normal" font-variant-caps="normal" font-variant-numeric="normal" font-variant-alternates="normal" font-feature-settings="normal" text-indent="0" text-decoration-line="none" text-decoration-style="solid" text-decoration-color="#000000" text-transform="none" text-orientation="mixed" white-space="normal" shape-padding="0" mix-blend-mode="normal" solid-color="#000000" paintOrder="fill markers stroke"/>
              <path id="path6" d="m39.101562 17.171875a1.0001 1.0001 0 0 0 -.769531 1.591797c1.0515 1.4729 1.667969 3.273728 1.667969 5.236328 0 5.0033-3.9967 9-9 9h-10v2h10c6.0767 0 11-4.9233 11-11 0-2.3837-.755436-4.597737-2.041016-6.398438a1.0001 1.0001 0 0 0 -.857422-.429687z" font-variant-ligatures="normal" font-variant-position="normal" font-variant-caps="normal" font-variant-numeric="normal" font-variant-alternates="normal" font-feature-settings="normal" text-indent="0" text-decoration-line="none" text-decoration-style="solid" text-decoration-color="#000000" text-transform="none" text-orientation="mixed" white-space="normal" shape-padding="0" mix-blend-mode="normal" solid-color="#000000" paintOrder="fill markers stroke"/>
              <path id="path8-1" d="m27.0194 9.0005a.99994 1 0 0 0 -1.0194.9999v7.9992a.99994 1 0 0 0 1.4959.86906l6.9989-3.9996a.99994 1 0 0 0 0-1.7381l-6.9989-3.9996a.99994 1 0 0 0 -.47649-.13085zm.98031 2.7243 3.9818 2.2752-3.9818 2.2752z" font-variant-ligatures="normal" font-variant-position="normal" font-variant-caps="normal" font-variant-numeric="normal" font-variant-alternates="normal" font-feature-settings="normal" text-indent="0" text-decoration-line="none" text-decoration-style="solid" text-decoration-color="#000000" text-transform="none" text-orientation="mixed" white-space="normal" shape-padding="0" mix-blend-mode="normal" solid-color="#000000"/>
              <path id="path845" d="m20.980645 29.0005a.99994 1 0 0 1 1.0194.9999v7.9992a.99994 1 0 0 1 -1.4959.86906l-6.9989-3.9996a.99994 1 0 0 1 0-1.7381l6.9989-3.9996a.99994 1 0 0 1 .47649-.13085zm-.98031 2.7243-3.9818 2.2752 3.9818 2.2752z" font-variant-ligatures="normal" font-variant-position="normal" font-variant-caps="normal" font-variant-numeric="normal" font-variant-alternates="normal" font-feature-settings="normal" text-indent="0" text-decoration-line="none" text-decoration-style="solid" text-decoration-color="#000000" text-transform="none" text-orientation="mixed" white-space="normal" shape-padding="0" mix-blend-mode="normal" solid-color="#000000"/>
             </svg>,
            action: () => {
              setRepeatAppointmentData({
                numberCount: 1,
                repeatCount: 1,
                repeatInterval: 'day',
                endDate: null,
              })
            }
          },
          {
            label: 'Prolonger',
            logo: 
            <svg id="Layer_1" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width='20' height='20'>
              <g id="Layer_2_00000183934888366482681160000007864504227170276480_">
                <g id="Layer_1_copy_10">
                  <g id="_21">
                    <path d="m384.8 148.1c6.3 0 12.4 2.5 16.9 7l84.1 84.1c9.3 9.3 9.3 24.4 0 33.8l-83.8 83.9c-9.3 9.3-24.4 9.3-33.8 0s-9.3-24.4 0-33.8l9.3-9.3c7.5-7.5 7.5-19.6 0-27.1-3.6-3.6-8.5-5.6-13.5-5.6h-321c-13.2 0-23.9-10.7-23.9-23.9s10.7-23.9 23.9-23.9h323.2c10.6 0 19.2-8.6 19.2-19.1 0-5.1-2-10-5.6-13.6l-11.8-11.7c-9.3-9.3-9.3-24.4 0-33.7 4.5-4.6 10.5-7.1 16.8-7.1m.1-19.1c-23.7 0-43 19.2-43 43 0 11.4 4.5 22.4 12.6 30.5l11.7 11.8h-323.2c-23.8 0-43 19.3-43 43s19.3 43 43 43h321l-9.3 9.3c-8.1 8-12.6 19-12.6 30.4 0 23.7 19.2 43 42.9 43.1 11.5 0 22.4-4.5 30.5-12.6l83.9-83.9c16.8-16.8 16.8-44 0-60.8l-84.1-84.1c-8.1-8.2-19-12.8-30.4-12.7z"/>
                  </g>
                </g>
              </g>
            </svg>,  
            action: () => {
              setExtendAppointmentData(new Date());
            } 
          },
          {
            label: 'Diviser',
            logo: 
              <svg fill="none" height="20" viewBox="0 0 191 177" width="21" xmlns="http://www.w3.org/2000/svg">
                <g fill="#000">
                  <path d="m95.5.34375c-1.7985 0-3.5233.71445-4.7951 1.98618-1.2717 1.27173-1.9861 2.99657-1.9861 4.79507v10.1719c0 1.7985.7144 3.5233 1.9861 4.795 1.2718 1.2718 2.9966 1.9862 4.7951 1.9862s3.5233-.7144 4.795-1.9862c1.272-1.2717 1.986-2.9965 1.986-4.795v-10.1719c0-1.7985-.714-3.52334-1.986-4.79507-1.2717-1.27173-2.9965-1.98618-4.795-1.98618z"/><path d="m95.5 42.1841c-1.7985 0-3.5233.7144-4.7951 1.9862-1.2717 1.2717-1.9861 2.9965-1.9861 4.795v23.7344c0 1.7985.7144 3.5233 1.9861 4.7951 1.2718 1.2717 2.9966 1.9862 4.7951 1.9862s3.5233-.7145 4.795-1.9862c1.272-1.2718 1.986-2.9966 1.986-4.7951v-23.7344c0-1.7985-.714-3.5233-1.986-4.795-1.2717-1.2718-2.9965-1.9862-4.795-1.9862z"/><path d="m95.5 97.519c-1.7985 0-3.5233.7145-4.7951 1.9862-1.2717 1.2718-1.9861 2.9968-1.9861 4.7948v23.735c0 1.798.7144 3.523 1.9861 4.795 1.2718 1.271 2.9966 1.986 4.7951 1.986s3.5233-.715 4.795-1.986c1.272-1.272 1.986-2.997 1.986-4.795v-23.735c0-1.798-.714-3.523-1.986-4.7948-1.2717-1.2717-2.9965-1.9862-4.795-1.9862z"/><path d="m95.5 152.922c-1.7985 0-3.5233.714-4.7951 1.986-1.2717 1.272-1.9861 2.997-1.9861 4.795v10.172c0 1.799.7144 3.523 1.9861 4.795 1.2718 1.272 2.9966 1.986 4.7951 1.986s3.5233-.714 4.795-1.986c1.272-1.272 1.986-2.996 1.986-4.795v-10.172c0-1.798-.714-3.523-1.986-4.795-1.2717-1.272-2.9965-1.986-4.795-1.986z"/><path d="m67.5617 24.8241c-2.2114-1.791-4.8033-3.0521-7.5773-3.6868-2.7739-.6347-5.6563-.6262-8.4265.0249l-35.9406 8.4088c-4.3482 1.0731-8.20408 3.5885-10.93829 7.1356-2.73422 3.5471-4.185215 7.9163-4.116104 12.3944v87.207c-.002169 3.045.679114 6.051 1.993604 8.797 1.3145 2.747 3.22868 5.163 5.6014 7.071 3.32719 2.671 7.46469 4.13 11.73159 4.137 1.4377.01 2.8717-.15 4.2722-.475l35.9406-8.409c4.3481-1.073 8.204-3.588 10.9383-7.136 2.7342-3.547 4.1852-7.916 4.1161-12.394v-46.1802c0-1.7985-.7145-3.5234-1.9862-4.7951-1.2718-1.2717-2.9966-1.9862-4.7951-1.9862s-3.5233.7145-4.7951 1.9862c-1.2717 1.2717-1.9861 2.9966-1.9861 4.7951v46.1802c.0519 1.417-.3749 2.809-1.2115 3.953-.8366 1.145-2.0343 1.974-3.3998 2.354l-36.0762 8.544c-.7796.168-1.5871.158-2.3621-.03-.7751-.188-1.4976-.548-2.1136-1.055-.7586-.665-1.3593-1.491-1.7581-2.418-.3989-.927-.5859-1.931-.5475-2.939v-87.207c-.0519-1.4165.3749-2.8092 1.2115-3.9533.8366-1.1442 2.0342-1.9732 3.3998-2.3533l36.0762-8.5444c.7796-.1682 1.5871-.158 2.3621.0299s1.4976.5486 2.1135 1.0551c.8057.7009 1.4345 1.5821 1.8351 2.572.4007.9898.5619 2.0603.4706 3.1243v13.5625c0 1.7985.7144 3.5233 1.9861 4.795 1.2718 1.2718 2.9966 1.9862 4.7951 1.9862s3.5233-.7144 4.7951-1.9862c1.2717-1.2717 1.9862-2.9965 1.9862-4.795v-13.5625c.0535-3.1018-.603-6.1747-1.9194-8.9837-1.3164-2.8091-3.2578-5.2799-5.6756-7.2235z"/><path d="m175.384 29.571-35.94-8.4088c-2.771-.6511-5.653-.6596-8.427-.0249s-5.366 1.8958-7.577 3.6868c-2.418 1.9436-4.359 4.4144-5.676 7.2235-1.316 2.809-1.973 5.8819-1.919 8.9837v86.8677c-.069 4.478 1.382 8.847 4.116 12.394 2.734 3.548 6.59 6.063 10.938 7.136l10.511 2.441c1.754.414 3.6.114 5.132-.833 1.533-.948 2.626-2.465 3.04-4.219.413-1.753.113-3.599-.834-5.132-.948-1.532-2.465-2.625-4.218-3.039l-10.511-2.441c-1.366-.38-2.564-1.209-3.4-2.354-.837-1.144-1.264-2.536-1.212-3.953v-86.8677c-.001-.9963.217-1.9806.639-2.8831.421-.9025 1.037-1.7009 1.803-2.3385.558-.5708 1.239-1.0076 1.991-1.2777.751-.2702 1.554-.3665 2.349-.282l35.94 8.4088c1.366.3801 2.563 1.209 3.4 2.3532s1.263 2.5369 1.211 3.9533v87.3427c.002.996-.216 1.98-.638 2.883-.422.902-1.037 1.701-1.803 2.338-.573.492-1.245.856-1.97 1.066-.725.211-1.487.263-2.234.155-1.754-.414-3.6-.114-5.132.834-1.533.947-2.626 2.465-3.04 4.218-.413 1.754-.113 3.6.834 5.132.948 1.533 2.465 2.626 4.218 3.039 1.401.326 2.835.485 4.273.475 4.266-.006 8.404-1.465 11.731-4.136 2.366-1.936 4.265-4.38 5.557-7.151 1.291-2.77 1.941-5.797 1.903-8.853v-87.207c.069-4.4781-1.382-8.8473-4.117-12.3944-2.734-3.5471-6.59-6.0625-10.938-7.1356z"/>
                </g>
              </svg>,
            action: () => {
              handleDivideAppointmentConfirm(); // Appel de la fonction de division avec l'ID du rendez-vous sélectionné
            },
            actif: isFullDay
              ? appointment.endDate.getTime() - appointment.startDate.getTime() <= (DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour) * 60 * 60 * 1000  
              : appointment.endDate.getTime() - appointment.startDate.getTime() <= (HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour) * 60 * 60 * 1000
          },
          {
             label: 'Coller',
            logo:
              <svg xmlns="http://www.w3.org/2000/svg" id="Layer_2" data-name="Layer 2" viewBox="0 0 100 100" width="20" height="20">
                <path d="M82.5,12.5h-10A8.58,8.58,0,0,0,63.72,5H48.78A8.58,8.58,0,0,0,40,12.5H30A2.5,2.5,0,0,0,27.5,15V27.5h-10A2.5,2.5,0,0,0,15,30V92.5A2.5,2.5,0,0,0,17.5,95h50A2.5,2.5,0,0,0,70,92.5V80H82.5A2.5,2.5,0,0,0,85,77.5V15A2.5,2.5,0,0,0,82.5,12.5ZM45,13.21A3.54,3.54,0,0,1,48.78,10H63.72a3.54,3.54,0,0,1,3.78,3.21V17.5H45ZM65,90H20V32.5H46v16a2.5,2.5,0,0,0,2.5,2.5H65V90ZM61.35,46H51V35.92ZM80,75H70V48.53a2.56,2.56,0,0,0-.76-1.79l-19-18.53a2.57,2.57,0,0,0-1.74-.71h-16v-10H40V20a2.5,2.5,0,0,0,2.5,2.5H70A2.5,2.5,0,0,0,72.5,20V17.5H80Z"/>
              </svg>
,
            action: () => {   
              pasteAppointment(cell);
            }
          },
          {
            label: 'Ajouter',
            logo:
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus-circle-fill" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z"/>
              </svg>,
            action: () => {
              setIsSearchOverlayOpen(true)
            }
          }
        ]
      });
    }

    if (origin === 'cell' && cell) {
      setSelectedCell(cell);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        item: [
          {
            label: 'Coller',
            logo:
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-copy" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
              </svg>,
            action: () => {   
              pasteAppointment(cell);
            }
          },
          {
            label: 'Ajouter',
            logo:
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus-circle-fill" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z"/>
              </svg>,
            action: () => {
              setIsSearchOverlayOpen(true);
            }
          }
        ]
      });
    }
  }, [handleDeleteAppointment, copyAppointmentToClipboard, pasteAppointment, handleOpenEditModal]);

  useEffect(() => {
    
    const day = new Date();
    const isSame = isSameDay(selectedDate, day) && isSameMonth(selectedDate, day) && isSameYear(selectedDate, day);
    if(viewType === 'calendar' && isSame) {
      // Délai pour s'assurer que le DOM est complètement rendu après NoSSR
      const timer = setTimeout(() => {
        goToDate(new Date());
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [viewType]); // Centrage initial

  // Marquer la fin de l'initialisation après le premier rendu
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitializing.current = false;
    }, 10); // Court délai pour s'assurer que l'initialisation est terminée
    
    return () => clearTimeout(timer);
  }, []);

  

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "c" && selectedAppointment) {
        copyAppointmentToClipboard(selectedAppointment);
      }
      else if (e.ctrlKey && e.key === "v" && selectedCell) {
        pasteAppointment(selectedCell);
      }
      else if (e.ctrlKey && e.key === "z") {
        e.preventDefault();

        undoLastAction();
      }
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setContextMenu(null); // Ferme le menu contextuel s'il est ouvert
        setIsSearchOverlayOpen(false);
        setIsModalOpen(false); // Ferme la modal s'il est ouvert
        const searchInputElement = document.querySelector<HTMLInputElement>("#search");
        if (searchInputElement) {
          searchInputElement.focus();
        }
      }
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        setIsViewDropdownOpen(true);
      }
      if (e.key === 'suppr' || e.key === 'Delete') {
        if (selectedAppointment) {
          handleDeleteAppointmentConfirm();
        }
        else{
          notificationService.error('Erreur', 'Aucun rendez-vous sélectionné pour la suppression.');
        }
      }

      if (!mainScrollRef.current) return;
      
      // Gestion des flèches avec scroll continu - seulement si l'infinite scroll est activé
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        
        // Scroll basique même si l'infinite scroll n'est pas encore activé
        mainScrollRef.current.scrollLeft += 100;
        
        // Scroll continu seulement si l'infinite scroll est activé
        if (isInfiniteScrollEnabled.current && !isArrowKeyPressed.current) {
          isArrowKeyPressed.current = true;
          arrowKeyDirection.current = 'right';
          
          throttledScrollHandler.current?.(); // Vérifier immédiatement si on doit ajouter des jours
          
          // Démarrer le scroll continu
          continuousScrollInterval.current = setInterval(() => {
            if (mainScrollRef.current && isArrowKeyPressed.current && arrowKeyDirection.current === 'right') {
              mainScrollRef.current.scrollLeft += 100;
              throttledScrollHandler.current?.(); // Vérifier à chaque scroll si on doit ajouter des jours
            }
          }, 150); // Scroll toutes les 150ms
        }
      }
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        
        // Scroll basique même si l'infinite scroll n'est pas encore activé
        mainScrollRef.current.scrollLeft -= 100;
        
        // Scroll continu seulement si l'infinite scroll est activé
        if (isInfiniteScrollEnabled.current && !isArrowKeyPressed.current) {
          isArrowKeyPressed.current = true;
          arrowKeyDirection.current = 'left';
          
          throttledScrollHandler.current?.(); // Vérifier immédiatement si on doit ajouter des jours
          
          // Démarrer le scroll continu
          continuousScrollInterval.current = setInterval(() => {
            if (mainScrollRef.current && isArrowKeyPressed.current && arrowKeyDirection.current === 'left') {
              mainScrollRef.current.scrollLeft -= 100;
              throttledScrollHandler.current?.(); // Vérifier à chaque scroll si on doit ajouter des jours
            }
          }, 150); // Scroll toutes les 150ms
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Arrêter le scroll continu quand on relâche les flèches
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        isArrowKeyPressed.current = false;
        arrowKeyDirection.current = null;
        
        if (continuousScrollInterval.current) {
          clearInterval(continuousScrollInterval.current);
          continuousScrollInterval.current = null;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      
      // Nettoyer l'intervalle au démontage
      if (continuousScrollInterval.current) {
        clearInterval(continuousScrollInterval.current);
      }
    };
  }, [selectedAppointment, selectedCell, copyAppointmentToClipboard, pasteAppointment, undoLastAction]);

  // Recherche optimisée avec debounce et dependencies précises
  useEffect(() => {
    // Debounce pour éviter les recherches trop fréquentes
    const searchTimer = setTimeout(() => {
      handleResearch();
    }, 20); // 200ms de délai pour les saisies utilisateur
    
    return () => clearTimeout(searchTimer);
  }, [searchInput, viewType]); // Ajout de viewType comme dépendance

  // Ajuste scrollLeft après ajout à gauche pour éviter le "saut"
  useEffect(() => {
    if (isLoadingMoreDays.current && mainScrollRef.current) {
      const widthAdded = DAYS_TO_ADD * CELL_WIDTH;
      // Si tu ajoutes à gauche
      if (isAddingLeft.current) {
        mainScrollRef.current.scrollLeft += widthAdded;
        isAddingLeft.current = false;
      }
      // Si tu ajoutes à droite
      if (isAddingRight.current) {
        // Optionnel : scroll à la fin
        mainScrollRef.current.scrollLeft -= widthAdded;
        isAddingRight.current = false;
      }
      isLoadingMoreDays.current = false;
    }
  }, [dayInTimeline]);

  // Optimisation des filtres avec debounce et conditions précises
  useEffect(() => {
    // Appliquer uniquement si nécessaire
    if (viewType === 'chantier-table') {
      // Debounce pour éviter les re-calculs trop fréquents
      const filterTimer = setTimeout(() => {
        applyFiltersToChantiers();
      }, 10); // Plus court car les filtres sont moins fréquents que la recherche
      
      return () => clearTimeout(filterTimer);
    } else if (viewType === 'paie-table') {
      // Pas de debounce nécessaire car c'est juste une assignation
      setFilteredEvent(events.current);
    }
  }, [activeFilters, viewType]); // Retirer applyFiltersToChantiers des dépendances pour éviter les re-renders

  // Initialiser la configuration du calendrier quand les configurations disponibles changent
  useEffect(() => {
    if (availableConfigs.length > 0 && !currentCalendarConfig) {
      setCurrentCalendarConfig(availableConfigs[0]);
    }
  }, [availableConfigs, currentCalendarConfig]);

  useEffect(() => {
    if (modalInfo) {
      const timeout = setTimeout(() => setModalInfo(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, [modalInfo]);

  useEffect(() => {
    if(viewType !== 'calendar') return;
    // Optimisation : pré-calculer les constantes une seule fois
    const date = selectedDate;
    const halfWindow = Math.floor(WINDOW_SIZE / 2);
    const startDate = addDays(date, -halfWindow);
    const endDate = addDays(date, halfWindow);
    
    // Optimisation : construction directe selon includeWeekend
    let newTimeline: Date[];
    
    if (includeWeekend) {
      newTimeline = eachDayOfInterval({ start: startDate, end: endDate });
    } else {
      // Construction optimisée sans filter() pour de meilleures performances
      newTimeline = [];
      let currentDate = startDate;
      while (currentDate <= endDate) {
        if (!isWeekend(currentDate)) {
          newTimeline.push(currentDate);
        }
        currentDate = addDays(currentDate, 1);
      }
    }
    
    setDayInTimeline(newTimeline);

    // Optimisation : batch le processing des appointments
    const appointmentsToMove = [...appointments.current];
    const shouldSaveHistory = hasInitializedWeekend.current;
    
    // Micro-tâche pour permettre au state de se mettre à jour d'abord
    queueMicrotask(() => {
      // Traitement optimisé des appointments
      for (const app of appointmentsToMove) {
        moveAppointment(
          app.id,
          app.startDate,
          app.endDate,
          app.employeeId as number,
          'right',
          shouldSaveHistory
        );
      }
      
      // Marquer l'initialisation une seule fois
      if (!hasInitializedWeekend.current) {
        hasInitializedWeekend.current = true;
      }
    });

    goToDate(selectedDate);

  }, [includeWeekend, viewType]);
    
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fermer le menu déroulant quand on clique à l'extérieur
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

  // Test du système de notifications au chargement (à supprimer en production)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        notificationService.info('Bienvenue', 'Application chargée avec succès !');
      }, 2000);
      
      setTimeout(() => {
        notificationService.success('Données synchronisées', 'Tous vos rendez-vous sont à jour.');
      }, 4000);
    }
  }, []);

  // Rendu principal de la page
  return (
    <NoSSR>
      <DndProvider backend={HTML5Backend}>
        <div className="h-screen flex flex-col overflow-hidden bg-bg-primary poppins">
          {/* Barre du haut modernisée */}
         {!isMobile && (
          <div className="flex flex-col items-center pr-9">
            <div className="flex flex-row w-full">
              <div className={` p-2 w-80 ${!isExpanded ? 'h-[80px]' : 'h-full'}`}>
                <img src={theme === 'dark' ? LogoUrlB.src : LogoUrlN.src} alt="Logo" className="h-20 w-auto mb-2" />
              </div>
              <div className={`flex-1 flex flex-col items-center justify-center py-4 h-[82px]`}>
                <div className="flex items-center justify-between w-full h-[50px]">
                  <div className="flex flex-col gap-1">
                    <div className="relative w-72 max-w-full">
                      <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 bg-icon" aria-hidden="true" fill="none" viewBox="0 0 20 20">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                        </svg>
                      </div>
                      <input
                        type="search"
                        id="search"
                        className="block w-full p-3 pl-8 text-base placeholder:bg-icon bg-icon  rounded-xl transition focus:outline-0 poppins text-[14px]"
                        placeholder="Rechercher"
                        value={searchInput || ""}
                        onChange={(e) => setSearchInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Flèche d'expansion */}
                    <button
                      type="button"
                      onClick={() => toggleSetIsExpanded(!isExpanded)}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer"
                      title={isExpanded ? "Réduire" : "Options avancées"}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="25" 
                        height="25" 
                        fill="currentColor" 
                        className={`transition-transform duration-300 bi bi-chevron-up bg-icon ${!isExpanded ? 'rotate-180' : ''}`} 
                        viewBox="0 0 16 16"
                      >
                        <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
                      </svg>
                    </button>
                    {viewType !== 'calendar' && (
                      <button
                        className="p-3 rounded-full hover:bg-primary-lighter transition cursor-pointer"
                        onClick={() => {toggleSetViewType('calendar')}}
                        title="Planning"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="20 20 60 60" width="25" height="25">
                          <defs>
                            <linearGradient width="100%" height="100%" id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#00c6ff"/>
                              <stop offset="100%" stopColor="#0072ff"/>
                            </linearGradient>
                            <linearGradient width="100%" height="100%" id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#8e2de2"/>
                              <stop offset="100%" stopColor="#4a00e0"/>
                            </linearGradient>
                          </defs>
                          <path width="100%"  height="100%" d="M20 40 Q50 10 80 40 L60 50 Q40 60 20 40 Z" fill="url(#gradBlue)"/>
                          <path width="100%"  height="100%" d="M20 60 Q50 90 80 60 L60 50 Q40 40 20 60 Z" fill="url(#gradPurple)"/>
                        </svg>
                      </button>
                    )}
                    <button
                      className="p-3 rounded-full hover:bg-primary-lighter transition cursor-pointer"
                      onClick={() => setIsSettingsOpen(true)}
                      title="Paramètres"
                    >
                      <svg 
                        id="Glyph" 
                        enableBackground="new 0 0 32 32" 
                        height="25" 
                        viewBox="0 0 32 32" 
                        width="25" 
                        xmlns="http://www.w3.org/2000/svg" 
                        version="1.1" 
                        fill='currentColor'
                        xmlnsXlink="http://www.w3.org/1999/xlink" 
                        className='bg-icon'
                      >
                        <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                          <path id="XMLID_273_" d="m27.526 18.036-.526-.304c-.626-.361-1-1.009-1-1.732s.374-1.371 1-1.732l.526-.304c1.436-.83 1.927-2.662 1.098-4.098l-1-1.732c-.827-1.433-2.666-1.925-4.098-1.098l-.526.303c-.626.362-1.375.362-2 0-.626-.362-1-1.009-1-1.732v-.607c0-1.654-1.346-3-3-3h-2c-1.654 0-3 1.346-3 3v.608c0 .723-.374 1.37-1 1.732-.626.361-1.374.362-2 0l-.526-.304c-1.432-.827-3.271-.335-4.099 1.098l-1 1.732c-.829 1.436-.338 3.269 1.098 4.098l.527.304c.626.361 1 1.009 1 1.732s-.374 1.371-1 1.732l-.526.304c-1.436.829-1.927 2.662-1.098 4.098l1 1.732c.828 1.433 2.667 1.925 4.098 1.098l.526-.303c.626-.363 1.374-.361 2 0 .626.362 1 1.009 1 1.732v.607c0 1.654 1.346 3 3 3h2c1.654 0 3-1.346 3-3v-.608c0-.723.374-1.37 1-1.732.625-.361 1.374-.362 2 0l.526.304c1.432.826 3.271.334 4.098-1.098l1-1.732c.829-1.436.338-3.269-1.098-4.098zm-11.526 2.964c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z" /></g></svg>
                    </button>
                    <div className="relative" ref={viewDropdownRef}>
                      <button
                        className="p-3 rounded-full hover:bg-primary-lighter transition cursor-pointer"
                        onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                        title="multi"
                      >
                        <svg 
                          id="Layer_1" 
                            enableBackground="new 0 0 512 512" 
                            height="25" 
                            viewBox="0 0 512 512" 
                            width="25" 
                            xmlns="http://www.w3.org/2000/svg" 
                            version="1.1" 
                            fill='currentColor'
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            className='bg-icon'
                          >
                            <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                              <path clipRule="evenodd" d="m40.583 21h71.806c10.771 0 19.583 8.812 19.583 19.583v71.806c0 10.771-8.812 19.583-19.583 19.583h-71.806c-10.771 0-19.583-8.812-19.583-19.583v-71.806c0-10.771 8.812-19.583 19.583-19.583zm159.931 19.583v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm-359.028 179.514v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm-359.028 179.514v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583z"/>
                            </g>
                          </svg>
                      </button>

                      {/* Menu déroulant modernisé */}
                      {isViewDropdownOpen && (
                        <div className="absolute top-full -left-30 mt-2 w-56 bg-bg-secondary rounded-2xl shadow-2xl  border-gray-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                          {/* En-tête du menu */}
                          <div className="px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white">
                            <h3 className="text-sm font-semibold">Changer de vue</h3>
                            <p className="text-xs text-white/80 mt-1">Sélectionnez votre mode d'affichage</p>
                          </div>
                          
                          <div className="py-2">
                            <button
                              className={`w-full px-4 py-3 text-left flex items-center gap-4 transition-all duration-200 group ${
                                viewType === 'calendar' 
                                  ? 'bg-primary-lighter text-primary shadow-sm' 
                                  : 'text-primary hover:bg-primary-ultra-light hover:shadow-sm'
                              }`}
                              onClick={() => {
                                toggleSetViewType('calendar');
                                setIsViewDropdownOpen(false);
                              }}
                            >
                              <div className={`p-2 rounded-xl transition-all duration-200 ${
                                viewType === 'calendar' 
                                  ? 'bg-primary text-white' 
                                  : 'group-hover:bg-primary group-hover:text-white'
                              }`}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  fill="currentColor"
                                  viewBox="0 0 16 16"
                                >
                                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">Planning</div>
                                <div className="text-xs text-primary mt-0.5">Vue calendrier avec timeline</div>
                              </div>
                              {viewType === 'calendar' && (
                                <div className="p-1 rounded-full bg-primary">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                </div>
                              )}
                            </button>
                            
                            {/* Séparateur */}
                            <div className="mx-4 my-2 h-px bg-primary-lighter"></div>
                            
                            <button
                              className={`w-full px-4 py-3 text-left flex items-center gap-4 transition-all duration-200 group ${
                                viewType === 'chantier-table' 
                                 ? 'bg-primary-lighter text-primary shadow-sm' 
                                  : 'text-primary hover:bg-primary-ultra-light hover:shadow-sm'
                              }`}
                              onClick={() => {
                                toggleSetViewType('chantier-table');
                                setIsViewDropdownOpen(false);
                              }}
                            >
                              <div className={`p-2 rounded-xl transition-all duration-200 ${
                                viewType === 'chantier-table' 
                                  ? 'bg-primary text-white' 
                                  : 'group-hover:bg-primary group-hover:text-white'
                              }`}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  fill="currentColor"
                                  viewBox="0 0 16 16"
                                >
                                  <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zM1 2v2h4V2H1zm4 3H1v3h4V5zm0 4H1v3h4V9zm0 4H1v2a1 1 0 0 0 1 1h3v-3zm5-8H6v3h4V4zm0 4H6v3h4V8z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">Liste des chantiers</div>
                                <div className="text-xs text-primary mt-0.5">Vue tableau avec filtres</div>
                              </div>
                              {viewType === 'chantier-table' && (
                                <div className="p-1 rounded-full bg-primary">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                </div>
                              )}
                            </button>
                            
                            <button
                              className={`w-full px-4 py-3 text-left flex items-center gap-4 transition-all duration-200 group ${
                                viewType === 'paie-table' 
                                  ? 'bg-primary-lighter text-primary shadow-sm' 
                                  : 'text-primary hover:bg-primary-ultra-light hover:shadow-sm'
                              }`}
                              onClick={() => {
                                toggleSetViewType('paie-table');
                                setIsViewDropdownOpen(false);
                              }}
                            >
                              <div className={`p-2 rounded-xl transition-all duration-200 ${
                                viewType === 'paie-table' 
                                  ? 'bg-primary text-white' 
                                  : 'group-hover:bg-primary group-hover:text-white'
                              }`}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  fill="currentColor"
                                  viewBox="0 0 16 16"
                                >
                                  <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3zm13-1H2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM2 5v7h12V5H2z"/>
                                  <path d="M6 8a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 8zm0 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/>
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">Rubrique Sociale</div>
                                <div className="text-xs text-primary mt-0.5">Gestion des éléments de paie</div>
                              </div>
                              {viewType === 'paie-table' && (
                                <div className="p-1 rounded-full bg-primary">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                </div>
                              )}
                            </button>
                          </div>
                          
                          {/* Pied du menu */}
                          <div className="px-4 py-2 bg-transparent border-t border-light">
                            <p className="text-xs text-primary text-center">
                              Raccourci : <span className="font-mono bg-transparent px-1 rounded">Ctrl + Q</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Bouton Notifications */}
                    <button
                      className="p-3 rounded-full hover:bg-primary-lighter transition relative cursor-pointer"
                      onClick={() => setIsNotificationsPanelOpen(!isNotificationsPanelOpen)}
                      title="Notifications"
                    >
                      <div className="relative">
                        <svg 
                          id="Layer_1" 
                          enableBackground="new 0 0 100 100" 
                          viewBox="0 0 100 100" 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="25" 
                          height="25" 
                          version="1.1" 
                          xmlnsXlink="http://www.w3.org/1999/xlink"
                          fill='currentColor'
                          className='bg-icon'
                        >
                          <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                            <path d="m84.9384384 78.6478882h-69.8768778c-4.2446356 0-6.8042536-4.7139664-4.4792337-8.2760315l4.8991413-7.4587746c2.6900654-4.0955315 4.1233788-8.8885002 4.1233788-13.7884827v-6.9935493c0-14.3977032 10.0250931-26.4705181 23.462925-29.5846062v-3.1142158c-.0000001-3.8393617 3.1142158-6.9322281 6.932228-6.9322281 1.9197464 0 3.6474648.7678463 4.9058571 2.0263696 1.237175 1.2583933 2.026371 2.9861126 2.026371 4.9058585v3.1142168c5.631134 1.2797441 10.622261 4.1380129 14.5683823 8.0839968 5.5030289 5.5031605 8.8945465 13.0966091 8.8945465 21.5006084v6.9935493c0 4.8999825 1.4333115 9.6929512 4.1233749 13.7884827l4.8991394 7.4587746c2.3250198 3.5620651-.2345962 8.2760315-4.4792328 8.2760315z"/>
                            <path d="m50.0000114 97.5h-.0000229c-6.6999817 0-12.1313858-5.4314041-12.1313858-12.1313858v-.4888229h24.2627945v.4888229c0 6.6999817-5.4314041 12.1313858-12.1313858 12.1313858z"/>
                          </g>
                        </svg>
                        <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
                      </div>
                    </button>
                    <div
                      className="p-5 rounded-full  transition bg-red-600 relative"
                    >
                       {notifications.unreadCount > 0 && (
                        <span className="absolute bottom-0 -right-1 block h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`flex items-center justify-between w-full ${!isExpanded ? 'hidden' : 'h-[50px]'}`}>
                <div className={`${viewType === 'calendar' ? 'ml-80' : 'ml-7'}`}>
                  <p className="text-5xl poppins text-primary">
                    {viewType === 'calendar' ? 'Planning' : viewType === 'chantier-table' ? 'Liste des chantiers' : 'Rubrique Paie'}
                  </p>
                </div>
                <div className="flex flex-row items-center gap-4">
                  <div className="flex flex-row items-center gap-2">
                    {viewType === 'calendar' && (
                      <input
                        id="date-select"
                        type="date"
                        className="date-input border w-38 border-default rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-color transition bg-bg-secondary text-base text-primary"
                        value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value);
                          if (isNaN(selectedDate.getTime())) return;
                          setSelectedDate(selectedDate);
                          goToDate(selectedDate);
                        }}
                      />
                    )}
                  </div>
                  <div className="border border-default rounded-xl flex items-center multi-op">
                    {viewType === 'calendar' && (
                      <>
                        <button
                          className="transition btn-header cursor-pointer border-r border-default px-3 py-2"
                          onClick={() => toggleSetIncludeWeekend(!includeWeekend)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            className={"bg-icon bi bi-calendar-event transition duration-200 " + (!includeWeekend ? ' text-color-primary' : 'text-gray-500')}
                            viewBox="0 0 16 16"
                          >
                            <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z" fillOpacity="1" stroke="none" strokeOpacity="1"/>
                            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" fillOpacity="1" stroke="none" strokeOpacity="1"/>
                          </svg>
                        </button>
                        <button 
                          className="transition cursor-pointer btn-header border-r border-default px-3 py-2"
                          onClick={() => toggleSetIsFullDay(!isFullDay)}
                        >
                          {!isFullDay ? (
                            <svg 
                              id="Layer_1" 
                              enableBackground="new 0 0 32 32" 
                              viewBox="0 0 32 32" 
                              xmlns="http://www.w3.org/2000/svg"
                              width="20" 
                              height="20" 
                              version="1.1" 
                              fill='currentColor'
                              className='bg-icon'
                              xmlnsXlink="http://www.w3.org/1999/xlink" 
                            >
                              <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                                <path d="m27 3v26c0 .5527344-.4472656 1-1 1h-8c-.5527344 0-1-.4472656-1-1v-26c0-.5527344.4472656-1 1-1h8c.5527344 0 1 .4472656 1 1zm-13-1h-8c-.5527344 0-1 .4472656-1 1v26c0 .5527344.4472656 1 1 1h8c.5527344 0 1-.4472656 1-1v-26c0-.5527344-.4472656-1-1-1z"/>
                              </g>
                            </svg>
                          ) : (
                            <svg 
                              id="Layer_1" 
                              height="20" 
                              viewBox="0 0 512 512" 
                              width="20" 
                              xmlns="http://www.w3.org/2000/svg" 
                              data-name="Layer 1" 
                              version="1.1" 
                              xmlnsXlink="http://www.w3.org/1999/xlink"
                              fill='currentColor'
                              className='bg-icon'
                            >
                              <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                                <rect height="480" rx="10.695" width="108.343" x="201.828" y="16"/>
                              </g>
                            </svg>
                          )}
                        </button>
                      </>
                    )}
                    {viewType !== 'paie-table' && (
                      <button 
                        className="transition btn-header px-3 py-2 group hover:text-[#00947f] cursor-pointer text-gray-400"
                        name="filtrer"
                        onClick={() => viewType === 'calendar' ? calendarConfig.openConfigModal() : setIsFilterModalOpen(true)}
                        title="Filtrer"
                      >
                        <svg 
                          viewBox="0 0 16 16"
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          fill="currentColor"
                          className="bg-icon w-5 h-5 text-inherit text-gray-500 transition duration-200"
                        >
                          <g>
                            <path 
                              d="m6.5 16c-.072 0-.145-.016-.212-.047-.176-.082-.288-.259-.288-.453v-6.285c0-.346-.121-.683-.34-.951l-5.434-6.63c-.145-.178-.226-.404-.226-.634 0-.551.449-1 1-1h14c.551 0 1 .449 1 1 0 .23-.081.456-.227.634l-5.434 6.63c-.218.268-.339.605-.339.951v2.849c0 .744-.328 1.444-.9 1.92l-2.28 1.9c-.091.076-.205.116-.32.116zm8.5-15h.01z"
                            />
                          </g>
                        </svg>
                      </button>
                    )}
                  </div>
                  {viewType === 'calendar' && (
                    <button
                      className="transition px-3 py-2 rounded-2xl cursor-pointer text-white font-semibold shadow active:scale-95 pointer-events-auto bg-primary-light"
                      type="button"
                      onClick={() => setIsSearchOverlayOpen(true)}
                    >
                      + Ajouter un évènement
                    </button>
                  )}
                </div>
              </div>
          </div>
        )}
        {/* Grille principale du calendrier modernisée */}
        <div className="flex-1 flex min-h-0
        ">
          <div
            className={`flex flex-grow rounded-2xl border-gray-200 ${!isMobile ? 'mt-8' : ''}`}
            tabIndex={0}
            style={{ outline: "none", minWidth: 0, minHeight: 0 }}
          >
            <div
              className={`
                flex-grow rounded-lg ${isLoading ? "pointer-events-none opacity-60" : ""}
                w-full h-full pb-4
              `}
            >
              <SelectedAppointmentContext.Provider value={{ selectedAppointment, setSelectedAppointment}}>
                <SelectedCellContext.Provider value={{ selectedCell, setSelectedCell }}>
                  {viewType === 'calendar' ? (
                    currentCalendarConfig  ? (
                      <CalendarGrid
                        employees={filteredEmployeesForCalendar}
                        appointments={filteredAppointmentsForCalendar}
                        initialTeams={initialTeams}
                        dayInTimeline={dayInTimeline}
                        HALF_DAY_INTERVALS={isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS}
                        isFullDay={isFullDay}
                        events={events.current}
                        //selectedCalendarId={selectedCalendarId}
                        isMobile={isMobile}
                        includeWeekend={includeWeekend}
                        nonWorkingDates={nonWorkingDates}
                        mainScrollRef={mainScrollRef}
                        handleScroll={handleScroll}
                        onAppointmentMoved={moveAppointment}
                        onCellDoubleClick={() => setIsSearchOverlayOpen(true)}
                        onAppointmentDoubleClick={handleOpenEditModal}
                        onExternalDragDrop={createAppointmentFromDrag}
                        handleContextMenu={handleContextMenu}
                        calendarConfig={currentCalendarConfig}
                        onCalendarConfigChange={setCurrentCalendarConfig}
                        availableConfigs={availableConfigs}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-gray-500">Chargement des configurations...</div>
                      </div>
                    )
                  ) :  (
                    <DataTableFrame 
                      dataType={viewType === 'chantier-table' ? "chantier" : "paie"}
                      items={filteredEvent} 
                      appointments={appointments.current}
                      employees={employees.current}
                      containerWidth={typeof window !== 'undefined' ? window.innerWidth - 50 : 1200}
                      onEditAppointment={handleOpenEditModal}
                    />
                  )}
                </SelectedCellContext.Provider>
              </SelectedAppointmentContext.Provider>
            </div>
          </div>
        </div>
        {/* Menu contextuel modernisé */}
        <RightClickComponent
          open={!!contextMenu}
          coordinates={contextMenu}
          rightClickItem={contextMenu?.item || []}
          clipBoardAppointment={clipboardAppointment.current}
          onClose={closeContextMenu}
        />
        {/* Modal unique pour tous les usages (création, édition, répétition) modernisée */}
        <Modal
          isOpen={isModalOpen || !!repeatAppointmentData || !!extendAppointmentData}
          onClose={() => {
            setIsModalOpen(false);
            setRepeatAppointmentData(null);
            setExtendAppointmentData(null);
          }}
          title={
            !!repeatAppointmentData ? "Répéter ce rendez-vous"
            : extendAppointmentData ? "Prolonger le rendez-vous"
            : selectedAppointment 
              ? (selectedAppointment.id === 0 ? "Modification Évènement" : "Modifier le rendez-vous")
              : "Ajouter un rendez-vous"
          }
          whithoutCloseButton={true}
          roundedSize="2xl"
        >
          {!!repeatAppointmentData ? (
            <div 
              className="flex flex-col gap-6 poppins w-[340px]"
            >
              <div className="flex flex-col gap-4">
                <span className="text-base underline">{'Rythme de répétition'}</span>
                <div className="flex items-center gap-7">
                  <label className="flex items-center gap-2 font-medium">
                    <span className="">{'Tous les'}</span>
                    <input
                      required
                      type="number"
                      min={1}
                      className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition w-[70px]  text-center"
                      value={repeatAppointmentData.numberCount || 1}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (value > 0) {
                          setRepeatAppointmentData((prev) =>
                            prev
                              ? { ...prev, numberCount: value }
                              : { numberCount: value, repeatCount: 1, repeatInterval: "day", endDate: new Date() }
                          );
                        }
                      }}
                    />
                  </label>
                  <select
                    className="border border-default bg-bg-secondary rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition ml-2 custom-select"
                    value={repeatAppointmentData.repeatInterval || "day"}
                    onChange={(e) => {
                      const value = e.target.value as "day" | "week" | "month";
                      setRepeatAppointmentData((prev) =>
                        prev
                          ? { ...prev, repeatInterval: value }
                          : { numberCount: 1, repeatCount: 1, repeatInterval: value, endDate: new Date() }
                      );
                    }}
                    required
                  >
                    <option value="day">Jours</option>
                    <option value="week">Semaines</option>
                    <option value="month">Mois</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-base underline">{'Méthode'}</span>

                <div className="flex flex-row items-center gap-6">
                  
                  {/* Option 1: Répéter un nombre de fois */}
                  <div className="flex items-center gap-22">
                    <div className="">
                      <input
                        type="radio"
                        name="repeatMethod"
                        value="count"
                        checked={repeatAppointmentData.repeatCount !== null && repeatAppointmentData.endDate === null}
                        onChange={() => {
                          setRepeatAppointmentData((prev) =>
                            prev ? { ...prev, repeatCount: 1, endDate: null } : { numberCount: 1, repeatCount: 1, repeatInterval: "day", endDate: null }
                          );
                        }}
                      />
                      <span className="ml-1">Nombre</span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      disabled={repeatAppointmentData.endDate !== null}
                      className={`${repeatAppointmentData.endDate !== null ? 'opacity-50 cursor-not-allowed' : 'opacity-100'} border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition w-[70px] ml-2`}
                      value={repeatAppointmentData.repeatCount === null ||
                              repeatAppointmentData.repeatCount === undefined
                                ? ""
                                : repeatAppointmentData.repeatCount
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          setRepeatAppointmentData((prev) =>
                            prev ? { ...prev, repeatCount: null } : { numberCount: 1, repeatCount: null, repeatInterval: "day", endDate: null }
                          );
                          return;
                        }
                        const parsed = parseInt(value, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                          setRepeatAppointmentData((prev) =>
                            prev ? { ...prev, repeatCount: parsed, endDate: null } : { numberCount: 1, repeatCount: parsed, repeatInterval: "day", endDate: null }
                          );
                        }
                      }}
                    />
                  </div>
                </div>
                {/* Option 2: Répéter jusqu'à une date */}
                <div className="flex items-center gap-12">
                  <div>
                    <input
                      type="radio"
                      name="repeatMethod"
                      value="endDate"
                      checked={repeatAppointmentData.endDate !== null && repeatAppointmentData.repeatCount === null}
                      onChange={() => {                        
                        setRepeatAppointmentData((prev) =>
                          prev ? { ...prev, repeatCount: null, endDate: new Date() } : { numberCount: 1, repeatCount: null, repeatInterval: "day", endDate: new Date() }
                        );
                      }}
                    />
                    <span className="ml-1">{'Fin répétition'}</span>
                  </div>
                  <input
                    type="date"
                    className={`${repeatAppointmentData.repeatCount !== null ? 'opacity-50 cursor-not-allowed text-sm' : 'opacity-100 text-base focus:ring-2 focus:ring-color'} ml-2 border border-default rounded-xl px-3 py-2 focus:outline-none  transition w-[145px]`}
                    value={repeatAppointmentData.endDate ? format(repeatAppointmentData.endDate, "yyyy-MM-dd") : ""}
                    min={selectedAppointment?.endDate ? format(selectedAppointment.endDate, "yyyy-MM-dd") : undefined}
                    onChange={e => {
                      const value = e.target.value;
                      setRepeatAppointmentData(prev => {
                        const endDate = value ? new Date(value) : null;
                        return prev
                          ? { ...prev, endDate, repeatCount: null }
                          : { numberCount: 1, repeatCount: null, repeatInterval: "day", endDate };
                      });                    
                    }}
                  />
                </div>
              </div>
              {/* Boutons d'action */}
              <div className="flex justify-between mt-2">
                <button
                  type="button"
                  onClick={() => setRepeatAppointmentData(null)}
                  className="px-4 py-2 bg-primary text-white rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRepeat}
                  className="px-4 py-2 bg-primary text-white rounded-xl transition-colors cursor-pointer"
                >
                  {'Enregistrer'}
                </button>
              </div>
            </div>
          ) : extendAppointmentData ? (
            <div>
              <div className="flex flex-row items-center mb-4 poppins">
                <span className="text-base poppins mr-[65px]">Jusqu'au</span>
                <input
                  type="date"
                  className="text-base border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition w-[145px]"
                  value={format(extendAppointmentData, "yyyy-MM-dd")}
                  min={selectedAppointment?.endDate ? format(selectedAppointment.endDate, "yyyy-MM-dd") : undefined}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    if (isNaN(selectedDate.getTime())) return;
                    setExtendAppointmentData(selectedDate);
                  }}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setExtendAppointmentData(null)}
                  className="px-4 py-2 bg-primary text-white rounded-xl cursor-pointer transition-colors w-[110px] mr-[89px]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleExtend}
                  className="px-4 py-2 bg-primary text-white rounded-xl cursor-pointer transition-colors w-[110px]"
                >
                  {'Valider'}
                </button>
              </div>
            </div>
          )
           : (
            <AppointmentForm
              appointments={appointments.current}
              appointment={selectedAppointmentForm as Appointment}
              event={events.current.find(e => e.id === selectedAppointmentForm?.EventId) as Evenement}
              initialEmployeeId={newAppointmentInfo?.employeeId || null}
              isReducedVersion={selectedAppointment?.id === 0}
              employees={employees.current}
              HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
              isFullDay={isFullDay}
              nonWorkingDates={nonWorkingDates}
              onSave={handleSaveAppointment}
              onClose={() => setIsModalOpen(false)}
              onSaveEvent={handleSaveEvent}
            />
          )}
        </Modal>
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)}
          settings={settings} 
          isSettingsOpen={isSettingsOpen}
        />
        
        {/* Modal de gestion des configurations */}
        <ConfigurationModal
          isOpen={calendarConfig.isConfigModalOpen}
          onClose={calendarConfig.closeConfigModal}
          availableConfigs={availableConfigs}
          currentConfig={currentCalendarConfig}
          onConfigChange={setCurrentCalendarConfig}
          onSaveConfig={saveCustomConfig}
          onUpdateConfig={updateCustomConfig}
          onDeleteConfig={deleteCustomConfig}
          onDuplicateConfig={duplicateConfig}
          editingConfig={calendarConfig.editingConfig}
          setEditingConfig={calendarConfig.setEditingConfig}
          isCreatingConfig={calendarConfig.isCreatingConfig}
          setIsCreatingConfig={calendarConfig.setIsCreatingConfig}
        />
        
        {/* Modal de filtres des chantiers */}
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
          filterOptions={getFilterOptions()}
          onClearAll={clearAllFilters}
        />
        
        {/* Panneau de notifications */}
        <NotificationsPanel 
          isOpen={isNotificationsPanelOpen}
          onClose={() => setIsNotificationsPanelOpen(false)}
          notifications={notifications.notifications}
          onMarkAsRead={notifications.markAsRead}
          onRemove={notifications.removeNotification}
          onClearAll={notifications.clearAll}
        />
        
        
        {/* Barre de chargement modernisée */}
        {isLoading && (
          <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 z-50">
            <div className="h-full bg-blue-600 animate-pulse rounded-r-full" style={{ width: "30%" }} />
          </div>
        )}
        {/* Alert pour les messages d'erreur modernisée */}
        <AlertModal
          isOpen={isAlertVisible}
          title={alertTitle}
          confirmLabel="Confirmer"
          cancelLabel="Annuler"
          onConfirm={() => 
            alertTitle === "Êtes-vous sûr de vouloir supprimer ce rendez-vous ?" 
            ? handleDeleteAppointment(selectedAppointment?.id) 
            : handleDivideAppointment(selectedAppointment?.id)}
          onClose={() => setIsAlertVisible(false)}
        />
        {modalInfo && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 bg-${modalInfo.color}-100 px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-4 border border-${modalInfo.color}-300`}>
            <span className={`font-semibold text-lg text-${modalInfo.color}-800`}>{modalInfo.message}</span>
            <button
              className="ml-2 text-green-900 font-bold text-2xl hover:text-green-700 transition"
              onClick={() => setModalInfo(null)}
              title="Fermer"
            >
              ×
            </button>
          </div>
        )}
        <SearchOverlay
          isOpen={isSearchOverlayOpen}
          onClose={() => setIsSearchOverlayOpen(false)}
          eventSearchInput={eventSearchInput}
          setEventSearchInput={setEventSearchInput}
          filteredEvents={filteredEvents}
          selectedCell={selectedCell}
          addAppointmentFromSearch={handleSaveAppointment}
          isFullDay={isFullDay}
        />
        <ThemeSelector
          position='bottom-right'
        />
      </div>
    </DndProvider>
    </NoSSR>
  );
}





