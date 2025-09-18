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

// Imports React, hooks, DnD, date-fns, types, composants, et données
import React, { useState, useCallback, useRef, useEffect, JSX, useMemo} from "react";
import { DndProvider, useDragDropManager } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  addDays,
  eachDayOfInterval,
  setHours,
  setMinutes,
  format,
  addWeeks,
  addMonths,
} from "date-fns";
import { Appointment, Employee, HistoryAction, EventTemplate, EventType } from "../types";
import CalendarGrid from "../components/CalendarGrid";
import ChantierTableFrame from "../components/ChantierTableFrame";
import Modal from "../components/Modal";
import AppointmentForm from "../components/AppointmentForm";
import DraggableSource from "../components/DraggableSource";
import RightClickComponent from "../components/RightClickComponent";
import {
  initialTeams,
  initialEmployees,
  initialAppointments,
  chantier,
  absences,
  autres,
  colors,
  allEventTypes,
  chantiersEventTypes,
  absencesEventTypes,
  autresEventTypes,
  chantiersDetailles,
  ChantierDetailed
} from "../../datasource";
import { SelectedAppointmentContext } from "../context/SelectedAppointmentContext";
import { SelectedCellContext } from "../context/SelectedCellContext";
import { CELL_WIDTH, DAY_INTERVALS, DAYS_TO_ADD, HALF_DAY_INTERVALS, WINDOW_SIZE } from "../utils/constants";
import { getNextWorkedDay, getWorkedDayIntervals, isWorkedDay, isWeekend } from "../utils/dates";
import { CalendarConfig } from "../types";
import { applyFiltersToEmployees, applyFiltersToAppointments } from "../utils/filters";


import LogoUrl from "../image/LOGO_couleur_police_noire.svg";


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
  // --- ETATS PRINCIPAUX ---
  const [includeWeekend, setIncludeWeekend] = useState(true);
  const [nonWorkingDates, setNonWorkingDates] = useState<Date[]>([]);
  const [newNonWorkingDate, setNewNonWorkingDate] = useState<string>("");
  const [dayInTimeline, setDayInTimeline] = useState<Date[]>([]);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const chantiers = useRef<ChantierDetailed[]>(chantiersDetailles);
  const [filteredChantiers, setFilteredChantiers] = useState<ChantierDetailed[]>(chantiersDetailles);
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
  const [isFullDay, setIsFullDay] = useState(false); // Toujours false par défaut
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState<"Êtes-vous sûr de vouloir supprimer ce rendez-vous ?" | "Êtes-vous sûr de vouloir diviser ce rendez-vous ?">("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [modalInfo, setModalInfo] = useState<{ message: string, color: string } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [eventSearchInput, setEventSearchInput] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewType, setViewType] = useState<'calendar' | 'chantier-table'>('calendar'); // État pour basculer entre les vues
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false); // État pour contrôler le menu déroulant
  const viewDropdownRef = useRef<HTMLDivElement>(null); // Ref pour le menu déroulant
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

  const eventTypes = useRef<EventType[]>(allEventTypes);
  

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


  // --- GESTION DES CONFIGURATIONS DE CALENDRIER ET FILTRES ---
  // Fonction pour obtenir les configurations disponibles selon les pôles des employés
  const getAvailableConfigs = useCallback((): CalendarConfig[] => {
    const poles = Array.from(new Set(employees.current.map(emp => emp.pole)));
    const configs: CalendarConfig[] = [];

    // Configuration par défaut : Vue par employés (toujours disponible)
    configs.push({
      id: 1,
      name: 'Vue par employés',
      dimension: 'employee',
      filters: []
    });

    // Configuration par pôles (toujours disponible si plusieurs pôles)
    if (poles.length > 1) {
      configs.push({
        id: 2,
        name: 'Vue par pôles',
        dimension: 'pole',
        filters: []
      });
    }

    // Configurations spécifiques selon les pôles présents
    if (poles.includes('Technique')) {
      configs.push({
        id: 3,
        name: 'Vue Technique - Par équipes',
        dimension: 'group',
        filters: [
          {
            id: 'pole-technique',
            field: 'pole',
            type: 'equals',
            value: 'Technique',
            label: 'Pôle Technique'
          }
        ]
      });
    }

    if (poles.includes('Commercial')) {
      configs.push({
        id: 4,
        name: 'Vue Commercial - Par contrats',
        dimension: 'contract',
        filters: [
          {
            id: 'pole-commercial',
            field: 'pole',
            type: 'equals',
            value: 'Commercial',
            label: 'Pôle Commercial'
          }
        ]
      });
    }

    if (poles.includes('Administrative')) {
      configs.push({
        id: 5,
        name: 'Vue Administrative - Par types',
        dimension: 'type',
        filters: [
          {
            id: 'pole-administrative',
            field: 'pole',
            type: 'equals',
            value: 'Administrative',
            label: 'Pôle Administrative'
          }
        ]
      });
    }

    if (poles.includes('RH')) {
      configs.push({
        id: 6,
        name: 'Vue RH - Par contrats',
        dimension: 'contract',
        filters: [
          {
            id: 'pole-rh',
            field: 'pole',
            type: 'equals',
            value: 'RH',
            label: 'Pôle RH'
          }
        ]
      });
    }

    return configs;
  }, []);

  const availableConfigs = getAvailableConfigs();
  const [currentCalendarConfig, setCurrentCalendarConfig] = useState<CalendarConfig>(availableConfigs[1]);

  // Appliquer les filtres aux employés et rendez-vous selon la configuration
  const filteredEmployeesForCalendar = useMemo(() => {
    return applyFiltersToEmployees(employees.current, currentCalendarConfig.filters);
  }, [currentCalendarConfig.filters]);

  const filteredAppointmentsForCalendar = useMemo(() => {
    return applyFiltersToAppointments(filteredAppointments, currentCalendarConfig.filters, employees.current);
  }, [filteredAppointments, currentCalendarConfig.filters]);


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

  const handleResearch = useCallback(() => {
    const lowercasedQuery = searchInput.toLowerCase();
    switch(viewType){
      case 'calendar':
        if (!searchInput) {
          setFilteredAppointments(appointments.current);
          return;
        }

        setFilteredAppointments(
          appointments.current
            .map(app => {
              const eventType = eventTypes.current.find(et => et.id === app.eventTypeId);
              if (eventType && eventType.label.toLowerCase().includes(lowercasedQuery)) {
                return app;
              }
              return undefined;
            })
            .filter((app): app is Appointment => app !== undefined)
        );
      case 'chantier-table':
        if (!searchInput) {
          setFilteredChantiers(chantiers.current);
          return;
        }

        setFilteredChantiers(
          chantiers.current
            .map(chantier => {
              // Vérifie si le nom du chantier ou le client correspond à la recherche
              if (chantier.attributs.libelle.toLowerCase().includes(lowercasedQuery) || chantier.attributs.chefChantier.toLowerCase().includes(lowercasedQuery)) {
                return chantier;
              }
              return undefined;
            })
            .filter((chantier): chantier is ChantierDetailed => chantier !== undefined)
        );
      } 
    }, [searchInput]);

  // Création de rendez-vous répétés
  const createRepeatedAppointments = useCallback((repeatInterval: "day" | "week" | "month", repeatCount: number, endDate?: Date, numberCount?: number) => {
    const startDateOriginal = selectedAppointment?.startDate;
    const endDateOriginal = selectedAppointment?.endDate;
    if (!startDateOriginal || !endDateOriginal) {
      console.warn("Start date or end date is undefined.");
      return;
    }
    const diff = endDateOriginal.getTime() - startDateOriginal.getTime();

    const newAppointments: Appointment[] = [];
    let currentStartDate = repeatInterval === "day" ? addDays(startDateOriginal, numberCount || 0) 
    : repeatInterval === "week" ? addWeeks(startDateOriginal, numberCount || 0) 
    : addMonths(startDateOriginal, numberCount || 0);    

    currentStartDate = getNextWorkedDay(
      currentStartDate, 
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      nonWorkingDates
    );

    if (repeatCount) {
      for (let i = 0; i < repeatCount; i++) {
        const newStartDate = getNextWorkedDay(
          new Date(currentStartDate.getTime()),
          isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          nonWorkingDates
        );
        const newEndDate = new Date(newStartDate.getTime() + diff);

        const days = getWorkedDayIntervals(
          newStartDate,
          newEndDate,
          isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          false,
          nonWorkingDates
        );

        days.forEach(day => {
          newAppointments.push({
          id: ++idCounter.current, // ID déterministe sans Date.now()
          description: selectedAppointment?.description || "Description du rendez-vous répété",
          startDate: day.start ,
          endDate: day.end,
          employeeId: selectedAppointment?.employeeId || 1,
          eventTypeId: selectedAppointment?.eventTypeId || 1, // Premier type par défaut
        });
      });

      // Incrémente la date pour le prochain rendez-vous
      currentStartDate = repeatInterval === "day" ? addDays(newStartDate, numberCount || 1)
        : repeatInterval === "week" ? addWeeks(newStartDate, numberCount || 1) 
        : addMonths(newStartDate, numberCount || 1);
      }
    }
    else if(endDate){      
      while (currentStartDate <= endDate) {
        const newStartDate = getNextWorkedDay(
          new Date(currentStartDate.getTime()), 
          isFullDay
          ? DAY_INTERVALS
          : HALF_DAY_INTERVALS,
          nonWorkingDates
        );
        const newEndDate = new Date(newStartDate.getTime() + diff);

        const days = getWorkedDayIntervals(
          newStartDate, 
          newEndDate,
          isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          false,
          nonWorkingDates
        );

        days.forEach(day => {
          newAppointments.push({
          id: ++idCounter.current, // ID déterministe sans Date.now()
          description: selectedAppointment?.description || "Description du rendez-vous répété",
          startDate: day.start ,
          endDate: day.end,
          employeeId: selectedAppointment?.employeeId || 1,
          eventTypeId: selectedAppointment?.eventTypeId || 1, // Premier type par défaut
        });
      });

      // Incrémente la date pour le prochain rendez-vous
      currentStartDate = repeatInterval === "day" ? addDays(newStartDate, numberCount || 1)
        : repeatInterval === "week" ? addWeeks(newStartDate, numberCount || 1)
        : addMonths(newStartDate, numberCount || 1);
      }
    }
    // Ajoute les nouveaux rendez-vous à la liste
    appointments.current = [...appointments.current, ...newAppointments];
    handleResearch(); // Met à jour la liste filtrée
    setModalInfo({ message: `${newAppointments.length} rendez-vous créé${newAppointments.length > 1 ? 's' : ''}`, color: 'green' });
    setRepeatAppointmentData(null);
  }, [handleResearch, selectedAppointment, isFullDay, nonWorkingDates]);

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
      setModalInfo({ message: "Aucune action à annuler", color: "#e74c3c" });
      setTimeout(() => setModalInfo(null), 2000);
      return;
    }

    const lastAction = history.current.pop();
    if (!lastAction) return;

    switch (lastAction.type) {
      case 'create':
        // Annuler une création = supprimer le rendez-vous
        if (lastAction.appointment) {
          appointments.current = appointments.current.filter(app => app.id !== lastAction.appointment!.id);
          setModalInfo({ message: "Création annulée", color: "#27ae60" });
        }
        break;

      case 'delete':
        // Annuler une suppression = restaurer le rendez-vous
        if (lastAction.appointment) {
          appointments.current = [...appointments.current, { ...lastAction.appointment }];
          setModalInfo({ message: "Suppression annulée", color: "#27ae60" });
        }
        break;

      case 'update':
        // Annuler une modification = restaurer l'ancien état
        if (lastAction.previousAppointment) {
          appointments.current = appointments.current.map(app =>
            app.id === lastAction.previousAppointment!.id ? { ...lastAction.previousAppointment! } : app
          );
          setModalInfo({ message: "Modification annulée", color: "#27ae60" });
        }
        break;

      case 'move':
        // Annuler un déplacement = restaurer la position précédente
        if (lastAction.previousAppointment) {
          appointments.current = appointments.current.map(app =>
            app.id === lastAction.previousAppointment!.id ? { ...lastAction.previousAppointment! } : app
          );
          setModalInfo({ message: "Déplacement annulé", color: "#27ae60" });
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
          
          setModalInfo({ message: "Division annulée", color: "#27ae60" });
        }
        break;
    }

    // Forcer la mise à jour de l'affichage
    setTimeout(() => {
      handleResearch(); // Mettre à jour l'affichage
    }, 0);
    
    setTimeout(() => setModalInfo(null), 2000);
  }, [handleResearch]);

  // Compteur pour générer des IDs uniques de façon déterministe
  const idCounter = useRef(10000); // Commencer à 10000 pour éviter les conflits avec les IDs existants
  const timestampCounter = useRef(1000); // Compteur pour les timestamps stables

  // Création d'un rendez-vous (utilisé lors du resize fractionné)
  const createAppointment = useCallback(
    (startDate: Date, endDate: Date, employeeId: number, eventTypeId: number, saveToHistory: boolean = true) => {
      // Générer un ID déterministe sans Date.now() ou Math.random()
      const id = ++idCounter.current;
      
      const newApp: Appointment = {
        id: id,
        description: `Nouvel rendez-vous`,
        startDate,
        endDate,
        employeeId,
        eventTypeId,
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
      clipboardAppointment.current = { ...app };
    } else {
      console.warn("Aucun rendez-vous sélectionné à copier.");
    }    
  }, [selectedAppointment]);

  const pasteAppointment = useCallback((cell: { employeeId: number; date: Date }) => {
    if (!clipboardAppointment.current) return;

    const startDate = clipboardAppointment.current.startDate;
    const endDate = clipboardAppointment.current.endDate;
    
    // Différence entre les dates de début et de fin du rendez-vous copié
    const diff = endDate.getTime() - startDate.getTime();

    // Nouvelle date de début basée sur la cellule sélectionnée
    const newStartDate = new Date(cell.date.getTime());
    const newEndDate = new Date(newStartDate.getTime() + diff);

    if (!isWorkedDay(newStartDate, nonWorkingDates)) {
      console.warn("Les dates sélectionnées ne sont pas des jours travaillés.");
      return;
    }

    const days = getWorkedDayIntervals(
      newStartDate, 
      newEndDate,
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      false,
      nonWorkingDates
    );

    for (const day of days) {
      createAppointment?.(
        day.start,
        day.end,
        cell.employeeId,
        clipboardAppointment.current.eventTypeId || 1
      );
    }
  }, [createAppointment, isFullDay, nonWorkingDates]);



  
  if (!throttledScrollHandler.current) {
    let rafId: number | null = null;
    throttledScrollHandler.current = () => {
      if (rafId || isProcessingInfiniteScroll.current || !isInfiniteScrollEnabled.current) return;
      
      rafId = requestAnimationFrame(() => {
        rafId = null;
        
        if (isAutoScrolling.current || !mainScrollRef.current || !isInfiniteScrollEnabled.current) return;

        const { scrollLeft, scrollWidth, clientWidth, scrollTop } = mainScrollRef.current;
        
        // Détection du scroll vertical - si c'est un scroll vertical, on ignore l'infinite scroll
        const isVerticalScroll = Math.abs(scrollTop - lastScrollTop.current) > Math.abs(scrollLeft - (lastScrollCheck.current || scrollLeft));
        lastScrollTop.current = scrollTop;
        
        if (isVerticalScroll) {
          return; // Ne pas déclencher l'infinite scroll pour un scroll vertical
        }

        const now = Date.now();
        // Throttle supplémentaire : maximum une fois toutes les 100ms (sauf si touche fléchée pressée)
        if (!isArrowKeyPressed.current && now - lastScrollCheck.current < 100) return;
        lastScrollCheck.current = now;
        
        // Early exit si pas assez de contenu pour scroller
        if (scrollWidth <= clientWidth) return;
        
        const scrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100;

        // Seuils optimisés pour éviter les déclenchements multiples
        // Seuils plus bas quand une touche fléchée est pressée pour un scroll continu
        const rightThreshold = isArrowKeyPressed.current && arrowKeyDirection.current === 'right' ? 85 : 90;
        const leftThreshold = isArrowKeyPressed.current && arrowKeyDirection.current === 'left' ? 15 : 10;
        
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

  // Fonctions optimisées pour ajouter des jours
  const addDaysToRight = useCallback(() => {
    if (!mainScrollRef.current) return;
    
    const previousScrollLeft = mainScrollRef.current.scrollLeft;
    const previousScrollWidth = mainScrollRef.current.scrollWidth;
    
    setDayInTimeline((prevDays) => {
      const lastDay = prevDays[prevDays.length - 1];
      let newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(lastDay, i + 1));
      newDays = includeWeekend ? newDays : newDays.filter(day => !isWeekend(day));
      
      // Ajuster le scroll de manière synchrone après le state update pour maintenir la vue stable
      requestAnimationFrame(() => {
        if (mainScrollRef.current) {          
          // Maintenir la position relative de la vue quand on tranche la fenêtre
          const removedFromLeft = prevDays.length + newDays.length - WINDOW_SIZE;
          
          if (removedFromLeft > 0) {
            // Compenser la suppression des jours à gauche
            mainScrollRef.current.scrollLeft = previousScrollLeft - (removedFromLeft * CELL_WIDTH);
          }
        }
        
        // Reset du flag avec délai plus court si touche fléchée pressée
        const delay = isArrowKeyPressed.current ? 50 : 200;
        setTimeout(() => {
          isProcessingInfiniteScroll.current = false;
        }, delay);
      });
      
      return [...prevDays, ...newDays].slice(-WINDOW_SIZE);
    });
  }, [includeWeekend]);

  const addDaysToLeft = useCallback(() => {
    if (!mainScrollRef.current) return;
    
    const previousScrollLeft = mainScrollRef.current.scrollLeft;
    
    setDayInTimeline((prevDays) => {
      const firstDay = prevDays[0];
      let newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(firstDay, -(i + 1))).reverse();
      newDays = includeWeekend ? newDays : newDays.filter(day => !isWeekend(day));
      
      // Ajuster le scroll de manière synchrone après le state update
      requestAnimationFrame(() => {
        if (mainScrollRef.current) {
          const scrollAdjustment = newDays.length * CELL_WIDTH;
          mainScrollRef.current.scrollLeft = previousScrollLeft + scrollAdjustment;
        }
        
        // Reset du flag avec délai plus court si touche fléchée pressée
        const delay = isArrowKeyPressed.current ? 50 : 200;
        setTimeout(() => {
          isProcessingInfiniteScroll.current = false;
        }, delay);
      });
      
      return [...newDays, ...prevDays].slice(0, WINDOW_SIZE);
    });
  }, [includeWeekend]);

  // Gestion du scroll ultra-optimisée
  const handleScroll = useCallback(() => {
    // Appel différé pour éviter de bloquer le thread principal
    throttledScrollHandler.current?.();
    
    // Détecter si on scroll contre les bords pour maintenir l'infinite scroll actif
    // Seulement si l'infinite scroll est activé
    if (mainScrollRef.current && isInfiniteScrollEnabled.current) {
      const { scrollLeft, scrollWidth, clientWidth } = mainScrollRef.current;
      const scrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100;
      
      // Si on est proche des bords et qu'on continue de scroller, maintenir l'infinite scroll actif
      if (scrollPercentage >= 95 || scrollPercentage <= 5) {
        // Réduire temporairement le délai de processing pour permettre des ajouts plus fréquents
        setTimeout(() => {
          if (isProcessingInfiniteScroll.current) {
            isProcessingInfiniteScroll.current = false;
          }
        }, 100);
      }
    }
  }, []);

  // Centrage sur aujourd'hui au chargement
  const goToDate = useCallback((date: Date) => {
    if (!mainScrollRef.current) return;
    setIsLoading(true);
    setDayInTimeline(
      eachDayOfInterval({
        start: addDays(date, -WINDOW_SIZE / 2),
        end: addDays(date, WINDOW_SIZE / 2),
      })
    );
    setTimeout(() => {
      const todayCell = document.getElementById(format(date, "yyyy-MM-dd"));
      if (todayCell && mainScrollRef.current) {
        isAutoScrolling.current = true;
        const container = mainScrollRef.current;
        const cellRect = todayCell.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollLeft =
          container.scrollLeft +
          (cellRect.left - containerRect.left) -
          container.clientWidth / 2 +
          todayCell.clientWidth / 2;
        
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        
        // Activer l'infinite scroll une fois le scroll automatique terminé
        setTimeout(() => {
          isAutoScrolling.current = false;
          isInfiniteScrollEnabled.current = true; // Activer la détection du scroll infini
        }, 1000); // Délai pour s'assurer que le smooth scroll est terminé
      }
      setSelectedDate(date);
      setIsLoading(false);
    }, 50);
  }, []);


  // Déplacement d'un rendez-vous (drag & drop ou resize)
  const moveAppointment = useCallback(
    (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection: 'left' | 'right' = 'right', saveToHistory: boolean = true) => {
      const appointment = appointments.current.find((app) => app.id === id);
    
      if (!appointment) return; // Rendez-vous non trouvé 
      
      // Enregistrer l'état précédent pour l'historique seulement si demandé
      const previousAppointment = saveToHistory ? { ...appointment } : null;
      
      const days = getWorkedDayIntervals(
        newStartDate, 
        newEndDate,
        isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
        !includeWeekend,
        nonWorkingDates
      );    
    
      if (days.length === 0) return; // Pas de jours travaillés dans l'intervalle
      
      // Collecter les nouveaux RDV créés lors du split
      const createdAppointments: Appointment[] = [];
      
      if (resizeDirection === 'right') {
        // Met à jour le rendez-vous principal sur le premier intervalle
        onResize(appointment.id, newStartDate, days[0].end, newEmployeeId, false);
        // Création de nouveaux rendez-vous pour les autres intervalles travaillés
        for (let index = 1; index < days.length; index++) {
          const day = days[index];
          const newApp = createAppointment?.(
            day.start, 
            day.end, 
            newEmployeeId, 
            appointment.eventTypeId,
            false
          );
          if (newApp) {
            createdAppointments.push(newApp);
          }
        }
      }
      if (resizeDirection === 'left') {
        // Met à jour le rendez-vous principal sur le dernier intervalle
        onResize(appointment.id, days[days.length - 1].start, newEndDate, newEmployeeId, false);
        // Création de nouveaux rendez-vous pour les autres intervalles travaillés (sens inverse)
        for (let index = days.length - 2; index >= 0; index--) {
          const day = days[index];
          const newApp = createAppointment?.(
            day.start, 
            day.end, 
            newEmployeeId, 
            appointment.eventTypeId,
            false
          );
          if (newApp) {
            createdAppointments.push(newApp);
          }
        }
      }
      
      // Enregistrer l'action dans l'historique seulement si demandé
      const updatedAppointment = appointments.current.find((app) => app.id === id);
      if (updatedAppointment && saveToHistory && previousAppointment) {
        if (createdAppointments.length > 0) {
          // Resize avec split
          saveAppointmentState(updatedAppointment, 'resize_split', previousAppointment, createdAppointments);
        } else {
          // Simple déplacement d'un seul RDV
          saveAppointmentState(updatedAppointment, 'move', previousAppointment);
        }
      }
    },
    [onResize, createAppointment, isFullDay, DAY_INTERVALS, HALF_DAY_INTERVALS, includeWeekend, nonWorkingDates, saveAppointmentState]
  );

  // Gestion de la création et édition de rendez-vous
  const handleSaveAppointment = useCallback(
    (appointment: Appointment, eventType: EventType, includeAllNonWorkingDays: boolean) => {

    // Mettre à jour le EventType correspondant dans le cache local `eventTypes` (et global `allEventTypes`)
    const existingIndex = eventTypes.current.findIndex(et => et.id === eventType.id);
    if (existingIndex !== -1) {
      // Fusionner les changements fournis par le formulaire (ne perdre aucune propriété non fournie)
      eventTypes.current[existingIndex] = { ...eventTypes.current[existingIndex], ...eventType };
    }


    const days = getWorkedDayIntervals(
      appointment.startDate, 
      appointment.endDate,
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      includeAllNonWorkingDays,
      nonWorkingDates
    );        
    
    console.log("Jours travaillés calculés pour le rendez-vous :", days);
    
    // Enregistrer l'état précédent pour l'historique
    let previousAppointment: Appointment | undefined;
    if (appointment.id) {
      previousAppointment = appointments.current.find(app => app.id === appointment.id);
    }
    
    // Fonction utilitaire pour créer les rendez-vous supplémentaires
    const createExtraAppointments = (fromIndex = 1) => {
      days.slice(fromIndex).forEach(day => {
        createAppointment(
          day.start,
          day.end,
          appointment.employeeId as number,
          appointment.eventTypeId
        );
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
              eventTypeId: appointment.eventTypeId,
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
        saveAppointmentState(updatedAppointment, 'update', previousAppointment);
      }
    }
    // Note: Les créations sont déjà enregistrées dans createAppointment
    
    handleResearch(); // Met à jour la liste filtrée
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setNewAppointmentInfo(null);
  }, [handleResearch, createAppointment, isFullDay, nonWorkingDates, saveAppointmentState]);


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
    const nbOfIntervals = Math.floor(totalDuration / (timeInterval * 60 * 60 * 1000)); // Nombre d'intervalles de travail dans la durée totale
    
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
      eventTypeId: appointmentToDivide.eventTypeId,
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

      // Trouver le bon eventTypeId basé sur le typeEvent et le title
      let eventTypeId = 1; // Par défaut
      if (typeEvent === 'Chantier') {
        const eventType = chantiersEventTypes.find(et => et.name === title);
        eventTypeId = eventType ? eventType.id : chantiersEventTypes[0].id;
      } else if (typeEvent === 'Absence') {
        const eventType = absencesEventTypes.find(et => et.name === title);
        eventTypeId = eventType ? eventType.id : absencesEventTypes[0].id;
      } else {
        const eventType = autresEventTypes.find(et => et.name === title);
        eventTypeId = eventType ? eventType.id : autresEventTypes[0].id;
      }

      createAppointment(
        startDate, 
        endDate, 
        employeeId, 
        eventTypeId
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

    const allEvents = [
      ...chantier.map(item => ({ ...item, type: 'Chantier' as const })),
      ...absences.map(item => ({ ...item, type: 'Absence' as const })),
      ...autres.map(item => ({ ...item, type: 'Autre' as const }))
    ];

    return allEvents.filter(event =>
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
            action: () => setRepeatAppointmentData({
              numberCount: 1,
              repeatCount: 1,
              repeatInterval: 'day',
              endDate: null,
            })
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
    // Délai pour s'assurer que le DOM est complètement rendu après NoSSR
    const timer = setTimeout(() => {
      goToDate(new Date());
    }, 100);
    
    return () => clearTimeout(timer);
  }, []); // Centrage initial

  // Marquer la fin de l'initialisation après le premier rendu
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitializing.current = false;
    }, 100); // Court délai pour s'assurer que l'initialisation est terminée
    
    return () => clearTimeout(timer);
  }, []);

  // Charger la valeur depuis localStorage après le montage (évite les problèmes d'hydratation)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      let storedValue = localStorage.getItem('isFullDay');
      if (storedValue !== null) {
        setIsFullDay(storedValue === 'true');
      }
      storedValue = localStorage.getItem('isExpanded');
      if (storedValue !== null) {
        setIsExpanded(storedValue === 'true');
      }
      storedValue = localStorage.getItem('includeWeekend');
      if (storedValue !== null) {
        setIncludeWeekend(storedValue === 'true');
      }
    }
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
      if (e.key === 'suppr' || e.key === 'Delete') {
        if (selectedAppointment) {
          handleDeleteAppointmentConfirm();
        }
        else{
          setModalInfo({ message: "Aucun rendez-vous sélectionné pour la suppression.", color: "red" });
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

  // Recherche dans les rendez-vous
  useEffect(() => {
    handleResearch();
  }, [searchInput]);

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

  useEffect(() => {
    if (modalInfo) {
      const timeout = setTimeout(() => setModalInfo(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, [modalInfo]);

  useEffect(() => {
    setDayInTimeline(
      includeWeekend
        ? eachDayOfInterval({ start: addDays(new Date(), -WINDOW_SIZE / 2), end: addDays(new Date(), WINDOW_SIZE / 2) })
        : eachDayOfInterval({ start: addDays(new Date(), -WINDOW_SIZE / 2), end: addDays(new Date(), WINDOW_SIZE / 2) }).filter(date => !isWeekend(date))
    );

    // Réorganiser les rendez-vous seulement après la première initialisation
    if (hasInitializedWeekend.current) {
      appointments.current.forEach(app => {
        moveAppointment(
          app.id,
          app.startDate,
          app.endDate,
          app.employeeId as number,
          'right',
          true // Sauvegarder dans l'historique lors des changements utilisateur
        );
      });
    } else {
      // Première initialisation : juste réorganiser sans historique
      appointments.current.forEach(app => {
        moveAppointment(
          app.id,
          app.startDate,
          app.endDate,
          app.employeeId as number,
          'right',
          false // Ne pas sauvegarder dans l'historique lors de l'initialisation
        );
      });
      hasInitializedWeekend.current = true;
    }

  }, [includeWeekend]);
    
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

  // Rendu principal de la page
  return (
    <NoSSR>
      <DndProvider backend={HTML5Backend}>
        <div 
          className="h-screen flex flex-col overflow-hidden"
          style={{
            backgroundColor: '#f3f7f8'
          }}
        >
          {/* Barre du haut modernisée */}
         {!isMobile && (
          <div className="flex flex-col items-center pr-9">
            <div className="flex flex-row w-full">
              <div className={` p-2 w-80 ${!isExpanded ? 'h-[80px]' : 'h-full'}`}>
                <img src={LogoUrl.src} alt="Logo" className="h-20 w-auto mb-2" />
              </div>
              <div className={`flex-1 flex flex-col items-center justify-center ${!isExpanded ? 'px-4 pt-4' : 'py-4'}`}>
                <div className="flex items-center justify-between w-full h-[50px]">
                  <div className="flex flex-col gap-1">
                    <div className="relative w-72 max-w-full">
                      <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" aria-hidden="true" fill="none" viewBox="0 0 20 20">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                        </svg>
                      </div>
                      <input
                        type="search"
                        id="search"
                        className="block w-full p-3 pl-8 text-base text-gray-900  rounded-xl transition focus:outline-0 poppins text-[14px]"
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
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10"
                      title={isExpanded ? "Réduire" : "Options avancées"}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="25" 
                        height="25" 
                        fill="currentColor" 
                        className={`transition-transform duration-300 bi bi-chevron-up text-[#84818a] ${!isExpanded ? 'rotate-180' : ''}`} 
                        viewBox="0 0 16 16"
                      >
                        <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
                      </svg>
                    </button>
                    {viewType === 'chantier-table' && (
                      <button
                        className="p-3 rounded-full hover:bg-blue-100 transition"
                        onClick={() => {setViewType('calendar')}}
                        title="Chantiers"
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
                      className="p-3 rounded-full hover:bg-blue-100 transition "
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
                        xmlnsXlink="http://www.w3.org/1999/xlink" 
                      >
                        <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                          <path id="XMLID_273_" d="m27.526 18.036-.526-.304c-.626-.361-1-1.009-1-1.732s.374-1.371 1-1.732l.526-.304c1.436-.83 1.927-2.662 1.098-4.098l-1-1.732c-.827-1.433-2.666-1.925-4.098-1.098l-.526.303c-.626.362-1.375.362-2 0-.626-.362-1-1.009-1-1.732v-.607c0-1.654-1.346-3-3-3h-2c-1.654 0-3 1.346-3 3v.608c0 .723-.374 1.37-1 1.732-.626.361-1.374.362-2 0l-.526-.304c-1.432-.827-3.271-.335-4.099 1.098l-1 1.732c-.829 1.436-.338 3.269 1.098 4.098l.527.304c.626.361 1 1.009 1 1.732s-.374 1.371-1 1.732l-.526.304c-1.436.829-1.927 2.662-1.098 4.098l1 1.732c.828 1.433 2.667 1.925 4.098 1.098l.526-.303c.626-.363 1.374-.361 2 0 .626.362 1 1.009 1 1.732v.607c0 1.654 1.346 3 3 3h2c1.654 0 3-1.346 3-3v-.608c0-.723.374-1.37 1-1.732.625-.361 1.374-.362 2 0l.526.304c1.432.826 3.271.334 4.098-1.098l1-1.732c.829-1.436.338-3.269-1.098-4.098zm-11.526 2.964c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z" fill="#84818a" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/></g></svg>
                    </button>
                    <div className="relative" ref={viewDropdownRef}>
                      <button
                        className="p-3 rounded-full hover:bg-blue-100 transition"
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
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                          >
                            <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                              <path clipRule="evenodd" d="m40.583 21h71.806c10.771 0 19.583 8.812 19.583 19.583v71.806c0 10.771-8.812 19.583-19.583 19.583h-71.806c-10.771 0-19.583-8.812-19.583-19.583v-71.806c0-10.771 8.812-19.583 19.583-19.583zm159.931 19.583v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm-359.028 179.514v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm-359.028 179.514v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583z" fillRule="evenodd" fill="#84818a" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
                            </g>
                          </svg>
                      </button>

                      {/* Menu déroulant */}
                      {isViewDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                          <div className="py-1">
                            <button
                              className={`w-full px-4 py-2 text-left flex items-center gap-3 transition ${
                                viewType === 'calendar' ? 'bg-[#C8E6E1] text-[#16302C]' : 'text-gray-700  hover:bg-[#e7f4f2]'
                              }`}
                              onClick={() => {
                                setViewType('calendar');
                                setIsViewDropdownOpen(false);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                              >
                                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                              </svg>
                              Planning
                              {viewType === 'calendar' && (
                                <svg className="w-4 h-4 ml-auto text-[#16302C]" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                </svg>
                              )}
                            </button>
                            <button
                              className={`w-full px-4 py-2 text-left flex items-center gap-3 transition ${
                                viewType === 'chantier-table' ? 'bg-[#C8E6E1] text-[#16302C]' : 'text-gray-700  hover:bg-[#e7f4f2]'
                              }`}
                              onClick={() => {
                                setViewType('chantier-table');
                                setIsViewDropdownOpen(false);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                              >
                                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zM1 2v2h4V2H1zm4 3H1v3h4V5zm0 4H1v3h4V9zm0 4H1v2a1 1 0 0 0 1 1h3v-3zm5-8H6v3h4V4zm0 4H6v3h4V8z" />
                              </svg>
                              Liste des chantiers
                              {viewType === 'chantier-table' && (
                                <svg className="w-4 h-4 ml-auto text-[#16302C]" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      className="p-3 rounded-full hover:bg-blue-100 transition relative"
                      onClick={() => setIsSettingsOpen(true)}
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
                        >
                          <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                            <path d="m84.9384384 78.6478882h-69.8768778c-4.2446356 0-6.8042536-4.7139664-4.4792337-8.2760315l4.8991413-7.4587746c2.6900654-4.0955315 4.1233788-8.8885002 4.1233788-13.7884827v-6.9935493c0-14.3977032 10.0250931-26.4705181 23.462925-29.5846062v-3.1142158c-.0000001-3.8393617 3.1142158-6.9322281 6.932228-6.9322281 1.9197464 0 3.6474648.7678463 4.9058571 2.0263696 1.237175 1.2583933 2.026371 2.9861126 2.026371 4.9058585v3.1142168c5.631134 1.2797441 10.622261 4.1380129 14.5683823 8.0839968 5.5030289 5.5031605 8.8945465 13.0966091 8.8945465 21.5006084v6.9935493c0 4.8999825 1.4333115 9.6929512 4.1233749 13.7884827l4.8991394 7.4587746c2.3250198 3.5620651-.2345962 8.2760315-4.4792328 8.2760315z" fill="#84818a" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
                            <path d="m50.0000114 97.5h-.0000229c-6.6999817 0-12.1313858-5.4314041-12.1313858-12.1313858v-.4888229h24.2627945v.4888229c0 6.6999817-5.4314041 12.1313858-12.1313858 12.1313858z" fill="#84818a" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
                          </g>
                        </svg>
                        <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
                      </div>
                    </button>
                    <div
                      className="p-5 rounded-full  transition bg-red-600 relative"
                    >
                      <span className="absolute bottom-0 -right-1 block h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`flex items-center justify-between w-full ${!isExpanded ? 'hidden' : 'h-[50px]'}`}>
                <div className={`${viewType === 'calendar' ? 'ml-80' : 'ml-7'}`}>
                  <p className="text-5xl poppins">
                    {viewType === 'calendar' ? 'Planning' : 'Liste des chantiers'}
                  </p>
                </div>
                <div className="flex flex-row items-center gap-4">
                  <div className="flex flex-row items-center gap-2">
                    {viewType === 'calendar' && (
                      <input
                        id="date-select"
                        type="date"
                        className="border w-38 border-gray-300 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-gray-100 text-base"
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
                  <div className="border border-gray-300 rounded-xl flex items-center multi-op">
                    {viewType === 'calendar' && (
                      <>
                        <button
                          className="transition btn-header cursor-pointer border-r border-gray-300 px-3 py-2"
                          onClick={() => toggleSetIncludeWeekend(!includeWeekend)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            className="bi bi-calendar-event text-gray-500 transition duration-200"
                            viewBox="0 0 16 16"
                          >
                            <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z" fill="#84818a" fillOpacity="1" stroke="none" strokeOpacity="1"/>
                            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" fill="#84818a" fillOpacity="1" stroke="none" strokeOpacity="1"/>
                          </svg>
                        </button>
                        <button 
                          className="transition cursor-pointer btn-header border-r border-gray-300 px-3 py-2"
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
                              xmlnsXlink="http://www.w3.org/1999/xlink" 
                            >
                              <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                                <path d="m27 3v26c0 .5527344-.4472656 1-1 1h-8c-.5527344 0-1-.4472656-1-1v-26c0-.5527344.4472656-1 1-1h8c.5527344 0 1 .4472656 1 1zm-13-1h-8c-.5527344 0-1 .4472656-1 1v26c0 .5527344.4472656 1 1 1h8c.5527344 0 1-.4472656 1-1v-26c0-.5527344-.4472656-1-1-1z" fill="#84818a" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
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
                            >
                              <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                                <rect height="480" rx="10.695" width="108.343" x="201.828" y="16" fill="#84818a" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
                              </g>
                            </svg>
                          )}
                        </button>
                      </>
                    )}
                    <button 
                      className="transition btn-header px-3 py-2 group hover:text-[#00947f] cursor-pointer text-gray-400"
                    >
                      <svg 
                        viewBox="0 0 16 16"
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        className="w-5 h-5 text-inherit text-gray-500 transition duration-200"
                      >
                        <g>
                          <path 
                            d="m6.5 16c-.072 0-.145-.016-.212-.047-.176-.082-.288-.259-.288-.453v-6.285c0-.346-.121-.683-.34-.951l-5.434-6.63c-.145-.178-.226-.404-.226-.634 0-.551.449-1 1-1h14c.551 0 1 .449 1 1 0 .23-.081.456-.227.634l-5.434 6.63c-.218.268-.339.605-.339.951v2.849c0 .744-.328 1.444-.9 1.92l-2.28 1.9c-.091.076-.205.116-.32.116zm8.5-15h.01z"
                            fill="#84818a" 
                            fillOpacity="1" 
                            data-original-color="#000000ff" 
                            stroke="none" 
                            strokeOpacity="1"
                          />
                        </g>
                      </svg>
                    </button>
                  </div>
                  {viewType === 'calendar' && (
                    <button
                      className="transition px-3 py-2 rounded-2xl cursor-pointer text-white font-semibold shadow active:scale-95 pointer-events-auto"
                      style={{ backgroundColor: '#00947f' }}
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
                    <CalendarGrid
                      employees={filteredEmployeesForCalendar}
                      appointments={filteredAppointmentsForCalendar}
                      initialTeams={initialTeams}
                      dayInTimeline={dayInTimeline}
                      HALF_DAY_INTERVALS={isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS}
                      isFullDay={isFullDay}
                      eventTypes={eventTypes.current}
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
                    <ChantierTableFrame 
                      chantiers={filteredChantiers} 
                      containerWidth={typeof window !== 'undefined' ? window.innerWidth - 50 : 1200}
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
            !!repeatAppointmentData
              ? "Répéter ce rendez-vous"
              : extendAppointmentData
              ? "Prolonger le rendez-vous"
              : selectedAppointment
              ? "Modifier le rendez-vous"
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
                <div className="flex items-center gap-12">
                  <label className="flex items-center gap-2 font-medium">
                    <span className="">{'Tous les'}</span>
                    <input
                      required
                      type="number"
                      min={1}
                      className="border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-[50px]  text-center"
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
                    className="border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ml-2 custom-select"
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
                      className={`${repeatAppointmentData.endDate !== null ? 'opacity-50 cursor-not-allowed' : 'opacity-100'} border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-[50px] ml-2`}
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
                    className={`${repeatAppointmentData.repeatCount !== null ? 'opacity-50 cursor-not-allowed text-sm' : 'opacity-100 text-base'} ml-2 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-[145px]`}
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
                  className="px-4 py-2 bg-[#009580] text-white rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRepeat}
                  className="px-4 py-2 bg-[#009580] text-white rounded-xl transition-colors"
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
                  className="text-base border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-[145px]"
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
                  className="px-4 py-2 bg-[#009580] text-white rounded-xl transition-colors w-[110px] mr-[89px]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleExtend}
                  className="px-4 py-2 bg-[#009580] text-white rounded-xl  transition-colors w-[110px]"
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
              eventTypes={eventTypes.current}
              initialEmployeeId={newAppointmentInfo?.employeeId || null}
              employees={employees.current}
              HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
              isFullDay={isFullDay}
              nonWorkingDates={nonWorkingDates}
              onSave={handleSaveAppointment}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </Modal>
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)}
          settings={settings} 
          isSettingsOpen={isSettingsOpen}
        />
        {/* Overlay de recherche d'événements */}
        
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
          eventTypes={eventTypes.current}
          isFullDay={isFullDay}
        />
      </div>
    </DndProvider>
    </NoSSR>
  );
}


// Modal d'alerte réutilisable
type AlertModalProps = {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  onClose,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div className="w-full py-2 bg-white cursor-default pointer-events-auto dark:bg-gray-800 relative rounded-xl mx-auto max-w-sm">
      {message && <div className="px-6 py-2 text-gray-700 dark:text-gray-200">{message}</div>}
      <div className="grid gap-2 grid-cols-2 px-6 py-2">
        <button
          className="inline-flex items-center justify-center py-1 gap-1 font-medium rounded-lg border transition-colors outline-none focus:ring-offset-2 focus:ring-2 focus:ring-inset min-h-[2.25rem] px-4 text-sm text-gray-800 bg-white border-gray-300 hover:bg-gray-50 focus:ring-primary-600 focus:text-primary-600 focus:bg-primary-50 focus:border-primary-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-200 dark:focus:text-primary-400 dark:focus:border-primary-400 dark:focus:bg-gray-800"
          onClick={onClose}
        >
          {cancelLabel}
        </button>
        <button
          className="inline-flex items-center justify-center py-1 gap-1 font-medium rounded-lg border transition-colors outline-none focus:ring-offset-2 focus:ring-2 focus:ring-inset min-h-[2.25rem] px-4 text-sm text-white shadow focus:ring-white border-transparent bg-red-600 hover:bg-red-500 focus:bg-red-700 focus:ring-offset-red-700"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </Modal>
);


type SettingsModalProps = {  
  onClose: () => void;
  settings: any;
  isSettingsOpen: boolean;
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isSettingsOpen,
  settings
}) => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={onClose}
      title="Paramètres"
    >
      <div className="flex flex-col gap-6">
        {settings.map((cat: any, idx: number) => (
          <div key={cat.category} className={`border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm  ${openCategory?.length !== null ? 'w-auto' : 'w-[400px]'}`}>
            <button
              type="button"
              className="w-full text-left px-6 py-4 font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100 flex items-center justify-between"
              onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
            >
              <span className="text-base">{cat.category}</span>
              <svg 
                className={`w-5 h-5 text-gray-500 transform transition-transform ${openCategory === cat.category ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openCategory === cat.category && (
              <div className="px-6 py-4 border-t border-gray-100">
                {cat.items.map((setting: any) => (
                  <div key={setting.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-50 last:border-b-0">
                    <label htmlFor={setting.id} className="text-sm font-medium text-gray-700 mb-2 sm:mb-0 sm:mr-4 min-w-[180px]">
                      {setting.label}
                    </label>
                    {setting.type === "custom-non-working-dates" ? (
                      <div className="flex flex-col gap-3 w-full max-w-md">
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            id={setting.id}
                            value={setting.newNonWorkingDate}
                            onChange={e => setting.setNewNonWorkingDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#009580] focus:border-[#009580] transition flex-1"
                          />
                          <button
                            className="px-4 py-2 bg-[#009580] text-white rounded-lg hover:bg-[#007a6b] transition-colors font-medium"
                            onClick={() => {
                              if (
                                setting.newNonWorkingDate &&
                                !setting.nonWorkingDates.some(
                                  (d: Date) =>
                                    format(d, "yyyy-MM-dd") === setting.newNonWorkingDate
                                )
                              ) {
                                setting.setNonWorkingDates((prev: Date[]) => [
                                  ...prev,
                                  new Date(setting.newNonWorkingDate),
                                ]);
                                setting.setNewNonWorkingDate("");
                              }
                            }}
                          >
                            Ajouter
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          {setting.nonWorkingDates.length === 0 ? (
                            <p className="text-gray-500 italic text-sm">Aucune date ajoutée</p>
                          ) : (
                            <ul className="space-y-2 max-h-32 overflow-y-auto">
                              {setting.nonWorkingDates.map((date: Date, idx: number) => (
                                <li key={format(date, "yyyy-MM-dd") + idx} className="flex items-center justify-between bg-white rounded px-3 py-2 shadow-sm">
                                  <span className="text-sm font-medium text-gray-700">{format(date, "dd/MM/yyyy")}</span>
                                  <button
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                                    onClick={() =>
                                      setting.setNonWorkingDates((prev: Date[]) =>
                                        prev.filter(
                                          (d: Date) =>
                                            format(d, "yyyy-MM-dd") !== format(date, "yyyy-MM-dd")
                                        )
                                      )
                                    }
                                  >
                                    Supprimer
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {setting.type === "checkbox" ? (
                          <div className="flex items-center">
                            <input
                              id={setting.id}
                              type="checkbox"
                              className="w-4 h-4 text-[#009580] border-gray-300 rounded focus:ring-[#009580] focus:ring-2"
                              checked={setting.value}
                              onChange={e => setting.onChange(e.target.checked)}
                            />
                          </div>
                        ) : (
                          <input
                            id={setting.id}
                            type={setting.type}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#009580] focus:border-[#009580] transition w-40"
                            value={setting.value}
                            onChange={e => setting.onChange(e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-end pt-4">
          <button
            className="px-6 py-2 bg-[#009580] text-white rounded-xl hover:bg-[#007a6b] transition-colors font-medium"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};


type SearchOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  eventSearchInput: string;
  setEventSearchInput: (input: string) => void;
  filteredEvents: (EventTemplate & { type: "Chantier" | "Absence" | "Autre" })[];
  selectedCell:{ employeeId: number; date: Date } | null
  addAppointmentFromSearch: (appointment: Appointment, eventType: EventType, includeAllNonWorkingDays: boolean) => void;
  eventTypes: EventType[];
  isFullDay: boolean;
};

const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  eventSearchInput,
  setEventSearchInput,
  filteredEvents,
  selectedCell,
  addAppointmentFromSearch,
  eventTypes,
  isFullDay
}) => {
  const dragDropManager = useDragDropManager();
  const [isDragging, setIsDragging] = useState(false);

  // Utiliser React DnD pour détecter l'état de drag
  useEffect(() => {
    const monitor = dragDropManager.getMonitor();
    
    const unsubscribe = monitor.subscribeToStateChange(() => {
      const isDragInProgress = monitor.isDragging();
      setIsDragging(isDragInProgress);
    });

    return unsubscribe;
  }, [dragDropManager]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDragging) {
        onClose();
        setEventSearchInput('');
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, setEventSearchInput, isOpen, isDragging]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className={`fixed inset-0 overlay z-50  ${
          isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => {
          if (!isDragging) {
            onClose();
            setEventSearchInput('');
          }
        }}
      />
      <div 
        className={`fixed z-60 bg-opacity-0 rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col ${isDragging ? 'opacity-0' : 'opacity-100'} transition-all duration-300 ease-in-out`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          top: '35%', 
          left: !isDragging ? '32%' : '100%' 
        }}
      >
        {/* Barre de recherche */}
        <div className="">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Rechercher un événement..."
              className="block bg-white w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              value={eventSearchInput}
              onChange={(e) => setEventSearchInput(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className=" p-3"></div>
        {/* Liste des événements filtrés */}
        <div className="flex-1 overflow-y-auto px-2 py-2 bg-white rounded-2xl">
          {eventSearchInput.trim() === '' ? (
            <div className="text-center text-gray-500 py-8">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg font-medium mb-2">Rechercher un événement</p>
              <p className="text-sm">Tapez pour rechercher parmi les chantiers, absences et autres événements</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.5a7.5 7.5 0 11-6 0 7.5 7.5 0 016 0z" />
              </svg>
              <p className="text-lg font-medium mb-2">Aucun résultat</p>
              <p className="text-sm">Aucun événement ne correspond à votre recherche</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredEvents.map((event, index) => (
                <div 
                  key={`${event.label}-${event.id}-${index}`} 
                  className="w-full flex justify-between hover:bg-[#e7f4f2] rounded-xl transition-colors px-2"
                >
                  <DraggableSource
                    key={`${event.label}-${event.id}-${index}`}
                    id={event.id}
                    title={event.label}
                    type={event.type}
                  />
                  {selectedCell && (
                    <div className="h-full">
                      <button
                        className="px-2 py-1 text-xl cursor-pointer h-full"
                        onClick={() => {
                          addAppointmentFromSearch(
                            {
                              description: event.label,
                              startDate: new Date(selectedCell.date),
                              endDate: new Date(selectedCell.date.setHours(isFullDay ? 23 : 11, 59, 59)),
                              employeeId: selectedCell.employeeId,
                              eventTypeId: event.id,
                            } as Appointment,
                            eventTypes.find(et => et.id === event.id)!,
                            false
                          )
                          onClose()
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}