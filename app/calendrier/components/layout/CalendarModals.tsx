import React, { memo, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { 
  Modal, 
  AppointmentForm, 
  ImageSelectorContentModal, 
  SettingsModal, 
  ConfigurationModal, 
  FilterModal,
  DeleteModal 
} from '@/app/calendrier/components';
import { Appointment, Item, CalendarConfig, Image, User } from '../../types';
import { ActiveFilters } from '../../utils/searchAndFilterUtils';
import { RepeatData } from '../../hooks/useAppointmentLogic';
import { DeleteScenario } from '../modals/DeleteModal';

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
  };
  handlers: {
    closeModal: () => void;
    saveAppointment: (app: Appointment, evt: Item, includeNonWork: boolean) => void;
    handleAddDimension: (dimension: Item) => void;
    handleEditDimension: (dimension: Item) => void;
    handleDeleteDimension?: (dimensionId: number, forceDelete?: boolean) => any;
    handleDeactivateDimension?: (dimensionId: number) => any;
    setDeleteConfirmData?: (data: { item: Item, isUsedInPlanning: boolean, isActive: boolean } | null) => void;
    
    // Repeat Handlers
    setRepeatData: (data: RepeatData | null) => void;
    handleRepeat: () => void;
    
    // Extend Handlers
    setExtendData: (date: number | null) => void;
    handleExtend: () => void;
    
    // Image Handlers
    closeImageModal: () => void;
    handleImageSelect: (image: Image) => void;
    handleImageUpload: (file: File) => Promise<Image>;
    openImageModalForEvent: (id: number) => void;

    // Settings & Config Handlers
    closeSettings: () => void;
    closeFilterModal: () => void;
    submitFilters: (filters: ActiveFilters) => void;
    clearFilters: () => void;
    
    // Config Calendar
    closeConfigModal: () => void;
    setCurrentConfig: (config: CalendarConfig) => void;
    saveCustomConfig: (config: Omit<CalendarConfig, "id">) => CalendarConfig;
    updateCustomConfig: (config: CalendarConfig) => void;
    deleteCustomConfig: (id: number) => void;
    duplicateConfig: (config: CalendarConfig) => CalendarConfig;
    
    // Configuration Editing State (from hook)
    setEditingConfig: (config: any) => void;
    setIsCreatingConfig: (val: boolean) => void;

    setSelectedItem: (item: Item | null) => void;
  };
  data: {
    appointments: Appointment[];
    items: Item[];
    employees: User[];
    selectedItem: Item | null;
    selectedEmployee: User | null;
    availableImages: Image[];
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
    nonWorkingDates: number[];
    setNonWorkingDates: (dates: number[]) => void;
    
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
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Reconstitution de la structure des paramètres pour SettingsModal
  const settings = useMemo(() => [
    {
      category: "Gestion des jours travaillés",
      items: [
        // {
        //   id: "includeWeekend", 
        //   label: "Autoriser la planification sur les week-ends", 
        //   type: "checkbox",
        //   value: config.includeWeekend,
        //   onChange: config.setIncludeWeekend,
        // },
        // {
        //   id: "respectNonWorkingDays", 
        //   label: "Respecter les jours non travaillés", 
        //   type: "checkbox",
        //   value: config.respectNonWorkingDays,
        //   onChange: config.setRespectNonWorkingDays,
        // },
        {
          id: "nonWorkedDay", 
          label: "Dates non travaillées personnalisées", 
          type: "custom-non-working-dates",
          nonWorkingDates: config.nonWorkingDates,
          setNonWorkingDates: config.setNonWorkingDates,
        }
      ]
    }
  ], [config.includeWeekend, config.respectNonWorkingDays, config.nonWorkingDates, config.setIncludeWeekend, config.setRespectNonWorkingDays, config.setNonWorkingDates]);  

  // Titre dynamique de la modale principale
  const getMainModalTitle = () => {
    if (modalsState.repeatData) return "Répéter ce rendez-vous";
    if (modalsState.extendData) return "Prolonger le rendez-vous";
    if (modalsState.selectedAppointmentForm) {
        return modalsState.selectedAppointmentForm.id === -1 ? "Modification de la ressource" : `Modifier l'Évènement - ${data.items.find(i => i.id === modalsState.selectedAppointmentForm?.EventId)?.code}`;
    }
    return "Ajouter un rendez-vous";
  };  

  
  return (
    <>
      {/* --- MODALE PRINCIPALE (Formulaire / Répétition / Prolongation) --- */}
      <Modal
        isOpen={modalsState.isModalOpen || !!modalsState.repeatData || !!modalsState.extendData}
        onClose={() => {
          handlers.closeModal();
          handlers.setRepeatData(null);
          handlers.setExtendData(null);
          setIsFormDirty(false);
        }}
        title={getMainModalTitle()}
        whithoutCloseButton={true}
        roundedSize="2xl"
        classNameContent='px-4 py-4'
        confirmCloseOnOverlay={true}
        hasUnsavedChanges={isFormDirty}
      >
        {/* CAS 1: Répétition */}
        {!!modalsState.repeatData ? (
          <div className="flex flex-col gap-6 poppins w-[340px]">
            <div className="flex flex-col gap-4">
              <span className="text-base underline">{'Rythme de répétition'}</span>
              <div className="flex items-center gap-7">
                <label className="flex items-center gap-2 font-medium">
                  <span className="">{'Tous les'}</span>
                  <input
                    required
                    type="number"
                    min={1}
                    className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition w-[70px] text-center"
                    value={modalsState.repeatData.numberCount || 1}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (value > 0) {
                        handlers.setRepeatData({ ...modalsState.repeatData!, numberCount: value });
                      }
                    }}
                  />
                </label>
                <select
                  className="border border-default bg-bg-secondary rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition ml-2 custom-select"
                  value={modalsState.repeatData.repeatInterval || "day"}
                  onChange={(e) => {
                    const value = e.target.value as "day" | "week" | "month";
                    handlers.setRepeatData({ ...modalsState.repeatData!, repeatInterval: value });
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
              <span className="text-base underline">{'Méthode'}</span>
              <div className="flex flex-row items-center gap-6">
                {/* Option: Nombre de fois */}
                <div className="flex items-center gap-22">
                  <div className="">
                    <input
                      type="radio"
                      name="repeatMethod"
                      value="count"
                      checked={modalsState.repeatData.repeatCount !== null && modalsState.repeatData.endDate === null}
                      onChange={() => {
                        handlers.setRepeatData({ ...modalsState.repeatData!, repeatCount: 1, endDate: null });
                      }}
                    />
                    <span className="ml-1">Nombre</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    disabled={modalsState.repeatData.endDate !== null}
                    className={`${modalsState.repeatData.endDate !== null ? 'opacity-50 cursor-not-allowed' : 'opacity-100'} border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition w-[70px] ml-2`}
                    value={modalsState.repeatData.repeatCount ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        handlers.setRepeatData({ ...modalsState.repeatData!, repeatCount: null });
                        return;
                      }
                      const parsed = parseInt(value, 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        handlers.setRepeatData({ ...modalsState.repeatData!, repeatCount: parsed, endDate: null });
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* Option: Jusqu'à date */}
              <div className="flex items-center gap-12">
                <div>
                  <input
                    type="radio"
                    name="repeatMethod"
                    value="endDate"
                    checked={modalsState.repeatData.endDate !== null && modalsState.repeatData.repeatCount === null}
                    onChange={() => {                        
                      handlers.setRepeatData({ ...modalsState.repeatData!, repeatCount: null, endDate: Date.now() });
                    }}
                  />
                  <span className="ml-1">{'Fin répétition'}</span>
                </div>
                <input
                  type="date"
                  className={`${modalsState.repeatData.repeatCount !== null ? 'opacity-50 cursor-not-allowed text-sm' : 'opacity-100 text-base focus:ring-2 focus:ring-color'} ml-2 border border-default rounded-xl px-3 py-2 focus:outline-none transition w-[145px]`}
                  value={modalsState.repeatData.endDate ? format(modalsState.repeatData.endDate, "yyyy-MM-dd") : ""}
                  min={modalsState.selectedAppointmentForm?.endDate ? format(modalsState.selectedAppointmentForm.endDate, "yyyy-MM-dd") : undefined}
                  onChange={e => {
                    const value = e.target.value;
                    const parsed = value ? new Date(value).getTime() : null;
                    if (parsed !== null && Number.isNaN(parsed)) return; // Ignore invalid dates
                    handlers.setRepeatData({ ...modalsState.repeatData!, endDate: parsed, repeatCount: null });
                  }}
                />
              </div>
            </div>
            
            <div className="flex justify-between mt-2">
              <button
                type="button"
                onClick={() => handlers.setRepeatData(null)}
                className="px-4 py-2 bg-primary text-white rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlers.handleRepeat}
                className="px-4 py-2 bg-primary text-white rounded-xl transition-colors cursor-pointer"
              >
                {'Enregistrer'}
              </button>
            </div>
          </div>
        ) : modalsState.extendData ? (
          /* CAS 2: Prolongation */
          <div>
            <div className="flex flex-row items-center mb-4 poppins">
              <span className="text-base poppins mr-[65px]">Jusqu'au</span>
              <input
                type="date"
                className="text-base border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-color transition w-[145px]"
                value={format(modalsState.extendData, "yyyy-MM-dd")}
                min={modalsState.selectedAppointmentForm?.endDate ? format(modalsState.selectedAppointmentForm.endDate, "yyyy-MM-dd") : undefined}
                onChange={(e) => {
                  const date = new Date(e.target.value).setHours(23, 59, 59, 999);
                  if (!isNaN(date)) {
                    handlers.setExtendData(date);
                  }
                }}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => handlers.setExtendData(null)}
                className="px-4 py-2 bg-primary text-white rounded-xl cursor-pointer transition-colors w-[110px] mr-[89px]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlers.handleExtend}
                className="px-4 py-2 bg-primary text-white rounded-xl cursor-pointer transition-colors w-[110px]"
              >
                {'Valider'}
              </button>
            </div>
          </div>
        ) : (
          /* CAS 3: Formulaire de RDV */
          <AppointmentForm
            appointments={data.appointments}
            appointment={modalsState.selectedAppointmentForm as Appointment}
            item={data.selectedItem!}
            items={data.items}
            isReducedVersion={modalsState.selectedAppointmentForm?.id === 0 || modalsState.selectedAppointmentForm?.id === -1}
            employees={data.employees}
            HALF_DAY_INTERVALS={config.HALF_DAY_INTERVALS}
            isFullDay={config.isFullDay}
            nonWorkingDates={config.nonWorkingDates}
            onSave={handlers.saveAppointment}
            onClose={() => handlers.closeModal()}
            handleOpenImageModal={handlers.openImageModalForEvent}
            onDirtyChange={setIsFormDirty}
            handleAddDimension={handlers.handleAddDimension}
            handleEditDimension={handlers.handleEditDimension}
          />
        )}
      </Modal>

      {/* --- SELECTEUR D'IMAGES --- */}
      <ImageSelectorContentModal
        images={data.availableImages}
        actualImage={config.viewType === 'employee-table' ? data.selectedEmployee?.image! : data.selectedItem?.image!}
        isOpen={modalsState.isImageSelectorOpen}
        onClose={handlers.closeImageModal}
        onImageSelect={handlers.handleImageSelect}
        onImageUpload={handlers.handleImageUpload}
        isUploading={data.isUploading}
        uploadError={data.uploadError}
      />

      {/* --- PARAMETRES --- */}
      <SettingsModal 
        onClose={handlers.closeSettings}
        settings={settings} 
        isSettingsOpen={modalsState.isSettingsOpen}
      />
      
      {/* --- CONFIGURATION VUES CALENDRIER --- */}
      <ConfigurationModal
        user={user}
        isOpen={modalsState.isConfigModalOpen}
        onClose={handlers.closeConfigModal}
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
      
      {/* --- FILTRES TABLEAUX --- */}
      <FilterModal
        title='Filtres avancés'
        isOpen={modalsState.isFilterModalOpen}
        onSubmit={handlers.submitFilters}
        onClose={handlers.closeFilterModal}
        filterConfig={data.filterConfig}
        onClearAll={handlers.clearFilters}
      />

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
                La rubrique <span className="font-semibold text-primary">{item.label}</span> ({item.code}) est déjà désactivée.
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
                label: "Supprimer définitivement",
                onClick: () => {
                  handlers.handleDeleteDimension?.(item.id, isUsedInPlanning);
                  handlers.setDeleteConfirmData?.(null);
                },
                variant: "primary",
                icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
                requiresConfirm: isUsedInPlanning,
                confirmMessage: isUsedInPlanning 
                  ? "⚠️ Êtes-vous sûr de vouloir supprimer cette rubrique ET tous les rendez-vous associés ? Cette action est irréversible."
                  : undefined
              },
              {
                label: "Annuler",
                onClick: () => handlers.setDeleteConfirmData?.(null),
                variant: "cancel"
              }
            ]
          };

          return (
            <DeleteModal
              isOpen={true}
              onClose={() => handlers.setDeleteConfirmData?.(null)}
              title="Suppression de rubrique"
              scenario={scenario}
            />
          );
        }

        // Scénario 2 : Rubrique active utilisée dans le planning
        if (isUsedInPlanning) {
          const scenario: DeleteScenario = {
            title: "Cette rubrique est actuellement utilisée dans le planning",
            description: (
              <>
                La rubrique <span className="font-semibold text-primary">{item.label}</span> ({item.code}) est liée à des rendez-vous existants.
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
                  handlers.handleDeactivateDimension?.(item.id);
                  handlers.setDeleteConfirmData?.(null);
                },
                variant: "secondary",
                icon: "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              },
              {
                label: "Supprimer tout (rubrique + RDV)",
                onClick: () => {
                  handlers.handleDeleteDimension?.(item.id, true);
                  handlers.setDeleteConfirmData?.(null);
                },
                variant: "primary",
                icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
                requiresConfirm: true,
                confirmMessage: "⚠️ Êtes-vous sûr de vouloir supprimer cette rubrique ET tous les rendez-vous associés ? Cette action est irréversible."
              },
              {
                label: "Annuler",
                onClick: () => handlers.setDeleteConfirmData?.(null),
                variant: "cancel"
              }
            ]
          };

          return (
            <DeleteModal
              isOpen={true}
              onClose={() => handlers.setDeleteConfirmData?.(null)}
              title="Suppression de rubrique"
              scenario={scenario}
            />
          );
        }

        // Scénario 3 : Rubrique active non utilisée
        const scenario: DeleteScenario = {
          title: "Confirmer la suppression",
          description: (
            <>
              Voulez-vous vraiment supprimer la rubrique <span className="font-semibold text-primary">{item.label}</span> ({item.code}) ?
            </>
          ),
          secondaryDescription: "Cette rubrique n'est pas utilisée dans le planning.",
          iconColor: "red",
          iconType: "trash",
          actions: [
            {
              label: "Supprimer",
              onClick: () => {
                handlers.handleDeleteDimension?.(item.id, false);
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
          <DeleteModal
            isOpen={true}
            onClose={() => handlers.setDeleteConfirmData?.(null)}
            title="Suppression de rubrique"
            scenario={scenario}
          />
        );
      })()}
    </>
  );
});