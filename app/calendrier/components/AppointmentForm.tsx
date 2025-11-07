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
import {Appointment, Employee, HalfDayInterval, Evenement, ChantierEvent } from '../types';
import { format, parseISO, setHours, startOfDay, setSeconds, setMinutes, addDays, eachDayOfInterval, addMinutes } from 'date-fns';
import { isHoliday, isWeekend } from '../utils/dates';
import Modal from './modals/Modal';
import AppointmentItem from './AppointmentItem';
import { imagesÉvénement } from '@/app/datasource';

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
  /** Liste des événements associés au rendez-vous */
  events: Evenement[];
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
  /** Version réduite du formulaire (moins de champs) */
  isReducedVersion?: boolean;
  /** Callback appelé lors de la sauvegarde */
  onSave: (
    appointment: Appointment,
    eventType: Evenement,
    includeAllNonWorkingDays: boolean
  ) => void;
  /** Callback appelé lors de la fermeture du formulaire */
  onClose: () => void;
  onSaveEvent: (eventType: Evenement) => void;
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
  events,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  isReducedVersion,
  onSave,
  onClose,
  onSaveEvent
}) => {
  
  // ===== ÉTATS LOCAUX =====
  
  /**
   * État principal du formulaire contenant toutes les données du rendez-vous
   * Initialisé avec les données existantes ou des valeurs par défaut
   */
  const [formDataAppointment, setFormDataAppointment] = useState<Appointment>(
      { ...appointment, startDate: appointment.startDate, endDate:  addMinutes(appointment.endDate, -1) }
  );
  const [formDataEventType, setFormDataEventType] = useState<Evenement>(event);
  const [dateValidationError, setDateValidationError] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Images disponibles selon le type
  const [availableImages, setAvailableImages] = useState(() => {
    const index = imagesÉvénement.findIndex(img => img.image === event.image);

    let t;
    if (index !== -1) {
      t = imagesÉvénement.splice(index, 1)[0];
    }

    if (t) {
      imagesÉvénement.unshift(t);
    }

    return imagesÉvénement;
  })



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
    if (!value) return;    
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

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedItemId(null);
    setUploadError(null);
  };

   const handleImageSelect = (newImageSrc: string) => {    
      onSaveEvent({
        ...formDataEventType,
        image: newImageSrc
      })

      setFormDataEventType(prev => ({ ...prev, image: newImageSrc }));
      // Logique pour mettre à jour l'image de l'élément
      setIsImageModalOpen(false);
      setSelectedItemId(null);
    };


    const handleImageUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      if (file.size > 200 * 1024) {
        throw new Error('Le fichier est trop volumineux. Taille maximum : 200 Ko');
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Format non supporté. Formats acceptés : JPG, PNG, GIF, WebP, SVG');
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
          const { width, height } = img;
          
          if (width > 480 || height > 480) {
            setUploadError('Image trop grande. Dimensions maximum : 480x480px');
            setIsUploading(false);
            reject(new Error('Image trop grande'));
            return;
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0);
          
          const dataURL = canvas.toDataURL('image/png');
          setIsUploading(false);
          resolve(dataURL);
        };

        img.onerror = () => {
          setIsUploading(false);
          reject(new Error('Impossible de charger l\'image'));
        };

        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
          setAvailableImages(prev => [...prev, { id: prev.length + 1, image: img.src, name: file.name }]);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      setIsUploading(false);
      setUploadError(error instanceof Error ? error.message : 'Erreur inconnue');
      throw error;
    }
  };

  

  /**
   * Déclenche l'ouverture du sélecteur de fichier
   */
  const handleImageButtonClick = () => {
    setIsImageModalOpen(true);
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
    <>
      <div className={`flex ${isExpanded ? 'lg:flex-row flex-col' : 'flex-col'} gap-4 rounded-xl poppins transition-all duration-300`}>
        {/* Section principale du formulaire */}
        <form onSubmit={handleSubmit} className={`flex flex-col gap-4 w-full max-w-[380px] min-w-[320px]`}>
          {/* Flèche d'expansion */}
          {!isReducedVersion && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="absolute top-4 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer"
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
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mr-2">
            <div className='flex item-start w-full sm:w-[68px]'>Icône</div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
              {/* Container pour l'image et le bouton de modification */}
              <div className="relative group">
                <img 
                  src={formDataEventType.image} 
                  alt="Icône" 
                  className="w-12 h-12 rounded border border-default object-cover" 
                />
                <button
                  type="button"
                  onClick={handleImageButtonClick}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[10px] hover:bg-primary transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer"
                  title="Modifier l'image"
                >
                  <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L10.5 8.207l-3-3L12.146.146zM11.207 9L8 5.793 1.146 12.646a.5.5 0 0 0-.146.354v2.5a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .354-.146L11.207 9zM4 15.5a.5.5 0 0 1-.5-.5v-2.293l8.5-8.5L14.293 6.5 5.793 15H4z"/>
                  </svg>
                </button>
              </div>
              {/* Sélecteurs de couleur */}
              <div className="flex flex-row sm:flex-col gap-2">
                {/* Couleur de fond */}
                <div className="relative group flex items-center gap-1">
                  <label 
                    htmlFor="color-fond"
                    className="w-4 h-4 border-1 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: formDataEventType.color || '#1E40AF' }}
                    title="Couleur de fond"
                  />
                  <input
                    id="color-fond"
                    type="color"
                    value={formDataEventType.color || '#1E40AF'}
                    onChange={(e) => setFormDataEventType(prev => ({ ...prev, color: e.target.value }))}
                    className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                    title="Couleur de fond"
                  />
                  <label htmlFor="color-fond" className="cursor-pointer">
                    Couleur de fond
                  </label>
                </div>
                {/* Couleur de bordure */}
                <div className="relative group flex items-center gap-1">
                 <label 
                    htmlFor="color-bordure"
                    className="w-4 h-4 border-1 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: formDataEventType.borderColor || '#1E40AF' }}
                    title="Couleur de bordure"
                  />
                  <input
                    id="color-bordure"
                    type="color"
                    value={formDataEventType.borderColor || '#1E40AF'}
                    onChange={(e) => setFormDataEventType(prev => ({ ...prev, borderColor: e.target.value }))}
                    className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                    title="Couleur de bordure"
                  />
                  <label htmlFor="color-bordure" className="cursor-pointer">
                    Couleur de bordure
                  </label>
                </div>
              
                {/* Couleur de texte */}
                <div className="relative group flex items-center gap-1">
                  <label 
                    htmlFor="color-texte"
                    className="w-4 h-4 border-1 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: formDataEventType.textColor || '#FFFFFF' }}
                    title="Couleur de texte"
                  />
                  <input
                    id="color-texte"
                    type="color"
                    value={formDataEventType.textColor || '#FFFFFF'}
                    onChange={(e) => setFormDataEventType(prev => ({ ...prev, textColor: e.target.value }))}
                    className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                    title="Couleur de texte"
                  />
                  <label htmlFor="color-texte" className="cursor-pointer">
                    Couleur de texte
                  </label>
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
              chargeeAffaire={formDataEventType && formDataEventType.type === 'chantier' ? formDataEventType.chargeAffaire : ''}
              onDoubleClick={() => {}}
              onResize={() => {}}
              handleContextMenu={() => {}}
            />
          </div>

        

          {!isReducedVersion && (
            <>
              {/* Dates et créneaux */}
              <div className="flex flex-col gap-4 bg-transparent">
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
                    className={`w-full sm:w-[145px] p-2 border ${dateValidationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color`}
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
                        className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color"
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
                      className={`w-full sm:w-[145px] p-2 border ${dateValidationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color`}
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
                          className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color bg-gray-50"
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

            {/* Sélecteur de chargé d'affaire */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label htmlFor="employeeId" className="block text-sm font-medium sm:mr-auto">Affecté</label>
              <select
                id="employeeId"
                name="employeeId"
                value={formDataAppointment.employeeId || ''}
                onChange={handleChange}
                className="w-full sm:w-[305px] p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color bg-bg-secondary"
              >
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          </>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-5">
            <button
              type="submit"
              className="px-4 py-2 bg-primary cursor-pointer text-white rounded-xl w-full sm:w-[110px] flex items-center poppins text-[14px] justify-center"
            >
              {appointment ? 'Enregistrer' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-primary cursor-pointer text-white rounded-xl w-full sm:w-[110px] flex items-center poppins text-[14px] justify-center"
            >
              Annuler
            </button>
          </div>
        </form>

        {/* Section extensible - Options avancées */}
        {isExpanded && (
          <div className="w-full lg:w-[530px] p-4 flex flex-col gap-1 animate-in slide-in-from-right text-primary duration-300 lg:border-l border-light mt-4 lg:mt-0">
            
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
                  className="w-4 h-4 border-default rounded mt-0.5"
                />
                <span className="text-sm  leading-tight">Inclure les week-ends, jours fériés et jours non travaillés</span>
              </label>
            </div>

            {/* Zone de texte pour annotations */}
            <div className="flex flex-col gap-6">
              <label className="text-sm font-medium">Annotations</label>
              <textarea
                value={formDataAppointment.description || ''}
                onChange={(e) => setFormDataAppointment(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ajoutez des annotations..."
                className="w-full h-24 p-3 border border-default rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-color text-sm"
              />
            </div>
          </div>
        )}
      </div>
       {/* Modal de sélection d'images */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        title="Choisir une image"
        isOverlayVisible={false}
      >
        <ImageSelectorContent
          images={availableImages}
          onImageSelect={handleImageSelect}
          onClose={handleCloseImageModal}
          onImageUpload={handleImageUpload}
          isUploading={isUploading}
          uploadError={uploadError}
        />
      </Modal>
    </>
  );
};

export default memo(AppointmentForm);





/**
 * Interface pour les données d'image
 */
interface ImageData {
  id: number;
  image: string;
  name: string;
  category?: string;
}

/**
 * Props pour le composant ImageSelectorContent
 */
interface ImageSelectorContentProps {
  images: ImageData[];
  onImageSelect: (src: string) => void;
  onClose: () => void;
  onImageUpload: (file: File) => Promise<string>;
  isUploading: boolean;
  uploadError: string | null;
}

/**
 * Composant de sélection d'images avec recherche et pagination
 */
const ImageSelectorContent: React.FC<ImageSelectorContentProps> = ({
  images,
  onImageSelect,
  onClose,
  onImageUpload,
  isUploading,
  uploadError
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const itemsPerPage = 8;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filtrer les images selon le terme de recherche
  const filteredImages = useMemo(() => {
    if (!searchTerm.trim()) return images;
    
    return images.filter(image => 
      image.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [images, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedImages = viewMode === 'grid' ? filteredImages.slice(startIndex, startIndex + itemsPerPage) : filteredImages;

  // Reset page quand on change le filtre
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Fonctions pour gérer l'upload de fichiers
  const handleFiles = async (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      try {
        const imageDataURL = await onImageUpload(file);
        onImageSelect(imageDataURL);
      } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="w-[700px] max-h-[80vh]">
      {/* Zone d'upload */}
      <div className="mb-4">
        <div
          className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary-ultra-light' 
              : 'border-gray-300 hover:border-primary'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />
          
          {isUploading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-primary">Upload en cours...</span>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">📁</div>
              <div className="text-secondary mb-2">
                Glissez-déposez une image ici ou{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary underline "
                >
                  parcourez vos fichiers
                </button>
              </div>
              <div className="text-xs text-secondary">
                Formats acceptés : JPG, PNG, GIF, WebP, SVG - Max 480x480px, 200Ko
              </div>
            </div>
          )}
        </div>
        
        {uploadError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {uploadError}
          </div>
        )}
      </div>

      {/* Barre de recherche et contrôles */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher une image..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full placeholder:text-primary pl-10 pr-4 py-2 border border-gray-300 rounded-lg  focus:outline-none focus:ring-2 focus:ring-color focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-primary">
            {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''} trouvée{filteredImages.length !== 1 ? 's' : ''}
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-transparent'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4C2.9 4 2 4.9 2 6V12C2 13.1 2.9 14 4 14H10C11.1 14 12 13.1 12 12V6C12 4.9 11.1 4 10 4Z"/>
                <path d="M20 4H14C12.9 4 12 4.9 12 6V12C12 13.1 12.9 14 14 14H20C21.1 14 22 13.1 22 12V6C22 4.9 21.1 4 20 4Z"/>
                <path d="M10 16H4C2.9 16 2 16.9 2 18V20C2 21.1 2.9 22 4 22H10C11.1 22 12 21.1 12 20V18C12 16.9 11.1 16 10 16Z"/>
                <path d="M20 16H14C12.9 16 12 16.9 12 18V20C12 21.1 12.9 22 14 22H20C21.1 22 22 21.1 22 20V18C22 16.9 21.1 16 20 16Z"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded cursor-pointer  ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-transparent'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13H1V11H3V13Z"/>
                <path d="M3 17H1V15H3V17Z"/>
                <path d="M3 9H1V7H3V9Z"/>
                <path d="M7 13H21V11H7V13Z"/>
                <path d="M7 17H21V15H7V17Z"/>
                <path d="M7 9H21V7H7V9Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu des images */}
      <div className="mb-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 gap-4">
        {paginatedImages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 
              `Aucune image trouvée pour "${searchTerm}"` :
              'Aucune image disponible'
            }
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {paginatedImages.map((image, index) => (
                <div
                  key={index}
                  onClick={() => onImageSelect(image.image)}
                  className="cursor-pointer group relative"
                >
                  <div 
                    className={`border-2 rounded-lg p-2 hover:border-primary hover:shadow-md transition-all relative ${
                      index === 0 && currentPage === 1
                        ? 'border-primary shadow-lg bg-primary-ultra-light' 
                        : 'border-gray-200 hover:border-primary'
                    }`}
                    title={image.name}
                  >
                    <img 
                      src={image.image} 
                      alt={image.name} 
                      className={`w-full h-20 object-contain mb-2 group-hover:scale-105 transition-transform ${
                        index === 0 && currentPage === 1 ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                >
                  ←
                </button>
                
                <span className="text-sm text-primary">
                  Page {currentPage} sur {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                >
                  →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {paginatedImages.map((image, index) => (
              <div
                key={index}
                onClick={() => onImageSelect(image.image)}
                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer hover:border-primary hover:shadow-md transition-all group relative ${
                  index === 0 
                    ? 'border-primary shadow-md bg-primary-ultra-light' 
                    : 'border-gray-200'
                }`}
                title={image.name}
              >
                <img 
                  src={image.image} 
                  alt={image.name} 
                  className={`w-12 h-12 object-contain mr-3 group-hover:scale-105 transition-transform ${
                    index === 0 ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                  }`}
                />
                <div>
                  <div className="font-medium text-gray-900 group-hover:text-primary">{image.name.length > 15 ? `${image.name.slice(0, 15)}...` : image.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

     

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-primary">
          💡 Astuce : Vous pouvez également glisser-déposer une image directement sur cette zone
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-primary rounded-lg transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
};