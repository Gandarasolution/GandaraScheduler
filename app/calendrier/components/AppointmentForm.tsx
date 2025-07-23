"use client";
// components/AppointmentForm.tsx
import React, { useState, memo, useMemo } from 'react';
import { Appointment, Employee, HalfDayInterval } from '../types';
import { format, parseISO, setHours, startOfDay, setSeconds, setMinutes, addDays, eachDayOfInterval, addMinutes } from 'date-fns';
import { isWeekend } from '../utils/dates';
import { absences, autres, chantier } from '@/app/datasource';

/**
 * Props du composant AppointmentForm
 * Formulaire pour créer ou éditer un rendez-vous (chantier, absence, autre).
 */
interface AppointmentFormProps {
  appointments: Appointment[]; // Liste des rendez-vous existants
  appointment: Appointment | null;
  initialDate?: Date | null;
  initialEmployeeId?: number | null; // Nouvelle prop
  employees: Employee[]; // Liste de tous les employés
  HALF_DAY_INTERVALS: HalfDayInterval[] // Liste des créneaux de demi-journée
  isFullDay: boolean; // Indique si le rendez-vous est sur une journée complète
  nonWorkingDates: Date[]; // Dates non travaillées (week-ends, fériés, etc.)
  onSave: (appointment: Appointment, includeWeekend: boolean) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}


/**
 * Formulaire de création ou d'édition d'un rendez-vous.
 *
 * @component
 * @param {Appointment[]} appointments - Liste des rendez-vous existants.
 * @param {AppointmentFormProps} props - Propriétés du formulaire de rendez-vous.
 * @param {Appointment | undefined} props.appointment - Rendez-vous à éditer (si existant).
 * @param {Date | undefined} props.initialDate - Date initiale pour le rendez-vous.
 * @param {number | undefined} props.initialEmployeeId - ID de l'employé assigné par défaut.
 * @param {Employee[]} props.employees - Liste des employés disponibles.
 * @param {Array<{ startHour: number, endHour: number }>} props.HALF_DAY_INTERVALS - Intervalles pour matin/après-midi.
 * @param {boolean} props.isFullDay - Indique si le rendez-vous couvre toute la journée.
 * @param {Date[]} props.nonWorkingDates - Liste des dates non travaillées.
 * @param {(appointment: Appointment, includeWeekend: boolean) => void} props.onSave - Callback lors de la sauvegarde.
 * @param {(id: number) => void} props.onDelete - Callback lors de la suppression.
 * @param {() => void} props.onClose - Callback lors de la fermeture du formulaire.
 *
 * @returns {JSX.Element} Formulaire de rendez-vous.
 *
 * @example
 * <AppointmentForm
 *   appointment={appointment}
 *   initialDate={new Date()}
 *   employees={employees}
 *   HALF_DAY_INTERVALS={[{ startHour: 8, endHour: 12 }, { startHour: 13, endHour: 17 }]}
 *   isFullDay={false}
 *   nonWorkingDates={[]}
 *   onSave={handleSave}
 *   onDelete={handleDelete}
 *   onClose={handleClose}
 * />
 */

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointments,
  appointment,
  initialDate,
  initialEmployeeId,
  employees,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  onSave,
  onDelete,
  onClose,
}) => {
  // État local pour les champs du formulaire
  const [formData, setFormData] = useState<Omit<Appointment, 'id'> & { id?: number }>(
    appointment
      ? { ...appointment, startDate: appointment.startDate, endDate:  addMinutes(appointment.endDate, -1) }
      : {
          title: '',
          description: '',
          libelle: '',
          startDate: initialDate || new Date(),
          endDate: initialDate ? setHours(setMinutes(initialDate, 0), 0) : new Date(),
          imageUrl: '',
          employeeId: initialEmployeeId || (employees.length > 0 ? employees[0].id : ''), // Par défaut au premier employé ou vide
          type: "Chantier", // Type par défaut
        }
  );
  const isFullWeekEnd = useMemo(() => {
    return eachDayOfInterval({ 
      start: formData.startDate, 
      end: formData.endDate 
    }).every(date => isWeekend(date));
  }, [formData.startDate, formData.endDate]);

  const isAppointmentSplitByWeekend = useMemo(() => {
    const app = appointments.find(a => a.id === formData.id);
    if (!app) return false;
    const days = eachDayOfInterval({ start: app.startDate, end: app.endDate });
    return days.some((date, idx) =>
      isWeekend(date) && idx !== 0 && idx !== days.length - 1
    );
  }, [appointments, formData.id,]);


  const [includeNotWorkingDay, setIncludeNotWorkingDay] = useState(isFullWeekEnd || isAppointmentSplitByWeekend ? true : false); // Nouveau champ pour inclure les week-ends
  const [titleNotValid, setTitleNotValid] = useState(false);

  /**
   * Gère les changements des champs texte, textarea et select du formulaire.
   * Met à jour l'état local `formData` en fonction du champ modifié.
   *
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>} e - Événement de changement.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'employeeId') {
      setFormData((prev) => ({ ...prev, employeeId: Number(value) }));
      return;
    }
    if (name === 'libelle' && value.trim() === '') {
      setTitleNotValid(true);
      return;     
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Gère le changement de date via les inputs de type "date".
   * Met à jour la date de début ou de fin dans l'état local `formData`.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - Événement de changement de date.
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const datePart = parseISO(value);
    let newDate: Date;

    if (name === 'startDate') {
      
        newDate = setHours(setMinutes(datePart, (formData.startDate || new Date()).getMinutes()), (formData.startDate || new Date()).getHours());
        const diffHours = (formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60);
        const newEndDate = setHours(setMinutes(datePart, (formData.endDate || new Date()).getMinutes()), (formData.endDate || new Date()).getHours());
        setFormData(prev => ({ ...prev, startDate: newDate, endDate: newEndDate }));
    } else if (name === 'endDate') {
        newDate = setHours(setMinutes(datePart, (formData.endDate || new Date()).getMinutes()), (formData.endDate || new Date()).getHours());
        setFormData(prev => ({ ...prev, endDate: newDate }));
    }
  };

  /**
   * Soumet le formulaire de rendez-vous.
   * Appelle la fonction `onSave` avec les données du formulaire et l'état `includeWeekend`.
   *
   * @param {React.FormEvent} e - Événement de soumission du formulaire.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() === '') {
      setTitleNotValid(true);
      return;
    }
    onSave(formData as Appointment, includeNotWorkingDay);
  };

  /**
   * Gère la suppression du rendez-vous courant.
   * Appelle la fonction `onDelete` avec l'identifiant du rendez-vous.
   */
  const handleDelete = () => {
    if (formData.id) {
      onDelete(formData.id);
    }
  };
  
  

  // Rendu du formulaire
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <input 
          type="checkbox" 
          id='includeWeekend'
          className={`
            h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 
            ${isFullWeekEnd ? 'bg-gray-200 cursor-not-allowed opacity-50' : ''}`}
          checked={includeNotWorkingDay} 
          onChange={e => !isFullWeekEnd && setIncludeNotWorkingDay(e.target.checked)} 
        />
        <label 
          className="ml-2 text-sm text-gray-700"
          htmlFor="includeWeekend"
        >
          Inclure week-end
        </label>
      </div>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          {appointment?.type}
        </label>
        <select 
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
        {appointment?.type === 'Chantier' ? chantier.map((c) => (
          <option key={c.id} value={c.label}>
            {c.label}
          </option>
        )) : appointment?.type === 'Absence' ? absences.map((a) => (
          <option key={a.id} value={a.label}>
            {a.label}
          </option>
        )) : appointment?.type === 'Autre' ? autres.map((o) => (
          <option key={o.id} value={o.label}>
            {o.label}
          </option>
        )) : null}
      </select>
      </div>
      {/* Titre du rendez-vous */}
      <div>
        <label htmlFor="libelle" className="block text-sm font-medium text-gray-700 mb-1">
          Libellé:
        </label>
        <input
          type="text"
          id="libelle"
          name="libelle"
          value={formData.libelle ?? ''}
          onChange={handleChange}
          required
          className={`
            w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 
            ${titleNotValid && 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50' }
          `}
        />

      </div>
  
      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description:</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>

      {/* Image (optionnelle) */}
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">URL Image (optionnel):</label>
        <input
          type="text"
          id="imageUrl"
          name="imageUrl"
          value={formData.imageUrl || ''}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Affectation à un employé */}
      <div>
        <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Assigné à:</label>
        <select
          id="employeeId"
          name="employeeId"
          value={formData.employeeId}
          onChange={handleChange}
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Dates et heures de début/fin */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Date de début:</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            max={format(formData.endDate, 'yyyy-MM-dd')}
            value={format(formData.startDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {!isFullDay && (
          <div className="flex-1">
            <label htmlFor="intervalNameStart" className="block text-sm font-medium text-gray-700 mb-1">Créneau :</label>
            <select
              id="intervalNameStart"
              name="intervalName"
              value={
                formData.startDate.getHours() >= HALF_DAY_INTERVALS[0].startHour 
                && formData.startDate.getHours() < HALF_DAY_INTERVALS[0].endHour
                ? 'morning' : 'afternoon'
              }
              onChange={e => {
                const newHour = e.target.value === 'morning'
                  ? HALF_DAY_INTERVALS[0].startHour
                  : HALF_DAY_INTERVALS[1].startHour;

                setFormData(prev => ({
                  ...prev,
                  startDate: setHours(
                    startOfDay(prev.startDate), // S'assure que vous commencez au début du jour actuel
                    newHour
                  ),
                }));
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="morning">Matin</option>
              <option value="afternoon"
                disabled={
                  format(formData.startDate, 'yyyy-MM-dd') === format(formData.endDate, 'yyyy-MM-dd') &&
                  formData.endDate.getHours() === HALF_DAY_INTERVALS[0].endHour
                }
              >Après-midi</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Date de fin:</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            min={format(formData.startDate, 'yyyy-MM-dd')}
            value={format(formData.endDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {!isFullDay && (
          <div className="flex-1">
            <label htmlFor="intervalNameEnd" className="block text-sm font-medium text-gray-700 mb-1">Créneau :</label>
            <select
              id="intervalNameEnd"
              name="intervalName"
              value={
                formData.endDate.getHours() <= HALF_DAY_INTERVALS[0].endHour
                  ? 'morning'
                  : 'afternoon'
              }
              onChange={e => {
                const isAfternoon = e.target.value === 'afternoon';
                setFormData(prev => {
                  // Toujours prendre la date de fin affichée dans le champ date
                  const endDateDay = new Date(format(prev.endDate, 'yyyy-MM-dd') + 'T00:00:00');
                  let newEndDate;
                  if (isAfternoon) {
                    newEndDate = setHours(setMinutes(setSeconds(endDateDay, 59), 59), HALF_DAY_INTERVALS[1].endHour - 1);
                  } else {
                    newEndDate = setHours(setMinutes(setSeconds(endDateDay, 0), 0), HALF_DAY_INTERVALS[0].endHour);
                  }
                  return {
                    ...prev,
                    endDate: newEndDate,
                  };
                });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option 
                value="morning"
                disabled={
                  format(formData.startDate, 'yyyy-MM-dd') === format(formData.endDate, 'yyyy-MM-dd') &&
                  formData.startDate.getHours() === HALF_DAY_INTERVALS[1].startHour
                }
              >Matin</option>
              <option value="afternoon">Après-midi</option>
            </select>
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end gap-3 mt-4">
        {appointment?.id && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors btn-delete"
          >
            Supprimer
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors btn-cancel"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors btn-save"
        >
          {appointment ? 'Enregistrer les modifications' : 'Créer le rendez-vous'}
        </button>
      </div>
    </form>
  );
};

export default memo(AppointmentForm);