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
import React, { useState, memo, useMemo, useEffect, useCallback, useRef } from 'react';
import {Appointment, HalfDayInterval, Item, CommonPaieAttributs, User, Tag, AutreItem } from '../../types';
import { isSameDay, isSameYear, isSameMonth, format } from 'date-fns';
import { isHoliday, isWeekend, eachDayOfInterval } from '../../utils/dates';
import socialPermissionService from '@/app/service/socialPermission.service';

import { AppointmentItem } from '../index';
import FormHeader, { ColorConfig, ResourceField } from './FormHeader';
import DateTimeSelector, { TimeInterval } from './DateTimeSelector';
import PermissionsPanel, { Permission, UserWithPermissions } from './PermissionsPanel';
import TagsManager from './TagsManager';
import { FormPreview, EmployeeSelector, AnnotationsField, ExpandButton, ActionButtons, Employee } from './FormComponents';
import { useModalContext } from '@/app/calendrier/components/modals/Modal';
import ressourceService from '@/app/service/ressource.service';
import { notificationService } from '../..';
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
  /** ID de l'employé présélectionné (optionnel) */
  initialEmployeeId?: number | null;
  /** Liste de tous les employés disponibles */
  employees: User[];
  /** Configuration des créneaux horaires (matin/après-midi/journée) */
  HALF_DAY_INTERVALS: HalfDayInterval[];
  /** Indique si le rendez-vous occupe une journée complète */
  isFullDay: boolean;
  /** Liste des dates non-travaillées (week-ends, fériés) */
  nonWorkingDates: Record<string, number>;
  /** Version réduite du formulaire (moins de champs) */
  isReducedVersion?: boolean;
  /** Indique si l'application est utilisée sur un appareil mobile */
  isMobile?: boolean;
  /** Mode d'édition de ressource: 'createRessource' pour créer, 'editRessource' pour modifier, 'editAppointment' pour un rendez-vous normal */
  resourceEditMode?: 'createRessource' | 'editRessource' | 'editAppointment' | null;
    /** Placement des étiquettes : 'hover' pour les afficher au survol, 'fixed' pour les afficher en permanence */
  tagPlacement?: 'hover' | 'fixed';
  /** Callback appelé lors de la sauvegarde */
  onSave: (
    appointment: Appointment,
    eventType: Item,
    includeAllNonWorkingDays: boolean,
    type: 'create' | 'update'
  ) => Promise<{ success: boolean; message?: string }>;
  /** Callback appelé lors de la fermeture du formulaire */
  onClose: () => void;
  /** Callback appelé lors de la sauvegarde de l'événement */
  handleOpenImageModal: (itemId: number) => void;
  /** Callback pour notifier si le formulaire a des modifications non enregistrées */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Callback pour ajouter une ressource manuelle */
  handleAddManualRessource: (dimension: AutreItem) => Promise<{ success: boolean, message?: string }>;
  /** Callback pour éditer une ressource manuelle */
  handleEditRessource: (dimension: Item) => Promise<{ success: boolean, message?: string }>;
  /** Callback pour supprimer une étiquette de tous les rendez-vous associés */
  onRemoveTagFromAppointments?: (tagId: number) => Promise<any>;
  onAddTagToResource?: (tag: any) => Promise<any>;
  onFetchTagsForResource?: (idRessource: number) => Promise<any>;
  onFetchEventAndRessource?: (idEvent: number) => Promise<any>;
  onFetchRessourceById?: (idRessource: number, typeRessource: 'Projet' | 'Paie' | 'Rubrique Perso') => Promise<any>;
  loadingFallback?: React.ReactNode;
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
  tagPlacement = 'hover',
  employees,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  isReducedVersion,
  onSave,
  onClose,
  handleOpenImageModal,
  onDirtyChange,
  handleAddManualRessource,
  handleEditRessource,
  isMobile,
  resourceEditMode = null,
  onRemoveTagFromAppointments,
  onAddTagToResource,
  onFetchTagsForResource,
  onFetchEventAndRessource,
  onFetchRessourceById,
  loadingFallback,
}) => {

  const { handleCloseWithSave, registerSaveHandler } = useModalContext();

  // Variables dérivées pour améliorer la lisibilité
  const isCreatingResource = resourceEditMode === 'createRessource';
  const isEditingResource = resourceEditMode === 'editRessource';
  const isEditingAppointment = resourceEditMode === 'editAppointment';

  // On simplifie la logique d'affichage 
  // - Les options de ressources (couleurs, code, ect.) sont toujours affichées dans tous les modes pour les rubriques perso
  // - Les selecteurs de Date et d'Employé sont cachés si on créer ou si on edite une ressource (isEditingAppointment == false)
  const isResourceMode = isCreatingResource || isEditingResource;
        

  // ===== ÉTATS LOCAUX =====
  
  /**
   * État principal du formulaire contenant toutes les données du rendez-vous
   * Initialisé avec les données existantes ou des valeurs par défaut
   */
  const [formDataAppointment, setFormDataAppointment] = useState<Appointment>(appointment);
  const [formDataItemType, setFormDataItemType] = useState<Item>(item);
  const [dateValidationError, setDateValidationError] = useState(false);
  const [codeValidationError, setCodeValidationError] = useState(false);

  // Nouveaux états pour gérer les étiquettes asynchrones
  const [resourceTags, setResourceTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [DeletingTag, setDeletingTag] = useState<number | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);

  // console.log("Ressource actuelle :", formDataItemType);
  // console.log("isResourceMode :", isResourceMode);

  useEffect(() => {
    const loadAllFormData = async () => {
      // Sécurité : Si aucune fonction de fetch n'est fournie, pas besoin de charger
      if (!onFetchTagsForResource && !onFetchEventAndRessource && !onFetchRessourceById) return;

      setIsLoading(true);
      setTagError(null);

      try {
        // On crée un tableau pour stocker les promesses qui vont s'exécuter
        const promises: Promise<any>[] = [];

        // 1. Fetch de l'événement complet et de sa ressource
        if (onFetchEventAndRessource && isEditingAppointment) {
          promises.push(
            onFetchEventAndRessource(formDataAppointment.IdPlanningEvenement)
              .then(response => {
                if (response?.error === 0 && response?.data) {
                  const { appointments, ressources } = response.data;
                  setFormDataAppointment(appointments[0] ?? appointments);
                  setFormDataItemType(ressources[0] ?? ressources);
                }
              })
              .catch(err => {
                console.error("Failed to load event and resource", err);
                setTagError("Erreur lors de la récupération de l'événement");
              })
          );
        }

        // 2. Fetch de la ressource par ID
        if (onFetchRessourceById && isEditingResource) {
          promises.push(
            onFetchRessourceById(item?.IdPlanningRessource, item?.Type)
              .then(response => {
                if (response?.error === 0 && response?.data) {
                  setFormDataItemType(response.data[0] ?? response.data);
                }
              })
              .catch(err => {
                console.error("Failed to load resource by ID", err);
                setTagError("Erreur lors de la récupération de la ressource");
              })
          );
        }

        // 3. Fetch des étiquettes
        if (onFetchTagsForResource && (isEditingResource || isEditingAppointment)) {
          promises.push(
            onFetchTagsForResource(item?.IdPlanningRessource)
              .then(response => {
                setResourceTags(response.data || response || []);
              })
              .catch(err => {
                console.error("Failed to load tags", err);
               setTagError("Erreur lors de la récupération des étiquettes");
              })
          );
        }

        

        // 🎯 MAGIE : On attend que toutes les promesses ajoutées soient terminées
        await Promise.all(promises);

      } catch (globalError) {
        console.error("Erreur générale lors du chargement du formulaire", globalError);
      } finally {
        // On n'éteint le chargement QUE lorsque tout est fini (succès ou échec)
        setIsLoading(false);
      }
    };

    void loadAllFormData();
  }, [
    onFetchTagsForResource, onFetchEventAndRessource, onFetchRessourceById
  ]);

  const handleCreateTag = async (tagData: Partial<Tag>) => {
    if (!onAddTagToResource) return;
    
    setIsCreatingTag(true);
    setTagError(null);
    
    try {
      const response = await onAddTagToResource({ ...tagData, IdPlanningRessource: item?.IdPlanningRessource || -1 });
      const newTagId = response.data || response;
      setResourceTags(prev => [...prev, { ...tagData, IdPlanningEtiquette: newTagId } as Tag]);
      return newTagId;
    } catch (err) {
      console.error("Failed to create tag", err);
      setTagError("Erreur lors de la création de l'étiquette");
      throw err;
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!onRemoveTagFromAppointments) return;
    setDeletingTag(tagId);
    setTagError(null);
    try {
      const result = await onRemoveTagFromAppointments(tagId);
      if (result?.error === 1) {
        setTagError(result.message || "Erreur lors de la suppression de l'étiquette");
        return;
      }
      setResourceTags(prev => prev.filter(tag => tag.IdPlanningEtiquette !== tagId));
    } catch (err) {
      console.error("Failed to delete tag", err);
      setTagError("Erreur lors de la suppression de l'étiquette");
    } finally {
      setDeletingTag(null);
    }
  };


  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
    
  const saveHandlerRef = useRef<(() => void | Promise<void>) | null>(null);
    const performAppointmentSave = async (): Promise<void> => {
      if (isSaving) return;

      if (formDataAppointment.DebutPlanningEvenement >= formDataAppointment.FinPlanningEvenement) {
        setDateValidationError(true);
        return;
      }

      setDateValidationError(false);
      setSaveError(null);
      setIsSaving(true);

      try {
        const result = await onSave(
          formDataAppointment,
          formDataItemType,
          includeAllNonWorkingDays,
          formDataAppointment.IdPlanningEvenement <= 0 ? 'create' : 'update'
        );

        if (result.success) {
          onClose();
          return;
        }

        setSaveError(result.message || 'La sauvegarde a échoué.');
      } catch (error) {
        setSaveError((error as Error).message || 'Une erreur est survenue pendant la sauvegarde.');
      } finally {
        setIsSaving(false);
      }
    };

  
  /**
   * État pour contrôler l'expansion du panel d'options avancées
   */
  const [isExpanded, setIsExpanded] = useState(isReducedVersion ? false : true);

  /**
   * États pour la gestion des permissions par employé (rubriques sociales uniquement)
   */
  const [employeePermissions, setEmployeePermissions] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    // Ne mettre à jour que si l'image a réellement changé
    if (item?.Image !== formDataItemType?.Image) {
      setFormDataItemType(prev => ({ ...prev, Image: item?.Image }));
    }
  }, [item?.Image, formDataItemType?.Image]);
  

  /**
   * Vérifie si le rendez-vous actuel chevauche des jours non-travaillés
   * Utilisé pour déterminer l'état initial de la checkbox
   */
  const isAppointmentSplitByNotWorkingDay = useMemo(() => {
    const app = appointments.find(a => a.IdPlanningEvenement === formDataAppointment.IdPlanningEvenement);
    if (!app) return false;
    const days = eachDayOfInterval({ start: app.DebutPlanningEvenement, end: app.FinPlanningEvenement });
    return days.some((date) =>
      (nonWorkingDates[format(date, 'yyyy-MM-dd')] !== undefined) || isHoliday(date) || isWeekend(date) // Vérifie jours non travaillés, fériés ou week-ends
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
      if (isEditingResource && formDataItemType?.IdPlanningRessource && (formDataItemType?.Type === 'Paie' || formDataItemType?.Type === 'Rubrique Perso')) {
        const permissionEntries = await Promise.all(
          employees.map(async (emp) => {
            const response = await socialPermissionService.getSocialItemPermission(emp.IdPersonnel, formDataItemType?.IdPlanningRessource);
            const perm = response?.error === 0 ? response.data : null;

            // const safePermission: SocialItemPermission = perm || {
            //   userId: emp.IdPersonnel,
            //   itemId: formDataItemType?.IdPlanningRessource,
            //   canView: true,
            //   canCreate: true,
            //   canEdit: true,
            //   canDelete: true,
            // };

            return [emp.IdPersonnel, perm] as const;
          })
        );

        if (!isMounted) return;

        setEmployeePermissions(new Map<number, number>(permissionEntries));
        return;
      }

      if (isCreatingResource && (formDataItemType?.Type === 'Paie' || formDataItemType?.Type === 'Rubrique Perso')) {
      // Pour la création, initialiser avec tous les droits
      const permissions = new Map<number, number>();
      employees.forEach(emp => {
        permissions.set(emp.IdPersonnel, 23);
      });

      if (!isMounted) return;

      setEmployeePermissions(permissions);
      }
    };

    loadPermissions();

    return () => {
      isMounted = false;
    };
  }, [isEditingResource, isCreatingResource, formDataItemType?.IdPlanningRessource, formDataItemType?.Type, employees]);

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
    // Enregistre un wrapper stable pour éviter les re-registers en cascade.
    registerSaveHandler(() => saveHandlerRef.current?.());

    // Nettoyer lors du démontage
    return () => {
      registerSaveHandler(null);
    };
  }, [registerSaveHandler]);

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
      [dateType === 'start' ? 'DebutPlanningEvenement' : 'FinPlanningEvenement']: newDate 
    }));
  };


  /**
   * Soumet le formulaire de rendez-vous.
   */
  const handleSubmit = async (e?: React.FormEvent) => {
    setSaveError(null);
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    // Gestion de la crÃ©ation d'une nouvelle ressource
    if (isCreatingResource) {
      setIsSaving(true);
            
      // Sauvegarde des permissions pour les rubriques sociales et événements manuels
      // if (formDataItemType.Type === 'Paie' || formDataItemType.Type === 'Rubrique Perso') {
      //   employeePermissions.forEach((perm) => {
      //     void socialPermissionService.setSocialItemPermission({
      //       ...perm,
      //       itemId: newItemId, // Utiliser le nouvel ID
      //     });
      //   });
      // }
      
    
      // Ajout du nouvel événement
      const result = await handleAddManualRessource({...formDataItemType} as AutreItem);
      if (!result.success) {
        notificationService.error('Erreur', result.message || 'Erreur lors de l\'ajout de la ressource.');
        setSaveError(result.message || 'Erreur lors de l\'ajout de la ressource.');
      } else if (onClose) {
        onClose();
      }
      setIsSaving(false);
      return;
    }
    // Gestion de la modification d'une ressource existante
    if (isEditingResource) {
      console.log('Modification de ressource');
      setIsSaving(true);

      // Sauvegarde des permissions pour les rubriques sociales et événements manuels
      if (formDataItemType?.Type === 'Paie' || formDataItemType?.Type === 'Rubrique Perso') {
        employeePermissions.forEach((perm) => {
          void socialPermissionService.setSocialItemPermission(perm);
        });
      }
      
      // Mise à jour de l'événement existant
      const result = await handleEditRessource(formDataItemType);
      if (!result.success) {
        notificationService.error('Erreur', result.message || 'Erreur lors de la mise à jour de la ressource.');
        setSaveError(result.message || 'Erreur lors de la mise à jour de la ressource.');
      }else if (onClose) {
        onClose();
      }

      setIsSaving(false);
      return;
    }    

    void performAppointmentSave();
  };

  /**
   * Callbacks pour les composants
   */
  
  // Callback pour changement de couleur
  const handleColorChange = (colorType: 'background' | 'border' | 'text', value: string) => {
    const colorMap = {
      background: 'CouleurFondPlanningRessource',
      border: 'CouleurBordurePlanningRessource',
      text: 'CouleurTextePlanningRessource',
    };
    setFormDataItemType(prev => ({ ...prev, [colorMap[colorType]]: value }));
  };

  // Callback pour changement de champ ressource
  const handleResourceFieldChange = async (fieldName: string, value: string | boolean) => {
    if (fieldName === 'CodePlanningRessource') {
      // Réinitialiser l'erreur lors de la modification
      if (codeValidationError) {
        setCodeValidationError(false);
      }
      // Forcer les majuscules pour le champ code
      const upperCode = (value as string).toUpperCase();
      
      console.log("Vérification de l'unicité du code :", upperCode);
      setFormDataItemType(prev => ({ ...prev, CodePlanningRessource: upperCode }));

      if (upperCode.length > 0) {
        try {
          const result = await ressourceService.verifyUniqueCode(upperCode);
          console.log("Résultat de la vérification d'unicité du code :", result);

          if(result.error === 1) {
            console.error("Erreur lors de la vérification du code :", result.message);
            return;
          }

          if (result.exists) {
            setCodeValidationError(true);
            return;
          }
        } catch (error) {
            console.error("Erreur lors de la vérification de l'unicité du code :", error);
            return;
        }
      
      }
      return;
    }
    
    setFormDataItemType(prev => ({ ...prev, [fieldName]: value }));
  };

  // Callback pour changement d'employé
  const handleEmployeeChange = (employeeId: number) => {
    setFormDataAppointment(prev => ({ ...prev, IdEmploye: employeeId }));
  };

  // Callback pour changement de permission
  const handlePermissionChange = (userId: number, permissionId: string, value: boolean) => {
    const perm = employeePermissions.get(userId) 
    setEmployeePermissions(new Map(employeePermissions.set(userId, 23)));
  };

  const handleSelectTag = (tag: Tag | undefined) => {
    setFormDataAppointment(prev => ({ ...prev, Etiquette: tag }));
  };

  // Callback pour changement de description/annotations
  const handleDescriptionChange = (value: string) => {
    setFormDataAppointment(prev => ({ ...prev, AnnotationPlanningEvenement: value }));
  };

  useEffect(() => {
    saveHandlerRef.current = handleSubmit;
  }, [handleSubmit]);


  /**
   * Préparation des données pour les composants génériques
   */
  
  // Configuration des couleurs pour FormHeader
  const colors: ColorConfig = {
   background: formDataItemType?.CouleurFondPlanningRessource,
    border: formDataItemType?.CouleurBordurePlanningRessource,
    text: formDataItemType?.CouleurTextePlanningRessource,
  };
  
  // Champs de ressource pour FormHeader (mode création/édition)
  const resourceFields: ResourceField[] | undefined = (isCreatingResource || (isEditingResource && formDataItemType?.Type === 'Rubrique Perso')) ? [
    {
      name: 'CodePlanningRessource',
      label: 'Code',
      type: 'text',
      value: formDataItemType?.CodePlanningRessource || '',
      placeholder: 'EX: CH',
      required: true,
      width: '1/3',
      error: codeValidationError ? 'Ce code est déjà utilisé' : undefined,
    },
    {
      name: 'Actif',
      label: 'Actif',
      type: 'checkbox',
      value: !!(formDataItemType as CommonPaieAttributs)?.Actif,
      width: '1/6',
    },
    {
      name: 'LibellePlanningRessource',
      label: 'Description',
      type: 'text',
      value: formDataItemType?.LibellePlanningRessource || '',
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
    const perm = employeePermissions.get(emp.IdPersonnel)
    return {
      id: emp.IdPersonnel,
      displayName: `${emp.Nom} ${emp.Prenom}`,
      initials: `${emp.Prenom?.charAt(0)}${emp.Nom?.charAt(0)}`,
      permissions: {
        canView: perm === 23,
        canCreate: perm === 23,
        canEdit: perm === 23,
        canDelete: perm === 23,
      },
    };
  });

  // Tags pour TagsManager
  const isTagUsedCheck = (tagId: number) => {
    const count = appointments.filter(app => app.Etiquette && app.Etiquette.IdPlanningEtiquette === tagId).length;
    return { used: count > 0, count };
  };
    
  if (isLoading && loadingFallback) {
    return <>{loadingFallback}</>;
  }

  // Rendu du formulaire
  return (
    <>
      <div className={`flex ${isResourceMode ? 'flex-row' : isExpanded ? 'lg:flex-row flex-col' : 'flex-col'} 
        gap-4 rounded-xl poppins transition-all duration-300 h-full items-stretch`}
      >  
        <form 
          onSubmit={handleSubmit} 
          className="flex flex-col gap-4 w-full max-w-[380px] min-w-[320px] flex-grow" 
          noValidate
        >
          {!isResourceMode && (
            <ExpandButton
              isExpanded={isExpanded}
              onToggle={() => setIsExpanded(!isExpanded)}
            />
          )}
          
          {/* FormHeader - Icône + Couleurs + Ressource */}
          <FormHeader
            icon={formDataItemType?.Image || undefined}
            onIconClick={() => handleOpenImageModal(formDataItemType?.IdPlanningRessource)}
            colors={colors}
            onColorChange={handleColorChange}
            resourceFields={resourceFields}
            onResourceFieldChange={handleResourceFieldChange}
            isMobile={isMobile}
          />

          {/* FormPreview - Aperçu du rendez-vous */}
          <FormPreview>
            <AppointmentItem
              appointment={formDataAppointment}
              event={formDataItemType}
              isFullDay={isFullDay}
              source={'demo'}
              isMobile={false}
              isDisplayWeekend={false}
              chargeeAffaire={formDataItemType && formDataItemType?.Type === 'Projet' ? formDataItemType?.ChargeAffaire : ''}
              onDoubleClick={() => {}}
              onAppointmentResize={() => {}}
              handleContextMenu={() => {}}
              tagPlacement={tagPlacement}
              mainScrollRef={null}
            />
          </FormPreview>
        
          {/* PermissionsPanel - Gestion des permissions par employé */}
          {isResourceMode && (formDataItemType?.Type === 'Paie' || formDataItemType?.Type === 'Rubrique Perso') && (
            <PermissionsPanel
              users={usersWithPermissions}
              availablePermissions={availablePermissions}
              onPermissionChange={handlePermissionChange}
              title="Gestion des permissions"
              defaultOpen={false}
              searchPlaceholder="Rechercher un employé..."
            />
          )}

          {!isResourceMode && (
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
                selectedEmployeeId={formDataAppointment.IdEmploye}
                onEmployeeChange={handleEmployeeChange}
                label="Affecté"
              />
            </>
          )}

          {/* ActionButtons - Boutons d'action */}
          <ActionButtons
            primaryLabel={
              isSaving ? 
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg> 
              : isCreatingResource ? 'Créer' : 'Enregistrer'}
            secondaryLabel="Fermé"
            onSecondary={() => handleCloseWithSave()}
            primaryType="submit"
            disabled={isSaving}
          />

          {saveError && (
            <p className="text-sm text-red-600 mt-2">{saveError}</p>
          )}
        </form>

        {/* Section étiquettes - Version réduite uniquement */}
        {isResourceMode && formDataItemType?.Type === 'Projet' && (
          <div className="w-full lg:w-[320px] px-4 flex flex-col gap-4 border-l border-light">
            <TagsManager
              tags={resourceTags}
              onAddTag={handleCreateTag}
              onRemoveTag={handleDeleteTag}
              isTagUsed={isTagUsedCheck}
              variant="compact"
              title="Étiquettes"
              isDeleting={DeletingTag}
              isCreating={isCreatingTag}
              error={tagError}
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
            {formDataItemType?.Type === 'Projet' && (
              <TagsManager
                tags={resourceTags}
                selectedTag={formDataAppointment.Etiquette}
                onSelectTag={handleSelectTag}
                onAddTag={async (newTag) => {
                  try {
                      const createdTag = await handleCreateTag(newTag);
                      handleSelectTag(createdTag);
                  } catch (e) {
                      // err is handled via tagError
                  }
                }}
                onRemoveTag={handleDeleteTag}
                isTagUsed={isTagUsedCheck}
                variant="extended"
                title="Étiquette associée"
                placeholder="Aucune étiquette"
                isDeleting={DeletingTag}
                isCreating={isCreatingTag}
                error={tagError}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
});


export default AppointmentForm;