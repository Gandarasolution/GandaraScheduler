import React, { memo, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { 
  Modal, 
  AppointmentForm, 
  ImageSelectorContentModal, 
  SettingsModal, 
  ConfigurationModal, 
  FilterModal 
} from '@/app/calendrier/components';
import { Appointment, Item, Employee, CalendarConfig, Image } from '../../types';
import { ActiveFilters } from '../../utils/searchAndFilterUtils';
import { RepeatData } from '../../hooks/useAppointmentLogic';

interface CalendarModalsProps {
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
  };
  handlers: {
    closeModal: () => void;
    saveAppointment: (app: Appointment, evt: Item, includeNonWork: boolean) => void;
    handleAddDimension: (dimension: Item) => void;
    handleEditDimension: (dimension: Item) => void;
    
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
    employees: Employee[];
    selectedItem: Item | null;
    selectedEmployee: Employee | null;
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
        {
          id: "includeWeekend", 
          label: "Autoriser la planification sur les week-ends", 
          type: "checkbox",
          value: config.includeWeekend,
          onChange: config.setIncludeWeekend,
        },
        {
          id: "respectNonWorkingDays", 
          label: "Respecter les jours non travaillés", 
          type: "checkbox",
          value: config.respectNonWorkingDays,
          onChange: config.setRespectNonWorkingDays,
        },
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
        return modalsState.selectedAppointmentForm.id === 0 ? "Modification Évènement" : "Modifier le rendez-vous";
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
    </>
  );
});