import React, { memo, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import { 
  ConfigurationModal,
  ImageSelectorContentModal,
  Modal, 
} from '@/app/calendrier/components';
import Loader from '../ui/Loader';
import { Appointment, Item, ImageType, User, AutreItem, DayType, Equipe } from '../../types';
import { ActiveFilters, FilterType } from '../../utils/searchAndFilterUtils';
import { RepeatData } from '../../hooks/appointments/useAppointmentLogic';
import { DeleteScenario } from '../modals/DeleteModal';
import etiquetteService from '@/app/service/etiquette.service';
import eventService from '@/app/service/evenement.service';
import { useAuth } from '../../hooks/utils/AuthContext';
import permissionService from '@/app/service/permission.service';
import { useDayTypesContext } from '../../hooks/data/dayTypesContext';
import calendarConfigService from '@/app/service/calendarConfig.service';
import displaySettingsService, { DisplaySettingsUpdate, DisplaySettings } from '@/app/service/displaySettings.service';
import { useCalendarView, useDataLayer } from '../../hooks';
import employeeService from '@/app/service/employee.service';

type ModalActionResult = { success: boolean; message?: string };

// Lazy loading des modales lourdes
const AppointmentForm = lazy(() => import('../forms/AppointmentForm'));
const ControlPanelModal = lazy(() => import('../modals/controlPanel/ControlPanelModal'));
const FilterModal = lazy(() => import('../modals/FilterModal'));
const DeleteModal = lazy(() => import('../modals/DeleteModal'));

const ModalLoadingFallback = () => (
  <div className="flex min-h-[320px] w-full items-center justify-center rounded-xl bg-secondary">
    <Loader size="lg" message="Chargement en cours..." />
  </div>
);

interface CalendarModalsProps {
  user: User;
  modalsState: {
    isModalOpen: boolean;
    isImageSelectorOpen: boolean;
    repeatData: RepeatData | null;
    extendData: number | null;
    selectedAppointmentForm: Appointment | null;
    deleteConfirmData: { item: Item; isUsedInPlanning: boolean; isActive: boolean } | null;
  };
  handlers: {
    closeModal: () => void;
    saveAppointment: (
      app: Appointment,
      evt: Item,
      includeNonWork: boolean,
      type: 'create' | 'update'
    ) => Promise<{ success: boolean; message?: string }>;
    handleAddManualRessource: (dimension: AutreItem) => Promise<{ success: boolean; message?: string }>;
    handleEditRessource: (dimension: Item) => Promise<{ success: boolean; message?: string }>;
    handleDeleteManualRessource?: (dimensionId: number, forceDelete?: boolean) => any;
    handleDeactivateDimension?: (dimensionId: number) => any;
    setDeleteConfirmData?: (data: { item: Item; isUsedInPlanning: boolean; isActive: boolean } | null) => void;

    // Repeat & Extend Handlers
    setRepeatData: (data: RepeatData | null) => void;
    handleRepeat: () => Promise<ModalActionResult>;
    setExtendData: (date: number | null) => void;
    handleExtend: () => Promise<ModalActionResult>;

    // Image Handlers
    closeImageModal: () => void;
    handleImageSelect: (image: ImageType) => void;
    handleImageUpload: (file: File) => Promise<ImageType>;
    openImageModalForEvent: (id?: number) => void;
    fetchPaginatedImages: (page: number, limit?: number) => Promise<{ image: ImageType[]; totalLignes: number }>;
    addImage: (base64: string) => Promise<{ success: boolean; id?: number; message?: string }>;

    // Filter Handlers
    submitFilters: (filters: ActiveFilters) => Promise<boolean>;
    applyFilters: (filters: ActiveFilters) => void;

    setSelectedItem: (item: Item | null) => void;
    onLockedError: (message: string) => void;
    applyDisplaySettingsToAllEvents: (value: DisplaySettings) => Promise<{ success: boolean; message?: string }>;
  };
  data: {
    appointments: Appointment[];
    items: Record<number, Item>;
    employees: User[];
    selectedItem: Item | null;
    selectedEmployee: User | null;
    keyOfFilter: { [key: string]: { label: string; type: FilterType; badgeColors?: Record<string, string> } };
    isUploading: boolean;
    uploadError: string | null;
  };
}

export const CalendarModals = memo(({
  user,
  modalsState,
  handlers,
  data,
}: CalendarModalsProps) => {
  const { hasPermission } = useAuth();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isSubmittingModalAction, setIsSubmittingModalAction] = useState(false);
  const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings | null>(null);

  const {
    DayTypes,
    fetchDayTypes,
    addDayType,
    updateDayType,
    removeDayType,
    onCheckDeleteDayType,
    nonWorkingDates,
    setNonWorkingDates,
    loadNonWorkingDates
  } = useDayTypesContext();

  // Récupération directe des états, configs et handlers depuis useCalendarView
  const {
    includeWeekend,
    setIncludeWeekend,
    respectNonWorkingDays,
    setRespectNonWorkingDays,
    tagPlacement,
    setTagPlacement,
    overlapDisplayMode,
    setOverlapDisplayMode,
    mobileAppointmentDisplay,
    handleSaveMobileAppointmentDisplay,
    mobileAppointmentFieldOptions,
    mobileAppointmentSettingsLoading,
    loadMobileAppointmentSettings,
    isControlPanelModalOpen,
    setIsControlPanelModalOpen,
    isFilterModalOpen,
    setIsFilterModalOpen,
    modalInfo,
    viewType,
    isFullDay,
    constants,
    calendarConfigHook,
    currentCalendarConfig,
    onCalendarConfigChange,
    availableConfigs,
  } = useCalendarView();

  const {
    initialTeams,
    globalEmployees,
    addTeam,
    updateTeam,
    deleteTeam,
    addPersonnelToTeam,
    removePersonnelFromTeam,
    fetchTeamMembers,
    onCheckDeleteTeam,
    loadTeams
  } = useDataLayer();

  const loadDisplaySettings = async () => {
    const result = await displaySettingsService.getDisplaySettings();
    if (!result?.success || !result.data) {
      return { success: false, message: result?.message || 'Erreur lors du chargement des options d’affichage.' };
    }
    setDisplaySettings(result.data);
    return { success: true };
  };

  const saveDisplaySettings = async (value: DisplaySettings) => {
    if (!displaySettings) {
      return { success: false, message: 'Les options d’affichage ne sont pas chargées.' };
    }

    const changedValues: Partial<DisplaySettings> = {};
    if (value.CouleurBordureParDefaut !== displaySettings.CouleurBordureParDefaut) {
      changedValues.CouleurBordureParDefaut = value.CouleurBordureParDefaut;
    }
    if (value.CouleurFondParDefaut !== displaySettings.CouleurFondParDefaut) {
      changedValues.CouleurFondParDefaut = value.CouleurFondParDefaut;
    }
    if (value.CouleurTexteParDefaut !== displaySettings.CouleurTexteParDefaut) {
      changedValues.CouleurTexteParDefaut = value.CouleurTexteParDefaut;
    }
    if (JSON.stringify(value.ImageParDefaut) !== JSON.stringify(displaySettings.ImageParDefaut)) {
      changedValues.ImageParDefaut = value.ImageParDefaut;
    }

    if (Object.keys(changedValues).length === 0) return { success: true };

    const updatePayload: DisplaySettingsUpdate = {
      ...(changedValues.CouleurBordureParDefaut !== undefined
        ? { CouleurBordureParDefaut: changedValues.CouleurBordureParDefaut }
        : {}),
      ...(changedValues.CouleurFondParDefaut !== undefined
        ? { CouleurFondParDefaut: changedValues.CouleurFondParDefaut }
        : {}),
      ...(changedValues.CouleurTexteParDefaut !== undefined
        ? { CouleurTexteParDefaut: changedValues.CouleurTexteParDefaut }
        : {}),
      ...(changedValues.ImageParDefaut
        ? { ImageParDefaut: String(changedValues.ImageParDefaut.id) }
        : {}),
    };

    const result = await displaySettingsService.updateDisplaySettings(updatePayload);
    if (!result?.success) {
      return { success: false, message: result?.message || 'Erreur lors de la sauvegarde des options d’affichage.' };
    }
    setDisplaySettings(value);
    return { success: true };
  };

  const [configImageSelectorContext, setConfigImageSelectorContext] = useState<{
    actualImage?: ImageType;
    onSelect: (image: ImageType) => void;
  } | null>(null);

  const openImageModalForConfig = (actualImage: ImageType | undefined, onSelect: (image: ImageType) => void) => {
    setConfigImageSelectorContext({ actualImage, onSelect });
    handlers.openImageModalForEvent();
  };

  const closeImageSelector = () => {
    setConfigImageSelectorContext(null);
    handlers.closeImageModal();
  };

  const handleImageSelectorSelect = (image: ImageType) => {
    if (configImageSelectorContext) {
      configImageSelectorContext.onSelect(image);
      closeImageSelector();
      return;
    }
    handlers.handleImageSelect(image);
  };

  const handleRepeatSubmit = async () => {
    if (isSubmittingModalAction) return;
    setModalSubmitError(null);
    setIsSubmittingModalAction(true);
    try {
      const result = await handlers.handleRepeat();
      if (!result.success && result.message) {
        setModalSubmitError(result.message);
      }
    } finally {
      setIsSubmittingModalAction(false);
    }
  };

  const handleExtendSubmit = async () => {
    if (isSubmittingModalAction) return;
    setModalSubmitError(null);
    setIsSubmittingModalAction(true);
    try {
      const result = await handlers.handleExtend();
      if (!result.success && result.message) {
        setModalSubmitError(result.message);
      }
    } finally {
      setIsSubmittingModalAction(false);
    }
  };

  useEffect(() => {
    if (!modalsState.repeatData && !modalsState.extendData) {
      setIsSubmittingModalAction(false);
      setModalSubmitError(null);
    }
  }, [modalsState.repeatData, modalsState.extendData]);

  const settings = useMemo(() => [
    ...(hasPermission(214, 23) ? [
      {
        category: "Gestion des jours",
        key: "daysManagement",
        items: [
          {
            id: "dayTypeSettings",
            label: "Styles des types de jours",
            type: "day-type-settings",
            dayTypes: DayTypes || [],
            canEdit: hasPermission(224),
            canDelete: hasPermission(224),
            canAdd: hasPermission(224),
            fetchDayTypes: async () => {
              try {
                return await fetchDayTypes();
              } catch (error: any) {
                return { success: false, message: error?.message || "Erreur lors du chargement des types de jours" };
              }
            },
            onAddDayType: async (newType: DayType) => {
              try {
                return await addDayType(newType);
              } catch (error: any) {
                return { success: false, message: error?.message || "Erreur lors de la création" };
              }
            },
            onUpdateDayType: async (updatedType: DayType) => {
              try {
                return await updateDayType(updatedType);
              } catch (error: any) {
                return { success: false, message: error?.message || "Erreur lors de la mise à jour" };
              }
            },
            onDeleteDayType: async (id: string, numberDayCheck: number) => {
              try {
                return await removeDayType(id, numberDayCheck);
              } catch (error: any) {
                return { success: false, message: error?.message || "Erreur lors de la suppression" };
              }
            },
            onCheckDeleteDayType: async (id: string) => {
              try {
                return await onCheckDeleteDayType(id);
              } catch (error: any) {
                return { success: false, message: error?.message || "Erreur lors de la récupération du nombre de jours affectés" };
              }
            }
          },
          {
            id: "nonWorkedDay",
            label: "Dates non travaillées personnalisées",
            type: "custom-non-working-dates",
            nonWorkingDates: nonWorkingDates,
            canEdit: hasPermission(223),
            canDelete: hasPermission(223),
            canAdd: hasPermission(223),
            setNonWorkingDates: setNonWorkingDates,
            addNonWorkingDatesToPlanning: calendarConfigService.addNonWorkingDatesToPlanning,
            removeNonWorkingDatesFromPlanning: calendarConfigService.removeNonWorkingDatesFromPlanning,
            updateNonWorkingDate: calendarConfigService.editNonWorkingDate,
            getAvailablesYearForNonWorkingDate: async () => {
              try {
                return await calendarConfigService.getAvailablesYearForNonWorkingDate();
              } catch {
                return [];
              }
            },
            fetchNonWorkingDays: loadNonWorkingDates,
            dayTypesOptions: DayTypes || [],
          }
        ]
      },
      {
        category: "Gestion des équipes",
        key: "teamsManagement",
        items: [
          {
            id: "teamSettings",
            label: "Liste des équipes",
            type: "team-settings",
            
            canEdit: hasPermission(224),
            canDelete: hasPermission(224),
            canAdd: hasPermission(224),
            onAddTeam: addTeam,
            onUpdateTeam: updateTeam,
            onDeleteTeam: deleteTeam,
            onCheckDeleteTeam: onCheckDeleteTeam,
            fetchEquipes: loadTeams
          },
          {
            id: "teamMembersSettings",
            label: "Personnel de l'équipe",
            type: "team-members-settings",
            canAdd: hasPermission(224),
            canDelete: hasPermission(224),
            fetAllPersonnel: employeeService.getAllUsersActif,
            fetchTeamMembers,
            onAddPersonnelToTeam: addPersonnelToTeam,
            onRemovePersonnelFromTeam: (_teamId: number, personnelId: number) =>
              removePersonnelFromTeam(personnelId),
          },
        ],
      },
      {
        category: "Affichage mobile des événements",
        key: "mobileAppointmentFields",
        items: [
          {
            id: "mobileAppointmentFields",
            label: null,
            type: "mobile-appointment-fields",
            value: mobileAppointmentDisplay,
            onChange: handleSaveMobileAppointmentDisplay,
            options: mobileAppointmentFieldOptions,
            isLoading: mobileAppointmentSettingsLoading,
            mobileAppointmentFieldOptions: mobileAppointmentFieldOptions,
            fetchFieldOptions: async () => {
              try {
                return await loadMobileAppointmentSettings();
              } catch (error: any) {
                return { success: false, message: error?.message || "Erreur lors du chargement des options" };
              }
            }
          }
        ],
        hasUnsavedChanges: true
      }
    ] : []),
    {
      category: "Gestion des vues",
      key: "calendarConfigurations",
      items: [
        {
          id: "calendarConfigurations",
          label: "Configurations des vues",
          type: "calendar-configurations",
          user: user,
          availableConfigs: availableConfigs,
          currentConfig: currentCalendarConfig,
          onConfigChange: onCalendarConfigChange,
          onSaveConfig: calendarConfigHook.saveConfig,
          onDeleteConfig: calendarConfigHook.deleteConfig,
          handleOpenImageModal: openImageModalForConfig,
          addImage: handlers.addImage,
        }
      ]
    },
    {
      category: "Options d’affichage",
      key: "displaySettings",
      items: [
        ...(hasPermission(227) ? [{
          id: "defaultDisplaySettings",
          label: "Paramètres par défaut",
          type: "default-display-settings",
          value: displaySettings,
          fetchDisplaySettings: loadDisplaySettings,
          onChange: saveDisplaySettings,
          onSelectImage: (onSelect: (image: ImageType) => void, actualImage?: ImageType) =>
            openImageModalForConfig(actualImage, onSelect),
          onApplyToAllEvents: handlers.applyDisplaySettingsToAllEvents
        }] : []),
        {
          id: "tagPlacement",
          label: "Placement de l'étiquette",
          classNameLabel: "font-semibold",
          classNameSelect: "bg-primary-500-bg",
          classNameInlineSaveButton: "ml-auto",
          type: "select",
          value: tagPlacement,
          onChange: setTagPlacement,
          options: [
            { value: 'hover', label: 'Au clic sur une icône' },
            { value: 'fixed', label: 'Toujours visible (bord inférieur)' }
          ]
        },
        {
          id: "overlapDisplayMode",
          label: "Affichage Multi-évenements sur la barre personnel",
          classNameLabel: "font-semibold",
          classNameSelect: "bg-primary-500-bg",
          classNameInlineSaveButton: "ml-auto",
          type: "select",
          value: overlapDisplayMode,
          onChange: setOverlapDisplayMode,
          options: [
            { value: 'button', label: 'Bouton Développer / Réduire' },
            { value: 'count', label: 'Nombre d’événements masqués' }
          ]
        }
      ]
    }
  ], [
    hasPermission,
    includeWeekend,
    respectNonWorkingDays,
    nonWorkingDates,
    setIncludeWeekend,
    setRespectNonWorkingDays,
    setNonWorkingDates,
    tagPlacement,
    setTagPlacement,
    overlapDisplayMode,
    setOverlapDisplayMode,
    displaySettings,
    mobileAppointmentDisplay,
    handleSaveMobileAppointmentDisplay,
    mobileAppointmentFieldOptions,
    mobileAppointmentSettingsLoading,
    loadMobileAppointmentSettings,
    DayTypes,
    user,
    availableConfigs,
    currentCalendarConfig,
    onCalendarConfigChange,
    calendarConfigHook.saveConfig,
    calendarConfigHook.deleteConfig,
    handlers.addImage,
    handlers.applyDisplaySettingsToAllEvents,
    fetchDayTypes,
    addDayType,
    updateDayType,
    removeDayType,
    onCheckDeleteDayType,
    initialTeams,
    globalEmployees,
    addTeam,
    updateTeam,
    deleteTeam,
    addPersonnelToTeam,
    removePersonnelFromTeam,
    fetchTeamMembers
  ]);

  const resourceEditMode: 'createRessource' | 'editRessource' | 'editAppointment' | null = useMemo(() => {
    if (!modalsState.selectedAppointmentForm) return null;
    if (modalsState.selectedAppointmentForm.IdPlanningEvenement === -1) return 'createRessource';
    if (modalsState.selectedAppointmentForm.IdPlanningEvenement === 0) return 'editRessource';
    return 'editAppointment';
  }, [modalsState.selectedAppointmentForm]);

  const getMainModalTitle = () => {
    if (modalsState.repeatData) return "Répéter ce rendez-vous";
    if (modalsState.extendData) return "Prolonger le rendez-vous";
    if (modalsState.selectedAppointmentForm) {
      if (resourceEditMode === 'createRessource') return "Création de la ressource";
      if (resourceEditMode === 'editRessource') {
        return `Modification de la ressource ${
          data.items[Number(modalsState.selectedAppointmentForm?.IdPlanningRessource)]?.Type === 'Projet'
            ? ` - ${data.items[Number(modalsState.selectedAppointmentForm?.IdPlanningRessource)]?.CodePlanningRessource}`
            : ''
        }`;
      }
      return `Modifier l'Évènement - ${data.items[Number(modalsState.selectedAppointmentForm?.IdPlanningRessource)]?.CodePlanningRessource || 'Ressource inconnue'}`;
    }
    return "Ajouter un rendez-vous";
  };

  const handleCloseModal = () => {
    if (resourceEditMode === 'editAppointment' && !modalsState.repeatData && !modalsState.extendData) {
      eventService.unlockEvenement(modalsState.selectedAppointmentForm?.IdPlanningEvenement);
    }
    handlers.closeModal();
  };

  const handleCloseRepeatOrExtend = () => {
    if (modalsState.selectedAppointmentForm?.IdPlanningEvenement) {
      eventService.unlockEvenement(modalsState.selectedAppointmentForm.IdPlanningEvenement);
    }
    handlers.setRepeatData(null);
    handlers.setExtendData(null);
  };

  return (
    <>
      <Modal
        isOpen={modalsState.isModalOpen || !!modalsState.repeatData || !!modalsState.extendData}
        onClose={() => {
          if (!!modalsState.repeatData || !!modalsState.extendData) {
            handleCloseRepeatOrExtend();
          } else {
            handleCloseModal();
          }
          setIsFormDirty(false);
        }}
        title={getMainModalTitle()}
        whithoutCloseButton={true}
        roundedSize="2xl"
        classNameContent="px-4 py-4"
        confirmCloseOnOverlay={true}
        hasUnsavedChanges={isFormDirty}
        onSave={
          !!modalsState.repeatData
            ? handleRepeatSubmit
            : !!modalsState.extendData
              ? handleExtendSubmit
              : undefined
        }
      >
        {/* CAS 1: Répétition */}
        {!!modalsState.repeatData ? (
          <RepeatAppointmentContent
            appointment={modalsState.selectedAppointmentForm}
            repeatData={modalsState.repeatData}
            setRepeatData={handlers.setRepeatData}
            onClose={handleCloseRepeatOrExtend}
            onSubmit={handleRepeatSubmit}
            isSubmitting={isSubmittingModalAction}
            error={modalSubmitError}
            onLockedError={handlers.onLockedError}
          />
        ) : modalsState.extendData ? (
          /* CAS 2: Prolongation */
          <ExtendAppointmentContent
            appointment={modalsState.selectedAppointmentForm}
            extendData={modalsState.extendData}
            setExtendData={handlers.setExtendData}
            onClose={handleCloseRepeatOrExtend}
            onSubmit={handleExtendSubmit}
            isSubmitting={isSubmittingModalAction}
            error={modalSubmitError}
            onLockedError={handlers.onLockedError}
          />
        ) : (
          /* CAS 3: Formulaire de RDV */
          <AppointmentForm
            key={`${resourceEditMode ?? 'new'}-${modalsState.selectedAppointmentForm?.IdPlanningEvenement ?? 'empty'}-${modalsState.selectedAppointmentForm?.IdPlanningRessource ?? 'empty'}`}
            appointments={data.appointments}
            tagPlacement={tagPlacement}
            appointment={modalsState.selectedAppointmentForm as Appointment}
            item={data.selectedItem as Item}
            isReducedVersion={resourceEditMode !== null}
            resourceEditMode={resourceEditMode}
            employees={data.employees}
            HALF_DAY_INTERVALS={constants.intervals}
            isFullDay={isFullDay}
            nonWorkingDates={nonWorkingDates}
            onSave={handlers.saveAppointment}
            isExpand={resourceEditMode === 'editAppointment'}
            onClose={() => handlers.closeModal()}
            handleOpenImageModal={handlers.openImageModalForEvent}
            onDirtyChange={setIsFormDirty}
            handleAddManualRessource={handlers.handleAddManualRessource}
            handleEditRessource={handlers.handleEditRessource}
            onRemoveTagFromAppointments={etiquetteService.deleteEtiquette}
            onFetchTagsForResource={etiquetteService.getEtiquettes}
            onAddTagToResource={etiquetteService.createEtiquette}
            onFetchEventAndRessource={eventService.getEvenement}
            onFetchPermissions={permissionService.getPermissions}
            onSetPermissions={permissionService.setPermissions}
            onLockedError={handlers.onLockedError}
            loadingFallback={<ModalLoadingFallback />}
          />
        )}
      </Modal>

      {/* --- PARAMETRES --- */}
      {isControlPanelModalOpen && (
        <ControlPanelModal
          onClose={() => setIsControlPanelModalOpen(false)}
          settings={settings}
          isControlPanelModalOpen={isControlPanelModalOpen}
        />
      )}

      {/* --- CONFIGURATION VUES CALENDRIER --- */}
      

      {/* --- SELECTEUR D'IMAGES --- */}
      {modalsState.isImageSelectorOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ImageSelectorContentModal
            actualImage={configImageSelectorContext ? configImageSelectorContext.actualImage : data.selectedItem?.Image}
            isOpen={modalsState.isImageSelectorOpen}
            onClose={closeImageSelector}
            onImageSelect={handleImageSelectorSelect}
            onImageUpload={handlers.handleImageUpload}
            isUploading={data.isUploading}
            uploadError={data.uploadError}
            fetchPaginatedImages={handlers.fetchPaginatedImages}
          />
        </Suspense>
      )}

      {/* --- FILTRES TABLEAUX --- */}
      {isFilterModalOpen && (
        <FilterModal
          title="Filtres avancés"
          isOpen={isFilterModalOpen}
          onSubmit={handlers.submitFilters}
          onApply={handlers.applyFilters}
          onClose={() => setIsFilterModalOpen(false)}
          keyOfFilter={data.keyOfFilter}
          viewType={viewType}
        />
      )}

      {/* --- NOTIFICATION FLOTTANTE (INFO MODALE) --- */}
      {modalInfo && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 bg-${modalInfo.color}-100 px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-4 border border-${modalInfo.color}-300`}>
          <span className={`font-semibold text-lg text-${modalInfo.color}-800`}>{modalInfo.message}</span>
        </div>
      )}

      {/* --- CONFIRMATION SUPPRESSION RUBRIQUE --- */}
      {modalsState.deleteConfirmData && (() => {
        const { item, isUsedInPlanning, isActive } = modalsState.deleteConfirmData;

        // Scénario 1 : Rubrique déjà désactivée
        if (!isActive) {
          const scenario: DeleteScenario = {
            title: "Rubrique déjà désactivée",
            description: (
              <>
                La rubrique <span className="font-semibold text-primary">{item.LibellePlanningRessource}</span> ({item.CodePlanningRessource}) est déjà désactivée.
              </>
            ),
            secondaryDescription: "Voulez-vous la supprimer définitivement ?",
            iconColor: "gray",
            iconType: "info",
            infoMessages: isUsedInPlanning ? [
              {
                text: "⚠️ Attention : Cette rubrique est encore utilisée dans le planning. La supprimer effacera tous les rendez-vous associés.",
                type: "warning"
              }
            ] : undefined,
            actions: [
              {
                label: "Supprimer",
                onClick: () => {
                  handlers.handleDeleteManualRessource?.(item.IdPlanningRessource, true);
                  handlers.setDeleteConfirmData?.(null);
                },
                variant: "primary",
                requiresConfirm: isUsedInPlanning,
              },
              {
                label: "Annuler",
                onClick: () => handlers.setDeleteConfirmData?.(null),
                variant: "cancel"
              }
            ]
          };

          return (
            <Suspense fallback={<ModalLoadingFallback />}>
              <DeleteModal
                isOpen={true}
                onClose={() => handlers.setDeleteConfirmData?.(null)}
                title="Suppression de rubrique"
                scenario={scenario}
              />
            </Suspense>
          );
        }

        // Scénario 2 : Rubrique active utilisée dans le planning
        if (isUsedInPlanning) {
          const scenario: DeleteScenario = {
            title: "Cette rubrique est actuellement utilisée dans le planning",
            description: (
              <>
                La rubrique <span className="font-semibold text-primary">{item.LibellePlanningRessource}</span> ({item.CodePlanningRessource}) est liée à des rendez-vous existants.
              </>
            ),
            iconColor: "orange",
            iconType: "warning",
            infoMessages: [
              {
                text: "💡 Recommandation : Désactivez cette rubrique au lieu de la supprimer. Elle restera visible dans l'historique mais ne pourra plus être utilisée pour de nouveaux rendez-vous.",
                type: "info"
              }
            ],
            actions: [
              {
                label: "Désactiver la rubrique (recommandé)",
                onClick: () => {
                  handlers.handleDeactivateDimension?.(item.IdPlanningRessource);
                  handlers.setDeleteConfirmData?.(null);
                },
                variant: "secondary",
                icon: "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              },
              {
                label: "Supprimer tout (rubrique + RDV)",
                onClick: () => {
                  handlers.handleDeleteManualRessource?.(item.IdPlanningRessource, true);
                  handlers.setDeleteConfirmData?.(null);
                },
                variant: "primary",
                icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
                requiresConfirm: true,
              },
              {
                label: "Annuler",
                onClick: () => handlers.setDeleteConfirmData?.(null),
                variant: "cancel"
              }
            ]
          };

          return (
            <Suspense fallback={<ModalLoadingFallback />}>
              <DeleteModal
                isOpen={true}
                onClose={() => handlers.setDeleteConfirmData?.(null)}
                title="Suppression de rubrique"
                scenario={scenario}
              />
            </Suspense>
          );
        }

        // Scénario 3 : Rubrique active non utilisée
        const scenario: DeleteScenario = {
          title: "Confirmer la suppression",
          description: (
            <>
              Voulez-vous vraiment supprimer la rubrique <span className="font-semibold text-primary">{item.LibellePlanningRessource}</span> ({item.CodePlanningRessource}) ?
            </>
          ),
          secondaryDescription: "Cette rubrique n'est pas utilisée dans le planning.",
          iconColor: "red",
          iconType: "trash",
          actions: [
            {
              label: "Supprimer",
              onClick: () => {
                handlers.handleDeleteManualRessource?.(item.IdPlanningRessource, true);
                handlers.setDeleteConfirmData?.(null);
              },
              variant: "primary"
            },
            {
              label: "Annuler",
              onClick: () => handlers.setDeleteConfirmData?.(null),
              variant: "cancel"
            }
          ]
        };

        return (
          <Suspense fallback={<ModalLoadingFallback />}>
            <DeleteModal
              isOpen={true}
              onClose={() => handlers.setDeleteConfirmData?.(null)}
              title="Suppression de rubrique"
              scenario={scenario}
            />
          </Suspense>
        );
      })()}
    </>
  );
});


const RepeatAppointmentContent = ({
  appointment,
  repeatData,
  setRepeatData,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  onLockedError
}: {
  appointment: Appointment | null;
  repeatData: RepeatData;
  setRepeatData: (data: RepeatData | null) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
  onLockedError: (msg: string) => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [freshApp, setFreshApp] = useState<Appointment | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!appointment?.IdPlanningEvenement) return;

    setIsLoading(true);
    // 1. On appelle l'API pour récupérer les infos FRAÎCHES et poser le verrou de 5 minutes
    eventService.getEvenement(appointment.IdPlanningEvenement).then(response => {
      if (!isMounted) return;
      
      if (!response?.success || response?.isLocked) {
        onClose();
        onLockedError(response?.message);
      } else if (response?.success && response?.data) {
        const fetchedApp = response.data.appointments[0] ?? response.data.appointments;
        setFreshApp(fetchedApp);
        setIsLoading(false);
      } else {
        // Fallback
        setFreshApp(appointment);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setFreshApp(appointment);
        setIsLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [appointment]);

  if (isLoading) return <ModalLoadingFallback />;

  return (
    <div className="flex flex-col gap-6 poppins w-[340px]">
      <div className="flex flex-col gap-4">
        <span className="text-base underline">Rythme de répétition</span>
        <div className="flex items-center gap-7">
          <label className="flex items-center gap-2 font-medium">
            <span className="">{repeatData.repeatInterval === 'week' ? 'Toutes les' : 'Tous les'}</span>
            <input
              required
              type="number"
              min={1}
              className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition w-[70px] text-center"
              value={repeatData.numberCount || 1}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (value > 0) setRepeatData({ ...repeatData, numberCount: value });
              }}
            />
          </label>
          <select
            className="border border-default bg-secondary rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition ml-2 custom-select"
            value={repeatData.repeatInterval || "day"}
            onChange={(e) => {
              const value = e.target.value as "day" | "week" | "month";
              setRepeatData({ ...repeatData, repeatInterval: value });
            }}
            required
          >
            <option value="day">Jours</option>
            <option value="week">Semaines</option>
            <option value="month">Mois</option>
          </select>
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        <span className="text-base underline">Méthode</span>
        <div className="flex flex-row items-center gap-6">
          <div className="flex items-center gap-22">
            <div className="">
              <input
                type="radio"
                name="repeatMethod"
                value="count"
                checked={repeatData.repeatCount !== null && repeatData.endDate === null}
                onChange={() => setRepeatData({ ...repeatData, repeatCount: 1, endDate: null })}
              />
              <span className="ml-1">Nombre</span>
            </div>
            <input
              type="number"
              min={1}
              disabled={repeatData.endDate !== null}
              className={`${repeatData.endDate !== null ? 'opacity-50 cursor-not-allowed' : 'opacity-100'} border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition w-[70px] ml-2`}
              value={repeatData.repeatCount ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  setRepeatData({ ...repeatData, repeatCount: null });
                  return;
                }
                const parsed = parseInt(value, 10);
                if (!isNaN(parsed) && parsed > 0) {
                  setRepeatData({ ...repeatData, repeatCount: parsed, endDate: null });
                }
              }}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-12">
          <div>
            <input
              type="radio"
              name="repeatMethod"
              value="endDate"
              checked={repeatData.endDate !== null && repeatData.repeatCount === null}
              onChange={() => setRepeatData({ ...repeatData, repeatCount: null, endDate: Date.now() })}
            />
            <span className="ml-1">Fin répétition</span>
          </div>
          <input
            type="date"
            className={`${repeatData.repeatCount !== null ? 'opacity-50 cursor-not-allowed text-sm' : 'opacity-100 text-base focus:ring-2 focus:ring-color'} ml-2 border border-default rounded-xl px-3 py-2 focus:outline-none transition w-[145px]`}
            value={repeatData.endDate ? format(repeatData.endDate, "yyyy-MM-dd") : ""}
            // 💡 On utilise la date fraîche récupérée de la BDD !
            min={freshApp?.FinPlanningEvenement ? format(freshApp.FinPlanningEvenement, "yyyy-MM-dd") : undefined}
            onChange={e => {
              const value = e.target.value;
              const parsed = value ? new Date(value).getTime() : null;
              if (parsed !== null && Number.isNaN(parsed)) return;
              setRepeatData({ ...repeatData, endDate: parsed, repeatCount: null });
            }}
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      
      <div className="flex justify-between mt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={`px-4 py-2 bg-primary-500 text-white rounded-xl transition-colors ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`px-4 py-2 bg-primary-500 text-white rounded-xl transition-colors flex items-center justify-center min-w-[120px] ${isSubmitting ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isSubmitting && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// SOUS-COMPOSANT : PROLONGATION (Gère son propre fetch et son verrou)
// ============================================================================
const ExtendAppointmentContent = ({
  appointment,
  extendData,
  setExtendData,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  onLockedError
}: {
  appointment: Appointment | null;
  extendData: number;
  setExtendData: (date: number | null) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
  onLockedError: (msg: string) => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [freshApp, setFreshApp] = useState<Appointment | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!appointment?.IdPlanningEvenement) return;

    setIsLoading(true);
    eventService.getEvenement(appointment.IdPlanningEvenement).then(response => {
      if (!isMounted) return;
      if (response?.success === false || response?.isLocked) {
        onClose();
        onLockedError(response?.message);
      } else if (response?.success && response?.data) {
        const fetchedApp = response.data.appointments[0] ?? response.data.appointments;
        setFreshApp(fetchedApp);
        setIsLoading(false);
      } else {
        setFreshApp(appointment);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setFreshApp(appointment);
        setIsLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [appointment]);

  if (isLoading) return <ModalLoadingFallback />;

  return (
    <div>
      <div className="flex flex-row items-center mb-4 poppins">
        <span className="text-base poppins mr-[65px]">Jusqu'au</span>
        <input
          type="date"
          className="text-base border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition w-[145px]"
          value={format(extendData, "yyyy-MM-dd")}
          // 💡 On utilise la date fraîche récupérée de la BDD !
          min={freshApp?.FinPlanningEvenement ? format(new Date(freshApp.FinPlanningEvenement), "yyyy-MM-dd") : undefined}
          onChange={(e) => {
            const date = new Date(e.target.value).setHours(23, 59, 59, 999);
            if (!isNaN(date)) {
              setExtendData(date);
            }
          }}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={`px-4 py-2 bg-primary-500 text-white rounded-xl transition-colors w-[110px] mr-[89px] ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`px-4 py-2 bg-primary-500 text-white rounded-xl transition-colors w-[140px] flex items-center justify-center ${isSubmitting ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isSubmitting && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isSubmitting ? 'Validation...' : 'Valider'}
        </button>
      </div>
    </div>
  );
};