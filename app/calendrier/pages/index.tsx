/**
 * Page Calendrier (Scheduler)
 * -----------------------------------
 * Cette page affiche l'agenda des employés sous forme de calendrier interactif.
 * - Vue desktop : calendrier horizontal multi-employés, multi-équipes, scroll horizontal.
 * - Vue mobile : calendrier vertical , un seul employé affiché, scroll infini.
 * - Drag & drop des rendez-vous (react-dnd).
 * - Gestion des sélections, contextes, et affichage dynamique selon la taille d'écran.
 *
 * Props principales :
 * - employees : liste des employés à afficher
 * - appointments : liste des rendez-vous
 * - dayInTimeline : tableau des jours affichés
 * - isMobile : détection mobile pour adapter l'affichage
 *
 * Composants principaux utilisés :
 * - CalendarGrid : grille principale du calendrier
 * - AppointmentItem : affichage d'un rendez-vous
 * - DayCell / IntervalCell : cellules de la grille
 *
 * Auteur : GandaraSolution
 * Dernière modification : 2025-07-18
 */

"use client";

// Composant NoSSR pour éviter les problèmes d'hydratation
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
  isSameDay,
  addMinutes,
} from "date-fns";
import { Appointment, Employee, HistoryAction, EventTemplate } from "../types";
import CalendarGrid from "../components/CalendarGrid";
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
  colors
} from "../../datasource";
import { SelectedAppointmentContext } from "../context/SelectedAppointmentContext";
import { SelectedCellContext } from "../context/SelectedCellContext";
import { CELL_WIDTH, DAY_INTERVALS, DAYS_TO_ADD, HALF_DAY_INTERVALS, WINDOW_SIZE } from "../utils/constants";
import { getNextWorkedDay, getWorkedDayIntervals, isWorkedDay, isWeekend, getBeforeWorkedDay } from "../utils/dates";
import { CalendarConfig } from "../types";
import { applyFiltersToEmployees, applyFiltersToAppointments } from "../utils/filters";


import LogoUrl from "../image/LOGO_couleur_police_noire.svg";


// Définition des types d'événements pour le drawer
const eventTypes = [
  { label: "Chantier", color: "primary", dataSource: chantier, placeholder: "Sélectionnez un chantier" },
  { label: "Absence", color: "warning", dataSource: absences, placeholder: "Sélectionnez une absence" },
  { label: "Autre", color: "secondary", dataSource: autres, placeholder: "Sélectionnez autre" },
];


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
  const [addAppointmentStep, setAddAppointmentStep] = useState<"select" | "form" | "">("");
  const [includeWeekend, setIncludeWeekend] = useState(true);
  const [nonWorkingDates, setNonWorkingDates] = useState<Date[]>([]);
  const [newNonWorkingDate, setNewNonWorkingDate] = useState<string>("");
  const [dayInTimeline, setDayInTimeline] = useState<Date[]>([]);
  const mainScrollRef = useRef<HTMLDivElement>(null);
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
  const history = useRef<HistoryAction[]>([]);
  const maxHistorySize = 50; // Limiter la taille de l'historique
  const isInitializing = useRef(true); // Flag pour éviter d'enregistrer les actions lors de l'initialisation
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
      category: "Affichage",
      items: [
        { 
          id: "showWeekends",
          label: "Afficher les week-ends", 
          type: "checkbox", value: includeWeekend, 
          onChange: (value : boolean) => setIncludeWeekend(value) 
        },
        {
          id: 'isFullDay',
          label: "Afficher les journées complète",
          type: "checkbox",
          value: isFullDay,
          onChange: (value: boolean) => setIsFullDay(value)
        }
      ]
    },
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

  const researchAppointments = useCallback(() => {
        
    if (!searchInput) {
      setFilteredAppointments(appointments.current);
      return;
    }
    const lowercasedQuery = searchInput.toLowerCase();
    setFilteredAppointments(
      appointments.current.filter((app) =>
        app.title.toLowerCase().includes(lowercasedQuery)
      )
    );
  }, [searchInput]);

  const isConsecutive = useCallback((app1: Appointment, app2: Appointment): boolean => {
    
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
    const nextWorkedDay = getNextWorkedDay(
      new Date(app1.endDate.getTime() + (intervals[0].endHour - intervals[0].startHour) * 60 * 60 * 1000),
      intervals,
      nonWorkingDates
    );
    // Consécutif si le startDate de app2 est le prochain jour travaillé après la fin de app1
    return isSameDay(app2.startDate, nextWorkedDay);
  }, [isFullDay, nonWorkingDates]);

  const getFullSequence = useCallback((appointmentId: number): Appointment[] => {
    const found = appointments.current.find(app => app.id === appointmentId);
    if (!found) return [];
    const sequence: Appointment[] = [found];

    // Trouve les RDV avant
    let prev = sequence[0];
    while (true) {
      const prevApp = appointments.current.find(app =>
        app.employeeId === prev.employeeId &&
        app.title === prev.title &&
        isConsecutive(app, prev) &&
        !sequence.some(seqApp => seqApp.id === app.id) // <-- Empêche la boucle infinie
      );
      if (prevApp) {
        sequence.unshift(prevApp);
        prev = prevApp;
      } else {
        break;
      }
    }
    

    // Trouve les RDV après
    let next = sequence[sequence.length - 1];
    while (true) {
      const nextApp = appointments.current.find(app =>
        app.employeeId === next.employeeId &&
        app.title === next.title &&
        isConsecutive(next, app) &&
        !sequence.some(seqApp => seqApp.id === app.id) // <-- Empêche la boucle infinie
      );
      
      if (nextApp) {
        sequence.push(nextApp);
        next = nextApp;
      } else {
        break;
      }
    }
    
    return sequence;
  }, [isConsecutive]);

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
          title: selectedAppointment?.title || "Rendez-vous répété",
          libelle: selectedAppointment?.libelle || "Rendez-vous répété",
          description: selectedAppointment?.description || "Description du rendez-vous répété",
          startDate: day.start ,
          endDate: day.end,
          image: selectedAppointment?.image,
          employeeId: selectedAppointment?.employeeId,
          type: selectedAppointment?.type || "Chantier", // Type de rendez-vous
          color: selectedAppointment?.color || "#1E40AF", // Couleur de fond du rendez-vous
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
          title: selectedAppointment?.title || "Rendez-vous répété",
          libelle: selectedAppointment?.libelle || "Rendez-vous répété",
          description: selectedAppointment?.description || "Description du rendez-vous répété",
          startDate: day.start ,
          endDate: day.end,
          image: selectedAppointment?.image,
          employeeId: selectedAppointment?.employeeId,
          type: selectedAppointment?.type || "Chantier", // Type de rendez-vous
          color: selectedAppointment?.color || "#1E40AF", // Couleur de fond du rendez-vous
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
    researchAppointments(); // Met à jour la liste filtrée
    setModalInfo({ message: `${newAppointments.length} rendez-vous créé${newAppointments.length > 1 ? 's' : ''}`, color: 'green' });
    setRepeatAppointmentData(null);
  }, [researchAppointments, selectedAppointment, isFullDay, nonWorkingDates]);

  const onResize = useCallback(
    (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId?: number) => {     
      appointments.current = appointments.current.map((app) =>
        app.id === id
          ? { ...app, startDate: newStartDate, endDate: newEndDate, employeeId: newEmployeeId || app.employeeId }
          : app
      );
      researchAppointments(); // Met à jour la liste filtrée
    }, [researchAppointments]
  );

  // --- FONCTIONS D'HISTORIQUE POUR CTRL+Z ---
  const addToHistory = useCallback((action: HistoryAction) => {
    history.current.push(action);
    // Limiter la taille de l'historique
    if (history.current.length > maxHistorySize) {
      history.current.shift();
    }
  }, []);

  const saveAppointmentState = useCallback((appointment: Appointment | null, type: 'create' | 'update' | 'delete' | 'move', previousAppointment?: Appointment) => {
    if (!appointment || isInitializing.current) return; // Ne pas enregistrer pendant l'initialisation
    
    addToHistory({
      type,
      timestamp: ++timestampCounter.current, // Timestamp stable et croissant
      appointment: { ...appointment },
      previousAppointment: previousAppointment ? { ...previousAppointment } : undefined,
      appointments: appointments.current.map(app => ({ ...app })) // Sauvegarde complète pour sécurité
    });
  }, [addToHistory]);

  const undoLastAction = useCallback(() => {
    console.log(history.current);
    
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
          appointments.current.push({ ...lastAction.appointment });
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
          
          setModalInfo({ message: "Redimensionnement annulé", color: "#27ae60" });
        }
        break;

      case 'move_sequence':
        // Annuler un déplacement de séquence (avec ou sans split)
        console.log("Annulation d'une séquence:", lastAction);
        if (lastAction.sequenceAppointments) {
          console.log("Restauration de", lastAction.sequenceAppointments.length, "RDV de la séquence");
          
          // Créer un nouveau tableau pour forcer la mise à jour de React
          const updatedAppointments = [...appointments.current];
          
          // Restaurer tous les RDV de la séquence à leur état précédent
          lastAction.sequenceAppointments.forEach(prevApp => {
            const currentAppIndex = updatedAppointments.findIndex(app => app.id === prevApp.id);
            console.log(`Restauration RDV ${prevApp.id}:`, currentAppIndex !== -1 ? "trouvé" : "non trouvé");
            if (currentAppIndex !== -1) {
              updatedAppointments[currentAppIndex] = { ...prevApp };
            }
          });
          
          // Si des RDV ont été créés lors du split, les supprimer
          if (lastAction.createdAppointments) {
            console.log("Suppression de", lastAction.createdAppointments.length, "RDV créés");
            const createdIds = lastAction.createdAppointments.map(app => app.id);
            appointments.current = updatedAppointments.filter(app => !createdIds.includes(app.id));
          } else {
            appointments.current = updatedAppointments;
          }
          
          setModalInfo({ message: "Déplacement de séquence annulé", color: "#27ae60" });
        }
        break;
    }

    researchAppointments(); // Mettre à jour l'affichage
    setTimeout(() => setModalInfo(null), 2000);
  }, [researchAppointments]);

  // Compteur pour générer des IDs uniques de façon déterministe
  const idCounter = useRef(10000); // Commencer à 10000 pour éviter les conflits avec les IDs existants
  const timestampCounter = useRef(1000); // Compteur pour les timestamps stables

  // Création d'un rendez-vous (utilisé lors du resize fractionné)
  const createAppointment = useCallback(
    (title: string, startDate: Date, endDate: Date, employeeId: number, type: "Chantier" | "Absence" | "Autre", color: string, libelle?: string, imageUrl?: string, saveToHistory: boolean = true) => {
      // Générer un ID déterministe sans Date.now() ou Math.random()
      const id = ++idCounter.current;
      
      const newApp: Appointment = {
        id: id,
        title,
        libelle, // Ajout du libellé pour l'affichage
        description: `Nouvel élément ${title}`,
        startDate,
        endDate,
        image: imageUrl,
        employeeId,
        type,
        color, // Couleur de fond du rendez-vous
      };
      appointments.current = [...appointments.current, newApp];
      
      // Enregistrer la création dans l'historique seulement si demandé
      if (saveToHistory) {
        saveAppointmentState(newApp, 'create');
      }
      
      researchAppointments(); // Met à jour la liste filtrée
      return newApp; // Retourner le nouveau RDV créé
  }, [researchAppointments, saveAppointmentState]);

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
        clipboardAppointment.current.title,
        day.start,
        day.end,
        cell.employeeId,
        clipboardAppointment.current.type || "Chantier",
        clipboardAppointment.current.libelle || "Rendez-vous copié",
        clipboardAppointment.current.image
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
    (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection: 'left' | 'right' = 'right') => {
      const appointment = appointments.current.find((app) => app.id === id);
    
      if (!appointment) return; // Rendez-vous non trouvé 
      
      // Enregistrer l'état précédent pour l'historique
      const previousAppointment = { ...appointment };
      
      const seq = getFullSequence(appointment.id);
      
      // Enregistrer l'état de toute la séquence avant les modifications
      const previousSequenceAppointments = seq.map(app => ({ ...app }));
      
      let timeOffset = 0;
      if (newEndDate.getTime() - newStartDate.getTime() === appointment.endDate.getTime() - appointment.startDate.getTime()) {
        timeOffset = newEndDate.getTime() - appointment.endDate.getTime(); 
      }
      
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
        onResize(appointment.id, newStartDate, days[0].end, newEmployeeId);
        // Création de nouveaux rendez-vous pour les autres intervalles travaillés
        for (let index = 1; index < days.length; index++) {
          const day = days[index];
          const newApp = createAppointment?.(appointment.title, day.start, day.end, newEmployeeId, appointment.type, appointment.color, appointment.libelle, appointment.image, false);
          if (newApp) {
            createdAppointments.push(newApp);
          }
        }
      }
      if (resizeDirection === 'left') {
        // Met à jour le rendez-vous principal sur le dernier intervalle
        onResize(appointment.id, days[days.length - 1].start, newEndDate, newEmployeeId);
        // Création de nouveaux rendez-vous pour les autres intervalles travaillés (sens inverse)
        for (let index = days.length - 2; index >= 0; index--) {
          const day = days[index];
          const newApp = createAppointment?.(appointment.title, day.start, day.end, newEmployeeId, appointment.type, appointment.color, appointment.libelle, appointment.image, false);
          if (newApp) {
            createdAppointments.push(newApp);
          }
        }
      }
      
      seq.forEach((app) => {
        
        if (app.id !== appointment.id) {
          let endDate = addMinutes(new Date(app.endDate.getTime() + timeOffset), -1);
          endDate = endDate.getDay() === 6 
          ? getBeforeWorkedDay(
              endDate,
              isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
              nonWorkingDates
            ) 
          : getNextWorkedDay(
              endDate,
              isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
              nonWorkingDates
            );


          onResize(
            app.id,
            getNextWorkedDay(
              new Date(app.startDate.getTime() + timeOffset),
              isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
              nonWorkingDates),
            endDate,
            newEmployeeId
          );
        }
      });
      
      // Enregistrer l'action dans l'historique
      const updatedAppointment = appointments.current.find((app) => app.id === id);
      if (updatedAppointment) {
        console.log("Enregistrement dans l'historique:");
        console.log("- Séquence length:", seq.length);
        console.log("- RDV créés:", createdAppointments.length);
        
        if (createdAppointments.length > 0) {
          // Si des RDV ont été créés (resize split) ET que d'autres RDV ont été déplacés
          if (seq.length > 1) {
            console.log("-> Action: move_sequence avec split");
            addToHistory({
              type: 'move_sequence',
              timestamp: ++timestampCounter.current,
              appointment: updatedAppointment,
              previousAppointment: previousAppointment,
              createdAppointments: createdAppointments,
              sequenceAppointments: previousSequenceAppointments
            });
          } else {
            // Seulement un resize split sans séquence
            console.log("-> Action: resize_split");
            addToHistory({
              type: 'resize_split',
              timestamp: ++timestampCounter.current,
              appointment: updatedAppointment,
              previousAppointment: previousAppointment,
              createdAppointments: createdAppointments
            });
          }
        } else {
          // Déplacement simple ou avec séquence mais sans split
          if (seq.length > 1) {
            console.log("-> Action: move_sequence sans split");
            addToHistory({
              type: 'move_sequence',
              timestamp: ++timestampCounter.current,
              appointment: updatedAppointment,
              previousAppointment: previousAppointment,
              sequenceAppointments: previousSequenceAppointments
            });
          } else {
            // Simple déplacement d'un seul RDV
            console.log("-> Action: move simple");
            saveAppointmentState(updatedAppointment, 'move', previousAppointment);
          }
        }
      }
    },
    [onResize, createAppointment, isFullDay, DAY_INTERVALS, HALF_DAY_INTERVALS, includeWeekend, nonWorkingDates, getFullSequence, saveAppointmentState, addToHistory]
  );

  // Gestion de la création et édition de rendez-vous
  const handleSaveAppointment = useCallback(
    (appointment: Appointment, includeWeekend: boolean, includeNotWorkingDay: boolean) => {    
    
    const days = getWorkedDayIntervals(
      appointment.startDate, 
      appointment.endDate,
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      includeWeekend,
      nonWorkingDates,
      includeNotWorkingDay
    );    
    
    // Enregistrer l'état précédent pour l'historique
    let previousAppointment: Appointment | undefined;
    if (appointment.id) {
      previousAppointment = appointments.current.find(app => app.id === appointment.id);
    }
    
    // Fonction utilitaire pour créer les rendez-vous supplémentaires
    const createExtraAppointments = (fromIndex = 1) => {
      days.slice(fromIndex).forEach(day => {
        createAppointment(
          appointment.title,
          day.start,
          day.end,
          appointment.employeeId as number,
          appointment.type,
          appointment.color,
          appointment.libelle,
          appointment.image
        );
      });
    };

    if (appointment.id) {
      const seq = getFullSequence(appointment.id);
      let index = 0;
      console.log("Updating appointments in sequence:", seq);      
      
      while (index < seq.length) {
        appointments.current = appointments.current.map(app => {
          
          if (app.id === seq[index].id) {
            
            return {
              ...app,
              title: appointment.title,
              description: appointment.description,
              startDate: days[index]?.start || app.startDate,
              endDate: days[index]?.end || app.endDate,
              employeeId: appointment.employeeId,
              image: appointment.image,
              color: appointment.color,
            };   
          }
          return app;
        });
        index++;
      }
      if (days.length > index) createExtraAppointments(index);
      else {
        // Si on a moins de jours que prévu, on supprime les RDV supplémentaires
        appointments.current = appointments.current.filter(
          app => !seq.some(
            s => s.id === app.id && !days.some(
              d => d.start.getTime() === app.startDate.getTime()
            )
          )
        );
      }
      
    } else {
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
    
    researchAppointments(); // Met à jour la liste filtrée
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setNewAppointmentInfo(null);
  }, [researchAppointments, createAppointment, getFullSequence, isFullDay, nonWorkingDates, saveAppointmentState]);


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
    researchAppointments(); // Met à jour la liste filtrée
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, [researchAppointments, saveAppointmentState]);

  const handleOpenEditModal = useCallback((appointment: Appointment) => {
    const seq = getFullSequence(appointment.id);
    console.log(seq);
    
    if (seq.length > 1) {
      appointment = {
        ...appointment,
        startDate: seq[0].startDate,
        endDate: seq[seq.length - 1].endDate,
      };
    }
    setSelectedAppointmentForm(appointment);
    setIsModalOpen(true);
  }, [getFullSequence]);

  const handleOpenNewModal = useCallback((date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => {
    setAddAppointmentStep("select");
    setSelectedAppointmentForm(null);
    setNewAppointmentInfo({ date, employeeId, intervalName });
  }, []);

  const handleDivideAppointmentConfirm = useCallback(() => {
    setAlertTitle("Êtes-vous sûr de vouloir diviser ce rendez-vous ?");
    setIsAlertVisible(true);
  }, []);

  const handleDivideAppointment = useCallback((id?: number) => {
    if (!id) return;

    const appointmentToDivide = appointments.current.find(app => app.id === id);
    if (!appointmentToDivide) return;

    const { startDate, endDate, employeeId, image: imageUrl } = appointmentToDivide;
    const totalDuration = endDate.getTime() - startDate.getTime();
    const timeInterval = isFullDay ? DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour : HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour;
    const nbOfIntervals = Math.floor(totalDuration / (timeInterval * 60 * 60 * 1000)); // Nombre d'intervalles de travail dans la durée totale
    
    const EndDate = new Date(startDate.getTime() + (Math.floor(nbOfIntervals / 2) * (timeInterval * 60 * 60 * 1000)));

    onResize(id, startDate, EndDate, employeeId as number);
    createAppointment(
      appointmentToDivide.title,
      EndDate,
      endDate,
      employeeId as number,
      appointmentToDivide.type,
      appointmentToDivide.color,
      appointmentToDivide.libelle,
      imageUrl,
     
    );
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, [onResize, createAppointment, isFullDay]);

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

      createAppointment(
        title, 
        startDate, 
        endDate, 
        employeeId, 
        typeEvent,
        colors[0].color, // Couleur par défaut
        title, // Utiliser le titre comme libellé 
        imageUrl
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
            actif: appointment.endDate.getTime() - appointment.startDate.getTime() <= 12 * 60 * 60 * 1000 // Si la durée est supérieure à 12 heure
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
              setSelectedAppointmentForm(null);
              setIsModalOpen(true);
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
              setSelectedAppointmentForm(null);
              setIsModalOpen(true);
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
      const storedValue = localStorage.getItem('isFullDay');
      if (storedValue !== null) {
        setIsFullDay(storedValue === 'true');
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
    researchAppointments();
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

    appointments.current.forEach(app => {
      moveAppointment(
        app.id,
        app.startDate,
        app.endDate,
        app.employeeId as number,
        'right'
      );
    });

  }, [includeWeekend]);
    
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          <div className="flex flex-row items-center pr-5">
            <div className="mr-7 h-full p-2">
              <img src={LogoUrl.src} alt="Logo" className="h-20 w-auto mb-2" />
            </div>
            <div className="flex-1 flex flex-col items-center p-4">
              <div className="flex items-center justify-between w-full">
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
                  <button
                    className="p-3 bg-gray-100 rounded-full hover:bg-blue-100 transition "
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
                  <button
                    className="p-3 bg-gray-100 rounded-full hover:bg-blue-100 transition"
                    onClick={() => setIsSettingsOpen(true)}
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
                  <button
                    className="p-3 bg-gray-100 rounded-full hover:bg-blue-100 transition relative"
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
              <div className="flex items-center justify-between w-full mt-6">
                <div>
                  <p className="text-5xl poppins">
                    Planning
                  </p>
                </div>
                <div className="flex flex-row items-center gap-4">
                  <div className="flex flex-row items-center gap-2">
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
                  </div>
                  <div className="border border-gray-300 rounded-2xl flex items-center multi-op">
                    <button
                      className="transition btn-header cursor-pointer border-r border-gray-300 px-3 py-2"
                      onClick={() => setIncludeWeekend(!includeWeekend)}
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
                  <button
                    className="transition px-3 py-2 rounded-2xl cursor-pointer text-white font-semibold shadow active:scale-95 pointer-events-auto"
                    style={{ backgroundColor: '#00947f' }}
                    type="button"
                    onClick={() => setIsSearchOverlayOpen(true)}
                  >
                    + Ajouter un évènement
                  </button>
                </div>
              </div>
            </div>
           
          </div>
        )}
        {/* Grille principale du calendrier modernisée */}
        <div className="flex-1 flex min-h-0
        ">
          <div
            className={`flex flex-grow rounded-2xl border-gray-200 ${!isMobile ? 'mt-4' : ''}`}
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
                  <CalendarGrid
                    employees={filteredEmployeesForCalendar}
                    appointments={filteredAppointmentsForCalendar}
                    initialTeams={initialTeams}
                    dayInTimeline={dayInTimeline}
                    HALF_DAY_INTERVALS={isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS}
                    isFullDay={isFullDay}
                    //selectedCalendarId={selectedCalendarId}
                    isMobile={isMobile}
                    includeWeekend={includeWeekend}
                    nonWorkingDates={nonWorkingDates}
                    mainScrollRef={mainScrollRef}
                    handleScroll={handleScroll}
                    onAppointmentMoved={moveAppointment}
                    onCellDoubleClick={handleOpenNewModal}
                    onAppointmentDoubleClick={handleOpenEditModal}
                    onExternalDragDrop={createAppointmentFromDrag}
                    handleContextMenu={handleContextMenu}
                    calendarConfig={currentCalendarConfig}
                    onCalendarConfigChange={setCurrentCalendarConfig}
                    availableConfigs={availableConfigs}
                  />
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
              className="flex flex-col gap-6 poppins"
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
                  <div className="flex items-center gap-21">
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
                    disabled={repeatAppointmentData.repeatCount !== null}
                    className={`${repeatAppointmentData.repeatCount !== null ? 'opacity-50 cursor-not-allowed' : 'opacity-100'} border border-gray-300 rounded-xl w-[120px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ml-2 text-xs`}
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
              <div className="flex flex-row items-center mb-4">
                <span className="text-base poppins mr-[78px]">Jusqu'au</span>
                <input
                  type="date"
                  className="text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-[120px]"
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
              appointment={selectedAppointmentForm}
              initialDate={newAppointmentInfo?.date || null}
              initialEmployeeId={newAppointmentInfo?.employeeId || null}
              employees={employees.current}
              HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
              isFullDay={isFullDay}
              colors={colors}
              nonWorkingDates={nonWorkingDates}
              onSave={handleSaveAppointment}
              onDelete={() => {
                handleDeleteAppointmentConfirm();
                setIsModalOpen(false);
              }}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </Modal>
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)}
          settings={settings} 
          isSettingsOpen={isSettingsOpen}
        />
        {/* Modal pour choisir le type de rendez-vous */}
        <ChoiceAppointmentType
          setAddAppointmentStep={setAddAppointmentStep}
          newAppointmentInfo={newAppointmentInfo}
          isOpen={addAppointmentStep === "select"}
          onSelect={(appointment) => {
            setAddAppointmentStep("form");
            setSelectedAppointmentForm(appointment);
            setIsModalOpen(true);
          }}
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
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-lg mb-2">Paramètres du calendrier</h3>
        {settings.map((cat: any, idx: number) => (
          <div key={cat.category} className="border rounded mb-2 bg-gray-50">
            <button
              type="button"
              className="w-full text-left px-4 py-2 font-semibold bg-gray-100 hover:bg-gray-200 rounded-t focus:outline-none"
              onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
            >
              {cat.category}
            </button>
            {openCategory === cat.category && (
              <div className="px-4 py-3">
                {cat.items.map((setting: any) => (
                  <div key={setting.id} className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                    <label htmlFor={setting.id} className="text-sm font-medium text-gray-700 mb-1 sm:mb-0 sm:mr-4 min-w-[160px]">
                      {setting.label}
                    </label>
                    {setting.type === "custom-non-working-dates" ? (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            id={setting.id}
                            value={setting.newNonWorkingDate}
                            onChange={e => setting.setNewNonWorkingDate(e.target.value)}
                            className="border rounded px-2 py-1 w-40"
                          />
                          <button
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition add"
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
                        <ul className="list-disc pl-5 mt-2 max-h-32 overflow-y-auto">
                          {setting.nonWorkingDates.length === 0 && (
                            <li className="text-gray-400 italic">Aucune date ajoutée</li>
                          )}
                          {setting.nonWorkingDates.map((date: Date, idx: number) => (
                            <li key={format(date, "yyyy-MM-dd") + idx} className="flex items-center gap-2">
                              <span>{format(date, "dd/MM/yyyy")}</span>
                              <button
                                className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded"
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
                      </div>
                    ) : (
                      <input
                        id={setting.id}
                        type={setting.type}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-40"
                        value={setting.value}
                        checked={setting.value}
                        onChange={e =>
                          setting.onChange(
                            setting.type === "checkbox" ? e.target.checked : e.target.value
                          )
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 self-end"
          onClick={onClose}
        >
          Fermer
        </button>
      </div>
    </Modal>
  );
};


// Composant pour choisir le type de rendez-vous à créer
type ChoiceAppointmentTypeProps = {
  onSelect: (appointment: Appointment) => void;
  isOpen: boolean;
  setAddAppointmentStep?: (step: "select" | "form" | "") => void;
  newAppointmentInfo: { date: Date; employeeId: number; intervalName: "morning" | "afternoon" | "day" } | null;
};

// Icônes pour chaque type d'événement
const typeIcons: Record<string, JSX.Element> = {
  Chantier: (
    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2M16 11V7a4 4 0 10-8 0v4M12 17v-6" />
    </svg>
  ),
  Absence: (
    <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Autre: (
    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  ),
};

// Couleurs pour chaque type d'événement
const colorMap: Record<string, string> = {
  Chantier: "blue",
  Absence: "yellow",
  Autre: "purple",
};

// Composant pour choisir le type de rendez-vous à créer (modal)
const ChoiceAppointmentType: React.FC<ChoiceAppointmentTypeProps> = ({
  onSelect,
  isOpen,
  setAddAppointmentStep,
  newAppointmentInfo,
}) => {
  // Sécurité : valeurs par défaut si jamais newAppointmentInfo est null
  const date = newAppointmentInfo?.date ?? new Date();
  const intervalName = newAppointmentInfo?.intervalName ?? "morning";
  const employeeId = newAppointmentInfo?.employeeId ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setAddAppointmentStep?.("") || null}
      title="Choisissez le type de rendez-vous"
    >
      <div className="mb-4 text-lg font-semibold text-center">
        Quel type souhaitez-vous ajouter ?
      </div>
      <div className="flex flex-col gap-3">
        {eventTypes.map((eventType) => (
          <button
            key={eventType.label}
            type="button"
            className={`
              flex items-center gap-4 p-4 rounded-xl border border-gray-200
              bg-white hover:bg-${colorMap[eventType.label]}-50
              shadow-sm cursor-pointer
              focus:outline-none focus:ring-2
              group
              hover:scale-105 origin-top-center transition-transform duration-300
            `}
            style={{ minHeight: 64 }}
            onClick={() => {
              onSelect({
                title: eventType.dataSource[0].label,
                description: "",
                startDate: setHours(
                  setMinutes(date, 0),
                  intervalName === "morning" 
                    ? HALF_DAY_INTERVALS[0].startHour
                    : intervalName === "day" 
                      ? DAY_INTERVALS[0].startHour
                      : HALF_DAY_INTERVALS[1].startHour
                ),
                endDate: setHours(
                  setMinutes(date, 0),
                  intervalName === "morning" 
                    ? HALF_DAY_INTERVALS[0].endHour
                    : intervalName === "day" 
                      ? DAY_INTERVALS[0].endHour
                      : HALF_DAY_INTERVALS[1].endHour
                ),
                image: "",
                employeeId,
                type: eventType.label as "Chantier" | "Absence" | "Autre",
              } as Appointment);
            }}
          >
            <span className="flex items-center justify-center rounded-full transition-colors">
              {typeIcons[eventType.label]}
            </span>
            <span className={`text-${colorMap[eventType.label]}-700 font-semibold text-lg`}>
              {eventType.label}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setAddAppointmentStep?.("")}
        className="mt-6 w-full py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition"
      >
        Annuler
      </button>
    </Modal>
  );
};


type SearchOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  eventSearchInput: string;
  setEventSearchInput: (input: string) => void;
  filteredEvents: (EventTemplate & { type: "Chantier" | "Absence" | "Autre" })[];
};

const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  eventSearchInput,
  setEventSearchInput,
  filteredEvents,
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
        <div className="flex-1 overflow-y-auto px-3 py-2 bg-white rounded-2xl">
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
                <DraggableSource
                  key={`${event.label}-${event.id}-${index}`}
                  id={event.id}
                  title={event.label}
                  type={event.type}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}