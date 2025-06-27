"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
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

const eventTypes = [
  { label: "Chantier", color: "primary", dataSource: chantier, placeholder: "Sélectionnez un chantier" },
  { label: "Absences", color: "warning", dataSource: absences, placeholder: "Sélectionnez une absence" },
  { label: "Autres", color: "secondary", dataSource: autres, placeholder: "Sélectionnez autre" },
];

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

function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

export default function HomePage() {
  const [dayInTimeline, setDayInTimeline] = useState(
    eachDayOfInterval({ start: addDays(new Date(), -WINDOW_SIZE / 2), end: addDays(new Date(), WINDOW_SIZE / 2) })
  );
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
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: Date; employeeId: number } | null>(null);
  const [drawerOptionsSelected, setDrawerOptionsSelected] = useState(eventTypes[0]);
  const lastScrollLeft = useRef(0);
  const lastScrollTime = useRef(Date.now());


  // Utilitaire pour savoir si on est au bord du scroll
  function isAtMinOrMaxScroll(container: HTMLDivElement) {
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isAtMin = scrollLeft === 0;
    const isAtMax = Math.abs(scrollLeft + clientWidth - scrollWidth) < 1;
    return { isAtMin, isAtMax };
  }

  // Scroll infini fluide
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

      // Ajout à droite
      if (scrollPercentage >= THRESHOLD_MAX) {
        isLoadingMoreDays.current = true;
        if (Math.abs(speed) < 0.5) setIsLoading(true);

        setDayInTimeline((prevDays) => {
          const lastDay = prevDays[prevDays.length - 1];
          const newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(lastDay, i + 1));
          return [...prevDays, ...newDays];
        });

        // Pas besoin d'ajuster scrollLeft lors de l'ajout à droite
        isLoadingMoreDays.current = false;
        setIsLoading(false);
      }
      // Ajout à gauche
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

  // Centrage sur aujourd'hui
  const goToday = useCallback(() => {
    if (!mainScrollRef.current) return;
    setIsLoading(true);
    const today = new Date();
    setDayInTimeline(
      eachDayOfInterval({
        start: addDays(today, -WINDOW_SIZE / 2),
        end: addDays(today, WINDOW_SIZE / 2),
      })
    );
    setTimeout(() => {
      const todayCell = document.getElementById('today-cell');
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
    goToday();
  }, []); // Centrage initial


  // Gestion des rendez-vous (inchangé)
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

  const handleOpenNewModal = useCallback((date: Date, employeeId: number) => {
    setSelectedAppointment(null);
    setNewAppointmentInfo({ date, employeeId });
    setIsModalOpen(true);
  }, []);

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

  const createAppointmentFromDrag = useCallback(
    (title: string, date: Date, intervalName: "morning" | "afternoon", employeeId: number) => {
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
        imageUrl: "https://via.placeholder.com/30/808080/FFFFFF?text=DR",
        employeeId,
      };
      setFilteredAppointments((prev) => [...prev, newApp]);
    },
    []
  );

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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="sticky top-0 z-20 bg-white shadow px-4 py-2 flex items-center justify-between">
          <button
            className="btn btn-primary cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              goToday();
            }}
          >
            Aujourd'hui
          </button>
          <div>
            <label htmlFor="search" className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
              </div>
              <input 
                  type="search" 
                  id="search" 
                  className="block p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50" 
                  placeholder="Search"
                  value={searchInput || ""}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
            </div>
          </div>
        </div>
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
              />
            </div>
          </div>
        </div>
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
                  {ev.label}
                </option>
              ))}
            </select>
            <div className="d-flex gap-3 flex-column">
              {drawerOptionsSelected?.dataSource?.map((ev) => (
                <DraggableSource id={ev.label} title={ev.label} key={ev.label} />
              ))}
            </div>
          </div>
        </Drawer>
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
        {isLoading && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-200 z-50">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: "30%" }} />
          </div>
        )}
      </div>
    </DndProvider>
  );
}