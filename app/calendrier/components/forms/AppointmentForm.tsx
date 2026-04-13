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
import {Appointment, HalfDayInterval, Item, CommonPaieAttributs, User, SocialItemPermission, Tag } from '../../types';
import { isSameDay, isSameYear, isSameMonth } from 'date-fns';
import { isHoliday, isWeekend, eachDayOfInterval } from '../../utils/dates';
import socialPermissionService from '@/app/service/socialPermission.service';

import { AppointmentItem } from '../index';
import FormHeader, { ColorConfig, ResourceField } from './FormHeader';
import DateTimeSelector, { TimeInterval } from './DateTimeSelector';
import PermissionsPanel, { Permission, UserWithPermissions } from './PermissionsPanel';
import TagsManager from './TagsManager';
import { FormPreview, EmployeeSelector, AnnotationsField, ExpandButton, ActionButtons, Employee } from './FormComponents';
import { useModalContext } from '@/app/calendrier/components/modals/Modal';

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
  employees: User[];
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
  /** Mode d'édition de ressource: 'create' pour créer, 'edit' pour modifier, null pour un rendez-vous normal */
  resourceEditMode?: 'create' | 'edit' | null;
    /** Placement des étiquettes : 'hover' pour les afficher au survol, 'fixed' pour les afficher en permanence */
  tagPlacement?: 'hover' | 'fixed';
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
  /** Callback pour supprimer une étiquette de tous les rendez-vous associés */
  onRemoveTagFromAppointments?: (tagId: number) => void;
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
  tagPlacement = 'hover',
  employees,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  isReducedVersion,
  onSave,
  handleOpenImageModal,
  onDirtyChange,
  handleAddDimension,
  handleEditDimension,
  isMobile,
  resourceEditMode = null,
  onRemoveTagFromAppointments,
}) => {

  const { handleCloseWithSave, registerSaveHandler } = useModalContext();

  // Variables dérivées pour améliorer la lisibilité
  const isCreatingResource = resourceEditMode === 'create';
  const isEditingResource = resourceEditMode === 'edit';
  
    
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
   * État pour contrôler l'expansion du panel d'options avancées
   */
  const [isExpanded, setIsExpanded] = useState(isReducedVersion ? false : true);

  /**
   * États pour la gestion des permissions par employé (rubriques sociales uniquement)
   */
  const [employeePermissions, setEmployeePermissions] = useState<Map<number, SocialItemPermission>>(new Map());

  useEffect(() => {
    // Ne mettre à jour que si l'image a réellement changé
    if (item?.IdImage !== formDataItemType.IdImage) {
      setFormDataItemType(prev => ({ ...prev, IdImage: item?.IdImage }));
    }
  }, [item?.IdImage, formDataItemType.IdImage]);
  

  /**
   * Vérifie si le rendez-vous actuel chevauche des jours non-travaillés
   * Utilisé pour déterminer l'état initial de la checkbox
   */
  const isAppointmentSplitByNotWorkingDay = useMemo(() => {
    const app = appointments.find(a => a.IdPlanningEvenement === formDataAppointment.IdPlanningEvenement);
    if (!app) return false;
    const days = eachDayOfInterval({ start: app.DebutPlanningEvenement, end: app.FinPlanningEvenement });
    return days.some((date) =>
      (nonWorkingDates.some(nd => 
        isSameDay(nd, date)
        && isSameMonth(nd, date)
        && isSameYear(nd, date)
      ) || isHoliday(date) || isWeekend(date)) // Vérifie jours non travaillés, fériés ou week-ends
    );
  }, [appointments, formDataAppointment.IdPlanningEvenement, nonWorkingDates]);

  /**
   * État unifié pour la gestion de tous les jours non travaillés
   * (week-ends, fériés, jours configurés comme non travaillés)
   */
  const includeAllNonWorkingDays = useMemo(() => isAppointmentSplitByNotWorkingDay, [isAppointmentSplitByNotWorkingDay]);

  // Charger les permissions existantes au montage ou lors du changement d'item
  useEffect(() => {
    let isMounted = true;

    const loadPermissions = async () => {
      if (isEditingResource && formDataItemType.IdPlanningRessource && (formDataItemType.Type === 'absence' || formDataItemType.Type === 'autre' || formDataItemType.isManual)) {
        const permissionEntries = await Promise.all(
          employees.map(async (emp) => {
            const response = await socialPermissionService.getSocialItemPermission(emp.IdPersonnel, formDataItemType.IdPlanningRessource);
            const perm = response?.error === 0 ? response.data : null;

            const safePermission: SocialItemPermission = perm || {
              userId: emp.IdPersonnel,
              itemId: formDataItemType.IdPlanningRessource,
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
            };

            return [emp.IdPersonnel, safePermission] as const;
          })
        );

        if (!isMounted) return;

        setEmployeePermissions(new Map<number, SocialItemPermission>(permissionEntries));
        return;
      }

      if (isCreatingResource && (formDataItemType.Type === 'absence' || formDataItemType.Type === 'autre' || formDataItemType.isManual)) {
      // Pour la création, initialiser avec tous les droits
      const permissions = new Map<number, SocialItemPermission>();
      employees.forEach(emp => {
        permissions.set(emp.IdPersonnel, {
          userId: emp.IdPersonnel,
          itemId: formDataItemType.IdPlanningRessource || -1,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        });
      });

      if (!isMounted) return;

      setEmployeePermissions(permissions);
      }
    };

    loadPermissions();

    return () => {
      isMounted = false;
    };
  }, [isEditingResource, isCreatingResource, formDataItemType.IdPlanningRessource, formDataItemType.Type, employees]);

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
      startDate: formDataAppointment.DebutPlanningEvenement,
      endDate: formDataAppointment.FinPlanningEvenement
    }) !== JSON.stringify({
      ...appointment,
      startDate: appointment.DebutPlanningEvenement,
      endDate: appointment.FinPlanningEvenement
    });

    const isItemDirty = JSON.stringify(formDataItemType) !== JSON.stringify(item);
    const isIncludeDirty = includeAllNonWorkingDays !== isAppointmentSplitByNotWorkingDay;

    onDirtyChange(isAppDirty || isItemDirty || isIncludeDirty);
  }, [formDataAppointment, formDataItemType, includeAllNonWorkingDays, appointment, item, isAppointmentSplitByNotWorkingDay, onDirtyChange]);

  /**
   * Enregistre le gestionnaire de sauvegarde dans le contexte du Modal
   * Cela permet au Modal de déclencher la sauvegarde du formulaire
   * lorsque l'utilisateur confirme vouloir sauvegarder
   */
  useEffect(() => {
    const handleSave = () => {
      // Validation: gestion de la création d'une nouvelle ressource
      if (isCreatingResource) {
        if (formDataItemType.CodePlanningRessource && items.find(item => item.CodePlanningRessource === formDataItemType.CodePlanningRessource?.toUpperCase() && item.IdPlanningRessource !== formDataItemType.IdPlanningRessource)) {
          setCodeValidationError(true);
          return;
        }
        
        const newItemId = Date.now();
        
        // Sauvegarde des permissions pour les rubriques sociales et événements manuels
        if (formDataItemType.Type === 'absence' || formDataItemType.Type === 'autre' || formDataItemType.isManual) {
          employeePermissions.forEach((perm) => {
            void socialPermissionService.setSocialItemPermission({
              ...perm,
              itemId: newItemId,
            });
          });
        }
        
        handleAddDimension({...formDataItemType, IdPlanningRessource: newItemId});
        return;
      }
      
      // Validation: gestion de la modification d'une ressource existante
      if (isEditingResource) {
        // Sauvegarde des permissions pour les rubriques sociales et événements manuels
        if (formDataItemType.Type === 'absence' || formDataItemType.Type === 'autre' || formDataItemType.isManual) {
          employeePermissions.forEach((perm) => {
            void socialPermissionService.setSocialItemPermission(perm);
          });
        }
        
        handleEditDimension(formDataItemType);
        return;
      }

      // Validation des dates pour un rendez-vous normal
      if (formDataAppointment.DebutPlanningEvenement >= formDataAppointment.FinPlanningEvenement) {      
        setDateValidationError(true);
        return;
      }

      setDateValidationError(false);

      // Appeler la fonction de sauvegarde
      onSave(
        formDataAppointment,
        formDataItemType,
        includeAllNonWorkingDays
      );
    };

    // Enregistrer le gestionnaire de sauvegarde
    registerSaveHandler(handleSave);

    // Nettoyer lors du démontage
    return () => {
      registerSaveHandler(null);
    };
  }, [
    formDataItemType, 
    formDataAppointment, 
    includeAllNonWorkingDays,
    items,
    employeePermissions, 
  ]);

  /**
   * Gère le changement de date via les inputs de type "date".
   */
  const handleDateChange = (dateType: 'start' | 'end', newDate: number) => {
    // Réinitialiser l'erreur de validation lors du changement de date
    if (dateValidationError) {
      setDateValidationError(false);
    }

    setFormDataAppointment(prev => ({ 
      ...prev, 
      [dateType === 'start' ? 'startDate' : 'endDate']: newDate 
    }));
  };


  /**
   * Soumet le formulaire de rendez-vous.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Gestion de la création d'une nouvelle ressource
    if (isCreatingResource) {
      // Validation du code avant la création
      if (formDataItemType.CodePlanningRessource && items.find(item => item.CodePlanningRessource === formDataItemType.CodePlanningRessource?.toUpperCase() && item.IdPlanningRessource !== formDataItemType.IdPlanningRessource)) {
        setCodeValidationError(true);
        return;
      }
      
      const newItemId = Date.now();
      
      // Sauvegarde des permissions pour les rubriques sociales et événements manuels
      if (formDataItemType.Type === 'absence' || formDataItemType.Type === 'autre' || formDataItemType.isManual) {
        employeePermissions.forEach((perm) => {
          void socialPermissionService.setSocialItemPermission({
            ...perm,
            itemId: newItemId, // Utiliser le nouvel ID
          });
        });
      }
      
      // Ajout du nouvel événement
      handleAddDimension({...formDataItemType, IdPlanningRessource: newItemId});
      return;
    }
    
    // Gestion de la modification d'une ressource existante
    if (isEditingResource) {
      console.log('Modification de ressource');
      
      // Sauvegarde des permissions pour les rubriques sociales et événements manuels
      if (formDataItemType.Type === 'absence' || formDataItemType.Type === 'autre' || formDataItemType.isManual) {
        employeePermissions.forEach((perm) => {
          void socialPermissionService.setSocialItemPermission(perm);
        });
      }
      
      // Mise à jour de l'événement existant
      handleEditDimension(formDataItemType);
      return;
    }    

    // Validation des dates
    if (formDataAppointment.DebutPlanningEvenement >= formDataAppointment.FinPlanningEvenement) {      
      setDateValidationError(true);
      return;
    }

    setDateValidationError(false);

    onSave(
      formDataAppointment,
      formDataItemType,
      includeAllNonWorkingDays
    );
  };

  /**
   * Callbacks pour les composants
   */
  
  // Callback pour changement de couleur
  const handleColorChange = (colorType: 'background' | 'border' | 'text', value: string) => {
    const colorMap = {
      background: 'color',
      border: 'borderColor',
      text: 'textColor',
    };
    setFormDataItemType(prev => ({ ...prev, [colorMap[colorType]]: value }));
  };

  // Callback pour changement de champ ressource
  const handleResourceFieldChange = (fieldName: string, value: string | boolean) => {
    if (fieldName === 'code') {
      // Réinitialiser l'erreur lors de la modification
      if (codeValidationError) {
        setCodeValidationError(false);
      }
      
      // Forcer les majuscules pour le champ code
      const upperCode = (value as string).toUpperCase();
      if (items.find(item => item.CodePlanningRessource === upperCode && item.IdPlanningRessource !== formDataItemType.IdPlanningRessource)) {
        setCodeValidationError(true);
      }
      setFormDataItemType(prev => ({ ...prev, CodePlanningRessource: upperCode }));
      return;
    }
    
    setFormDataItemType(prev => ({ ...prev, [fieldName]: value }));
  };

  // Callback pour changement d'employé
  const handleEmployeeChange = (employeeId: number) => {
    setFormDataAppointment(prev => ({ ...prev, employeeId, Employee: employees.find(e => e.IdPersonnel === employeeId) || prev.Employee }));
  };

  // Callback pour changement de permission
  const handlePermissionChange = (userId: number, permissionId: string, value: boolean) => {
    const perm = employeePermissions.get(userId) || {
      userId,
      itemId: formDataItemType.IdPlanningRessource || -1,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
    };
    setEmployeePermissions(new Map(employeePermissions.set(userId, { ...perm, [permissionId]: value })));
  };

  // Callback pour ajout/suppression d'étiquettes
  const handleAddTag = (tag: Tag) => {
    setFormDataItemType(prev => ({
      ...prev,
      Etiquette: prev.Etiquettes ? [...prev.Etiquettes, tag] : [tag]
    }));
  };

  const handleRemoveTag = (tagId: number) => {
    setFormDataItemType(prev => ({
      ...prev,
      Etiquette: prev.Etiquettes ? prev.Etiquettes.filter(tag => tag.IdPlanningEtiquette !== tagId) : []
    }));
    
    // Si le rendez-vous actuel utilise cette étiquette, la retirer
    if (formDataAppointment.Etiquette && formDataAppointment.Etiquette.IdPlanningEtiquette === tagId) {
      setFormDataAppointment(prev => ({ ...prev, Etiquette: undefined }));
    }
    
    // Notifier le parent pour mettre à jour tous les rendez-vous concernés
    if (onRemoveTagFromAppointments) {
      onRemoveTagFromAppointments(tagId);
    }
  };

  const handleSelectTag = (tag: Tag | undefined) => {
    setFormDataAppointment(prev => ({ ...prev, Etiquette: tag }));
  };

  // Callback pour changement de description/annotations
  const handleDescriptionChange = (value: string) => {
    setFormDataAppointment(prev => ({ ...prev, description: value }));
  };

  /**
   * Préparation des données pour les composants génériques
   */
  
  // Configuration des couleurs pour FormHeader
  const colors: ColorConfig = {
   background: formDataItemType.color,
    border: formDataItemType.borderColor,
    text: formDataItemType.textColor,
  };

  // Champs de ressource pour FormHeader (mode création/édition)
  const resourceFields: ResourceField[] | undefined = (isCreatingResource || (isEditingResource && formDataItemType.isManual)) ? [
    {
      name: 'code',
      label: 'Code',
      type: 'text',
      value: formDataItemType.CodePlanningRessource || '',
      placeholder: 'EX: CH',
      required: true,
      width: '1/3',
      error: codeValidationError ? 'Ce code est déjà utilisé' : undefined,
    },
    {
      name: 'actif',
      label: 'Actif',
      type: 'checkbox',
      value: !!(formDataItemType as CommonPaieAttributs).Actif,
      width: '1/6',
    },
    {
      name: 'label',
      label: 'Description',
      type: 'text',
      value: formDataItemType.LibellePlanningRessource || '',
      placeholder: 'Nom de la rubrique...',
      required: true,
      width: 'full',
    },
  ] : undefined;

  // Intervalles pour DateTimeSelector
  const timeIntervals: TimeInterval[] = HALF_DAY_INTERVALS.map((interval, index) => ({
    id: index === 0 ? 'morning' : 'afternoon',
    label: index === 0 ? 'Matin' : 'Après-midi',
    startHour: interval.startHour,
    endHour: interval.endHour,
  }));

  // Employees pour EmployeeSelector
  const employeeList: Employee[] = employees.map(emp => ({
    id: emp.IdPersonnel,
    displayName: `${emp.Nom} ${emp.Prenom}`,
  }));

  // Permissions disponibles pour PermissionsPanel
  const availablePermissions: Permission[] = [
    {
      id: 'canView',
      label: 'Voir',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
        </svg>
      ),
    },
    {
      id: 'canCreate',
      label: 'Créer',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/>
        </svg>
      ),
    },
    {
      id: 'canEdit',
      label: 'Éditer',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
        </svg>
      ),
    },
    {
      id: 'canDelete',
      label: 'Supprimer',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
        </svg>
      ),
    },
  ];

  // Users avec permissions pour PermissionsPanel
  const usersWithPermissions: UserWithPermissions[] = employees.map(emp => {
    const perm = employeePermissions.get(emp.IdPersonnel) || {
      userId: emp.IdPersonnel,
      itemId: formDataItemType.IdPlanningRessource || -1,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
    };
    return {
      id: emp.IdPersonnel,
      displayName: `${emp.Nom} ${emp.Prenom}`,
      initials: `${emp.Prenom.charAt(0)}${emp.Nom.charAt(0)}`,
      permissions: {
        canView: perm.canView,
        canCreate: perm.canCreate,
        canEdit: perm.canEdit,
        canDelete: perm.canDelete,
      },
    };
  });

  // Tags pour TagsManager
  const availableTags: Tag[] = formDataItemType.Etiquettes || [];
  const isTagUsedCheck = (tagId: number) => {
    const count = appointments.filter(app => app.Etiquette && app.Etiquette.IdPlanningEtiquette === tagId).length;
    return { used: count > 0, count };
  };
    
  // Rendu du formulaire
  return (
    <>
      <div className={`flex ${isReducedVersion ? 'flex-row' : isExpanded ? 'lg:flex-row flex-col' : 'flex-col'} 
        gap-4 rounded-xl poppins transition-all duration-300 h-full items-stretch`}
      >  
        <form 
          onSubmit={handleSubmit} 
          className="flex flex-col gap-4 w-full max-w-[380px] min-w-[320px] flex-grow" 
          noValidate
        >
          {!isReducedVersion && (
            <ExpandButton
              isExpanded={isExpanded}
              onToggle={() => setIsExpanded(!isExpanded)}
            />
          )}
          
          {/* FormHeader - Icône + Couleurs + Ressource */}
          <FormHeader
            icon={formDataItemType?.IdImage || undefined}
            onIconClick={() => handleOpenImageModal(formDataItemType.IdPlanningRessource)}
            colors={colors}
            onColorChange={handleColorChange}
            resourceFields={resourceFields}
            onResourceFieldChange={handleResourceFieldChange}
            isMobile={isMobile}
          />

          {/* FormPreview - Aperçu du rendez-vous */}
          <FormPreview>
            <AppointmentItem
              appointment={{
                ...formDataAppointment,
                IdPlanningEvenement: formDataAppointment.IdPlanningEvenement || 0,
                DebutPlanningEvenement: Date.now(),
                FinPlanningEvenement: Date.now() + 86400000 * 3, // +3 jours
              }}
              event={formDataItemType}
              isFullDay={isFullDay}
              source='demo'
              isMobile={false}
              isDisplayWeekend={false}
              chargeeAffaire={formDataItemType && formDataItemType.Type === 'chantier' ? formDataItemType.chargeAffaire : ''}
              onDoubleClick={() => {}}
              onResize={() => {}}
              handleContextMenu={() => {}}
              tagPlacement={tagPlacement}
              mainScrollRef={null}
            />
          </FormPreview>
        
          {/* PermissionsPanel - Gestion des permissions par employé */}
          {(isCreatingResource || isEditingResource) && (formDataItemType.Type === 'absence' || formDataItemType.Type === 'autre' || formDataItemType.isManual) && (
            <PermissionsPanel
              users={usersWithPermissions}
              availablePermissions={availablePermissions}
              onPermissionChange={handlePermissionChange}
              title="Gestion des permissions"
              defaultOpen={false}
              searchPlaceholder="Rechercher un employé..."
            />
          )}

          {!isReducedVersion && (
            <>
              {/* DateTimeSelector - Dates et créneaux */}
              <DateTimeSelector
                startDate={formDataAppointment.DebutPlanningEvenement}
                endDate={formDataAppointment.FinPlanningEvenement}
                onDateChange={handleDateChange}
                intervals={timeIntervals}
                isFullDay={isFullDay}
                validationError={dateValidationError ? "La date de fin doit être postérieure à la date de début" : undefined}
              />

              {/* EmployeeSelector - Sélecteur d'employé */}
              <EmployeeSelector
                employees={employeeList}
                selectedEmployeeId={formDataAppointment.Employee.IdPersonnel}
                onEmployeeChange={handleEmployeeChange}
                label="Affecté"
              />
            </>
          )}

          {/* ActionButtons - Boutons d'action */}
          <ActionButtons
            primaryLabel={isCreatingResource ? 'Créer' : 'Enregistrer'}
            secondaryLabel="Fermé"
            onSecondary={() => handleCloseWithSave()}
            primaryType="submit"
          />
        </form>

        {/* Section étiquettes - Version réduite uniquement */}
        {isReducedVersion && formDataItemType.Type === 'chantier' && (
          <div className="w-full lg:w-[320px] px-4 flex flex-col gap-4 border-l border-light">
            <TagsManager
              tags={availableTags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              isTagUsed={isTagUsedCheck}
              variant="compact"
              title="Étiquettes"
            />
          </div>
        )}

        {/* Section extensible - Options avancées */}
        {isExpanded && (
          <div className="w-full lg:w-[530px] p-4 flex flex-col gap-6 animate-in slide-in-from-right text-primary duration-300 lg:border-l border-light mt-4 lg:mt-0">
            
            {/* AnnotationsField - Zone de texte pour annotations */}
            <AnnotationsField
              value={formDataAppointment.AnnotationPlanningEvenement || ''}
              onChange={handleDescriptionChange}
              label="Annotations"
              placeholder="Ajoutez des annotations..."
              height={96}
            />

            {/* TagsManager - Sélecteur d'étiquette (version étendue pour chantiers) */}
            {formDataItemType.Type === 'chantier' && (
              <TagsManager
                tags={availableTags}
                selectedTag={formDataAppointment.Etiquette}
                onSelectTag={handleSelectTag}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                isTagUsed={isTagUsedCheck}
                variant="extended"
                title="Étiquette associée"
                placeholder="Aucune étiquette"
              />
            )}
          </div>
        )}
      </div>
    </>
  );
});


export default AppointmentForm;