"use client"

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  addYears,
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


export const CELL_WIDTH = 60; 
export const EMPLOYEE_COLUMN_WIDTH = 150; // Largeur de la colonne des employés
export const DAY_CELL_WIDTH = CELL_WIDTH; // Largeur des cellules de jour
export const DAY_CELL_HEIGHT = 80; // Hauteur des cellules de jour
export const sizeCell = `${DAY_CELL_WIDTH} ${DAY_CELL_HEIGHT}`;
export const TEAM_HEADER_HEIGHT = DAY_CELL_HEIGHT; // Hauteur de l'en-tête de l'équipe
export const HALF_DAY_INTERVALS: HalfDayInterval[] = [
  { name: 'morning', startHour: 0, endHour: 11 },
  { name: 'afternoon', startHour: 12, endHour:  23},
];

export default function HomePage() {
  const currentMonth = useRef(startOfMonth(new Date()));
  const monthStart = startOfMonth(currentMonth.current);
  const monthEnd = endOfMonth(currentMonth.current);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = new Date();
  const todayIndex = daysInMonth.findIndex(day => isSameDay(day, today));
  const [timelineStart, setTimelineStart] = useState(startOfMonth(new Date()));
  const [timelineEnd, setTimelineEnd] = useState(addMonths(startOfMonth(new Date()), 3));
  const dayInTimeline = useMemo(() => {
    return eachDayOfInterval({ start: timelineStart, end: timelineEnd });
  }, [timelineStart, timelineEnd]);

  const employees = useRef<Employee[]>(initialEmployees);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: Date; employeeId: number } | null>(null);
  const [drawerOptionsSelected, setDrawerOptionsSelected] = useState(eventTypes[0]);const gridRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(true);
  const { isDragging } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);


   // Fonction pour charger plus de jours (vers la gauche ou la droite)
  const loadMoreDays = useCallback((direction: 'forward' | 'backward') => {
    if (direction === 'forward') {
      setTimelineEnd((prevEnd) => addMonths(prevEnd, 1)); // Étendre d'un mois
    } else {
      setTimelineStart((prevStart) => subMonths(prevStart, 1)); // Étendre d'un mois
    }
  }, []);

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

  

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="font-sans h-screen flex flex-col"> {/* Ajout de h-screen et flex-col */}
        <div className="flex flex-grow overflow-hidden"> {/* flex-grow et overflow-hidden pour que le calendrier prenne l'espace restant et gère son propre défilement */}

          {/* Grille du calendrier avec employés */}
          <div ref={gridRef}  
            className="flex-grow overflow-auto border border-gray-300 rounded-lg shadow-md"
            style={{
              visibility: ready ? 'visible' : 'hidden', // Masquer la grille jusqu'à ce qu'elle soit prête
            }}
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
              loadMoreDays={loadMoreDays}
            />
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
    </DndProvider>
  );
}