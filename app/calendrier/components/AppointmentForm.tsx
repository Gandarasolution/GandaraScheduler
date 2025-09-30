/**
 * @fileoverview Composant de formulaire pour créer et éditer des rendez-vous
 * 
 * Ce composant permet de créer et modifier des rendez-vous avec des options avancées :
 * - Sélection du type (Chantier, Absence, Autre)
 * - Personnalisation des couleurs (fond, bordure, texte)
 * - Configuration des jours non-travaillés
 * - Aperçu en temps réel
 * - Panel d'options extensible
 * 
 * @component AppointmentForm
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
// components/AppointmentForm.tsx
import React, { useState, memo, useMemo } from 'react';
import {Appointment, Employee, HalfDayInterval, Evenement } from '../types';
import { format, parseISO, setHours, startOfDay, setSeconds, setMinutes, addDays, eachDayOfInterval, addMinutes } from 'date-fns';
import { isHoliday, isWeekend } from '../utils/dates';
import { images } from '@/app/datasource';
import CustomSelectWithImage from './CustomSelectWithImage';
import AppointmentItem from './AppointmentItem';

/**
 * Interface définissant les propriétés du composant AppointmentForm
 * @interface AppointmentFormProps
 */
interface AppointmentFormProps {
  /** Liste complète des rendez-vous existants */
  appointments: Appointment[];
  /** Rendez-vous à éditer (null pour création) */
  appointment: Appointment;
  /** Événement associé au rendez-vous */
  event: Evenement;
  /** ID de l'employé présélectionné (optionnel) */
  initialEmployeeId?: number | null;
  /** Liste de tous les employés disponibles */
  employees: Employee[];
  /** Configuration des créneaux horaires (matin/après-midi/journée) */
  HALF_DAY_INTERVALS: HalfDayInterval[];
  /** Indique si le rendez-vous occupe une journée complète */
  isFullDay: boolean;
  /** Liste des dates non-travaillées (week-ends, fériés) */
  nonWorkingDates: Date[];
  /** Palette de couleurs disponibles avec noms */
  /** Callback appelé lors de la sauvegarde */
  onSave: (
    appointment: Appointment, 
    eventType: Evenement, 
    includeAllNonWorkingDays: boolean) => void;
  /** Callback appelé lors de la fermeture du formulaire */
  onClose: () => void;
}


/**
 * Composant formulaire pour créer et éditer des rendez-vous
 * 
 * Fonctionnalités principales :
 * - Création/édition de rendez-vous avec validation
 * - Système de couleurs personnalisables (fond, bordure, texte)
 * - Panel d'options extensible pour configuration avancée
 * - Aperçu en temps réel des modifications
 * - Gestion des jours non-travaillés avec checkbox unifié
 * - Sélection de types avec icônes (Chantier, Absence, Autre)
 * 
 * @component
 * @param {AppointmentFormProps} props - Propriétés du composant
 * @returns {JSX.Element} Interface de formulaire avec aperçu
 * 
 * @example
 * <AppointmentForm
 *   appointment={appointment}
 *   initialDate={selectedDate}
 *   initialEmployeeId={employeeId}
 *   employees={employees}
 *   HALF_DAY_INTERVALS={intervals}
 *   isFullDay={true}
 *   nonWorkingDates={weekends}
 *   colors={colorPalette}
 *   onSave={handleSave}
 *   onClose={handleClose}
 * />
 */
const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointments,
  appointment,
  event,
  employees,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  onSave,
  onClose,
}) => {
  
  // ===== ÉTATS LOCAUX =====
  
  /**
   * État principal du formulaire contenant toutes les données du rendez-vous
   * Initialisé avec les données existantes ou des valeurs par défaut
   */
  const [formDataAppointment, setFormDataAppointment] = useState<Omit<Appointment, 'id'> & { id?: number }>(
      { ...appointment, startDate: appointment.startDate, endDate:  addMinutes(appointment.endDate, -1) }
  );
  const [formDataEventType, setFormDataEventType] = useState<Evenement>(event);
  const [dateValidationError, setDateValidationError] = useState(false);


  /**
   * Vérifie si le rendez-vous actuel chevauche des jours non-travaillés
   * Utilisé pour déterminer l'état initial de la checkbox
   */
  const isAppointmentSplitByNotWorkingDay = useMemo(() => {
    const app = appointments.find(a => a.id === formDataAppointment.id);
    if (!app) return false;
    const days = eachDayOfInterval({ start: app.startDate, end: app.endDate });
    return days.some((date) =>
      (nonWorkingDates.some(nd => 
        nd.getDay() === date.getDay()
        && nd.getMonth() === date.getMonth()
        && nd.getFullYear() === date.getFullYear()
      ) || isHoliday(date) || isWeekend(date)) // Vérifie jours non travaillés, fériés ou week-ends
    );
  }, [appointments, formDataAppointment.id, nonWorkingDates]);

  /**
   * État pour contrôler l'expansion du panel d'options avancées
   */
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * État unifié pour la gestion de tous les jours non travaillés
   * (week-ends, fériés, jours configurés comme non travaillés)
   */
  const [includeAllNonWorkingDays, setIncludeAllNonWorkingDays] = useState(
    isAppointmentSplitByNotWorkingDay
  );

  /**
   * Gère les changements des champs texte, textarea et select du formulaire.
   * Met à jour l'état local `formData` en fonction du champ modifié.
   *
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>} e - Événement de changement.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'employeeId') {
      setFormDataAppointment((prev) => ({ ...prev, employeeId: Number(value) }));
      return;
    }
    setFormDataAppointment((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Gère le changement de date via les inputs de type "date".
   * Met à jour la date de début ou de fin dans l'état local `formData`.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - Événement de changement de date.
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Réinitialiser l'erreur de validation lors du changement de date
    if (dateValidationError) {
      setDateValidationError(false);
    }

    const { name, value } = e.target;
    const datePart = parseISO(value);
    let newDate: Date;

    if (name === 'startDate') {
      
        newDate = setHours(setMinutes(datePart, (formDataAppointment.startDate || new Date()).getMinutes()), (formDataAppointment.startDate || new Date()).getHours());
        setFormDataAppointment(prev => ({ ...prev, startDate: newDate }));
    } else if (name === 'endDate') {
        newDate = setHours(setMinutes(datePart, (formDataAppointment.endDate || new Date()).getMinutes()), (formDataAppointment.endDate || new Date()).getHours());
        setFormDataAppointment(prev => ({ ...prev, endDate: newDate }));
    }
  };

  /**
   * Soumet le formulaire de rendez-vous.
   * Appelle la fonction `onSave` avec les données du formulaire et l'état `includeAllNonWorkingDays`.
   *
   * @param {React.FormEvent} e - Événement de soumission du formulaire.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation des dates
    if (formDataAppointment.startDate >= formDataAppointment.endDate) {
      setDateValidationError(true);
      return;
    }


    setDateValidationError(false);
    onSave(formDataAppointment as Appointment, formDataEventType, includeAllNonWorkingDays);
  };

  
  

  // Rendu du formulaire
  return (
    <div className={`flex ${isExpanded ? 'lg:flex-row flex-col' : 'flex-col'} gap-4 rounded-xl poppins transition-all duration-300`}>
      {/* Section principale du formulaire */}
      <form onSubmit={handleSubmit} className={`flex flex-col gap-4 w-full max-w-[380px] min-w-[320px]`}>
        {/* Flèche d'expansion */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-4 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10"
          title={isExpanded ? "Réduire" : "Options avancées"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            fill="currentColor" 
            className={`transition-transform duration-300 bi bi-chevron-right text-[#84818a] ${isExpanded ? 'rotate-180' : ''}`} 
            viewBox="0 0 16 16"
          >
            <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
          </svg>
        </button>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mr-2">
          <div className='flex item-start w-full sm:w-[68px]'>Icône</div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
            <CustomSelectWithImage
              options={images}
              value={formDataEventType.image || ''}
              onChange={(value) => {setFormDataEventType(prev => ({ ...prev, image: value as string }))}}
              placeholder="Sélectionnez une icône"
              className="w-full sm:w-[65px] py-2 px-2"
              showImages={true}
              illustrationImage={<></>}
            />
          
            {/* Sélecteurs de couleur */}
            <div className="flex flex-row sm:flex-col items-center gap-2">
              {/* Couleur de fond */}
              <div className="relative group">
                <input
                  type="color"
                  value={formDataEventType.color || '#1E40AF'}
                  onChange={(e) => setFormDataEventType(prev => ({ ...prev, color: e.target.value }))}
                  className="w-4 h-4  border-0 cursor-pointer opacity-0 absolute inset-0"
                  title="Couleur de fond"
                />
                <div 
                  className="w-4 h-4  border-1 border-gray-300 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: formDataEventType.color || '#1E40AF' }}
                  title="Couleur de fond"
                />
              </div>
              {/* Couleur de bordure */}
              <div className="relative group">
                <input
                  type="color"
                  value={formDataEventType.borderColor || '#1E40AF'}
                  onChange={(e) => setFormDataEventType(prev => ({ ...prev, borderColor: e.target.value }))}
                  className="w-4 h-4  border-0 cursor-pointer opacity-0 absolute inset-0"
                  title="Couleur de bordure"
                />
                <div 
                  className="w-4 h-4  border-1 border-gray-300 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: formDataEventType.borderColor || '#1E40AF' }}
                  title="Couleur de bordure"
                />
              </div>
            
              {/* Couleur de texte */}
              <div className="relative group">
                <input
                  type="color"
                  value={formDataEventType.textColor || '#FFFFFF'}
                  onChange={(e) => setFormDataEventType(prev => ({ ...prev, textColor: e.target.value }))}
                  className="w-4 h-4  border-0 cursor-pointer opacity-0 absolute inset-0"
                  title="Couleur de texte"
                />
                <div 
                  className="w-4 h-4  border-1 border-gray-300 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: formDataEventType.textColor || '#FFFFFF' }}
                  title="Couleur de texte"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Aperçu du rendez-vous - Repositionné sous les couleurs */}
        <div className="relative flex items-center w-full h-full">
          <AppointmentItem
            appointment={{
              ...formDataAppointment,
              id: formDataAppointment.id || 0,
              top: 0,
              startDate: new Date(),
              endDate: new Date(addDays(new Date(), 3)),
            }}
            event={formDataEventType}
            isFullDay={isFullDay}
            source='demo'
            isMobile={false}
            includeWeekend={false}
            employee={{ id: formDataAppointment.employeeId as number, name: employees.find(e => e.id === formDataAppointment.employeeId)?.name || 'Employé' }}
            onDoubleClick={() => {}}
            onResize={() => {}}
            handleContextMenu={() => {}}
          />
        </div>

      

        {/* Dates et créneaux */}
        <div className="flex flex-col gap-4 bg-white">
          <div className="flex-1 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <label htmlFor="startDate" className={"block text-sm font-medium sm:mr-auto"}>Début</label>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={format(formDataAppointment.startDate, 'yyyy-MM-dd')}
                onChange={handleDateChange}
                required
                className={`w-full sm:w-[145px] p-2 border ${dateValidationError ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-blue-500 focus:border-blue-500`}
              />
        
              <div className='w-full sm:w-[145px]'>
                {!isFullDay && (
                  <select
                    id="intervalNameStart"
                    name="intervalName"
                    value={
                      formDataAppointment.startDate.getHours() >= HALF_DAY_INTERVALS[0].startHour 
                      && formDataAppointment.startDate.getHours() < HALF_DAY_INTERVALS[0].endHour
                      ? 'morning' : 'afternoon'
                    }
                    onChange={e => {
                      const newHour = e.target.value === 'morning'
                        ? HALF_DAY_INTERVALS[0].startHour
                        : HALF_DAY_INTERVALS[1].startHour;
                      setFormDataAppointment(prev => ({
                        ...prev,
                        startDate: setHours(startOfDay(prev.startDate), newHour),
                      }));
                    }}
                    className="w-full p-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="morning">Matin</option>
                    <option value="afternoon"
                      disabled={
                        format(formDataAppointment.startDate, 'yyyy-MM-dd') === format(formDataAppointment.endDate, 'yyyy-MM-dd') &&
                        formDataAppointment.endDate.getHours() === HALF_DAY_INTERVALS[0].endHour
                      }
                    >Après-midi</option>
                  </select>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <label htmlFor="endDate" className="block text-sm font-medium sm:mr-auto">Fin</label>
            <div className="flex flex-col w-full sm:w-auto">
              <div className="flex sm:flex-row gap-4 w-full sm:w-auto">
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={format(formDataAppointment.endDate, 'yyyy-MM-dd')}
                  onChange={handleDateChange}
                  required
                  className={`w-full sm:w-[145px] p-2 border ${dateValidationError ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-blue-500 focus:border-blue-500`}
                />

                <div className='w-full sm:w-[145px]'>
                  {!isFullDay && (
                    <select
                      id="intervalNameEnd"
                      name="intervalName"
                      value={
                        formDataAppointment.endDate.getHours() <= HALF_DAY_INTERVALS[0].endHour
                          ? 'morning'
                          : 'afternoon'
                      }
                      onChange={e => {
                        const isAfternoon = e.target.value === 'afternoon';
                        setFormDataAppointment(prev => {
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
                      className="w-full p-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                      <option 
                        value="morning"
                        disabled={
                          format(formDataAppointment.startDate, 'yyyy-MM-dd') === format(formDataAppointment.endDate, 'yyyy-MM-dd') &&
                          formDataAppointment.startDate.getHours() === HALF_DAY_INTERVALS[1].startHour
                        }
                      >Matin</option>
                      <option value="afternoon">Après-midi</option>
                    </select>
                  )}
                </div>
              </div>
              {dateValidationError && (
                <div className='w-full sm:w-auto'>
                  <span className="text-red-500 text-[11px] mt-1 block">
                    La date de fin doit être postérieure à la date de début
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sélecteur d'employé */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <label htmlFor="employeeId" className="block text-sm font-medium sm:mr-auto">Affecté</label>
          <select
            id="employeeId"
            name="employeeId"
            value={formDataAppointment.employeeId || ''}
            onChange={handleChange}
            className="w-full sm:w-[305px] p-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
          >
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-5">
          <button
            type="submit"
            className="px-4 py-2 bg-[#009580] cursor-pointer text-white rounded-xl w-full sm:w-[110px] flex items-center poppins text-[14px] justify-center"
          >
            {appointment ? 'Enregistrer' : 'Créer'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#009580] cursor-pointer text-white rounded-xl w-full sm:w-[110px] flex items-center poppins text-[14px] justify-center"
          >
            Annuler
          </button>
        </div>
      </form>

      {/* Section extensible - Options avancées */}
      {isExpanded && (
        <div className="w-full lg:w-[530px] p-4 rounded-xl flex flex-col gap-1 animate-in slide-in-from-right duration-300 lg:border-l border-gray-200 mt-4 lg:mt-0">
          
          {/* Cases à cocher */}
          <div className="mb-[50px]">
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAllNonWorkingDays}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setIncludeAllNonWorkingDays(isChecked);
                  // Synchroniser avec les anciens états pour compatibilité
                  
                }}
                className="w-4 h-4 text-[#009580] border-gray-300 rounded focus:ring-[#009580] mt-0.5"
              />
              <span className="text-sm text-gray-700 leading-tight">Inclure les week-ends, jours fériés et jours non travaillés</span>
            </label>
          </div>

          {/* Zone de texte pour annotations */}
          <div className="flex flex-col gap-6">
            <label className="text-sm font-medium text-gray-700">Annotations</label>
            <textarea
              value={formDataAppointment.description || ''}
              onChange={(e) => setFormDataAppointment(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Ajoutez des annotations..."
              className="w-full h-24 p-3 border border-gray-300 rounded-xl resize-none focus:ring-[#009580] focus:border-[#009580] text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(AppointmentForm);