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
import React, { useState, memo, useMemo, useEffect } from 'react';
import {Appointment, Employee, HalfDayInterval, Item, Tags, CommonPaieAttributs } from '../../types';
import { format, startOfDay, isSameDay, isSameYear, isSameMonth } from 'date-fns';
import { isHoliday, isWeekend, eachDayOfInterval } from '../../utils/dates';

import { AppointmentItem } from '../index';

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
  item: Item;
  /** Événements*/
  items: Item[];
  /** ID de l'employé présélectionné (optionnel) */
  initialEmployeeId?: number | null;
  /** Liste de tous les employés disponibles */
  employees: Employee[];
  /** Configuration des créneaux horaires (matin/après-midi/journée) */
  HALF_DAY_INTERVALS: HalfDayInterval[];
  /** Indique si le rendez-vous occupe une journée complète */
  isFullDay: boolean;
  /** Liste des dates non-travaillées (week-ends, fériés) */
  nonWorkingDates: number[];
  /** Version réduite du formulaire (moins de champs) */
  isReducedVersion?: boolean;
  /** Indique si l'application est utilisée sur un appareil mobile */
  isMobile?: boolean;
  /** Callback appelé lors de la sauvegarde */
  onSave: (
    appointment: Appointment,
    eventType: Item,
    includeAllNonWorkingDays: boolean
  ) => void;
  /** Callback appelé lors de la fermeture du formulaire */
  onClose: () => void;
  /** Callback appelé lors de la sauvegarde de l'événement */
  handleOpenImageModal: (itemId: number) => void;
  /** Callback pour notifier si le formulaire a des modifications non enregistrées */
  onDirtyChange?: (isDirty: boolean) => void;
  handleAddDimension: (dimension: Item) => void;
  handleEditDimension: (dimension: Item) => void;
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
const AppointmentForm: React.FC<AppointmentFormProps> = memo(({
  appointments,
  appointment,
  item,
  items,
  employees,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  isReducedVersion,
  onSave,
  onClose,
  handleOpenImageModal,
  onDirtyChange,
  handleAddDimension,
  handleEditDimension,
  isMobile,
}) => {
    
  // ===== ÉTATS LOCAUX =====
  
  /**
   * État principal du formulaire contenant toutes les données du rendez-vous
   * Initialisé avec les données existantes ou des valeurs par défaut
   */
  const [formDataAppointment, setFormDataAppointment] = useState<Appointment>(appointment);
  const [formDataItemType, setFormDataItemType] = useState<Item>(item);
  const [dateValidationError, setDateValidationError] = useState(false);
  const [codeValidationError, setCodeValidationError] = useState(false);  
   
  /**
   * Normalise une couleur en format hexadécimal court (#RRGGBB)
   * Supprime le canal alpha si présent (#RRGGBBAA -> #RRGGBB)
   * @param color - Couleur au format hex (#RRGGBB ou #RRGGBBAA)
   * @returns Couleur normalisée au format #RRGGBB
   */
  const normalizeColorForInput = (color: string | undefined): string => {
    if (!color) return '#1E40AF';
    // Si la couleur a 9 caractères (#RRGGBBAA), on retire les 2 derniers (canal alpha)
    if (color.length === 9 && color.startsWith('#')) {
      return color.substring(0, 7);
    }
    return color;
  };

  useEffect(() => {
    // Ne mettre à jour que si l'image a réellement changé
    if (item?.image !== formDataItemType.image) {
      setFormDataItemType(prev => ({ ...prev, image: item?.image }));
    }
  }, [item?.image, formDataItemType.image]);
  

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
        isSameDay(nd, date)
        && isSameMonth(nd, date)
        && isSameYear(nd, date)
      ) || isHoliday(date) || isWeekend(date)) // Vérifie jours non travaillés, fériés ou week-ends
    );
  }, [appointments, formDataAppointment.id, nonWorkingDates]);

  /**
   * État pour contrôler l'expansion du panel d'options avancées
   */
  const [isExpanded, setIsExpanded] = useState(isReducedVersion ? false : true);

  /**
   * État unifié pour la gestion de tous les jours non travaillés
   * (week-ends, fériés, jours configurés comme non travaillés)
   */
  const [includeAllNonWorkingDays, setIncludeAllNonWorkingDays] = useState(
    isAppointmentSplitByNotWorkingDay
  );

  /**
   * États pour la gestion des étiquettes (version réduite uniquement)
   */
  const [newTag, setNewTag] = useState<Tags>({id: 0, name: ''});

  /**
   * Détection des changements non sauvegardés
   */
  useEffect(() => {
    if (!onDirtyChange) return;

    // Comparaison simple pour détecter les changements
    // Note: Pour une comparaison plus robuste, on pourrait utiliser lodash.isEqual
    // ou une comparaison champ par champ spécifique
    
    // On ignore certaines propriétés qui peuvent changer sans impacter la "saleté" du formulaire
    // comme l'ordre des clés ou des références d'objets identiques
    
    const isAppDirty = JSON.stringify({
      ...formDataAppointment,
      // Normalisation des dates pour éviter les faux positifs dus aux millisecondes
      startDate: formDataAppointment.startDate,
      endDate: formDataAppointment.endDate
    }) !== JSON.stringify({
      ...appointment,
      startDate: appointment.startDate,
      endDate: appointment.endDate
    });

    const isItemDirty = JSON.stringify(formDataItemType) !== JSON.stringify(item);
    const isIncludeDirty = includeAllNonWorkingDays !== isAppointmentSplitByNotWorkingDay;

    onDirtyChange(isAppDirty || isItemDirty || isIncludeDirty);
  }, [formDataAppointment, formDataItemType, includeAllNonWorkingDays, appointment, item, isAppointmentSplitByNotWorkingDay, onDirtyChange]);

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

    const baseDate = new Date(value);
    const baseTs = baseDate.getTime();
    if (Number.isNaN(baseTs)) return; // Ignore invalid input to avoid propagating NaN

    // 2. On récupère l'heure actuelle stockée dans le state (ou l'heure courante si vide)
    // formDataAppointment[name] est supposé être un timestamp (number)
    const currentTimestamp = formDataAppointment[name as 'startDate' | 'endDate'] || Date.now();
    const timeSource = new Date(currentTimestamp);
    const timeSourceTs = timeSource.getTime();
    const safeTimeSource = Number.isNaN(timeSourceTs) ? new Date() : timeSource;

    // 3. FUSION : On applique l'heure conservée sur la nouvelle date
    // setHours prend (heures, minutes, secondes, ms)
    baseDate.setHours(
      safeTimeSource.getHours(), 
      safeTimeSource.getMinutes(), 
      0, 
      0
    );

    // 4. On met à jour le state avec un TIMESTAMP (nombre)
    setFormDataAppointment(prev => ({ 
        ...prev, 
        [name]: baseDate.getTime() 
    }));
  };


  /**
   * Soumet le formulaire de rendez-vous.
   * Appelle la fonction `onSave` avec les données du formulaire et l'état `includeAllNonWorkingDays`.
   *
   * @param {React.FormEvent} e - Événement de soumission du formulaire.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    
    if (formDataAppointment.id === -1) {
      // Validation du code avant la création
      if (formDataItemType.code && items.find(item => item.code === formDataItemType.code.toUpperCase())) {
        setCodeValidationError(true);
        return;
      }
      // Si c'est une création, on ajoute le nouvel événement
      handleAddDimension({...formDataItemType, id: Date.now()});
      return;
    }
    
    if (formDataItemType.id === 0) {
      // Si c'est une modification, on met à jour l'événement existant
      handleEditDimension(formDataItemType);
      return;
    }    

    // Validation des dates
    if (formDataAppointment.startDate >= formDataAppointment.endDate) {      
      setDateValidationError(true);
      return;
    }

    setDateValidationError(false);
    
       // console.log(formDataItemType.id);

    onSave(
      formDataAppointment,
      formDataItemType,
      includeAllNonWorkingDays
    );
  };

  /**
   * Gestion des étiquettes
   */
  const handleAddTag = () => {
    if (newTag.name.trim() && !formDataItemType.tags?.some(tag => tag.name === newTag.name.trim())) {
      setFormDataItemType(prev => ({
        ...prev,
        tags: prev.tags ? [...prev.tags, { id: Date.now(), name: newTag.name.trim() }] : [{ id: Date.now(), name: newTag.name.trim() }]
      }));
      setNewTag({id: 0, name: ''});
    }
  };

  const handleRemoveTag = (tagToRemove: number) => {
    setFormDataItemType(prev => ({
      ...prev,
      tags: prev.tags ? prev.tags.filter(tag => tag.id !== tagToRemove) : []
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (name === 'code') {
      // Réinitialiser l'erreur lors de la modification
      if (codeValidationError) {
        setCodeValidationError(false);
      }
      
      // Forcer les majuscules pour le champ code
      const upperCode = value.toUpperCase();
      if (items.find(item => item.code === upperCode && item.id !== formDataItemType.id)) {
        // Gérer le cas où le code existe déjà
        setCodeValidationError(true);
        setFormDataItemType(prev => ({
          ...prev,
          [name]: upperCode
        }));
        return;
      }
      setFormDataItemType(prev => ({
        ...prev,
        [name]: upperCode
      }));
      return;
    }

    setFormDataItemType(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
    
  
  // Rendu du formulaire
  return (
    <>
      <div className={`flex ${isReducedVersion ? 'flex-row' : isExpanded ? 'lg:flex-row flex-col' : 'flex-col'} gap-4 rounded-xl poppins transition-all duration-300`}>
        {/* Section principale du formulaire */}
        <form onSubmit={handleSubmit} className={`flex flex-col gap-4 w-full max-w-[380px] min-w-[320px]`} noValidate>
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
          {formDataAppointment.id === -1 && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                  {/* Champ CODE */}
                  <div className="w-1/3">
                      <label htmlFor="code" className="block text-xs font-medium text-gray-500 mb-1">Code</label>
                      <input
                          type="text"
                          name="code"
                          id="code"
                          value={formDataItemType.code || ''}
                          onChange={handleItemChange}
                          placeholder="EX: CH"
                          className={`w-full p-2 border rounded-xl focus:outline-none focus:ring-2 text-sm ${codeValidationError ? 'border-red-500 focus:ring-red-500' : 'border-default focus:ring-primary'}`}
                          required
                      />
                      {codeValidationError && (
                        <p className="text-xs text-red-500 mt-1">Ce code est déjà utilisé</p>
                      )}
                  </div>
                  
                  {/* Champ ACTIF (Switch) */}
                  <div className="flex flex-col items-center justify-center w-1/6">
                      <label htmlFor="active" className="block text-xs font-medium text-gray-500 mb-1">Actif</label>
                      <input
                          type="checkbox"
                          name="actif"
                          id="actif"
                          checked={!!(formDataItemType as CommonPaieAttributs).actif}
                          onChange={handleItemChange}
                          className="w-5 h-5 cursor-pointer accent-primary"
                          title="Statut actif/inactif"
                      />
                  </div>
              </div>

              {/* Champ DESCRIPTION (Nom) */}
              <div className="w-full">
                  <label htmlFor="name" className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <input
                      type="text"
                      name="label"
                      id="label"
                      value={formDataItemType.label || ''}
                      onChange={handleItemChange}
                      placeholder="Nom de la rubrique..."
                      className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      required
                  />
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mr-2">
            <div className='flex item-start w-full sm:w-[68px]'>Icône</div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
              {/* Container pour l'image et le bouton de modification */}
              <div 
                className="relative group"
                onClick={() => {if (isMobile) handleOpenImageModal(formDataItemType.id)}}
              >
                {formDataItemType?.image?.image ? (
                  // CAS 1 : L'image existe -> On l'affiche
                  <img 
                    src={formDataItemType.image.image} 
                    alt="Icône" 
                    className="w-12 h-12 rounded border border-default object-cover" 
                  />
                ) : (
                  // CAS 2 : Pas d'image -> Fond gris avec une croix
                  <div className="w-12 h-12 rounded border border-default bg-gray-200 flex items-center justify-center text-gray-400">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      strokeWidth={2} 
                      stroke="currentColor" 
                      className="w-6 h-6"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {if (!isMobile) handleOpenImageModal(formDataItemType.id)}}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[10px] hover:bg-primary transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer"
                  title="Modifier l'image"
                >
                  <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L10.5 8.207l-3-3L12.146.146zM11.207 9L8 5.793 1.146 12.646a.5.5 0 0 0-.146.354v2.5a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .354-.146L11.207 9zM4 15.5a.5.5 0 0 1-.5-.5v-2.293l8.5-8.5L14.293 6.5 5.793 15H4z"/>
                  </svg>
                </button>
              </div>
              {/* Sélecteurs de couleur */}
              <div className="flex flex-col gap-2 w-full">
                {/* Couleur de fond */}
                <div className="relative group flex items-center gap-2">
                  <label 
                    htmlFor="color-fond"
                    className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: formDataItemType?.color || '#1E40AF' }}
                    title="Couleur de fond"
                  />
                  <input
                    id="color-fond"
                    type="color"
                    value={normalizeColorForInput(formDataItemType?.color)}
                    onChange={(e) => setFormDataItemType(prev => ({ ...prev, color: e.target.value }))}
                    className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                    title="Couleur de fond"
                  />
                  <label htmlFor="color-fond" className="cursor-pointer text-sm flex-1">
                    Couleur de fond
                  </label>
                </div>
                {/* Couleur de bordure */}
                <div className="relative group flex items-center gap-2">
                 <label 
                    htmlFor="color-bordure"
                    className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: formDataItemType?.borderColor || '#1E40AF' }}
                    title="Couleur de bordure"
                  />
                  <input
                    id="color-bordure"
                    type="color"
                    value={normalizeColorForInput(formDataItemType?.borderColor)}
                    onChange={(e) => setFormDataItemType(prev => ({ ...prev, borderColor: e.target.value }))}
                    className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                    title="Couleur de bordure"
                  />
                  <label htmlFor="color-bordure" className="cursor-pointer text-sm flex-1">
                    Couleur de bordure
                  </label>
                </div>
              
                {/* Couleur de texte */}
                <div className="relative group flex items-center gap-2">
                  <label 
                    htmlFor="color-texte"
                    className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: formDataItemType?.textColor || '#FFFFFF' }}
                    title="Couleur de texte"
                  />
                  <input
                    id="color-texte"
                    type="color"
                    value={normalizeColorForInput(formDataItemType?.textColor)}
                    onChange={(e) => setFormDataItemType(prev => ({ ...prev, textColor: e.target.value }))}
                    className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                    title="Couleur de texte"
                  />
                  <label htmlFor="color-texte" className="cursor-pointer text-sm flex-1">
                    Couleur de texte
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Aperçu du rendez-vous - Repositionné sous les couleurs */}
          <div className='relative'>
            <AppointmentItem
              appointment={{
                ...formDataAppointment,
                id: formDataAppointment.id || 0,
                startDate: Date.now(),
                endDate: Date.now() + 86400000 * 3, // +3 jours
              }}
              event={formDataItemType}
              isFullDay={isFullDay}
              source='demo'
              isMobile={false}
              isDisplayWeekend={false}
              chargeeAffaire={formDataItemType && formDataItemType.type === 'chantier' ? formDataItemType.chargeAffaire : ''}
              onDoubleClick={() => {}}
              onResize={() => {}}
              handleContextMenu={() => {}}
            />
          </div>
        

          {!isReducedVersion && (
            <>
              {/* Dates et créneaux */}
              <div className="flex flex-col gap-4 bg-transparent">
              <div className="flex-1 flex flex-row gap-2 items-center justify-between">
                <label htmlFor="startDate" className={"block text-sm font-medium"}>Début</label>
                <div className="flex flex-row gap-2 w-full justify-end">
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={format(formDataAppointment.startDate, 'yyyy-MM-dd')}
                    onChange={handleDateChange}
                    required
                    className={`w-[145px] p-2 border ${dateValidationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm`}
                  />
            
                  <div className='w-[145px]'>
                    {!isFullDay && (
                      <select
                        id="intervalNameStart"
                        name="intervalName"
                        value={
                          new Date(formDataAppointment.startDate).getHours() >= HALF_DAY_INTERVALS[0].startHour 
                          && new Date(formDataAppointment.startDate).getHours() < HALF_DAY_INTERVALS[0].endHour
                          ? 'morning' : 'afternoon'
                        }
                        onChange={e => {
                          const newHour = e.target.value === 'morning'
                            ? HALF_DAY_INTERVALS[0].startHour
                            : HALF_DAY_INTERVALS[1].startHour;
                          setFormDataAppointment(prev => ({
                            ...prev,
                            startDate: startOfDay(prev.startDate).setHours(newHour),
                          }));
                        }}
                        className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color"
                      >
                        <option value="morning">Matin</option>
                        <option value="afternoon"
                          disabled={
                            format(formDataAppointment.startDate, 'yyyy-MM-dd') === format(formDataAppointment.endDate, 'yyyy-MM-dd') &&
                            new Date(formDataAppointment.endDate).getHours() === HALF_DAY_INTERVALS[0].endHour - 1
                          }
                        >Après-midi</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-row gap-2 items-center">
                <label htmlFor="endDate" className="block text-sm font-medium">Fin</label>
                <div className="flex flex-col w-full">
                  <div className="flex flex-row gap-2 w-full justify-end">
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={format(formDataAppointment.endDate, 'yyyy-MM-dd')}
                      onChange={handleDateChange}
                      required
                      className={`w-[145px] p-2 border ${dateValidationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm`}
                    />

                    <div className='w-[145px]'>
                      {!isFullDay && (
                        <select
                          id="intervalNameEnd"
                          name="intervalName"
                          value={
                            new Date(formDataAppointment.endDate).getHours() <= HALF_DAY_INTERVALS[0].endHour
                              ? 'morning'
                              : 'afternoon'
                          }
                          onChange={e => {
                            const isAfternoon = e.target.value === 'afternoon';

                            setFormDataAppointment(prev => {
                              const targetDate = new Date(prev.endDate);
                              targetDate.setHours(
                                isAfternoon ? HALF_DAY_INTERVALS[1].endHour - 1 : HALF_DAY_INTERVALS[0].endHour - 1 ,
                                59 ,
                                59 ,
                                999
                              );
                              return {
                                ...prev,
                                endDate: targetDate.getTime(),
                              };
                            });
                          }}
                          className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color bg-gray-50"
                        >
                          <option 
                            value="morning"
                            disabled={
                              format(formDataAppointment.startDate, 'yyyy-MM-dd') === format(formDataAppointment.endDate, 'yyyy-MM-dd') &&
                              new Date(formDataAppointment.startDate).getHours() === HALF_DAY_INTERVALS[1].startHour
                            }
                          >Matin</option>
                          <option value="afternoon">Après-midi</option>
                        </select>
                      )}
                    </div>
                  </div>
                  {dateValidationError && (
                    <div className='w-full'>
                      <span className="text-red-500 text-xs mt-1 block">
                        La date de fin doit être postérieure à la date de début
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sélecteur de chargé d'affaire */}
            <div className="flex flex-col gap-2">
              <label htmlFor="employeeId" className="block text-sm font-medium">Affecté</label>
              <select
                id="employeeId"
                name="employeeId"
                value={formDataAppointment.employeeId || ''}
                onChange={handleChange}
                className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color bg-bg-secondary text-sm"
              >
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name + ' ' + employee.firstName}
                  </option>
                ))}
              </select>
            </div>
          </>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-5">
            <input
              type="submit"
              className="px-4 py-3 bg-primary cursor-pointer text-white rounded-xl flex-1 sm:flex-none sm:w-[110px] flex items-center poppins text-sm justify-center font-medium touch-manipulation"
              value={appointment?.id === -1 ? 'Créer' : 'Enregistrer'}
            />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-primary cursor-pointer text-white rounded-xl flex-1 sm:flex-none sm:w-[110px] flex items-center poppins text-sm justify-center font-medium touch-manipulation"
            >
              Annuler
            </button>
          </div>
        </form>

        {/* Section étiquettes - Version réduite uniquement */}
        {isReducedVersion && (
          <div className="w-full lg:w-[280px] p-4 flex flex-col gap-4 border-l border-light">
            <h3 className="text-sm font-semibold text-primary">Étiquettes</h3>
            
            {/* Input pour ajouter une étiquette */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag.name}
                onChange={(e) => setNewTag({id: 0, name: e.target.value})}
                onKeyPress={handleTagKeyPress}
                placeholder="Nouvelle étiquette..."
                className="flex-1 px-3 py-2 text-sm border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={20}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!newTag.name.trim()}
                className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Ajouter l'étiquette"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
              </button>
            </div>

            {/* Liste des étiquettes */}
            <div className="flex flex-wrap gap-2 min-h-[60px] max-h-[200px] overflow-y-auto">
              {formDataItemType?.tags?.length === 0 ? (
                <span className="text-xs text-gray-400 italic">Aucune étiquette</span>
              ) : (
                formDataItemType?.tags?.map((tag, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-ultra-light text-primary rounded-full text-xs group hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <span>{tag.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors"
                      title="Supprimer l'étiquette"
                    >
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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

            {/* Sélecteur d'étiquette - Version étendue uniquement */}
            <div className="flex flex-col gap-4 mt-6">
              <label className="text-sm font-medium">Étiquette associée</label>
              <select
                value={formDataAppointment.tag?.id || ''}
                onChange={(e) => setFormDataAppointment(prev => ({
                  ...prev,
                  tag: e.target.value ? formDataItemType.tags?.find(tag => tag.id === Number(e.target.value)) || undefined : undefined
                }))}
                className="w-full p-3 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm bg-bg-secondary"
              >
                <option value="">Aucune étiquette</option>
                {formDataItemType.tags?.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              
              {/* Aperçu de l'étiquette sélectionnée */}
              {formDataAppointment.tag && formDataItemType.tags && (
                <div className="flex items-center gap-2 p-3 bg-primary-ultra-light rounded-xl">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-primary">
                    <path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
                  </svg>
                  <span className="text-sm text-primary font-medium">
                    {formDataAppointment.tag.name}
                  </span>
                </div>
              )}
              
              {/* Message si aucune étiquette disponible */}
              {(!formDataItemType.tags || formDataItemType.tags.length === 0) && (
                <div className="text-xs text-gray-400 italic p-2 bg-gray-50 rounded-lg">
                  Aucune étiquette disponible. Ajoutez des étiquettes à cet événement en mode réduit.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
});


export default AppointmentForm;