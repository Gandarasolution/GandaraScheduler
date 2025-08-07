"use client";
// components/AppointmentForm.tsx
import React, { useState, memo, useMemo } from 'react';
import { Appointment, Employee, HalfDayInterval } from '../types';
import { format, parseISO, setHours, startOfDay, setSeconds, setMinutes, addDays, eachDayOfInterval, addMinutes } from 'date-fns';
import { isHoliday, isWeekend } from '../utils/dates';
import { absences, autres, chantier, images } from '@/app/datasource';
import CustomSelectWithImage, { SelectOptionWithImage } from './CustomSelectWithImage';

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
  colors: {color: string, name: string}[]; // Liste des couleurs disponibles pour les rendez-vous
  onSave: (appointment: Appointment, includeWeekend: boolean, includeNotWorkingDay: boolean) => void;
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
 * @param {string[]} props.colors - Liste des couleurs disponibles pour les rendez-vous.
 * @param {Date[]} props.nonWorkingDates - Liste des dates non travaillées.
 * @param {(appointment: Appointment, includeWeekend: boolean, includeNotWorkingDay: boolean) => void} props.onSave - Callback lors de la sauvegarde.
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
  colors,
  onSave,
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
          image: '',
          employeeId: initialEmployeeId || (employees.length > 0 ? employees[0].id : ''),
          type: "Chantier",
          color: "#1E40AF", // Couleur par défaut
          textColor: "#FFFFFF", // Couleur du texte par défaut
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
    onSave(formData as Appointment, false, false);
  };

  
  

  // Rendu du formulaire
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl poppins w-[340px]">
      <div className="flex items-center gap-4">
        <div className='flex item-start w-[68px]'>Icône</div>
        <CustomSelectWithImage
          options={images}
          value={formData.image || ''}
          onChange={(value) => setFormData(prev => ({ ...prev, image: value as string }))}
          placeholder="Sélectionnez une icône"
          className="w-[65px] py-2 px-2"
          showImages={true}
        />
        
        {/* Sélecteurs de couleur */}
        <div className="flex flex-col items-center gap-2">
          {/* Couleur de fond */}
          <div className="relative group">
            <input
              type="color"
              value={formData.color || '#1E40AF'}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              className="w-4 h-4  border-0 cursor-pointer opacity-0 absolute inset-0"
              title="Couleur de fond"
            />
            <div 
              className="w-4 h-4  border-1 border-gray-300 cursor-pointer hover:scale-110 transition-transform shadow-sm"
              style={{ backgroundColor: formData.color || '#1E40AF' }}
              title="Couleur de fond"
            />
          </div>
          
          {/* Couleur de texte */}
          <div className="relative group">
            <input
              type="color"
              value={formData.textColor || '#FFFFFF'}
              onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
              className="w-4 h-4  border-0 cursor-pointer opacity-0 absolute inset-0"
              title="Couleur de texte"
            />
            <div 
              className="w-4 h-4  border-1 border-gray-300 cursor-pointer hover:scale-110 transition-transform shadow-sm"
              style={{ backgroundColor: formData.textColor || '#FFFFFF' }}
              title="Couleur de texte"
            />
          </div>
        </div>
      </div>

      {/* Dates et créneaux */}
      <div className="flex flex-col gap-4 bg-white">
        <div className="flex-1 flex flex-row gap-4 items-center">
          <label htmlFor="startDate" className="block text-sm font-medium mr-auto">Début</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            max={format(formData.endDate, 'yyyy-MM-dd')}
            value={format(formData.startDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            required
            className="w-[145px] p-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
          />
        
          {!isFullDay && (
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
              className="w-[95px] p-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="morning">Matin</option>
              <option value="afternoon"
                disabled={
                  format(formData.startDate, 'yyyy-MM-dd') === format(formData.endDate, 'yyyy-MM-dd') &&
                  formData.endDate.getHours() === HALF_DAY_INTERVALS[0].endHour
                }
              >Après-midi</option>
            </select>
          )}
        </div>
        <div className="flex-1 flex flex-row gap-4 items-center">
          <label htmlFor="endDate" className="block text-sm font-medium mr-auto">Fin</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            min={format(formData.startDate, 'yyyy-MM-dd')}
            value={format(formData.endDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            required
            className="w-[145px] p-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 "
          />
          {!isFullDay && (
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
              className="w-[95px] p-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
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
          )}
        </div>
      </div>

      {/* Sélecteur d'employé */}
      <div className="flex flex-row items-center">
        <label htmlFor="employeeId" className="block text-sm font-medium mr-auto">Affecté</label>
        <select
          id="employeeId"
          name="employeeId"
          value={formData.employeeId || ''}
          onChange={handleChange}
          className="w-[255px] p-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
        >
          {employees.map(employee => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-between mt-5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-[#009580] text-white rounded-xl w-[110px] flex items-center poppins text-[14px] justify-center"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[#009580] text-white rounded-xl w-[110px] flex items-center poppins text-[14px] justify-center"
        >
          {appointment ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  );
};

export default memo(AppointmentForm);