import { memo, useState, useMemo, useEffect, useRef, useCallback } from "react";
import Modal, { useModalContext } from "../Modal";
import {
  Appointment,
  Item,
  User,
} from "../../../types";
import { DaysManagementCategoryContent } from "./DaysManagement";
import { DisplaySettingsCategoryContent } from "./DisplaySettings";
import { MobileAppointmentFieldsCategoryContent } from "./MobileAppointmentFields";
import { CalendarConfigurationsEditor } from "./CalendarConfigurations";
import { TeamsManagementCategoryContent } from "./TeamsManagement";

type ControlPanelModalProps = {
  onClose: () => void;
  settings: any;
  isControlPanelModalOpen: boolean;
};

export type SaveAction = {
  isDirty: boolean;
  save: () => Promise<void>;
};

export const previewAppointment: Appointment = {
  IdPlanningEvenement: -1,
  AnnotationPlanningEvenement: "Prévoir le matériel nécessaire",
  DebutPlanningEvenement: new Date(2026, 8, 7).getTime(),
  FinPlanningEvenement: new Date(2026, 8, 7).getTime(),
  IdEmploye: 1,
  IdPlanningRessource: 1,
  EtapeValidation: "Validé",
  Etiquette: {
    IdPlanningEtiquette: 1,
    LibelleLongPlanningEtiquette: "Urgent",
  },
  isLocked: false,
};

export const previewItem = {
  IdPlanningRessource: 1,
  LibellePlanningRessource:
    "Construction de deux immeubles regroupant 41 logements : 19 en accession et 22 en location",
  CouleurFondPlanningRessource: "#d92e25",
  CouleurBordurePlanningRessource: "#841c17",
  CouleurTextePlanningRessource: "#2f0a08",
  CodePlanningRessource: "16894",
  Type: "Projet",
  ChefChantier: "MONNOT Romain",
  ChargeAffaire: "DECREUSE Vivien",
  AdresseChantier: "Rue Jean Wyrsch 25000 BESANCON",
  Identifiant: "41 lgt wyrsch",
  PoleActivite: "TRAVAUX CVC2",
} as unknown as Item;

export const previewEmployee: User = {
  IdPersonnel: 1,
  Nom: "Martin",
  Prenom: "Camille",
  PoleActivite: null,
  Type: "SALARIE",
  Equipe: null,
};




export const InlineSaveButton = ({
  isDirty,
  isSaving,
  onSave,
  className,
}: {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => Promise<void> | void;
  className?: string;
}) => {
  if (!isDirty && !isSaving) return null;

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      title="Enregistrer les modifications"
      className={`${className || ""} px-3 py-2 rounded-xl border border-default text-white hover:bg-primary-500-600 
      bg-primary-500 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
    >
      {isSaving ? (
        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <span>Enregistrer les modifications</span>
      )}
    </button>
  );
};


export const SelectSettingItem = ({
  setting,
  registerSaveAction,
}: {
  setting: any;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}) => {
  const [localValue, setLocalValue] = useState(setting.value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalValue(setting.value);
  }, [setting.value]);

  const isDirty = String(localValue) !== String(setting.value);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await setting.onChange(localValue);
    } finally {
      setIsSaving(false);
    }
  }, [localValue, setting]);

  useEffect(() => {
    const actionId = String(setting.id || setting.label || "select-setting");
    registerSaveAction(actionId, { isDirty, save: handleSave });
    return () => registerSaveAction(actionId, null);
  }, [setting.id, setting.label, isDirty, handleSave, registerSaveAction]);

  return (
    <div className={`flex flex-col gap-2 w-full${setting.classNameContainer || ""}`}>
      <label htmlFor={setting.id} className={"text-sm font-medium text-primary " + (setting.classNameLabel || "")}>
        {setting.label}
      </label>
      <div className="flex items-center gap-2.5">
        <select
          id={setting.id}
          className={
            "w-[270px] border border-default rounded-xl px-2 py-2 text-sm bg-transparent shadow-sm " +
            (setting.classNameSelect || "")
          }
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
        >
          {setting.options?.map((option: any) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <InlineSaveButton
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={handleSave}
          className={setting.classNameInlineSaveButton || ""}
        />
      </div>
    </div>
  );
};


const ControlPanelModalContent: React.FC<{
  onClose: () => void;
  settings: any;
  currentCategoryObj: any;
  apiError: string | null;
  setApiError: (err: string | null) => void;
  selectedDayTypeId: string | null;
  setSelectedDayTypeId: (id: string | null) => void;
  isAnyDirty: boolean;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
  handleFooterSave: () => Promise<void>;
  isSavingPending: boolean;
  onFormStateChange?: (isOpen: boolean) => void
}> = ({
  currentCategoryObj,
  apiError,
  setApiError,
  selectedDayTypeId,
  setSelectedDayTypeId,
  isAnyDirty,
  registerSaveAction,
  handleFooterSave,
  isSavingPending,
  onFormStateChange
}) => {
  const { handleCloseWithSave } = useModalContext();
  const categoryKey = currentCategoryObj?.key ?? currentCategoryObj?.id;

  const showFooterSave =
    (categoryKey === "mobileAppointmentFields" || categoryKey === "calendarConfigurations") &&
    (isAnyDirty || isSavingPending);

  const renderCategoryContent = () => {
    switch (categoryKey) {
      case "daysManagement":
        return (
          <DaysManagementCategoryContent
            categoryObj={currentCategoryObj}
            selectedDayTypeId={selectedDayTypeId}
            setSelectedDayTypeId={setSelectedDayTypeId}
            setApiError={setApiError}
            registerSaveAction={registerSaveAction}
          />
        );

      case "mobileAppointmentFields":
        return (
          <MobileAppointmentFieldsCategoryContent
            categoryObj={currentCategoryObj}
            registerSaveAction={registerSaveAction}
          />
        );

      case "calendarConfigurations": {
        const configSetting = currentCategoryObj.items?.find(
          (item: any) => item.type === "calendar-configurations"
        );
        return configSetting ? (
          <CalendarConfigurationsEditor
            setting={configSetting}
            onFormStateChange={onFormStateChange}
            registerSaveAction={registerSaveAction}
          />
        ) : null;
      }

      case "displaySettings":
        return (
          <DisplaySettingsCategoryContent
            categoryObj={currentCategoryObj}
            registerSaveAction={registerSaveAction}
          />
        );

      case "teamsManagement":
        return (
          <TeamsManagementCategoryContent
            categoryObj={currentCategoryObj}
            setApiError={setApiError}
            registerSaveAction={registerSaveAction}
          />
        );
      default:
        return (
          <div className="space-y-6 flex-1">
            {currentCategoryObj.items?.map((setting: any, settingIdx: number) => (
              <div
                key={setting.id}
                className={`flex flex-col lg:flex-row justify-between lg:items-center ${
                  settingIdx !== currentCategoryObj.items.length - 1
                    ? "border-b border-ultra-light pb-4"
                    : ""
                }`}
              >
                {setting.type === "select" ? (
                  <SelectSettingItem setting={setting} registerSaveAction={registerSaveAction} />
                ) : (
                  <input
                    id={setting.id}
                    type={setting.type}
                    className="border border-default rounded-xl px-4 py-3 text-sm bg-transparent shadow-sm w-48"
                    value={setting.value}
                    onChange={(e) => setting.onChange(e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 poppins gap-4">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="bg-secondary shadow-sm flex flex-col min-h-0 overflow-y-auto flex-1">
          {currentCategoryObj && (
            <div className="flex flex-col h-full min-h-0">
              {apiError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-700 text-sm poppins shadow-sm shrink-0">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{apiError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApiError(null)}
                    className="text-red-400 hover:text-red-600 transition-colors cursor-pointer p-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {renderCategoryContent()}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex justify-end pt-3 border-t border-ultra-light shrink-0 gap-3">
        <button
          type="button"
          className={`px-8 py-3 rounded-xl active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md cursor-pointer ${
            showFooterSave
              ? "bg-secondary border border-light text-primary hover:bg-secondary/10"
              : "bg-primary-500 text-white hover:bg-primary-600"
          }`}
          onClick={handleCloseWithSave}
          disabled={isSavingPending}
        >
          Fermer
        </button>

        {showFooterSave && (
          <button
            type="button"
            className="px-8 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-500-600 active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 min-w-[220px]"
            onClick={handleFooterSave}
            disabled={isSavingPending}
          >
            {isSavingPending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>Sauvegarder les modifications</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const ControlPanelModal: React.FC<ControlPanelModalProps> = ({ onClose, isControlPanelModalOpen, settings }) => {
  const [activeCategory] = useState<string>(() => {
    return sessionStorage.getItem("activeSettingsCategory") || settings?.[0]?.key || "";
  });

  const [isCalendarFormOpen, setIsCalendarFormOpen] = useState(false);
  const [selectedDayTypeId, setSelectedDayTypeId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSavingPending, setIsSavingPending] = useState(false);

  const saveCallbacksRef = useRef<Record<string, () => Promise<void>>>({});
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});

  const currentCategoryObj = useMemo(() => {
    return settings.find((cat: any) => cat.key === activeCategory) || settings[0];
  }, [settings, activeCategory]);

  const registerSaveAction = useCallback((id: string, action: SaveAction | null) => {
    if (!action) {
      delete saveCallbacksRef.current[id];
      setDirtyMap((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    saveCallbacksRef.current[id] = action.save;
    const nextDirty = Boolean(action.isDirty);

    setDirtyMap((prev) => {
      if (prev[id] === nextDirty) return prev;
      return { ...prev, [id]: nextDirty };
    });
  }, []);

  const isAnyDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);

  useEffect(() => {
    if (!isControlPanelModalOpen) {
      setApiError(null);
      setSelectedDayTypeId(null);
      setIsCalendarFormOpen(false);
    }
  }, [isControlPanelModalOpen]);

  const handleSaveAll = useCallback(async () => {
    const dirtyIds = Object.entries(dirtyMap)
      .filter(([, isDirty]) => isDirty)
      .map(([id]) => id);

    if (dirtyIds.length === 0) return;

    setIsSavingPending(true);
    setApiError(null);
    try {
      await Promise.all(dirtyIds.map((id) => saveCallbacksRef.current[id]?.()));
    } catch (error: any) {
      setApiError(error?.message || "Erreur lors de la sauvegarde.");
      throw error;
    } finally {
      setIsSavingPending(false);
    }
  }, [dirtyMap]);

  const modalWidthClass = useMemo(() => {
    switch (currentCategoryObj?.key) {
      case "daysManagement":
        return "w-[min(98vw,1500px)] max-h-[600px]!";
      case "teamsManagement":
        return "w-[min(98vw,1200px)] max-h-[600px]!";
      case "mobileAppointmentFields":
        return "w-[min(95vw,1400px)]";
      case "calendarConfigurations":
        return isCalendarFormOpen
          ? "w-[min(96vw,1300px)] h-[90vh]"
          : "w-[min(95vw,620px)]";
      default:
        return "w-[min(95vw,607px)]";
    }
  }, [currentCategoryObj?.key, isCalendarFormOpen]);

  return (
    <Modal
      isOpen={isControlPanelModalOpen}
      onClose={onClose}
      title={currentCategoryObj?.category || "Paramètres"}
      className={`${modalWidthClass} max-h-[750px] overflow-hidden flex flex-col transition-all duration-300`}
      classNameContent="flex-1 overflow-hidden p-4 flex flex-col min-h-0"
      confirmCloseOnOverlay={(currentCategoryObj?.hasUnsavedChanges ?? true) && isAnyDirty}
      onSave={handleSaveAll}
    >
      <ControlPanelModalContent
        onClose={onClose}
        settings={settings}
        currentCategoryObj={currentCategoryObj}
        apiError={apiError}
        setApiError={setApiError}
        selectedDayTypeId={selectedDayTypeId}
        setSelectedDayTypeId={setSelectedDayTypeId}
        isAnyDirty={isAnyDirty}
        registerSaveAction={registerSaveAction}
        handleFooterSave={handleSaveAll}
        isSavingPending={isSavingPending}
        onFormStateChange={setIsCalendarFormOpen}
      />
    </Modal>
  );
};
export default memo(ControlPanelModal);