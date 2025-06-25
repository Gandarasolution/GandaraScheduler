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
export const EMPLOYEE_COLUMN_WIDTH = '150px'; // Largeur de la colonne des employés
export const DAY_CELL_WIDTH = `${CELL_WIDTH}px`; // Largeur des cellules de jour
export const DAY_CELL_HEIGHT = '100px'; // Hauteur des cellules de jour
export const sizeCell = `${DAY_CELL_WIDTH} ${DAY_CELL_HEIGHT}`;
export const TEAM_HEADER_HEIGHT = '50px'; // Hauteur de l'en-tête de l'équipe
export const HALF_DAY_INTERVALS: HalfDayInterval[] = [
  { name: 'morning', startHour: 0, endHour: 11 },
  { name: 'afternoon', startHour: 12, endHour:  23},
];

export default function HomePage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = new Date();
  const todayIndex = daysInMonth.findIndex(day => isSameDay(day, today));

  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: Date; employeeId: number } | null>(null);
  const [drawerOptionsSelected, setDrawerOptionsSelected] = useState(eventTypes[0]);const gridRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);


  const { isDragging } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
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
    },
    []
  );

  useEffect(() => {
    console.log(appointments[0]);
  }, [appointments]);
    

  useEffect(() => {
    // Si aujourd'hui est dans le mois affiché, scroll vers aujourd'hui
    if (todayIndex !== -1 && gridRef.current) {
      const cellWidth = parseFloat(DAY_CELL_WIDTH);
      const scrollLeft = todayIndex * cellWidth;
      console.log(`Scrolling to index ${todayIndex}, scrollLeft: ${scrollLeft}`);
      setTimeout(() => {
        gridRef.current?.scrollTo({ left: scrollLeft });
      }, 500); // Assurez-vous que le scroll est terminé avant de marquer le calendrier comme
      setReady(true); // Indique que le calendrier est prêt après le scroll
    }
  }, [todayIndex]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-5 font-sans h-screen flex flex-col"> {/* Ajout de h-screen et flex-col */}

        <div className="flex justify-center items-center mb-5 flex-shrink-0">
          <button onClick={handlePrevMonth} className="px-4 py-2 mr-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">&lt; Mois précédent</button>
          <h2 className="text-2xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2> {/* Correction format année */}
          <button onClick={handleNextMonth} className="px-4 py-2 ml-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">Mois suivant &gt;</button>
        </div>

        <div className="flex flex-grow overflow-hidden"> {/* flex-grow et overflow-hidden pour que le calendrier prenne l'espace restant et gère son propre défilement */}

          {/* Grille du calendrier avec employés */}
          <div ref={gridRef}  
            className="flex-grow overflow-auto border border-gray-300 rounded-lg shadow-md"
            style={{
              visibility: ready ? 'visible' : 'hidden', // Masquer la grille jusqu'à ce qu'elle soit prête
            }}
          >
            <CalendarGrid
              employees={employees}
              appointments={appointments}
              initialTeams={initialTeams}
              daysInMonth={daysInMonth}
              HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
              onAppointmentMoved={moveAppointment}
              onCellDoubleClick={handleOpenNewModal}
              onAppointmentClick={handleOpenEditModal}
              onExternalDragDrop={createAppointmentFromDrag}
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