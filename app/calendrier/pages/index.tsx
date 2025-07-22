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

// Imports React, hooks, DnD, date-fns, types, composants, et données
import React, { useState, useCallback, useRef, useEffect, JSX} from "react";
import { DndProvider } from "react-dnd";
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
import { Appointment, Employee } from "../types";
import CalendarGrid from "../components/CalendarGrid";
import Modal from "../components/Modal";
import AppointmentForm from "../components/AppointmentForm";
import DraggableSource from "../components/DraggableSource";
import Drawer from "../components/Drawer";
import RightClickComponent from "../components/RightClickComponent";
import {
  initialTeams,
  initialEmployees,
  initialAppointments,
  chantier,
  absences,
  autres,
} from "../../datasource";
import { SelectedAppointmentContext } from "../context/SelectedAppointmentContext";
import { SelectedCellContext } from "../context/SelectedCellContext";
import { CELL_WIDTH, DAY_INTERVALS, DAYS_TO_ADD, HALF_DAY_INTERVALS, THRESHOLD_MAX, THRESHOLD_MIN, WINDOW_SIZE } from "../utils/constants";
import { getNextWorkedDay, getWorkedDayIntervals, isWorkedDay, isWeekend, getBeforeWorkedDay } from "../utils/dates";
import { calendars } from "../../datasource";

// Définition des types d'événements pour le drawer
const eventTypes = [
  { label: "Chantier", color: "primary", dataSource: chantier, placeholder: "Sélectionnez un chantier" },
  { label: "Absence", color: "warning", dataSource: absences, placeholder: "Sélectionnez une absence" },
  { label: "Autre", color: "secondary", dataSource: autres, placeholder: "Sélectionnez autre" },
];


// Petite fonction utilitaire pour éviter les appels trop fréquents (scroll, etc.)
function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
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
  // --- ETATS PRINCIPAUX ---
  const [includeWeekend, setIncludeWeekend] = useState(true);
  const [nonWorkingDates, setNonWorkingDates] = useState<Date[]>([]);
  const [newNonWorkingDate, setNewNonWorkingDate] = useState<string>("");
  const [dayInTimeline, setDayInTimeline] = useState<Date[]>([]);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState<string>('');
  const isLoadingMoreDays = useRef(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<number>(calendars[0]?.id ?? 1);
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
  const [drawerOptionsSelected, setDrawerOptionsSelected] = useState(eventTypes[0]);
  const [repeatAppointmentData, setRepeatAppointmentData] = useState<{numberCount:number, repeatCount: number | null; repeatInterval: "day" | "week" | "month"; endDate: Date | null } | null>(null);
  const [extendAppointmentData, setExtendAppointmentData] = useState<Date | null>(null);
  const lastScrollLeft = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number, item: { label: string; logo: JSX.Element; action: () => void; actif?: boolean }[]} | null>(null);
  const clipboardAppointment= useRef<Appointment | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; date: Date } | null>(null);
  const [isFullDay, setIsFullDay] = useState(false);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState<"Êtes-vous sûr de vouloir supprimer ce rendez-vous ?" | "Êtes-vous sûr de vouloir diviser ce rendez-vous ?">("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?");
  const [selectedDate, setSelectedDate] = useState<Date>(dayInTimeline[Math.floor(WINDOW_SIZE / 2)]);
  const [modalInfo, setModaltInfo] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);


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
  }, [isFullDay]);

  const getFullSequence = useCallback((appointmentId: number): Appointment[] => {
    const sequence: Appointment[] = [appointments.current.find(app => app.id === appointmentId)!];

    // Trouve les RDV avant
    let prev = sequence[0];
    while (true) {
      const prevApp = appointments.current.find(app =>
        app.employeeId === prev.employeeId &&
        app.title === prev.title &&
        isConsecutive(app, prev)
      );
      if (prevApp) {
        sequence.unshift(prevApp);
        prev = prevApp;
      } else {
        break;
      }
    }

    // Trouve les RDV après
    let next = sequence[0];
    while (true) {
      const nextApp = appointments.current.find(app =>
        app.employeeId === next.employeeId &&
        app.title === next.title &&
        isConsecutive(next, app)
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
          id: Number(Date.now() + i), // Assure l'unicité de l'ID
          title: selectedAppointment?.title || "Rendez-vous répété",
          description: selectedAppointment?.description || "Description du rendez-vous répété",
          startDate: day.start ,
          endDate: day.end,
          imageUrl: selectedAppointment?.imageUrl,
          employeeId: selectedAppointment?.employeeId,
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
          id: Number(Date.now() + day.start.getTime()), // Assure l'unicité de l'ID
          title: selectedAppointment?.title || "Rendez-vous répété",
          description: selectedAppointment?.description || "Description du rendez-vous répété",
          startDate: day.start ,
          endDate: day.end,
          imageUrl: selectedAppointment?.imageUrl,
          employeeId: selectedAppointment?.employeeId,
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
    setModaltInfo(`${newAppointments.length} rendez-vous créé${newAppointments.length > 1 ? 's' : ''}`);
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
  // Création d'un rendez-vous (utilisé lors du resize fractionné)
  const createAppointment = useCallback(
    (title: string, startDate: Date, endDate: Date, employeeId: number, imageUrl?: string) => {
      const newApp: Appointment = {
        id: Number(Date.now() + Math.random()), // Assure l'unicité de l'ID
        title,
        description: `Nouvel élément ${title}`,
        startDate,
        endDate,
        imageUrl,
        employeeId,
      };
      appointments.current = [...appointments.current, newApp];
      researchAppointments(); // Met à jour la liste filtrée
  }, [researchAppointments]);

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
        clipboardAppointment.current.imageUrl
      );
    }
  }, [createAppointment, isFullDay, nonWorkingDates]);

  // Gestion du scroll infini horizontal (ajout de jours à gauche/droite)
  const handleScroll = useCallback(
    debounce(() => {
      if (isAutoScrolling.current || isLoadingMoreDays.current || !mainScrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = mainScrollRef.current;
      const scrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100;

      const now = Date.now();
      const delta = scrollLeft - lastScrollLeft.current;
      const dt = now - lastScrollTime.current;
      const speed = dt > 0 ? delta / dt : 0;

      lastScrollLeft.current = scrollLeft;
      lastScrollTime.current = now;
      // Ajout de jours à droite si on approche du bord droit
      if (scrollPercentage >= THRESHOLD_MAX) {
        isAddingRight.current = true;
        isLoadingMoreDays.current = true;
        if (Math.abs(speed) < 0.5) setIsLoading(true);

        setDayInTimeline((prevDays) => {
          const lastDay = prevDays[prevDays.length - 1];
          let newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(lastDay, i + 1));
          newDays = includeWeekend ? newDays : newDays.filter(day => !isWeekend(day));
          return [...prevDays, ...newDays].slice(-WINDOW_SIZE);
        });
      }
      // Ajout de jours à gauche si on approche du bord gauche
      else if (scrollPercentage <= THRESHOLD_MIN) {
        isAddingLeft.current = true;
        isLoadingMoreDays.current = true;
        if (Math.abs(speed) < 0.5) setIsLoading(true);

        setDayInTimeline((prevDays) => {
          const firstDay = prevDays[0];
          let newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(firstDay, -(i + 1))).reverse();
          newDays = includeWeekend ? newDays : newDays.filter(day => !isWeekend(day));
          return [...newDays, ...prevDays].slice(0, WINDOW_SIZE);
        });
        // On ajuste scrollLeft dans un useEffect après le rendu
      }
      setIsLoading(false);
      isLoadingMoreDays.current = false;

    }, 100), // Débouncing court pour plus de fluidité
    [includeWeekend, nonWorkingDates]
  );

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
        isAutoScrolling.current = false;
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

      const days = getWorkedDayIntervals(
        newStartDate, 
        newEndDate,
        isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
        !includeWeekend,
        nonWorkingDates
    );

      if (days.length === 0) return; // Pas de jours travaillés dans l'intervalle
      
      if (resizeDirection === 'right') {
        // Met à jour le rendez-vous principal sur le premier intervalle
        onResize(appointment.id, newStartDate, days[0].end, newEmployeeId);
        // Création de nouveaux rendez-vous pour les autres intervalles travaillés
        for (let index = 1; index < days.length; index++) {
          const day = days[index];
          createAppointment?.(appointment.title, day.start, day.end, newEmployeeId, appointment.imageUrl);
        }
      }
      if (resizeDirection === 'left') {
        // Met à jour le rendez-vous principal sur le dernier intervalle
        onResize(appointment.id, days[days.length - 1].start, newEndDate, newEmployeeId);
        // Création de nouveaux rendez-vous pour les autres intervalles travaillés (sens inverse)
        for (let index = days.length - 2; index >= 0; index--) {
          const day = days[index];
          createAppointment?.(appointment.title, day.start, day.end, newEmployeeId, appointment.imageUrl);
        }
      }
    },
    [onResize, createAppointment, isFullDay, DAY_INTERVALS, HALF_DAY_INTERVALS, includeWeekend, nonWorkingDates]
  );

  // Gestion de la création et édition de rendez-vous
  const handleSaveAppointment = useCallback((appointment: Appointment, includeWeekend: boolean) => {    
    const days = getWorkedDayIntervals(
      appointment.startDate, 
      appointment.endDate,
      isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      includeWeekend,
      nonWorkingDates
    );

    console.log("Jours travaillés :", days);
    

    
    // Fonction utilitaire pour créer les rendez-vous supplémentaires
    const createExtraAppointments = (fromIndex = 1) => {
      days.slice(fromIndex).forEach(day => {
        createAppointment(
          appointment.title,
          day.start,
          day.end,
          appointment.employeeId as number,
          appointment.imageUrl
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
              imageUrl: appointment.imageUrl,
            };
          }
          return app;
        });
        index++;
      }
      if (days.length > index) createExtraAppointments(index);
      else {
        // Si on a moins de jours que prévu, on supprime les RDV supplémentaires
        appointments.current = appointments.current.filter(app => !seq.some(s => s.id === app.id && !days.some(d => d.start.getTime() === app.startDate.getTime())));
      }
      
    } else {
      createExtraAppointments(0);
    }
    researchAppointments(); // Met à jour la liste filtrée
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setNewAppointmentInfo(null);
  }, [researchAppointments, createAppointment, getFullSequence, isFullDay, nonWorkingDates]);


  const handleDeleteAppointmentConfirm = useCallback(() => {
    setAlertTitle("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?");
    setIsAlertVisible(true)
  }, []);

  const handleDeleteAppointment = useCallback((id? : number) => {
    if (!id) {
      console.warn("Aucun ID de rendez-vous fourni pour la suppression.");
      return;
    }
    setIsAlertVisible(false);
    appointments.current = appointments.current.filter((app) => app.id !== id);
    researchAppointments(); // Met à jour la liste filtrée
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, [researchAppointments]);

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
    setSelectedAppointmentForm({
      title: "",
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
      imageUrl: "",
      employeeId,
    } as Appointment);
    setIsModalOpen(true);
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

    const { startDate, endDate, employeeId, imageUrl } = appointmentToDivide;
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
      imageUrl
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
    (title: string, date: Date, intervalName: "morning" | "afternoon", employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => {
      const startHour = HALF_DAY_INTERVALS.find(interval => interval.name === intervalName)?.startHour || 0;
      const endHour = HALF_DAY_INTERVALS.find(interval => interval.name === intervalName)?.endHour || 24;

      const startDate = setHours(setMinutes(new Date(date), 0), startHour);
      const endDate = setHours(setMinutes(new Date(date), 0), endHour);

      createAppointment(title, startDate, endDate, employeeId, imageUrl);
    },
    [repeatAppointmentData, createAppointment]
  );

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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil-fill" viewBox="0 0 16 16">
                <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/>
              </svg>
              ,
            action: () => {
              handleOpenEditModal(appointment);
            }
          },
          { 
            label: "Supprimer", 
            logo: 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash3-fill" viewBox="0 0 16 16">
                <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"/>
              </svg>,
            action: () => {
              handleDeleteAppointmentConfirm(); // Appel de la fonction de suppression avec l'ID du rendez-vous sélectionné
            }
          },
          {
            label: 'Copier',
            logo:
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-copy" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
              </svg>,
            action: () => {
              copyAppointmentToClipboard(appointment);
            }
          },
          {
            label: 'Répéter',
            logo:
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-repeat" viewBox="0 0 16 16">
                <path d="M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.896.446A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192m3.81.086a.5.5 0 0 1 .67.225A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192V12h6a4 4 0 0 0 3.585-5.777.5.5 0 0 1 .225-.67Z"/>
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
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">

              <g id="Complete">
                <g id="expand">
                  <g>
                    <polyline data-name="Right" fill="none" id="Right-2" points="3 17.3 3 21 6.7 21" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <line fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="10" x2="3.8" y1="14" y2="20.2"/>
                    <line fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="14" x2="20.2" y1="10" y2="3.8"/>
                    <polyline data-name="Right" fill="none" id="Right-3" points="21 6.7 21 3 17.3 3" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-vr" viewBox="0 0 16 16">
                <path d="M3 12V4a1 1 0 0 1 1-1h2.5V2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5v-1H4a1 1 0 0 1-1-1m6.5 1v1H12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H9.5v1H12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1zM8 16a.5.5 0 0 1-.5-.5V.5a.5.5 0 0 1 1 0v15a.5.5 0 0 1-.5.5"/>
              </svg>,
            action: () => {
              handleDivideAppointmentConfirm(); // Appel de la fonction de division avec l'ID du rendez-vous sélectionné
            },
            actif: appointment.endDate.getTime() - appointment.startDate.getTime() <= 12 * 60 * 60 * 1000 // Si la durée est supérieure à 12 heure
          },
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
    goToDate(new Date());
  }, []); // Centrage initial

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "c" && selectedAppointment) {
        copyAppointmentToClipboard(selectedAppointment);
      }
      else if (e.ctrlKey && e.key === "v" && selectedCell) {
        pasteAppointment(selectedCell);
      }
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setContextMenu(null); // Ferme le menu contextuel s'il est ouvert
        setIsDrawerOpen(false); // Ferme le drawer s'il est ouvert
        setIsModalOpen(false); // Ferme la modal s'il est ouvert
        const searchInputElement = document.querySelector<HTMLInputElement>("#search");
        if (searchInputElement) {
          searchInputElement.focus();
        }
      }

      if (!mainScrollRef.current) return;
      if (e.key === 'ArrowRight') {
        mainScrollRef.current.scrollLeft += 100; // 100px au lieu de 40px par défaut
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft') {
        mainScrollRef.current.scrollLeft -= 100;
        e.preventDefault();
      }

    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedAppointment, selectedCell, copyAppointmentToClipboard, pasteAppointment]);

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
    const timeout = setTimeout(() => setModaltInfo(null), 4000);
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
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Barre du haut : date, recherche */}
        {!isMobile && (
          <div className="sticky top-0 z-20 bg-white shadow px-4 py-2 flex items-center justify-between main-header">
            <div>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  if (isNaN(selectedDate.getTime())) return;
                  setSelectedDate(selectedDate);
                }}
              />
              <button
                className="ml-4 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                onClick={() => goToDate(selectedDate)}
              >
                  Valider
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCalendarId}
                onChange={e => setSelectedCalendarId(Number(e.target.value))}
                className="border rounded px-2 py-1 mr-4"
              >
                {calendars.map(cal => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 ml-4">
                <button
                  className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-gear-fill" viewBox="0 0 16 16">
                    <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
                  </svg>
                </button>
              </div>
              {/* Champ de recherche */}
              <div className="w-80 max-w-full">
                <label htmlFor="search" className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">
                  Recherche
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" aria-hidden="true" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
                  </div>
                  <input
                    type="search"
                    id="search"
                    className="block w-full p-3 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-100 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Rechercher un rendez-vous"
                    value={searchInput || ""}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Grille principale du calendrier */}
        <div className="flex-1 flex flex-col max-h-full max-w-full overflow-hidden">
          <div
            className="flex flex-grow overflow-auto snap-x snap-mandatory scrollbar-hide"
            ref={mainScrollRef}
            onScroll={handleScroll}
            tabIndex={0}
            style={{ outline: "none" }}
          >
            <div
              className={`flex-grow rounded-lg shadow-md ${isLoading ? "pointer-events-none opacity-60" : ""}`}
            >
              <SelectedAppointmentContext.Provider value={{ selectedAppointment, setSelectedAppointment}}>
                <SelectedCellContext.Provider value={{ selectedCell, setSelectedCell }}>
                  <CalendarGrid
                    employees={employees.current}
                    appointments={filteredAppointments}
                    initialTeams={initialTeams}
                    dayInTimeline={dayInTimeline}
                    HALF_DAY_INTERVALS={isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS}
                    isFullDay={isFullDay}
                    selectedCalendarId={selectedCalendarId}
                    isMobile={isMobile}
                    includeWeekend={includeWeekend}
                    nonWorkingDates={nonWorkingDates}
                    onAppointmentMoved={moveAppointment}
                    onCellDoubleClick={handleOpenNewModal}
                    onAppointmentDoubleClick={handleOpenEditModal}
                    onExternalDragDrop={createAppointmentFromDrag}
                    handleContextMenu={handleContextMenu}
                  />
                </SelectedCellContext.Provider>
              </SelectedAppointmentContext.Provider>
            </div>
          </div>
        </div>
        {/* Menu contextuel */}
        <RightClickComponent
          open={!!contextMenu}
          coordinates={contextMenu}
          rightClickItem={contextMenu?.item || []}
          clipBoardAppointment={clipboardAppointment.current}
          onClose={closeContextMenu}
        />
        {/* Modal unique pour tous les usages (création, édition, répétition) */}
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
        >
          {!!repeatAppointmentData ? (
            <div 
              className="flex flex-col gap-6 p-2"
            >
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-medium">
                  <span className="">{'Tous les'}</span>
                  <input
                    required
                    type="number"
                    min={1}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-20"
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
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ml-2"
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
              <div>
                <span>{'Répéter jusqu\'au'} </span>
                <input
                  type="date"
                  className={`${repeatAppointmentData.repeatCount ? 'opacity-50' : 'opacity-100'} border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ml-2`}
                  value={repeatAppointmentData.endDate ? format(repeatAppointmentData.endDate, "yyyy-MM-dd") : ""}
                  min={selectedAppointment?.endDate ? format(selectedAppointment.endDate, "yyyy-MM-dd") : undefined}
                  onChange={e => {
                    const value = e.target.value;
                    setRepeatAppointmentData(prev => {
                      const endDate = value ? new Date(value) : prev?.endDate || new Date();
                      return prev
                        ? { ...prev, endDate, repeatCount: null }
                        : { numberCount: 1, repeatCount: null, repeatInterval: "day", endDate };
                    });                    
                  }}
                />
                <span>{' ou nombre de répétitions'}</span>
                <input
                  type="number"
                  min={1}
                  className={`${repeatAppointmentData.endDate ? 'opacity-50' : 'opacity-100'} border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-20 ml-2`}
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
              {/* Boutons d'action */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setRepeatAppointmentData(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRepeat}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {'Enregistrer'}
                </button>
              </div>
            </div>
          ) : extendAppointmentData ? (
            <div>
              <div>
                <input
                  type="date"
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full mb-4"
                  value={format(extendAppointmentData, "yyyy-MM-dd")}
                  min={selectedAppointment?.endDate ? format(selectedAppointment.endDate, "yyyy-MM-dd") : undefined}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    if (isNaN(selectedDate.getTime())) return;
                    setExtendAppointmentData(selectedDate);
                  }}
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setExtendAppointmentData(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleExtend}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {'Enregistrer'}
                </button>
              </div>
            </div>
          )
           : (
            <AppointmentForm
              appointment={selectedAppointmentForm}
              initialDate={newAppointmentInfo?.date || null}
              initialEmployeeId={newAppointmentInfo?.employeeId || null}
              employees={employees.current}
              HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
              isFullDay={isFullDay}
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
        {/* Drawer latéral pour ajouter un rendez-vous par drag & drop */}
        <Drawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} isDragging={isDrawerOpen}>
          <div className={"flex flex-col items-center"}>
            <div className="mb-3 text-muted" style={{ fontSize: 13 }}>
              Faites glisser un bloc sur la timeline pour l’ajouter.
            </div>
            <select
              className="p-2 w-full border-solid border mb-3 rounded-5 rounded-xs"
              onChange={(e) => {
                const selected = eventTypes.find((ev) => ev.label === e.target.value);
                setDrawerOptionsSelected(selected ?? eventTypes[0]);
              }}
            >
              {eventTypes.map((ev) => (
                <option key={ev.label} value={ev.label}>
                  {ev.label + "s"}
                </option>
              ))}
            </select>
            <div className="d-flex gap-3 flex-column">
              {drawerOptionsSelected?.dataSource?.map((ev) => (
                <DraggableSource 
                  id={ev.label} 
                  title={ev.label} 
                  key={ev.label} 
                  imageUrl={ev.imageUrl} 
                  type={drawerOptionsSelected.label as "Chantier" | "Absence" | "Autre"}
                />
              ))}
            </div>
          </div>
        </Drawer>
        {/* Bouton pour ouvrir le drawer */}
        {!isMobile && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="btn-add"
            style={{
              opacity: isDrawerOpen ? 0 : 1,
              pointerEvents: isDrawerOpen ? "none" : "auto",
            }}
          >
            +
          </button>
        )}
        {/* Barre de chargement */}
        {isLoading && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-200 z-50">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: "30%" }} />
          </div>
        )}
        {/* Alert pour les messages d'erreur */}
        <AlertModal
          isOpen={isAlertVisible}
          title={alertTitle} // ou "Êtes-vous sûr de vouloir supprimer ce rendez-vous ?" ou autre selon le contexte
          confirmLabel="Confirmer"
          cancelLabel="Annuler"
          onConfirm={() => 
            alertTitle === "Êtes-vous sûr de vouloir supprimer ce rendez-vous ?" 
            ? handleDeleteAppointment(selectedAppointment?.id) 
            : handleDivideAppointment(selectedAppointment?.id)}
          onClose={() => setIsAlertVisible(false)}
        />
        {modalInfo && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded shadow z-50">
            {modalInfo}
            <button
              className="ml-4 text-green-900 font-bold"
              onClick={() => setModaltInfo(null)}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </DndProvider>
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