"use client";

// Imports React, hooks, DnD, date-fns, types, composants, et données
import React, { useState, useCallback, useRef, useEffect, JSX } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  addDays,
  eachDayOfInterval,
  setHours,
  setMinutes,
  isSameDay,
  format,
} from "date-fns";
import { Appointment, Employee, HalfDayInterval } from "../types";
import CalendarGrid from "../components/CalendarGrid";
import Modal from "../components/Modal";
import AppointmentForm from "../components/AppointmentForm";
import DraggableSource from "../components/DraggableSource";
import Drawer from "../components/Drawer";
import {
  initialTeams,
  initialEmployees,
  initialAppointments,
  chantier,
  absences,
  autres,
} from "../../datasource";

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
export const CELL_HEIGHT = 100;
export const sizeCell = `${CELL_WIDTH}px ${CELL_HEIGHT}px`;
export const TEAM_HEADER_HEIGHT = "50px";
export const HALF_DAY_INTERVALS: HalfDayInterval[] = [
  { name: "morning", startHour: 0, endHour: 12 },
  { name: "afternoon", startHour: 12, endHour: 24 },
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
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: Date; employeeId: number ; intervalName: "morning" | "afternoon"} | null>(null);
  const [drawerOptionsSelected, setDrawerOptionsSelected] = useState(eventTypes[0]);
  const lastScrollLeft = useRef(0);
  const lastScrollTime = useRef(Date.now());

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

  useEffect(() => {
    goToDate(new Date());
  }, []); // Centrage initial

  // Gestion de la création et édition de rendez-vous
  const handleSaveAppointment = useCallback((appointment: Appointment) => {
    if (appointment.id) {
      setFilteredAppointments((prev) => prev.map((app) => (app.id === appointment.id ? appointment : app)));
    } else {
      setFilteredAppointments((prev) => [...prev, { ...appointment, id: Number(Date.now()) }]);
    }
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setNewAppointmentInfo(null);
  }, []);

  const handleDeleteAppointment = useCallback((id: number) => {
    setFilteredAppointments((prev) => prev.filter((app) => app.id !== id));
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, []);

  const handleOpenEditModal = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  }, []);

  const handleOpenNewModal = useCallback((date: Date, employeeId: number, intervalName: "morning" | "afternoon") => {    
    setAddAppointmentStep("select");
    setSelectedAppointment(null);
    setNewAppointmentInfo({ date, employeeId, intervalName });
  }, []);

  // Déplacement d'un rendez-vous (drag & drop ou resize)
  const moveAppointment = useCallback(
    (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number) => {
      setFilteredAppointments((prev) =>
        prev.map((app) =>
          app.id === id
            ? { ...app, startDate: newStartDate, endDate: newEndDate, employeeId: newEmployeeId }
            : app
        )
      );
    },
    []
  );

  // Création d'un rendez-vous depuis un drag externe
  const createAppointmentFromDrag = useCallback(
    (title: string, date: Date, intervalName: "morning" | "afternoon", employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => {
      const newApp: Appointment = {
        id: Number(Date.now()),
        title,
        description: `Nouvel élément ${title}`,
        startDate:
          intervalName === "morning"
            ? setHours(setMinutes(date, 0), HALF_DAY_INTERVALS[0].startHour)
            : setHours(setMinutes(date, 0), HALF_DAY_INTERVALS[1].startHour),
        endDate:
          intervalName === "morning"
            ? setHours(setMinutes(date, 0), HALF_DAY_INTERVALS[0].endHour)
            : setHours(setMinutes(date, 0), HALF_DAY_INTERVALS[1].endHour),
        imageUrl: imageUrl,
        employeeId,
        type: typeEvent,
      };
      setFilteredAppointments((prev) => [...prev, newApp]);
    },
    []
  );

  // Création d'un rendez-vous (utilisé lors du resize fractionné)
  const createAppointment = useCallback(
    (title: string, startDate: Date, endDate: Date, employeeId: number, imageUrl?: string) => {
      const newApp: Appointment = {
        id: Number(Date.now()),
        title,
        description: `Nouvel élément ${title}`,
        startDate,
        endDate,
        imageUrl,
        employeeId,
      };
      setFilteredAppointments((prev) => [...prev, newApp]);
    }, []);

  // Recherche dans les rendez-vous
  const searchAppointments = useCallback((query: string) => {    
    if (!query) {
      setFilteredAppointments(appointments.current);
      return;
    }
    const lowercasedQuery = query.toLowerCase();
    setFilteredAppointments(
      appointments.current.filter((app) =>
        app.title.toLowerCase().includes(lowercasedQuery)
      )
    );
  }, []);

  useEffect(() => {
    searchAppointments(searchInput);
  }, [searchInput]);

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
              <CalendarGrid
                employees={employees.current}
                appointments={filteredAppointments}
                initialTeams={initialTeams}
                dayInTimeline={dayInTimeline}
                HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
                onAppointmentMoved={moveAppointment}
                onCellDoubleClick={handleOpenNewModal}
                onAppointmentClick={handleOpenEditModal}
                onExternalDragDrop={createAppointmentFromDrag}
                createAppointment={createAppointment}
              />
            </div>
          </div>
        </div>
        {/* Modal pour le formulaire de rendez-vous */}
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => 
          setIsModalOpen(false)}
          title={selectedAppointment ? "Modifier le rendez-vous" : "Ajouter un rendez-vous"}
          >
          <AppointmentForm
            appointment={selectedAppointment}
            initialDate={newAppointmentInfo?.date || null}
            initialEmployeeId={newAppointmentInfo?.employeeId || null}
            employees={employees.current}
            onSave={handleSaveAppointment}
            onDelete={handleDeleteAppointment}
            onClose={() => setIsModalOpen(false)}
          />
        </Modal>
        {/* Modal pour choisir le type de rendez-vous */}
        <ChoiceAppointmentType
          setAddAppointmentStep={setAddAppointmentStep}
          newAppointmentInfo={newAppointmentInfo}
          isOpen={addAppointmentStep === "select"}
          onSelect={(appointment) => {
            setAddAppointmentStep("form");
            setSelectedAppointment(appointment);
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
        Quel type souhaitez-vous ajouter&nbsp;?
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