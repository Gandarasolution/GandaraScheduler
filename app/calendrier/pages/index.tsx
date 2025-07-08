"use client";

// Imports React, hooks, DnD, date-fns, types, composants, et données
import React, { useState, useCallback, useRef, useEffect, JSX, useMemo, startTransition, Key } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  addDays,
  eachDayOfInterval,
  setHours,
  setMinutes,
  format,
  addHours,
  addWeeks,
  addMonths,
} from "date-fns";
import { Appointment, Employee, HalfDayInterval } from "../types";
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
import Holidays from 'date-holidays';
import { SelectedAppointmentContext } from "../context/SelectedAppointmentContext";
import { SelectedCellContext } from "../context/SelectedCellContext";
const hd = new Holidays('FR'); // 'FR' pour la France
const holidays = hd.getHolidays(new Date().getFullYear());

// Fonctions utilitaires pour la gestion des jours travaillés
const isHoliday = (date: Date) => {
  const dateStr = date.toISOString().split('T')[0];
  return holidays.some(holiday => holiday.date === dateStr);
};

const isWorkedDay = (date: Date) => {
  return date.getDay() !== 0 && date.getDay() !== 6 && !isHoliday(date);
};

const getNextRestDay = (date: Date) => {
  let next = new Date(date);
  while (isWorkedDay(next)) {
    next = addHours(next, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour);
  }
  return next;
};

const getNextWorkedDay = (date: Date) => {
  let next = new Date(date);
  while (!isWorkedDay(next)) {
    next = addHours(next, HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour);
  }
  return next;
};

const getWorkedDayIntervals = (start: Date, end: Date) => {
  const intervals: { start: Date, end: Date }[] = [];
  let day = getNextWorkedDay(start);

  while(day < end){
    const intervalEnd = getNextRestDay(day);    
    if (intervalEnd > end) {
      // Si l'intervalle dépasse la date de fin, on le limite
      intervals.push({
        start: new Date(day),
        end: new Date(end)
      });      
      break;
    }
    intervals.push({
      start: new Date(day),
      end: intervalEnd
    });
    day = getNextWorkedDay(intervalEnd);
    // Si le jour suivant dépasse la date de fin, on arrête
    if (day > end) break;      
  }
  return intervals;
};

// Définition des types d'événements pour le drawer
const eventTypes = [
  { label: "Chantier", color: "primary", dataSource: chantier, placeholder: "Sélectionnez un chantier" },
  { label: "Absence", color: "warning", dataSource: absences, placeholder: "Sélectionnez une absence" },
  { label: "Autre", color: "secondary", dataSource: autres, placeholder: "Sélectionnez autre" },
];

// Constantes pour la timeline et les cellules
const DAYS_TO_ADD = 30;
const THRESHOLD_MAX = 80;
const THRESHOLD_MIN = 20;
const WINDOW_SIZE = 100;
export const EMPLOYEE_COLUMN_WIDTH = "150px";
export const CELL_WIDTH = 60;
export const CELL_HEIGHT = 50;

export const HALF_DAY_INTERVALS: HalfDayInterval[] = [
  { name: "morning", startHour: 0, endHour: 12 },
  { name: "afternoon", startHour: 12, endHour: 24 },
];
export const DAY_INTERVALS: HalfDayInterval[] = [
  { name: "day", startHour: 0, endHour: 24 },
];

// Petite fonction utilitaire pour éviter les appels trop fréquents (scroll, etc.)
function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Composant principal de la page calendrier
export default function HomePage() {
  // Etats principaux
  const [dayInTimeline, setDayInTimeline] = useState(
    eachDayOfInterval({ start: addDays(new Date(), -WINDOW_SIZE / 2), end: addDays(new Date(), WINDOW_SIZE / 2) })
  );
  const [addAppointmentStep, setAddAppointmentStep] = useState<"select" | "form" | "">("");
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState<string>('');
  const isLoadingMoreDays = useRef(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const employees = useRef<Employee[]>(initialEmployees);
  const [isLoading, setIsLoading] = useState(false);
  const isAutoScrolling = useRef(false);
  const appointments = useRef<Appointment[]>(initialAppointments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentForm, setSelectedAppointmentForm] = useState<Appointment | null>(null);
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: Date; employeeId: number ; intervalName: "morning" | "afternoon"} | null>(null);
  const [drawerOptionsSelected, setDrawerOptionsSelected] = useState(eventTypes[0]);
  const [repeatAppointmentData, setRepeatAppointmentData] = useState<{numberCount:number, repeatCount: number | null; repeatInterval: "day" | "week" | "month"; endDate: Date | null } | null>(null);
  const [extendAppointmentData, setExtendAppointmentData] = useState<Date | null>(null);
  const lastScrollLeft = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number, item: { label: string; logo: JSX.Element; action: () => void }[] } | null>(null);
  const clipboardAppointment= useRef<Appointment | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; date: Date } | null>(null);
  const [isFullDay, setIsFullDay] = useState(true);

  const copyAppointmentToClipboard = useCallback((app: Appointment) => {
    if (app) {
      clipboardAppointment.current = { ...app };
    } else {
      console.warn("Aucun rendez-vous sélectionné à copier.");
    }
    console.log("Rendez-vous copié dans le presse-papiers :", clipboardAppointment.current);
    
  }, [selectedAppointment]);

  const pasteAppointment = useCallback((cell: { employeeId: number; date: Date }) => {
    if (!clipboardAppointment.current) return;

    const startDate = clipboardAppointment.current.startDate;
    const endDate = clipboardAppointment.current.endDate;

    console.log(startDate, endDate);
    
    // Différence entre les dates de début et de fin du rendez-vous copié
    const diff = endDate.getTime() - startDate.getTime();

    // Nouvelle date de début basée sur la cellule sélectionnée
    const newStartDate = new Date(cell.date.getTime());
    const newEndDate = new Date(newStartDate.getTime() + diff);

    console.log("Nouvelle date de début :", newStartDate);
    console.log("Nouvelle date de fin :", newEndDate);

    if (!isWorkedDay(newStartDate)) {
      console.warn("Les dates sélectionnées ne sont pas des jours travaillés.");
      return;
    }

    const days = getWorkedDayIntervals(newStartDate, newEndDate);

    for (const day of days) {
      createAppointment?.(
        clipboardAppointment.current.title,
        day.start,
        day.end,
        cell.employeeId,
        clipboardAppointment.current.type as 'Chantier' | 'Absence' | 'Autre',
        clipboardAppointment.current.imageUrl
      );
    }
  }, []);
   

  // Utilitaire pour savoir si on est au bord du scroll horizontal
  function isAtMinOrMaxScroll(container: HTMLDivElement) {
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isAtMin = scrollLeft === 0;
    const isAtMax = Math.abs(scrollLeft + clientWidth - scrollWidth) < 1;
    return { isAtMin, isAtMax };
  }

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
        isLoadingMoreDays.current = true;
        if (Math.abs(speed) < 0.5) setIsLoading(true);

        setDayInTimeline((prevDays) => {
          const lastDay = prevDays[prevDays.length - 1];
          const newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(lastDay, i + 1));
          return [...prevDays, ...newDays];
        });

        isLoadingMoreDays.current = false;
        setIsLoading(false);
      }
      // Ajout de jours à gauche si on approche du bord gauche
      else if (scrollPercentage <= THRESHOLD_MIN) {
        isLoadingMoreDays.current = true;
        if (Math.abs(speed) < 0.5) setIsLoading(true);

        setDayInTimeline((prevDays) => {
          const firstDay = prevDays[0];
          const newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(firstDay, -(i + 1))).reverse();
          const allDays = [...newDays, ...prevDays].slice(0, WINDOW_SIZE);
          return allDays;
        });

        // On ajuste scrollLeft dans un useEffect après le rendu
      }
    }, 100), // Débouncing court pour plus de fluidité
    []
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
      setIsLoading(false);
    }, 50);
  }, []);

  // Gestion de la création et édition de rendez-vous
  const handleSaveAppointment = useCallback((appointment: Appointment) => {
    const days = getWorkedDayIntervals(appointment.startDate, appointment.endDate);
    
    
    // Fonction utilitaire pour créer les rendez-vous supplémentaires
    const createExtraAppointments = (fromIndex = 1) => {
      days.slice(fromIndex).forEach(day => {
        createAppointment(
          appointment.title,
          day.start,
          day.end,
          appointment.employeeId as number,
          appointment.type as 'Chantier' | 'Absence' | 'Autre',
          appointment.imageUrl
        );
      });
    };
    
    if (appointment.id) {
      // Mise à jour du rendez-vous principal
      appointments.current = appointments.current.map(app =>
        app.id === appointment.id
          ? { ...appointment, startDate: days[0].start, endDate: days[0].end }
          : app
      );
      if (days.length > 1) createExtraAppointments();
    } else {
      createExtraAppointments(0);
    }
    researchAppointments(); // Met à jour la liste filtrée
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setNewAppointmentInfo(null);
  }, []);

  const handleDeleteAppointment = useCallback((id : number) => {
    appointments.current = appointments.current.filter((app) => app.id !== id);
    researchAppointments(); // Met à jour la liste filtrée
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, []);

  const handleOpenEditModal = useCallback((appointment: Appointment) => {
    setSelectedAppointmentForm(appointment);
    setIsModalOpen(true);
  }, []);

  const handleOpenNewModal = useCallback((date: Date, employeeId: number, intervalName: "morning" | "afternoon") => {    
    setAddAppointmentStep("select");
    setSelectedAppointmentForm(null);
    setNewAppointmentInfo({ date, employeeId, intervalName });
  }, []);

  const handleRepeat = useCallback(() => {
    if (!repeatAppointmentData) return;

    const { repeatCount, endDate, repeatInterval, numberCount} = repeatAppointmentData;
    
    // Créer des rendez-vous répétés
    createRepeatedAppointments(repeatInterval, repeatCount ?? 0, endDate ?? undefined, numberCount);
    setRepeatAppointmentData(null);
  }, [repeatAppointmentData]);

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

  }, [extendAppointmentData, selectedAppointment]);

  // Création de rendez-vous répétés
  const createRepeatedAppointments = (repeatInterval: "day" | "week" | "month", repeatCount: number, endDate?: Date, numberCount?: number) => {
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
        
    if (repeatCount) {
      for (let i = 0; i < repeatCount; i++) {
        const newStartDate = new Date(currentStartDate.getTime());
        const newEndDate = new Date(newStartDate.getTime() + diff);

        const days = getWorkedDayIntervals(newStartDate, newEndDate); 

        days.forEach(day => {
          newAppointments.push({
          id: Number(Date.now() + i), // Assure l'unicité de l'ID
          title: selectedAppointment?.title || "Rendez-vous répété",
          description: selectedAppointment?.description || "Description du rendez-vous répété",
          startDate: day.start ,
          endDate: day.end,
          imageUrl: selectedAppointment?.imageUrl,
          employeeId: selectedAppointment?.employeeId,
          type: selectedAppointment?.type,
        });
      });

      // Incrémente la date pour le prochain rendez-vous
      currentStartDate = repeatInterval === "day" ? addDays(currentStartDate, numberCount || 1)
        : repeatInterval === "week" ? addWeeks(currentStartDate, numberCount || 1) 
        : addMonths(currentStartDate, numberCount || 1);
      }
    }
    else if(endDate){      
      while (currentStartDate <= endDate) {
        const newStartDate = new Date(currentStartDate.getTime());
        const newEndDate = new Date(newStartDate.getTime() + diff);

        const days = getWorkedDayIntervals(newStartDate, newEndDate); 
        
        days.forEach(day => {
          newAppointments.push({
          id: Number(Date.now() + day.start.getTime()), // Assure l'unicité de l'ID
          title: selectedAppointment?.title || "Rendez-vous répété",
          description: selectedAppointment?.description || "Description du rendez-vous répété",
          startDate: day.start ,
          endDate: day.end,
          imageUrl: selectedAppointment?.imageUrl,
          employeeId: selectedAppointment?.employeeId,
          type: selectedAppointment?.type,
        });
      });

      // Incrémente la date pour le prochain rendez-vous
      currentStartDate = repeatInterval === "day" ? addDays(currentStartDate, numberCount || 1)
        : repeatInterval === "week" ? addWeeks(currentStartDate, numberCount || 1) 
        : addMonths(currentStartDate, numberCount || 1);
      }
    }
    // Ajoute les nouveaux rendez-vous à la liste
    appointments.current = [...appointments.current, ...newAppointments];
    researchAppointments(); // Met à jour la liste filtrée
    setRepeatAppointmentData(null);
  };

  // Déplacement d'un rendez-vous (drag & drop ou resize)
  const moveAppointment = useCallback(
    (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection: 'left' | 'right' = 'right') => {
      const appointment = appointments.current.find((app) => app.id === id);
    
      if (!appointment) return; // Rendez-vous non trouvé

      const days = getWorkedDayIntervals(newStartDate, newEndDate);
      
      if (days.length === 0) return; // Pas de jours travaillés dans l'intervalle
      
      if (resizeDirection === 'right') {
        // Met à jour le rendez-vous principal sur le premier intervalle
        onResize(appointment.id, days[0].start, days[0].end, newEmployeeId);
        // Création de nouveaux rendez-vous pour les autres intervalles travaillés
        for (let index = 1; index < days.length; index++) {
          const day = days[index];
          createAppointment?.(appointment.title, day.start, day.end, newEmployeeId, appointment.type as 'Chantier' | 'Absence' | 'Autre', appointment.imageUrl);
        }
      }
      if (resizeDirection === 'left') {
        // Met à jour le rendez-vous principal sur le dernier intervalle
        onResize(appointment.id, days[days.length - 1].start, days[days.length - 1].end, newEmployeeId);
        // Création de nouveaux rendez-vous pour les autres intervalles travaillés (sens inverse)
        for (let index = days.length - 2; index >= 0; index--) {
          const day = days[index];
          createAppointment?.(appointment.title, day.start, day.end, newEmployeeId, appointment.type as 'Chantier' | 'Absence' | 'Autre', appointment.imageUrl);
        }
      }
    },
    []
  );

  const onResize = useCallback(
    (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId?: number) => {     
      appointments.current = appointments.current.map((app) =>
        app.id === id
          ? { ...app, startDate: newStartDate, endDate: newEndDate, employeeId: newEmployeeId || app.employeeId }
          : app
      );
      researchAppointments(); // Met à jour la liste filtrée
    }, []
  );


  // Création d'un rendez-vous depuis un drag externe
  const createAppointmentFromDrag = useCallback(
    (title: string, date: Date, intervalName: "morning" | "afternoon", employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => {
      const startHour = HALF_DAY_INTERVALS.find(interval => interval.name === intervalName)?.startHour || 0;
      const endHour = HALF_DAY_INTERVALS.find(interval => interval.name === intervalName)?.endHour || 24;

      const startDate = setHours(setMinutes(new Date(date), 0), startHour);
      const endDate = setHours(setMinutes(new Date(date), 0), endHour);

      createAppointment(title, startDate, endDate, employeeId, typeEvent, imageUrl);
    },
    []
  );

  // Création d'un rendez-vous (utilisé lors du resize fractionné)
  const createAppointment = useCallback(
    (title: string, startDate: Date, endDate: Date, employeeId: number, typeEvent: 'Chantier' | 'Absence' | 'Autre', imageUrl?: string) => {
      const newApp: Appointment = {
        id: Number(Date.now() + Math.random()), // Assure l'unicité de l'ID
        title,
        description: `Nouvel élément ${title}`,
        startDate,
        endDate,
        imageUrl,
        employeeId,
        type: typeEvent,
      };
      appointments.current = [...appointments.current, newApp];
      researchAppointments(); // Met à jour la liste filtrée
  }, []);


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

    if (origin === 'appointment' && appointment) {      
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
              setSelectedAppointmentForm(appointment);
              setIsModalOpen(true);
            }
          },
          { 
            label: "Supprimer", 
            logo: 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash3-fill" viewBox="0 0 16 16">
                <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"/>
              </svg>,
            action: () => {
              handleDeleteAppointment(appointment.id); // Appel de la fonction de suppression avec l'ID du rendez-vous sélectionné
              setSelectedAppointment(null); // Réinitialiser l'ID sélectionné après la suppression
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
  }, [handleDeleteAppointment, copyAppointmentToClipboard, pasteAppointment]);

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
      mainScrollRef.current.scrollLeft += widthAdded;
      isLoadingMoreDays.current = false;
      setIsLoading(false);
    }
  }, [dayInTimeline]);

  // Appelle handleScroll si on est déjà au bord après ajout
  useEffect(() => {
    if (mainScrollRef.current) {
      const { isAtMin, isAtMax } = isAtMinOrMaxScroll(mainScrollRef.current);
      if (isAtMin || isAtMax) {
        handleScroll();
      }
    }
    // eslint-disable-next-line
  }, [dayInTimeline]);


  // Rendu principal de la page
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Barre du haut : date, recherche */}
        <div className="sticky top-0 z-20 bg-white shadow px-4 py-2 flex items-center justify-between">
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            value={format(dayInTimeline[Math.floor(WINDOW_SIZE / 2)], "yyyy-MM-dd")}
            onChange={(e) => {
              const selectedDate = new Date(e.target.value);
              if (isNaN(selectedDate.getTime())) return;
              goToDate(selectedDate);
            }}
          />
         
         <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 ml-4">
            <label htmlFor="toggle-full-day" className="text-sm font-medium text-gray-700">
              Vue journée complète
            </label>
            <input
              id="toggle-full-day"
              type="checkbox"
              checked={isFullDay}
              onChange={e => setIsFullDay(e.target.checked)}
              className="accent-blue-600 w-5 h-5"
            />
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
                    onAppointmentMoved={moveAppointment}
                    onCellDoubleClick={handleOpenNewModal}
                    onAppointmentDoubleClick={handleOpenEditModal}
                    onExternalDragDrop={createAppointmentFromDrag}
                    handleContextMenu={handleContextMenu}
                    isHoliday={isHoliday}
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
                  value={repeatAppointmentData.repeatCount || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (value > 0) {
                      setRepeatAppointmentData((prev) => {
                        return prev
                          ? { ...prev, repeatCount: value, endDate: null }
                          : { numberCount: 1, repeatCount: value, repeatInterval: "day", endDate: null };
                      });
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
              onSave={handleSaveAppointment}
              onDelete={handleDeleteAppointment}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </Modal>
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
        {/* Barre de chargement */}
        {isLoading && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-200 z-50">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: "30%" }} />
          </div>
        )}
        
        
      </div>
    </DndProvider>
  );
}

// Composant pour choisir le type de rendez-vous à créer
type ChoiceAppointmentTypeProps = {
  onSelect: (appointment: Appointment) => void;
  isOpen: boolean;
  setAddAppointmentStep?: (step: "select" | "form" | "") => void;
  newAppointmentInfo: { date: Date; employeeId: number; intervalName: "morning" | "afternoon" } | null;
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
                    : HALF_DAY_INTERVALS[1].startHour
                ),
                endDate: setHours(
                  setMinutes(date, 0),
                  intervalName === "morning"
                    ? HALF_DAY_INTERVALS[0].endHour
                    : HALF_DAY_INTERVALS[1].endHour
                ),
                imageUrl: "",
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