import React, { memo, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import { 
  Modal, 
} from '@/app/calendrier/components';
import { Appointment, Item, CalendarConfig, ImageType, User, AutreItem } from '../../types';
import { ActiveFilters } from '../../utils/searchAndFilterUtils';
import { RepeatData } from '../../hooks/appointments/useAppointmentLogic';
import { DeleteScenario } from '../modals/DeleteModal';
import etiquetteService from '@/app/service/etiquette.service';
import eventService from '@/app/service/evenement.service';
import { useAuth } from '../../hooks/utils/AuthContext';

type ModalActionResult = { success: boolean; message?: string };

// Lazy loading des modales lourdes
const AppointmentForm = lazy(() => import('../forms/AppointmentForm'));
const ImageSelectorContentModal = lazy(() => import('../modals/imageSelectorContentModal'));
const SettingsModal = lazy(() => import('../modals/SettingsModal'));
const ConfigurationModal = lazy(() => import('../modals/ConfigurationModal'));
const FilterModal = lazy(() => import('../modals/FilterModal'));
const DeleteModal = lazy(() => import('../modals/DeleteModal'));

// Composant de fallback pour le chargement
const ModalLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

interface CalendarModalsProps {
  user: User;
  modalsState: {
    isModalOpen: boolean;
    isSettingsOpen: boolean;
    isFilterModalOpen: boolean;
    isImageSelectorOpen: boolean;
    isConfigModalOpen: boolean;
    repeatData: RepeatData | null;
    extendData: number | null;
    modalInfo: { message: string, color: string } | null;
    selectedAppointmentForm: Appointment | null;
    deleteConfirmData: { item: Item, isUsedInPlanning: boolean, isActive: boolean } | null;
    tagPlacement: 'hover' | 'fixed';
  };
  handlers: {
    closeModal: () => void;
    saveAppointment: (app: Appointment, evt: Item, includeNonWork: boolean, type: 'create' | 'update') => Promise<{ success: boolean; message?: string }>;
    handleAddManualRessource: (dimension: AutreItem) => Promise<{ success: boolean; message?: string }>;
    handleEditRessource: (dimension: Item) => Promise<{ success: boolean; message?: string }>;
    handleDeleteManualRessource?: (dimensionId: number, forceDelete?: boolean) => any;
    handleDeactivateDimension?: (dimensionId: number) => any;
    setDeleteConfirmData?: (data: { item: Item, isUsedInPlanning: boolean, isActive: boolean } | null) => void;
    
    // Repeat Handlers
    setRepeatData: (data: RepeatData | null) => void;
    handleRepeat: () => Promise<ModalActionResult>;
    
    // Extend Handlers
    setExtendData: (date: number | null) => void;
    handleExtend: () => Promise<ModalActionResult>;
    
    // Image Handlers
    closeImageModal: () => void;
    handleImageSelect: (image: ImageType) => void;
    handleImageUpload: (file: File) => Promise<ImageType>;
    openImageModalForEvent: (id: number) => void;

    // Settings & Config Handlers
    closeSettings: () => void;
    closeFilterModal: () => void;
    submitFilters: (filters: ActiveFilters) => void;
    clearFilters: () => void;
    
    // Config Calendar
    closeConfigModal: () => void;
    setCurrentConfig: (config: CalendarConfig) => void;
    saveCustomConfig: (config: Omit<CalendarConfig, "id">) => Promise<CalendarConfig | void> | CalendarConfig | void;
    updateCustomConfig: (config: CalendarConfig) => void;
    deleteCustomConfig: (id: number) => void;
    duplicateConfig: (config: CalendarConfig) => Promise<CalendarConfig | void> | CalendarConfig | void;
    
    // Config Configuration Editing State (from hook)
    setEditingConfig: (config: any) => void;
    setIsCreatingConfig: (val: boolean) => void;
    addNonWorkingDatesToPlanning: (date: number) => Promise<any>;
    removeNonWorkingDatesFromPlanning: (idPlanning: number, date: number) => Promise<any>;

    setSelectedItem: (item: Item | null) => void;
    onLockedError: (message: string) => void;
  };
  data: {
    appointments: Appointment[];
    items: Record<number, Item>;
    employees: User[];
    selectedItem: Item | null;
    selectedEmployee: User | null;
    availableImages: ImageType[];
    filterConfig: any; // Options pour le filtre
    isUploading: boolean;
    uploadError: string | null;
    
    // Config Editing Data
    editingConfig: any;
    isCreatingConfig: boolean;
    availableConfigs: CalendarConfig[];
    currentConfig: CalendarConfig | null;
  };
  config: {
    // Settings Values
    includeWeekend: boolean;
    setIncludeWeekend: (v: boolean) => void;
    respectNonWorkingDays: boolean;
    setRespectNonWorkingDays: (v: boolean) => void;
    nonWorkingDates: Record<string, number>;
    setNonWorkingDates: (dates: Record<string, number>) => void;
    tagPlacement: 'hover' | 'fixed';
    setTagPlacement: (v: 'hover' | 'fixed') => void;
    
    // Constants
    HALF_DAY_INTERVALS: any[];
    isFullDay: boolean;
    isDisplayWeekend: boolean;
    viewType: 'calendar' | 'chantier-table' | 'paie-table' | 'employee-table' | 'manual-event-table';
  };
}

export const CalendarModals = memo(({ 
  user,
  modalsState, 
  handlers, 
  data, 
  config 
}: CalendarModalsProps) => {
  const { hasPermission } = useAuth();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isSubmittingModalAction, setIsSubmittingModalAction] = useState(false);
  const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);

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
    ...(hasPermission(23) ? [
      {
      category: "Gestion des jours travaillés",
      items: [
        {
          id: "nonWorkedDay", 
          label: "Dates non travaillées personnalisées", 
          type: "custom-non-working-dates",
          nonWorkingDates: config.nonWorkingDates,
          setNonWorkingDates: config.setNonWorkingDates,
          addNonWorkingDatesToPlanning: handlers.addNonWorkingDatesToPlanning,
          removeNonWorkingDatesFromPlanning: handlers.removeNonWorkingDatesFromPlanning,
        }
      ]
    }] : []),
    {
      category: "Affichage des étiquettes",
      items: [
        {
          id: "tagPlacement",
          label: "Placement de l'étiquette",
          type: "select",
          value: config.tagPlacement,
          onChange: config.setTagPlacement,
          options: [
            { value: 'hover', label: 'Au survol (animation)' },
            { value: 'fixed', label: 'Toujours visible (bord inférieur)' }
          ]
        }
      ]
    }
  ], [config.includeWeekend, config.respectNonWorkingDays, config.nonWorkingDates, config.setIncludeWeekend, config.setRespectNonWorkingDays, config.setNonWorkingDates, config.tagPlacement, config.setTagPlacement, handlers.addNonWorkingDatesToPlanning, handlers.removeNonWorkingDatesFromPlanning]);  

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
        if (resourceEditMode === 'editRessource') return `Modification de la ressource - ${data.items[Number(modalsState.selectedAppointmentForm?.IdPlanningRessource)]?.CodePlanningRessource}`;
        return `Modifier l'Évènement - ${data.items[Number(modalsState.selectedAppointmentForm?.IdPlanningRessource)]?.CodePlanningRessource || 'Ressource inconnue'}`;
    }
    return "Ajouter un rendez-vous";
  };  

  const handleCloseModal = () => {
      // Le composant enfant (AppointmentForm) gère déjà son propre unlock si besoin
      // Mais en sécurité, on débloque si c'est une édition classique
      if (resourceEditMode === 'editAppointment' && !modalsState.repeatData && !modalsState.extendData) {
        eventService.unlockEvenement(modalsState.selectedAppointmentForm?.IdPlanningEvenement);
      }
      handlers.closeModal();
  }

  const handleCloseRepeatOrExtend = () => {
    // Si on annule Repeat ou Extend, on doit libérer le verrou récupéré lors de l'ouverture
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
        classNameContent='px-4 py-4'
        confirmCloseOnOverlay={true}
        hasUnsavedChanges={isFormDirty}
        onSave={
          !!modalsState.repeatData ? handleRepeatSubmit 
          : !!modalsState.extendData ? handleExtendSubmit 
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
            appointments={data.appointments}
            tagPlacement={modalsState.tagPlacement}
            appointment={modalsState.selectedAppointmentForm as Appointment}
            item={modalsState.selectedAppointmentForm?.IdPlanningRessource === -1 
              ? {
                  IdPlanningRessource: -1,
                  CodePlanningRessource: '',
                  LibellePlanningRessource: '',
                  Type: 'Rubrique Perso',
                  CouleurFondPlanningRessource: '#ffffff',
                  CouleurBordurePlanningRessource: '#000000',
                  CouleurTextePlanningRessource: '#000000',
                  Actif: false,
                  Verrou: false,
                  Category: 'dimension',
              } 
              : data.items[Number(modalsState.selectedAppointmentForm?.IdPlanningRessource)] as Item}
            isReducedVersion={resourceEditMode !== null}
            resourceEditMode={resourceEditMode}
            employees={data.employees}
            HALF_DAY_INTERVALS={config.HALF_DAY_INTERVALS}
            isFullDay={config.isFullDay}
            nonWorkingDates={config.nonWorkingDates}
            onSave={handlers.saveAppointment}
            onClose={() => handlers.closeModal()}
            handleOpenImageModal={handlers.openImageModalForEvent}
            onDirtyChange={setIsFormDirty}
            handleAddManualRessource={handlers.handleAddManualRessource}
            handleEditRessource={handlers.handleEditRessource}
            onRemoveTagFromAppointments={etiquetteService.deleteEtiquette}
            onFetchTagsForResource={etiquetteService.getEtiquettes}
            onAddTagToResource={etiquetteService.createEtiquette}
            onFetchEventAndRessource={eventService.getEvenement}
            onLockedError={handlers.onLockedError}
            loadingFallback={<ModalLoadingFallback />}
          />
        )}
      </Modal>

      {/* --- SELECTEUR D'IMAGES --- */}
      {modalsState.isImageSelectorOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ImageSelectorContentModal
            images={data.availableImages}
            actualImage={data.availableImages.find(img => img.id === (config.viewType === 'employee-table' ? data.selectedEmployee?.IdImage : data.selectedItem?.Image)) ?? null}
            isOpen={modalsState.isImageSelectorOpen}
            onClose={handlers.closeImageModal}
            onImageSelect={handlers.handleImageSelect}
            onImageUpload={handlers.handleImageUpload}
            isUploading={data.isUploading}
            uploadError={data.uploadError}
            fetchPaginatedImages={async (page, limit) => {
              // TODO: Gérer l'état des images au niveau du parent via imageService.getImagesPaginated(page, limit || 8)
              console.log('Appel de fetchPaginatedImages', { page, limit });
            }}
            addImageToDatabase={async (file) => {
              // TODO: Appeler imageService.uploadImage(file)
              console.log('Appel de addImageToDatabase', { file });
            }}
          />
        </Suspense>
      )}

      {/* --- PARAMETRES --- */}
      {modalsState.isSettingsOpen && (
        <SettingsModal 
          onClose={handlers.closeSettings}
          settings={settings} 
          isSettingsOpen={modalsState.isSettingsOpen}
        />
      )}
      
      {/* --- CONFIGURATION VUES CALENDRIER --- */}
      {modalsState.isConfigModalOpen && (
        <ConfigurationModal
          user={user}
          isOpen={modalsState.isConfigModalOpen}
          onClose={handlers.closeConfigModal}
          availablesImages={data.availableImages}
          availableConfigs={data.availableConfigs}
          currentConfig={data.currentConfig}
          onConfigChange={handlers.setCurrentConfig}
          onSaveConfig={handlers.saveCustomConfig}
          onUpdateConfig={handlers.updateCustomConfig}
          onDeleteConfig={handlers.deleteCustomConfig}
          onDuplicateConfig={handlers.duplicateConfig}
          editingConfig={data.editingConfig}
          setEditingConfig={handlers.setEditingConfig}
          isCreatingConfig={data.isCreatingConfig}
          setIsCreatingConfig={handlers.setIsCreatingConfig}
        />
      )}
      
      {/* --- FILTRES TABLEAUX --- */}
      {modalsState.isFilterModalOpen && (
        <FilterModal
          title='Filtres avancés'
          isOpen={modalsState.isFilterModalOpen}
          onSubmit={handlers.submitFilters}
          onClose={handlers.closeFilterModal}
          filterConfig={data.filterConfig}
          onClearAll={handlers.clearFilters}
          viewType={config.viewType}
        />
      )}

      {/* --- NOTIFICATION FLOTTANTE (INFO MODALE) --- */}
      {modalsState.modalInfo && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 bg-${modalsState.modalInfo.color}-100 px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-4 border border-${modalsState.modalInfo.color}-300`}>
          <span className={`font-semibold text-lg text-${modalsState.modalInfo.color}-800`}>{modalsState.modalInfo.message}</span>
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
      
      if (response?.error === 409 || response?.isLocked) {
        // 🚨 Verrou pris par un autre
        onClose();
        onLockedError(response?.message || "Accès refusé. Ce rendez-vous est déjà en cours d'édition.");
      } else if (response?.error === 0 && response?.data) {
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
            className="border border-default bg-secondary-bg rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition ml-2 custom-select"
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
          className={`px-4 py-2 bg-primary text-white rounded-xl transition-colors ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`px-4 py-2 bg-primary text-white rounded-xl transition-colors flex items-center justify-center min-w-[120px] ${isSubmitting ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
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
      if (response?.error === 409 || response?.isLocked) {
        onClose();
        onLockedError(response?.message || "Accès refusé. Ce rendez-vous est déjà en cours d'édition.");
      } else if (response?.error === 0 && response?.data) {
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
          className={`px-4 py-2 bg-primary text-white rounded-xl transition-colors w-[110px] mr-[89px] ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={`px-4 py-2 bg-primary text-white rounded-xl transition-colors w-[140px] flex items-center justify-center ${isSubmitting ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
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