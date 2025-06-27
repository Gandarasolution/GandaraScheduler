"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {DndProvider, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  addMonths, 
  subMonths, 
  format, 
  startOfMonth, 
  setHours, 
  setMinutes, 
  endOfMonth, 
  isSameDay,
  eachDayOfInterval,
  addDays,
} from 'date-fns';
import { Appointment, Employee, HalfDayInterval} from '../types';
import CalendarGrid from '../components/CalendarGrid';
import AppointmentForm from '../components/AppointmentForm';
import DraggableSource from '../components/DraggableSource';
import Drawer from '../components/Drawer';
import { initialTeams, initialEmployees, initialAppointments, chantier, absences, autres} from '../../datasource'

const eventTypes = [
  { label: 'Chantier', color: 'primary', dataSource: chantier, placeholder: 'Sélectionnez un chantier' },
  { label: 'Absences', color: 'warning', dataSource: absences, placeholder: 'Sélectionnez une absence' },
  { label: 'Autres', color: 'secondary', dataSource: autres, placeholder: 'Sélectionnez autre' }
];


const DAYS_TO_ADD = 15;
const THRESHOLD_MAX = 80;
const THRESHOLD_MIN = 20;
const WINDOW_SIZE = 120; // nombre de jours affichés (ex: 60 avant, 60 après)
export const EMPLOYEE_COLUMN_WIDTH = '150px'; // Largeur de la colonne des employés
export const CELL_WIDTH = 60; 
export const CELL_HEIGHT = 100; // Hauteur des cellules
export const sizeCell = `${CELL_WIDTH}px ${CELL_HEIGHT}px`;
export const TEAM_HEADER_HEIGHT = '50px'; // Hauteur de l'en-tête de l'équipe
export const HALF_DAY_INTERVALS: HalfDayInterval[] = [
  { name: 'morning', startHour: 0, endHour: 12 },
  { name: 'afternoon', startHour: 12, endHour:  24},
];

export default function HomePage() {
  const [dayInTimeline, setDayInTimeline] = useState(eachDayOfInterval({ start: addDays(new Date(), -WINDOW_SIZE/2), end: addDays(new Date(), WINDOW_SIZE/2) }));
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreDays = useRef(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const employees = useRef<Employee[]>(initialEmployees);
  const [isLoading, setIsLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: Date; employeeId: number } | null>(null);
  const [drawerOptionsSelected, setDrawerOptionsSelected] = useState(eventTypes[0]);const gridRef = useRef<HTMLDivElement>(null);
  const { isDragging } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));



  //Fonction 


  const handleSaveAppointment = useCallback((appointment: Appointment) => {
    if (appointment.id) {
      setAppointments((prev) =>
        prev.map((app) => (app.id === appointment.id ? appointment : app))
      );
    } else {
      setAppointments((prev) => [...prev, { ...appointment, id: Number(Date.now()) }]);
    }
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setNewAppointmentInfo(null);
  }, []);

  const handleDeleteAppointment = useCallback((id: number) => {
    setAppointments((prev) => prev.filter((app) => app.id !== id));
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
    (id: number, newStartDate: Date, newEndDate: Date , newEmployeeId: number) => {
      console.log(newStartDate, newEndDate, newEmployeeId);
      
      setAppointments((prev) =>
        prev.map((app) =>
          app.id === id
            ? { 
              ...app, 
              startDate: newStartDate, 
              endDate: newEndDate, 
              employeeId: newEmployeeId 
            }
            : app
        )
      );
    },
    []
  );

  const createAppointmentFromDrag = useCallback(
    (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number) => {
      const newApp: Appointment = {
        id: Number(Date.now()),
        title: title,
        description: `Nouvel élément ${title}`,
        startDate: intervalName === 'morning' ? setHours(setMinutes(date, 0), HALF_DAY_INTERVALS[0].startHour) : setHours(setMinutes(date, 0), HALF_DAY_INTERVALS[1].startHour),
        endDate: intervalName === 'morning' ? setHours(setMinutes(date, 0), HALF_DAY_INTERVALS[0].endHour) : setHours(setMinutes(date, 0), HALF_DAY_INTERVALS[1].endHour),
        imageUrl: 'https://via.placeholder.com/30/808080/FFFFFF?text=DR',
        employeeId: employeeId,
      };
      setAppointments((prev) => [...prev, newApp]);
    }, []);


  const handleScroll = useCallback(() => {
    console.log("Scroll event triggered");
    
    if (!mainScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = mainScrollRef.current;
    const scrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100;

    if (isLoadingMoreDays.current) return;

    // Ajout à droite
    if (scrollPercentage >= THRESHOLD_MAX) {
      isLoadingMoreDays.current = true;
        setIsLoading(true);

      setDayInTimeline(prevDays => {
        const lastDay = prevDays[prevDays.length - 1];
        const newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(lastDay, i + 1));
        // Supprime les jours trop anciens à gauche si la fenêtre devient trop grande
        const allDays = [...prevDays, ...newDays];
        return allDays.slice(-WINDOW_SIZE);
      });
      setTimeout(() => {
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollLeft -= (DAYS_TO_ADD + 5) * CELL_WIDTH;
          }
      }, 0);
      setTimeout(() => { isLoadingMoreDays.current = false; }, 200);
    }
    // Ajout à gauche
    else if (scrollPercentage <= THRESHOLD_MIN) {
      isLoadingMoreDays.current = true;
      setIsLoading(true);
      setDayInTimeline(prevDays => {
        const firstDay = prevDays[0];
        const newDays = Array.from({ length: DAYS_TO_ADD }, (_, i) => addDays(firstDay, -(i + 1))).reverse();
        // Supprime les jours trop anciens à droite si la fenêtre devient trop grande
        const allDays = [...newDays, ...prevDays];
        // Décale le scroll pour garder la même date visible
        setTimeout(() => {
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollLeft += (DAYS_TO_ADD + 5 ) * CELL_WIDTH;
          }
        }, 0);
        return allDays.slice(0, WINDOW_SIZE);
      });

      setTimeout(() => { 
        isLoadingMoreDays.current = false; 
        setIsLoading(false);
      }, 200);
    }
  }, []);

  const goToday = useCallback(() => {
    const todayCell = document.getElementById('today-cell');
    if (todayCell && mainScrollRef.current) {
      // Calcule la position horizontale de la cellule par rapport au conteneur
      const container = mainScrollRef.current;
      const cellRect = todayCell.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft 
        + (cellRect.left - containerRect.left) 
        - (container.clientWidth / 2) 
        + (todayCell.clientWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    goToday();
  }, []);

  // Rendu du calendrier
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col overflow-hidden"> {/* Ajout de h-screen et flex-col */}
        {/* Header sticky */}
        <div className="sticky top-0 z-20 bg-white shadow px-4 py-2">
          <button onClick={goToday}>Aujourd'hui</button>
        </div>
        {/* Grille qui prend tout le reste */}
        <div className="flex-1 flex flex-col max-h-full max-w-full overflow-hidden">
          <div 
            className="flex flex-grow overflow-auto"
            ref={mainScrollRef}
            onScroll={handleScroll}
          >
            <div
              className={`flex-grow rounded-lg shadow-md snap-x snap-mandatory ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
            >
              <CalendarGrid
                employees={employees.current}
                appointments={appointments}
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

        {/* Modal pour le formulaire de rendez-vous */}
        {/* <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <AppointmentForm
            appointment={selectedAppointment}
            initialDate={newAppointmentInfo?.date || null}
            initialEmployeeId={newAppointmentInfo?.employeeId || null}
            employees={employees}
            onSave={handleSaveAppointment}
            onDelete={handleDeleteAppointment}
            onClose={() => setIsModalOpen(false)}
          />
        </Modal> */}
      </div>
      <Drawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} isDragging={isDragging}>
        <div
          className={'flex flex-col items-center'}
        >
          <div className="mb-3 text-muted" style={{ fontSize: 13 }}>
            Faites glisser un bloc sur la timeline pour l’ajouter.
          </div>
          <select
            className="p-2 w-full border-solid border mb-3 rounded-5 rounded-xs"
            onChange={(e) => {
              const selected = eventTypes.find(ev => ev.label === e.target.value);
              setDrawerOptionsSelected(selected ?? eventTypes[0]);
            }}
          >
            {eventTypes.map(ev => (
              <option key={ev.label} value={ev.label}>
                {ev.label}
              </option>
            ))}
          </select>
          <div className="d-flex gap-3 flex-column">
              {drawerOptionsSelected?.dataSource?.map(ev => (
                <DraggableSource id={ev.label} title={ev.label} key={ev.label} />
              ))}
            </div>
            
        </div>
      </Drawer>
      <button
          onClick={() => setIsDrawerOpen(true)}
          className='btn-add'
          style={{
            opacity: isDrawerOpen ? 0 : 1,
            pointerEvents: isDrawerOpen ? 'none' : 'auto',
          }}
        >
          +
        </button>
        {isLoading && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-200 z-50">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: '30%' }} />
          </div>
        )}
    </DndProvider>
  );
}