"use client";
import React, { useState, memo, useMemo, useEffect, useCallback, useRef } from 'react';
import { HalfDayInterval, Item, CommonPaieAttributs, User, Tag, AutreItem, Appointment } from '../../types';
import { format } from 'date-fns';
import { isHoliday, isWeekend, eachDayOfInterval } from '../../utils/dates';
import { AppointmentItem } from '../index';
import FormHeader, { ColorConfig, ResourceField } from './FormHeader';
import DateTimeSelector, { TimeInterval } from './DateTimeSelector';
import PermissionsPanel, { Permission, UserWithPermission } from './PermissionsPanel';
import TagsManager from './TagsManager';
import { FormPreview, EmployeeSelector, AnnotationsField, ExpandButton, ActionButtons, Employee } from './FormComponents';
import { useModalContext } from '@/app/calendrier/components/modals/Modal';
import ressourceService from '@/app/service/ressource.service';
import { useAuth } from '@/app/calendrier/hooks/utils/AuthContext';

interface AppointmentFormProps {
  appointments: Appointment[];
  appointment: Appointment;
  item: Item;
  initialEmployeeId?: number | null;
  employees: User[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  nonWorkingDates: Record<string, { Id: number; TypeJourCode: string }>;
  isReducedVersion?: boolean;
  isMobile?: boolean;
  resourceEditMode?: 'createRessource' | 'editRessource' | 'editAppointment' | null;
  tagPlacement?: 'hover' | 'fixed';
  onSave: (
    appointment: Appointment,
    eventType: Item,
    includeAllNonWorkingDays: boolean,
    type: 'create' | 'update'
  ) => Promise<{ success: boolean; message?: string }>;
  onClose: () => void;
  handleOpenImageModal: (itemId: number) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  handleAddManualRessource: (dimension: AutreItem) => Promise<{ success: boolean; message?: string }>;
  handleEditRessource: (dimension: Item) => Promise<{ success: boolean; message?: string }>;
  onRemoveTagFromAppointments?: (tagId: number) => Promise<any>;
  onAddTagToResource?: (tag: any) => Promise<any>;
  onFetchTagsForResource?: (idRessource: number) => Promise<any>;
  onFetchEventAndRessource?: (idEvent: number) => Promise<any>;
  onFetchRessourceById?: (idRessource: number, typeRessource: 'Projet' | 'Paie' | 'Rubrique Perso') => Promise<any>;
  onLockedError?: (message: string) => void;
  onFetchPermissions?: () => Promise<any>;
  onSetPermissions?: (data: { IdPersonnel: number; IdDroit: number }[]) => Promise<any>;
  loadingFallback?: React.ReactNode;
  isExpand?: boolean;
}

const APPOINTMENT_DIRTY_KEYS = [
  'IdPlanningEvenement',
  'AnnotationPlanningEvenement',
  'IdEmploye',
  'IdPlanningRessource',
  'Etiquette',
  'isReadOnly',
  'PlanningEvenementPriorite',
  'DebutPlanningEvenement',
  'FinPlanningEvenement',
] as const satisfies readonly (keyof Appointment)[];

const pickAppointmentKeys = (obj: Appointment) => {
  const result: Partial<Appointment> = {};
  for (let i = 0; i < APPOINTMENT_DIRTY_KEYS.length; i++) {
    const key = APPOINTMENT_DIRTY_KEYS[i]!;
    (result as any)[key] = obj[key];
  }
  return result;
};

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
  onFetchPermissions,
  onLockedError,
  loadingFallback,
  isExpand = false,
  onSetPermissions,
}) => {
  const { handleCloseWithSave, registerSaveHandler } = useModalContext();
  const { hasPermission } = useAuth();

  const isCreatingResource = resourceEditMode === 'createRessource';
  const isEditingResource = resourceEditMode === 'editRessource';
  const isEditingAppointment = resourceEditMode === 'editAppointment';
  const isResourceMode = isCreatingResource || isEditingResource;
  const hasPermissionsPanel =
    isEditingResource && (item?.Type === 'Paie' || item?.Type === 'Rubrique Perso');

  const [formDataAppointment, setFormDataAppointment] = useState<Appointment>(appointment);
  const [formStartDate, setFormStartDate] = useState(() => new Date(appointment.DebutPlanningEvenement));
  const [formEndDate, setFormEndDate] = useState(() => new Date(appointment.FinPlanningEvenement));
  const [formDataItemType, setFormDataItemType] = useState<Item>(item);

  const canEditImage = useMemo(() => {
    if (formDataItemType?.Type === 'Projet') return hasPermission(225, 3);
    if (formDataItemType?.Type === 'Paie' || formDataItemType?.Type === 'Rubrique Perso') {
      return hasPermission(226, 3);
    }
    return false;
  }, [formDataItemType?.Type, hasPermission]);


const canEdit = useMemo(() => {
  if (item.Type === 'Projet') {
      return hasPermission(232, 23);
    }
    if (item.Type === 'Paie') {
      return hasPermission(231, 23);
    }
    if (item.Type === 'Rubrique Perso') {
      return hasPermission(234, 23);
    }

    return false;
}, [item.Type, hasPermission]);

  const [dateValidationError, setDateValidationError] = useState(false);
  const [codeValidationError, setCodeValidationError] = useState(false);

  const [resourceTags, setResourceTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [DeletingTag, setDeletingTag] = useState<number | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const permissions = useRef<Permission[]>([]);
  const [usersWithPermission, setUsersWithPermission] = useState<UserWithPermission[]>([]);
  const changedEmployeePermissions = useRef<Record<number, number>>({});

  const initialAppointmentRef = useRef<Appointment>(appointment);
  const initialItemRef = useRef<Item>(item);
  const [dirtyReady, setDirtyReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAllFormData = async () => {
      setDirtyReady(false);
      onDirtyChange?.(false);

      initialAppointmentRef.current = appointment;
      initialItemRef.current = item;

      if (!onFetchTagsForResource && !onFetchEventAndRessource && !onFetchRessourceById) {
        setIsLoading(false);
        setDirtyReady(true);
        return;
      }

      setIsLoading(true);
      setTagError(null);

      try {
        const promises: Promise<any>[] = [];

        if (onFetchEventAndRessource && isEditingAppointment) {
          promises.push(
            onFetchEventAndRessource(appointment.IdPlanningEvenement)
              .then((response) => {
                if (!isMounted) return;
                if (response?.success === false && response?.isLocked) {
                  onClose();
                  onLockedError?.(
                    response?.message || "Accès refusé. Ce rendez-vous est déjà en cours d'édition par un collègue."
                  );
                  return;
                }

                if (response?.success && response?.data) {
                  const { appointments: fetchedApps, ressources } = response.data;
                  const loadedAppointment = Array.isArray(fetchedApps) ? fetchedApps[0] : fetchedApps;
                  const loadedItem = Array.isArray(ressources) ? ressources[0] : ressources;

                  const normalizedAppointment = {
                    ...loadedAppointment,
                    isLocked: false,
                  };

                  initialAppointmentRef.current = normalizedAppointment;
                  initialItemRef.current = loadedItem;

                  setFormDataAppointment(normalizedAppointment);
                  setFormStartDate(new Date(normalizedAppointment.DebutPlanningEvenement));
                  setFormEndDate(new Date(normalizedAppointment.FinPlanningEvenement));
                  setFormDataItemType(loadedItem);
                }
              })
              .catch((err) => {
                console.error('Failed to load event and resource', err);
                if (isMounted) setTagError("Erreur lors de la récupération de l'événement");
              })
          );
        }

        if (onFetchRessourceById && isEditingResource) {
          promises.push(
            onFetchRessourceById(item?.IdPlanningRessource, item?.Type)
              .then((response) => {
                if (!isMounted) return;
                if (response?.success && response?.data) {
                  const loadedItem = Array.isArray(response.data) ? response.data[0] : response.data;
                  initialItemRef.current = loadedItem;
                  setFormDataItemType(loadedItem);
                }
              })
              .catch((err) => {
                console.error('Failed to load resource by ID', err);
                if (isMounted) setTagError('Erreur lors de la récupération de la ressource');
              })
          );
        }

        if (onFetchTagsForResource && ((isEditingResource && item?.Type === 'Projet') || isEditingAppointment)) {
          promises.push(
            onFetchTagsForResource(item?.IdPlanningRessource)
              .then((response) => {
                if (isMounted) setResourceTags(response.data || response || []);
              })
              .catch((err) => {
                console.error('Failed to load tags', err);
                if (isMounted) setTagError('Erreur lors de la récupération des étiquettes');
              })
          );
        }

        if (
          onFetchPermissions &&
          isResourceMode &&
          (item?.Type === 'Paie' || item?.Type === 'Rubrique Perso')
        ) {
          promises.push(
            onFetchPermissions()
              .then((response) => {
                if (!isMounted) return;
                permissions.current = response.data?.permissions || response.data || response || [];
                setUsersWithPermission(response.data?.employees || response.data || response || []);
              })
              .catch((err) => {
                console.error('Failed to load permissions', err);
                if (isMounted) setTagError('Erreur lors de la récupération des permissions');
              })
          );
        }

        await Promise.all(promises);
      } catch (globalError) {
        console.error('Erreur générale lors du chargement du formulaire', globalError);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setDirtyReady(true);
        }
      }
    };

    void loadAllFormData();
    return () => {
      isMounted = false;
    };
  }, [onFetchTagsForResource, onFetchEventAndRessource, onFetchRessourceById]);

  // Synchronisation propre lorsqu'une image est sélectionnée dans ImageSelectorContentModal
  const prevPropImageRef = useRef(item?.Image);
  useEffect(() => {
    const incomingImage = item?.Image;
    if (!incomingImage) return;

    const hasChangedFromProp =
      prevPropImageRef.current?.id !== incomingImage.id ||
      prevPropImageRef.current?.image !== incomingImage.image;

    if (hasChangedFromProp) {
      prevPropImageRef.current = incomingImage;
      setFormDataItemType((prev) => ({
        ...prev,
        Image: { id: incomingImage.id, image: incomingImage.image },
      }));
    }
  }, [item?.Image]);

  const handleCreateTag = useCallback(
    async (tagData: Partial<Tag>) => {
      if (!onAddTagToResource) return;

      setIsCreatingTag(true);
      setTagError(null);

      try {
        const response = await onAddTagToResource({
          ...tagData,
          IdPlanningRessource: item?.IdPlanningRessource || -1,
        });
        const newTagId = response.data || response;
        const createdTag = { ...tagData, IdPlanningEtiquette: newTagId } as Tag;
        setResourceTags((prev) => [...prev, createdTag]);
        return createdTag;
      } catch (err) {
        console.error('Failed to create tag', err);
        setTagError("Erreur lors de la création de l'étiquette");
        throw err;
      } finally {
        setIsCreatingTag(false);
      }
    },
    [onAddTagToResource, item?.IdPlanningRessource]
  );

  const handleDeleteTag = useCallback(
    async (tagId: number) => {
      if (!onRemoveTagFromAppointments) return;
      setDeletingTag(tagId);
      setTagError(null);
      try {
        const result = await onRemoveTagFromAppointments(tagId);
        if (result?.success === false) {
          setTagError(result.message || "Erreur lors de la suppression de l'étiquette");
          return;
        }
        setResourceTags((prev) => prev.filter((tag) => tag.IdPlanningEtiquette !== tagId));
      } catch (err) {
        console.error('Failed to delete tag', err);
        setTagError("Erreur lors de la suppression de l'étiquette");
      } finally {
        setDeletingTag(null);
      }
    },
    [onRemoveTagFromAppointments]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveHandlerRef = useRef<(() => void | Promise<void>) | null>(null);

  const [isExpanded, setIsExpanded] = useState(isExpand || !isReducedVersion || hasPermissionsPanel);

  const isAppointmentSplitByNotWorkingDay = useMemo(() => {
    const app = appointments.find(
      (a) => a.IdPlanningEvenement === formDataAppointment.IdPlanningEvenement
    );
    if (!app) return false;
    const days = eachDayOfInterval({
      start: app.DebutPlanningEvenement,
      end: app.FinPlanningEvenement,
    });
    return days.some(
      (date) =>
        nonWorkingDates[format(date, 'yyyy-MM-dd')] !== undefined ||
        isHoliday(date) ||
        isWeekend(date)
    );
  }, [appointments, formDataAppointment.IdPlanningEvenement, nonWorkingDates]);

  const includeAllNonWorkingDays = isAppointmentSplitByNotWorkingDay;

  useEffect(() => {
    if (!onDirtyChange || !dirtyReady) return;

    const isAppDirty =
      JSON.stringify(pickAppointmentKeys(formDataAppointment)) !==
      JSON.stringify(pickAppointmentKeys(initialAppointmentRef.current));

    const isItemDirty =
      JSON.stringify(formDataItemType) !== JSON.stringify(initialItemRef.current);

    onDirtyChange(isAppDirty || isItemDirty);
  }, [dirtyReady, formDataAppointment, formDataItemType, onDirtyChange]);

  useEffect(() => {
    registerSaveHandler(() => saveHandlerRef.current?.());
    return () => {
      registerSaveHandler(null);
    };
  }, [registerSaveHandler]);

  const handleDateChange = useCallback((dateType: 'start' | 'end', newDate: number) => {
    setDateValidationError(false);
    const date = new Date(newDate);

    if (dateType === 'start') {
      setFormStartDate(date);
    } else {
      setFormEndDate(date);
    }
    setFormDataAppointment((prev) => ({
      ...prev,
      [dateType === 'start' ? 'DebutPlanningEvenement' : 'FinPlanningEvenement']: date.getTime(),
    }));
  }, []);

  const performAppointmentSave = useCallback(async (): Promise<void> => {
    if (isSaving) return;

    if (formStartDate >= formEndDate) {
      setDateValidationError(true);
      return;
    }

    setDateValidationError(false);
    setSaveError(null);
    setIsSaving(true);

    try {
      const result = await onSave(
        {
          ...formDataAppointment,
          DebutPlanningEvenement: formStartDate.getTime(),
          FinPlanningEvenement: formEndDate.getTime(),
        },
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
  }, [
    isSaving,
    formStartDate,
    formEndDate,
    onSave,
    formDataAppointment,
    formDataItemType,
    includeAllNonWorkingDays,
    onClose,
  ]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      setSaveError(null);
      e?.preventDefault?.();

      if (isCreatingResource) {
        setIsSaving(true);
        const result = await handleAddManualRessource({ ...formDataItemType } as AutreItem);
        if (!result.success) {
          setSaveError(result.message || "Erreur lors de l'ajout de la ressource.");
        } else {
          onClose?.();
        }
        setIsSaving(false);
        return;
      }

      if (isEditingResource) {
        setIsSaving(true);

        if (formDataItemType?.Type === 'Paie' || formDataItemType?.Type === 'Rubrique Perso') {
          const updatedPermissions = Object.entries(changedEmployeePermissions.current).map(
            ([IdPersonnel, IdDroit]) => ({
              IdPersonnel: Number(IdPersonnel),
              IdDroit: Number(IdDroit),
            })
          );

          if (onSetPermissions && updatedPermissions.length > 0) {
            try {
              const permissionResult = await onSetPermissions(updatedPermissions);
              if (permissionResult?.success === false) {
                setSaveError(
                  permissionResult.message || 'Erreur lors de la mise à jour des permissions.'
                );
                setIsSaving(false);
                return;
              }
            } catch (error) {
              console.error('Erreur lors de la mise à jour des permissions :', error);
              setSaveError('Erreur lors de la mise à jour des permissions.');
              setIsSaving(false);
              return;
            }
          }
        }

        console.log('handleSubmit: Editing resource, calling handleEditRessource with formDataItemType:', formDataItemType);
        const result = await handleEditRessource(formDataItemType);
        if (!result.success) {
          setSaveError(result.message || 'Erreur lors de la mise à jour de la ressource.');
        } else {
          onClose?.();
        }

        setIsSaving(false);
        return;
      }

      await performAppointmentSave();
    },
    [
      isCreatingResource,
      isEditingResource,
      handleAddManualRessource,
      formDataItemType,
      onClose,
      onSetPermissions,
      handleEditRessource,
      performAppointmentSave,
    ]
  );

  useEffect(() => {
    saveHandlerRef.current = handleSubmit;
  }, [handleSubmit]);

  const handleColorChange = useCallback(
    (colorType: 'background' | 'border' | 'text', value: string) => {
      const colorMap = {
        background: 'CouleurFondPlanningRessource',
        border: 'CouleurBordurePlanningRessource',
        text: 'CouleurTextePlanningRessource',
      } as const;
      setFormDataItemType((prev) => ({ ...prev, [colorMap[colorType]]: value }));
    },
    []
  );

  const codeCheckSeqRef = useRef(0);
  const handleResourceFieldChange = useCallback(
    async (fieldName: string, value: string | boolean) => {
      if (fieldName === 'CodePlanningRessource') {
        setCodeValidationError(false);
        const upperCode = (value as string).toUpperCase();
        setFormDataItemType((prev) => ({ ...prev, CodePlanningRessource: upperCode }));

        const seq = ++codeCheckSeqRef.current;
        if (upperCode.length > 0) {
          try {
            const result = await ressourceService.verifyUniqueCode(upperCode);
            if (seq !== codeCheckSeqRef.current) return;
            if (result.success !== false && result.exists) {
              setCodeValidationError(true);
            }
          } catch (error) {
            console.error("Erreur lors de la vérification de l'unicité du code :", error);
          }
        }
        return;
      }

      setFormDataItemType((prev) => ({ ...prev, [fieldName]: value }));
    },
    []
  );

  const handleEmployeeChange = useCallback((employeeId: number) => {
    setFormDataAppointment((prev) => ({ ...prev, IdEmploye: employeeId }));
  }, []);

  const handlePermissionChange = useCallback((IdPersonnel: number, IdDroit: number | string) => {
    setUsersWithPermission((prev) =>
      prev.map((user) => (user.IdPersonnel === IdPersonnel ? { ...user, IdDroit } : user))
    );
    changedEmployeePermissions.current[IdPersonnel] = Number(IdDroit);
  }, []);

  const handleSelectTag = useCallback((tag: Tag | undefined) => {
    setFormDataAppointment((prev) => ({ ...prev, Etiquette: tag }));
  }, []);

  const handleDescriptionChange = useCallback((value: string) => {
    setFormDataAppointment((prev) => ({ ...prev, AnnotationPlanningEvenement: value }));
  }, []);

  const colors = useMemo<ColorConfig>(
    () => ({
      background: formDataItemType?.CouleurFondPlanningRessource,
      border: formDataItemType?.CouleurBordurePlanningRessource,
      text: formDataItemType?.CouleurTextePlanningRessource,
    }),
    [
      formDataItemType?.CouleurFondPlanningRessource,
      formDataItemType?.CouleurBordurePlanningRessource,
      formDataItemType?.CouleurTextePlanningRessource,
    ]
  );

  const resourceFields = useMemo<ResourceField[] | undefined>(() => {
    if (!(isCreatingResource || (isEditingResource && formDataItemType?.Type === 'Rubrique Perso'))) {
      return undefined;
    }
    return [
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
    ];
  }, [
    isCreatingResource,
    isEditingResource,
    formDataItemType?.Type,
    formDataItemType?.CodePlanningRessource,
    (formDataItemType as CommonPaieAttributs)?.Actif,
    formDataItemType?.LibellePlanningRessource,
    codeValidationError,
  ]);

  const timeIntervals = useMemo<TimeInterval[]>(
    () =>
      HALF_DAY_INTERVALS.map((interval, index) => ({
        id: index === 0 ? 'morning' : 'afternoon',
        label: index === 0 ? 'Matin' : 'Après-midi',
        startHour: interval.startHour,
        endHour: interval.endHour,
      })),
    [HALF_DAY_INTERVALS]
  );

  const employeeList = useMemo<Employee[]>(
    () =>
      employees.map((emp) => ({
        id: emp.IdPersonnel,
        displayName: `${emp.Nom} ${emp.Prenom}`,
      })),
    [employees]
  );

  // Indexation O(1) de l'utilisation des étiquettes
  const tagUsageCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < appointments.length; i++) {
      const tagId = appointments[i]?.Etiquette?.IdPlanningEtiquette;
      if (tagId !== undefined) {
        map.set(tagId, (map.get(tagId) ?? 0) + 1);
      }
    }
    return map;
  }, [appointments]);

  const isTagUsedCheck = useCallback(
    (tagId: number) => {
      const count = tagUsageCountMap.get(tagId) ?? 0;
      return { used: count > 0, count };
    },
    [tagUsageCountMap]
  );

  const handleOpenImageClick = useMemo(
    () => (canEditImage ? () => handleOpenImageModal(formDataItemType?.IdPlanningRessource) : undefined),
    [canEditImage, handleOpenImageModal, formDataItemType?.IdPlanningRessource]
  );

  if (isLoading && loadingFallback) {
    return <>{loadingFallback}</>;
  }

  return (
    <div
      className={`flex ${isResourceMode ? 'flex-row' : isExpanded ? 'lg:flex-row flex-col' : 'flex-col'} 
        gap-4 rounded-xl poppins transition-all duration-300 h-full items-stretch`}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-[380px] min-w-[320px] flex-grow"
        noValidate
      >
        {!isResourceMode && (
          <ExpandButton isExpanded={isExpanded} onToggle={() => setIsExpanded((prev) => !prev)} />
        )}

        <FormHeader
          icon={formDataItemType?.Image?.image || undefined}
          onIconClick={handleOpenImageClick}
          canEditImage={canEditImage}
          colors={colors}
          onColorChange={handleColorChange}
          resourceFields={resourceFields}
          onResourceFieldChange={handleResourceFieldChange}
          isMobile={isMobile}
        />

        <FormPreview>
          <AppointmentItem
            appointment={formDataAppointment}
            event={formDataItemType}
            isFullDay={isFullDay}
            source="demo"
            isMobile={false}
            isDisplayWeekend={false}
            chargeeAffaire={formDataItemType?.Type === 'Projet' ? formDataItemType.ChargeAffaire : ''}
            tagPlacement={tagPlacement}
            mainScrollRef={null}
          />
        </FormPreview>

        {!isResourceMode && (
          <>
            <DateTimeSelector
              startDate={formStartDate.getTime()}
              endDate={formEndDate.getTime()}
              onDateChange={handleDateChange}
              intervals={timeIntervals}
              isFullDay={isFullDay}
              validationError={
                dateValidationError
                  ? 'La date de fin doit être postérieure à la date de début'
                  : undefined
              }
              canEdit={canEdit}
            />

            <EmployeeSelector
              employees={employeeList}
              selectedEmployeeId={formDataAppointment.IdEmploye}
              onEmployeeChange={handleEmployeeChange}
              label="Affecté"
              canEdit={canEdit}
            />
          </>
        )}

        <ActionButtons
          primaryLabel={
            isSaving ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : isCreatingResource ? (
              'Créer'
            ) : (
              'Enregistrer'
            )
          }
          secondaryLabel="Fermé"
          onSecondary={handleCloseWithSave}
          primaryType="submit"
          disabled={isSaving}
        />

        {saveError && <p className="text-sm text-red-600 mt-2">{saveError}</p>}
      </form>

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

      {isExpanded && (
        <div className="w-full lg:w-[550px] p-4 flex flex-col gap-6 animate-in slide-in-from-right text-primary duration-300 lg:border-l border-light mt-4 lg:mt-0">
          <AnnotationsField
            value={formDataAppointment.AnnotationPlanningEvenement || ''}
            onChange={handleDescriptionChange}
            label="Annotations"
            placeholder="Ajoutez des annotations..."
            height={96}
            canEdit={canEdit}
          />

          {hasPermissionsPanel && (
            <PermissionsPanel
              usersWithPermission={usersWithPermission}
              permissions={permissions.current}
              onPermissionChange={handlePermissionChange}
              title="Gestion des permissions"
              defaultOpen={false}
              searchPlaceholder="Rechercher un employé..."
            />
          )}

          {formDataItemType?.Type === 'Projet' && (
            <TagsManager
              tags={resourceTags}
              selectedTag={formDataAppointment.Etiquette}
              onSelectTag={handleSelectTag}
              onAddTag={async (newTag) => {
                try {
                  const createdTag = await handleCreateTag(newTag);
                  handleSelectTag(createdTag);
                } catch {
                  // Erreur gérée via tagError
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
              canEdit={canEdit}
            />
          )}
        </div>
      )}
    </div>
  );
});

export default AppointmentForm;