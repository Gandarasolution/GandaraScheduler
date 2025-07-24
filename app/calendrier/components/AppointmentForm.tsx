"use client";
// components/AppointmentForm.tsx
import React, { useState, memo, useMemo } from 'react';
import { Appointment, Employee, HalfDayInterval } from '../types';
import { format, parseISO, setHours, startOfDay, setSeconds, setMinutes, addDays, eachDayOfInterval, addMinutes } from 'date-fns';
import { isHoliday, isWeekend } from '../utils/dates';
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
  onSave: (appointment: Appointment, includeWeekend: boolean, includeNotWorkingDay: boolean) => void;
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
 * @param {(appointment: Appointment, includeWeekend: boolean, includeNotWorkingDay: boolean) => void} props.onSave - Callback lors de la sauvegarde.
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
          employeeId: initialEmployeeId || (employees.length > 0 ? employees[0].id : ''),
          type: "Chantier",
        }
  );
  const isFullWeekEnd = useMemo(() => {
    return eachDayOfInterval({ 
      start: formData.startDate, 
      end: formData.endDate 
    }).every(date => isWeekend(date));
  }, [formData.startDate, formData.endDate]);

  const isFullNotWorkingDay = useMemo(() => {
    return eachDayOfInterval({ 
      start: formData.startDate, 
      end: formData.endDate 
    }).every(date => 
      nonWorkingDates.some(nd => nd.getTime() === date.getTime()) || isHoliday(date)
    );
  }, [formData.startDate, formData.endDate, nonWorkingDates]);
  

  const isAppointmentSplitByWeekend = useMemo(() => {
    const app = appointments.find(a => a.id === formData.id);
    if (!app) return false;
    const days = eachDayOfInterval({ start: app.startDate, end: addDays(app.endDate, 1) });
    return days.some((date) =>
      isWeekend(date) // Vérifie si le jour est un week-end
    );
  }, [appointments, formData.id,]);

  const isAppointmentSplitByNotWorkingDay = useMemo(() => {
    const app = appointments.find(a => a.id === formData.id);
    if (!app) return false;
    const days = eachDayOfInterval({ start: app.startDate, end: app.endDate });
    return days.some((date) =>
      (nonWorkingDates.some(nd => 
        nd.getDay() === date.getDay()
        && nd.getMonth() === date.getMonth()
        && nd.getFullYear() === date.getFullYear()
      ) || isHoliday(date))
    );
  }, [appointments, formData.id, nonWorkingDates]);


  
  const [includeNotWorkingDay, setIncludeNotWorkingDay] = useState(
    isFullNotWorkingDay || isAppointmentSplitByNotWorkingDay ? true : false
  ); // Nouveau champ pour inclure les jours non travaillés
  const [includeWeekend, setIncludeWeekend] = useState(
    isFullWeekEnd || isAppointmentSplitByWeekend ? true : false
  ); // Nouveau champ pour inclure les week-ends
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
    if (name === 'type') {
      // Pré-remplit le libellé si vide
      let defaultLibelle = '';
      const typedValue = value as 'Chantier' | 'Absence' | 'Autre';
      if (typedValue === 'Chantier' && chantier.length > 0) defaultLibelle = chantier[0].label;
      if (typedValue === 'Absence' && absences.length > 0) defaultLibelle = absences[0].label;
      if (typedValue === 'Autre' && autres.length > 0) defaultLibelle = autres[0].label;
      setFormData((prev) => ({ ...prev, type: typedValue, libelle: prev.libelle || defaultLibelle }));
      return;
    }
    if (name === 'libelle' && value.trim() === '') {
      setTitleNotValid(true);
    } else {
      setTitleNotValid(false);
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
        setFormData(prev => ({ ...prev, startDate: newDate }));
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
    onSave(formData as Appointment, includeWeekend, includeNotWorkingDay);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-2 sm:p-4 bg-gray-50 rounded-xl shadow-inner">
      <h3 className="text-lg font-bold text-blue-700 mb-2">{appointment ? 'Modifier le rendez-vous' : 'Créer un rendez-vous'}</h3>
      {/* Options avancées */}
      <div className="flex flex-col md:flex-row gap-4 bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          <input 
            type="checkbox" 
            id='includeWeekend'
            className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${isFullWeekEnd ? 'bg-gray-200 cursor-not-allowed opacity-50' : ''}`}
            checked={includeWeekend} 
            onChange={e => !isFullWeekEnd && setIncludeWeekend(e.target.checked)} 
          />
          <label className="text-sm text-gray-700" htmlFor="includeWeekend">Inclure week-end</label>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="checkbox" 
            id='includeNotWorkingDay'
            className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${isFullNotWorkingDay ? 'bg-gray-200 cursor-not-allowed opacity-50' : ''}`}
            checked={includeNotWorkingDay} 
            onChange={e => !isFullNotWorkingDay && setIncludeNotWorkingDay(e.target.checked)} 
          />
          <label className="text-sm text-gray-700" htmlFor="includeNotWorkingDay">Inclure les jours non travaillés/fériés</label>
        </div>
      </div>
      
      {/* Section type et libellé */}
      <div className="flex flex-col md:flex-row gap-4 bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex-1">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type d'événement <span className="text-red-500">*</span></label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            required
          >
            <option value="Chantier">Chantier</option>
            <option value="Absence">Absence</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="libelle" className="block text-sm font-medium text-gray-700 mb-1">Libellé <span className="text-red-500">*</span></label>
          <select
            id="libelle"
            name="libelle"
            value={formData.libelle}
            onChange={handleChange}
            className={`w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50 ${titleNotValid ? 'border-red-500 bg-red-50' : ''}`}
            required
          >
            {(formData.type === 'Chantier' ? chantier : formData.type === 'Absence' ? absences : autres).map((item) => (
              <option key={item.id} value={item.label}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={2}
          placeholder="Détail du rendez-vous..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
        ></textarea>
      </div>

      {/* Image (optionnelle) */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">URL de l'image (optionnel)</label>
        <input
          type="text"
          id="imageUrl"
          name="imageUrl"
          value={formData.imageUrl || ''}
          onChange={handleChange}
          placeholder="https://..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
        />
      </div>

      {/* Affectation à un employé */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Assigné à <span className="text-red-500">*</span></label>
        <select
          id="employeeId"
          name="employeeId"
          value={formData.employeeId}
          onChange={handleChange}
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>


      {/* Dates et créneaux */}
      <div className="flex flex-col md:flex-row gap-4 bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Date de début <span className="text-red-500">*</span></label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              max={format(formData.endDate, 'yyyy-MM-dd')}
              value={format(formData.startDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>
        
          {!isFullDay && (
            <div className="flex-1">
              <label htmlFor="intervalNameStart" className="block text-sm font-medium text-gray-700 mb-1">Créneau</label>
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
                    startDate: setHours(startOfDay(prev.startDate), newHour),
                  }));
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
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
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Date de fin <span className="text-red-500">*</span></label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              min={format(formData.startDate, 'yyyy-MM-dd')}
              value={format(formData.endDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>
        
          {!isFullDay && (
            <div className="flex-1">
              <label htmlFor="intervalNameEnd" className="block text-sm font-medium text-gray-700 mb-1">Créneau</label>
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
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
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end gap-3 mt-6">
        {appointment?.id && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 btn-delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="inline-block" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6zm3 .5a.5.5 0 0 1 .5-.5.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6zm-7-1A1.5 1.5 0 0 1 5.5 4h5A1.5 1.5 0 0 1 12 5.5V6h1a.5.5 0 0 1 0 1h-1v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7H3a.5.5 0 0 1 0-1h1v-.5zM5.5 5a.5.5 0 0 0-.5.5V6h6v-.5a.5.5 0 0 0-.5-.5h-5z"/></svg>
            Supprimer
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2 btn-cancel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="inline-block" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>
          Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 btn-save"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="inline-block" viewBox="0 0 16 16"><path d="M16 2a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2zM2 1a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm2 2a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H4.5A.5.5 0 0 1 4 4V3zm0 2h8v8H4V5z"/></svg>
          {appointment ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  );
};

export default memo(AppointmentForm);