import { memo, useState, useMemo, useEffect, useRef, useCallback } from "react";
import Modal, { useModalContext } from "./Modal";
import Loader from "../ui/Loader";
import { format, isBefore, startOfDay } from "date-fns";
import {
  Appointment,
  CalendarConfig,
  DayType,
  GroupingLevel,
  ImageType,
  Item,
  MobileAppointmentDisplayConfig,
  User,
} from "../../types";
import { DisplaySettings } from "@/app/service/displaySettings.service";
import {
  AppointmentCard,
  DragOverTarget,
  MobileAppointmentFieldOption,
} from "../Calendar/MobileCalendar/AppointmentList";
import { AppointmentItem, ColorHexInput, Combobox, normalizeColorForInput } from "../index";
import { calendarConfigService, employeeService } from "@/app/service";
import { useAuth } from "../../hooks/utils/AuthContext";
import { 
  Lock, 
} from "lucide-react";
import { GroupIcon } from "@/app/calendrier";

type SettingsModalProps = {
  onClose: () => void;
  settings: any;
  isSettingsOpen: boolean;
};

type SaveAction = {
  isDirty: boolean;
  save: () => Promise<void>;
};

const previewAppointment: Appointment = {
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

const previewItem = {
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

const previewEmployee: User = {
  IdPersonnel: 1,
  Nom: "Martin",
  Prenom: "Camille",
  PoleActivite: null,
  Type: "SALARIE",
  Equipe: null,
};

type FieldColumn = "primaryFields" | "secondaryFields";
type FieldRows = Record<FieldColumn, string[][]>;
const MAX_SECONDARY_FIELDS = 2;
const MAX_FIELDS_PER_PRIMARY_ROW = 3;
const MAX_TITLE_REGULAR_FIELDS = 2;
const MAX_TITLE_SPECIAL_FIELDS = 1;
const MAX_PRIMARY_ROWS = 5;

const Spinner = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) => {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
  return (
    <svg className={`animate-spin ${sizes[size]} ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

const isSpecialField = (field: string, options: MobileAppointmentFieldOption[]) =>
  options.find((option) => option.Code === field)?.CaractereSpecial === true;

const countRegularFields = (row: string[], options: MobileAppointmentFieldOption[], excludedField?: string) =>
  row.filter((field) => field !== excludedField).length;

const isTitleRowFull = (row: string[], options: MobileAppointmentFieldOption[], draggedField?: string) => {
  const currentFields = row.filter((field) => field !== draggedField);
  const specialCount = currentFields.filter((field) => isSpecialField(field, options)).length;
  const regularCount = currentFields.length - specialCount;

  if (!draggedField) {
    return regularCount >= MAX_TITLE_REGULAR_FIELDS && specialCount >= MAX_TITLE_SPECIAL_FIELDS;
  }

  return isSpecialField(draggedField, options)
    ? specialCount >= MAX_TITLE_SPECIAL_FIELDS
    : regularCount >= MAX_TITLE_REGULAR_FIELDS;
};

const getFieldRows = (
  value: MobileAppointmentDisplayConfig,
  options: MobileAppointmentFieldOption[] = []
): FieldRows => {
  const primaryFields = value.primaryFieldRows?.length
    ? value.primaryFieldRows.slice(0, MAX_PRIMARY_ROWS).map((row, index) => {
        if (index !== 0) return row.slice(0, MAX_FIELDS_PER_PRIMARY_ROW);

        let regularCount = 0;
        let specialCount = 0;
        return row.filter((field) => {
          if (isSpecialField(field, options)) {
            if (specialCount >= MAX_TITLE_SPECIAL_FIELDS) return false;
            specialCount += 1;
          } else {
            if (regularCount >= MAX_TITLE_REGULAR_FIELDS) return false;
            regularCount += 1;
          }
          return true;
        });
      })
    : value.primaryFields.map((field) => [field]);

  const secondarySourceRows = value.secondaryFieldRows?.length
    ? value.secondaryFieldRows
    : value.secondaryFields.map((field) => [field]);

  const secondaryFields = secondarySourceRows.slice(0, 5).map((row) => row.slice(0, MAX_SECONDARY_FIELDS));

  return {
    primaryFields,
    secondaryFields,
  };
};

const flattenFieldRows = (rows: string[][]) => rows.flat();

const InlineSaveButton = ({
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
      className={`${className || ""} px-3 py-2 rounded-xl border border-default text-white hover:bg-primary-600 
      bg-primary text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
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

const SelectSettingItem = ({
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

const DefaultDisplaySettingsEditor = ({
  setting,
  registerSaveAction,
}: {
  setting: {
    id?: string;
    value: DisplaySettings | null;
    fetchDisplaySettings: () => Promise<{ success: boolean; message?: string }>;
    onChange: (value: DisplaySettings) => Promise<{ success: boolean; message?: string }>;
    onSelectImage: (onSelect: (image: ImageType) => void, actualImage?: ImageType) => void;
    onApplyToAllEvents?: (value: DisplaySettings) => Promise<{ success: boolean; message?: string }>;
  };
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}) => {
  const [localValue, setLocalValue] = useState<DisplaySettings | null>(setting.value);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(
    setting.value ? JSON.stringify(setting.value) : null
  );
  const [isLoading, setIsLoading] = useState(!setting.value);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!setting.value) {
      setIsLoading(true);
      setting
        .fetchDisplaySettings()
        .then((result) => {
          if (mounted && !result.success) setError(result.message || "Erreur lors du chargement.");
        })
        .catch((err: any) => {
          if (mounted) setError(err?.message || "Erreur lors du chargement.");
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [setting.value, setting.fetchDisplaySettings]);

  useEffect(() => {
    if (!setting.value) return;
    const serialized = JSON.stringify(setting.value);
    if (serialized !== savedSnapshot) {
      setSavedSnapshot(serialized);
      setLocalValue(setting.value);
    }
  }, [setting.value, savedSnapshot]);

  const isDirty = !!localValue && JSON.stringify(localValue) !== savedSnapshot;

  const save = useCallback(async () => {
    if (!localValue) return;
    const result = await setting.onChange(localValue);
    if (!result.success) {
      throw new Error(result.message || "Erreur lors de la sauvegarde.");
    }
    setSavedSnapshot(JSON.stringify(localValue));
  }, [localValue, setting]);

  useEffect(() => {
    const actionId = String(setting.id || "default-display-settings");
    registerSaveAction(actionId, { isDirty, save });
    return () => registerSaveAction(actionId, null);
  }, [setting.id, isDirty, save, registerSaveAction]);

  const handleInlineSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await save();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateColor = (
    key: keyof Pick<
      DisplaySettings,
      "CouleurBordureParDefaut" | "CouleurFondParDefaut" | "CouleurTexteParDefaut"
    >,
    value: string
  ) => {
    setLocalValue((previous) => (previous ? { ...previous, [key]: value } : previous));
  };

  const handleConfirmApplyToAllEvents = async () => {
    if (!localValue || !setting.onApplyToAllEvents) return;

    setIsConfirmOpen(false);
    setIsApplying(true);
    setError(null);

    try {
      if (isDirty) {
        await save();
      }
      const result = await setting.onApplyToAllEvents(localValue);
      if (!result.success) {
        setError(result.message || "Erreur lors de l'application à tous les événements.");
      } else {
        setSavedSnapshot(JSON.stringify(localValue));
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'application à tous les événements.");
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) return <Loader message="Chargement des options d’affichage..." />;
  if (!localValue) {
    return <p className="text-sm text-red-600">{error || "Options d’affichage indisponibles."}</p>;
  }

  const image = localValue.ImageParDefaut;
  const selectedImage: ImageType | undefined = image ? { id: Number(image.id), image: image.url } : undefined;

  const handleOpenImagePicker = () => {
    setting.onSelectImage((selected) => {
      setLocalValue((previous) =>
        previous
          ? {
              ...previous,
              ImageParDefaut: { id: selected.id, url: selected.image },
            }
          : previous
      );
    }, selectedImage);
  };

  return (
    <div className="space-y-5 w-full">
      <div>
        <h4 className="text-sm font-semibold text-primary">Définition l’apparence par défaut des chantiers</h4>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-row items-center gap-4">
        <div className="flex items-center gap-2.5 pb-1">
          <button
            type="button"
            onClick={handleOpenImagePicker}
            title="Choisir une image par défaut"
            className="w-10 h-10 rounded border border-default overflow-hidden bg-secondary-bg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-sm flex-shrink-0"
          >
            {image ? (
              <img src={image.url} alt="Image par défaut" className="w-full h-full object-contain" />
            ) : (
              <svg className="w-3.5 h-3.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-2.5 max-w-xs">
          <ColorHexInput
            id="default-color-fond"
            label="Couleur de fond"
            value={localValue.CouleurFondParDefaut}
            fallbackColor="#1E40AF"
            onChange={(val) => updateColor("CouleurFondParDefaut", val)}
          />

          <ColorHexInput
            id="default-color-bordure"
            label="Couleur de bordure"
            value={localValue.CouleurBordureParDefaut}
            fallbackColor="#1E40AF"
            onChange={(val) => updateColor("CouleurBordureParDefaut", val)}
          />

          <ColorHexInput
            id="default-color-texte"
            label="Couleur de texte"
            value={localValue.CouleurTexteParDefaut}
            fallbackColor="#FFFFFF"
            onChange={(val) => updateColor("CouleurTexteParDefaut", val)}
          />
        </div>

        <div className="pb-0.5 ml-auto">
          <InlineSaveButton isDirty={isDirty} isSaving={isSaving} onSave={handleInlineSave} className="w-full" />
          {setting.onApplyToAllEvents && (
            <div className="pt-2">
              <button
                type="button"
                disabled={isApplying}
                onClick={() => setIsConfirmOpen(true)}
                className="
                  px-3 py-2 rounded-xl border border-default text-white hover:bg-primary-600 
                  bg-primary text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isApplying ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  "Appliquer à tous les chantier"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <AppointmentItem
        appointment={{
          ...previewAppointment,
        }}
        event={{
          ...previewItem,
          CouleurFondPlanningRessource: localValue.CouleurFondParDefaut,
          CouleurBordurePlanningRessource: localValue.CouleurBordureParDefaut,
          CouleurTextePlanningRessource: localValue.CouleurTexteParDefaut,
        }}
        isFullDay={true}
        source={"demo"}
        isMobile={false}
        isDisplayWeekend={false}
        chargeeAffaire={previewItem && previewItem?.Type === "Projet" ? previewItem?.ChargeAffaire : ""}
        onDoubleClick={() => {}}
        onAppointmentResize={() => {}}
        handleContextMenu={() => {}}
        tagPlacement={localStorage.getItem("tagPlacement") as "hover" | "fixed" | undefined}
        mainScrollRef={null}
      />

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="w-full max-w-sm rounded-2xl border border-default bg-primary-bg dark:bg-neutral-900 p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 id="confirm-modal-title" className="text-base font-semibold text-primary">
                Confirmation
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Voulez-vous vraiment appliquer ces paramètres d&apos;affichage à tous les événements existants ?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-default text-primary hover:bg-secondary-bg text-xs font-medium cursor-pointer transition-colors"
              >
                Non
              </button>
              <button
                type="button"
                onClick={handleConfirmApplyToAllEvents}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity"
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MobileDisplayEditor = ({
  setting,
  registerSaveAction,
}: {
  setting: any;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}) => {
  const initialFieldRows = getFieldRows(setting.value, setting.options || []);
  const [localValue, setLocalValue] = useState<MobileAppointmentDisplayConfig>({
    ...setting.value,
    primaryFields: flattenFieldRows(initialFieldRows.primaryFields),
    secondaryFields: flattenFieldRows(initialFieldRows.secondaryFields),
    primaryFieldRows: initialFieldRows.primaryFields,
    secondaryFieldRows: initialFieldRows.secondaryFields,
  });

  const [draggedItem, setDraggedItem] = useState<{
    column: "primaryFields" | "secondaryFields" | "available";
    fieldCode: string;
  } | null>(null);

  const [dragOverInfo, setDragOverInfo] = useState<DragOverTarget>(null);
  const [highlightedFieldCode, setHighlightedFieldCode] = useState<string | null>(null);

  const [isLoadingOptions, setIsLoadingOptions] = useState(typeof setting.fetchFieldOptions === "function");
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const hasFetchedOptions = useRef(false);

  useEffect(() => {
    if (typeof setting.fetchFieldOptions === "function" && !hasFetchedOptions.current) {
      hasFetchedOptions.current = true;
      setIsLoadingOptions(true);

      setting
        .fetchFieldOptions()
        .then((res: any) => {
          if (res && !res.success && res.message) {
            setOptionsError(res.message);
          }
        })
        .catch((err: any) => {
          setOptionsError(err?.message || "Erreur lors du chargement des champs disponibles.");
        })
        .finally(() => {
          setIsLoadingOptions(false);
        });
    }
  }, [setting]);

  useEffect(() => {
    const fieldRows = getFieldRows(setting.value, setting.options || []);
    setLocalValue({
      ...setting.value,
      primaryFields: flattenFieldRows(fieldRows.primaryFields),
      secondaryFields: flattenFieldRows(fieldRows.secondaryFields),
      primaryFieldRows: fieldRows.primaryFields,
      secondaryFieldRows: fieldRows.secondaryFields,
    });
  }, [setting.value]);

  const isDirty =
    JSON.stringify(localValue.primaryFields) !== JSON.stringify(setting.value.primaryFields) ||
    JSON.stringify(localValue.secondaryFields) !== JSON.stringify(setting.value.secondaryFields);

  const handleSave = useCallback(async () => {
    if (typeof setting.onChange === "function") {
      await setting.onChange(localValue);
    }
  }, [localValue, setting]);

  useEffect(() => {
    const actionId = String(setting.id || "mobile-appointment-fields");
    registerSaveAction(actionId, { isDirty, save: handleSave });
    return () => registerSaveAction(actionId, null);
  }, [setting.id, isDirty, handleSave, registerSaveAction]);

  const { normalAvailableOptions, specialAvailableOptions, totalAvailableCount } = useMemo(() => {
    const allOptions = (setting.options || []) as MobileAppointmentFieldOption[];

    const unassigned = allOptions.filter((opt) => {
      const inPrimary = localValue.primaryFields.includes(opt.Code);
      const inSecondary = localValue.secondaryFields.includes(opt.Code);
      return !(inPrimary && inSecondary);
    });

    const normal = unassigned.filter((opt) => !opt.CaractereSpecial);
    const special = unassigned.filter((opt) => opt.CaractereSpecial);

    return {
      normalAvailableOptions: normal,
      specialAvailableOptions: special,
      totalAvailableCount: unassigned.length,
    };
  }, [setting.options, localValue]);

  const removeField = (column: "primaryFields" | "secondaryFields", fieldCode: string) => {
    setLocalValue((prev) => {
      const rows = getFieldRows(prev, setting.options || [])[column]
        .map((row) => row.filter((field) => field !== fieldCode))
        .filter((row) => row.length > 0);
      return {
        ...prev,
        [column]: flattenFieldRows(rows),
        [`${column === "primaryFields" ? "primary" : "secondary"}FieldRows`]: rows,
      };
    });
  };

  const addRow = (column: FieldColumn) => {
    setLocalValue((prev) => {
      const rows = getFieldRows(prev, setting.options || [])[column];
      if (rows.length >= (column === "primaryFields" ? MAX_PRIMARY_ROWS : 5)) return prev;
      return {
        ...prev,
        [`${column === "primaryFields" ? "primary" : "secondary"}FieldRows`]: [...rows, []],
      };
    });
  };

  const removeRow = (column: FieldColumn, rowIndex: number) => {
    setLocalValue((prev) => {
      const rows = getFieldRows(prev, setting.options || [])[column].filter((_, idx) => idx !== rowIndex);
      return {
        ...prev,
        [column]: flattenFieldRows(rows),
        [`${column === "primaryFields" ? "primary" : "secondary"}FieldRows`]: rows,
      };
    });
  };

  const handlePreviewDrop = (
    event: React.DragEvent<HTMLDivElement>,
    column: "primaryFields" | "secondaryFields",
    targetRowIndex?: number,
    targetFieldCode?: string,
    insertRow = false
  ) => {
    event.preventDefault();
    const fieldCode = (event.dataTransfer.getData("text/plain") || draggedItem?.fieldCode) as string;

    if (!fieldCode) return;

    if (fieldCode === targetFieldCode && draggedItem?.column === column) {
      setDraggedItem(null);
      setDragOverInfo(null);
      return;
    }

    setLocalValue((prev) => {
      let primaryRows = getFieldRows(prev, setting.options || []).primaryFields;
      let secondaryRows = getFieldRows(prev, setting.options || []).secondaryFields;

      if (column === "primaryFields") {
        primaryRows = primaryRows.map((row) => row.filter((f) => f !== fieldCode));
      } else {
        secondaryRows = secondaryRows.map((row) => row.filter((f) => f !== fieldCode));
      }

      if (draggedItem?.column === column) {
        if (column === "primaryFields") {
          primaryRows = primaryRows.map((row) => row.filter((f) => f !== fieldCode));
        } else {
          secondaryRows = secondaryRows.map((row) => row.filter((f) => f !== fieldCode));
        }
      }

      let targetRows = column === "primaryFields" ? primaryRows : secondaryRows;

      const rowIndex = targetRowIndex ?? (targetRows.length > 0 ? targetRows.length - 1 : 0);

      if (insertRow) {
        const maxRows = column === "primaryFields" ? MAX_PRIMARY_ROWS : 5;
        if (targetRows.length >= maxRows) return prev;
        targetRows.splice(Math.max(0, Math.min(rowIndex, targetRows.length)), 0, []);
      }

      if (!targetRows[rowIndex]) {
        targetRows[rowIndex] = [];
      }

      const currentRow = targetRows[rowIndex];

      const options = setting.options || [];
      const rowIsFull =
        column === "primaryFields" && rowIndex === 0
          ? isTitleRowFull(currentRow, options, fieldCode)
          : column === "primaryFields"
            ? countRegularFields(currentRow, options, fieldCode) >= MAX_FIELDS_PER_PRIMARY_ROW
            : countRegularFields(currentRow, options, fieldCode) >= MAX_SECONDARY_FIELDS;
      if (rowIsFull) {
        return prev;
      }

      if (targetFieldCode) {
        const insertIndex = currentRow.indexOf(targetFieldCode);
        if (insertIndex !== -1) {
          currentRow.splice(insertIndex, 0, fieldCode);
        } else {
          currentRow.push(fieldCode);
        }
      } else {
        currentRow.push(fieldCode);
      }

      primaryRows = primaryRows.filter((row) => row.length > 0);
      secondaryRows = secondaryRows.filter((row) => row.length > 0);

      return {
        ...prev,
        primaryFields: flattenFieldRows(primaryRows),
        primaryFieldRows: primaryRows,
        secondaryFields: flattenFieldRows(secondaryRows),
        secondaryFieldRows: secondaryRows,
      };
    });

    setDraggedItem(null);
    setDragOverInfo(null);
  };

  if (isLoadingOptions) {
    return (
      <div className="w-full flex items-center justify-center min-h-[300px] bg-secondary-bg/40 rounded-xl border border-dashed border-light">
        <Loader size="md" message="Chargement des champs..." />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3 poppins">
      {optionsError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">{optionsError}</div>
      )}

      <div className="flex flex-col gap-3 h-full">
        <div className="rounded-xl border border-default bg-secondary-bg/50 p-2.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-secondary">
              Champs disponibles ({totalAvailableCount})
            </span>
          </div>

          <div>
            <span className="text-[10px] font-medium text-secondary uppercase tracking-wider block mb-1">
              Champs standards ({normalAvailableOptions.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {normalAvailableOptions.map((option) => (
                <div
                  key={option.Code}
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    setDraggedItem({ column: "available", fieldCode: option.Code });
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", option.Code);
                  }}
                  onMouseEnter={() => setHighlightedFieldCode(option.Code)}
                  onMouseLeave={() => setHighlightedFieldCode(null)}
                  className={`flex cursor-grab items-center gap-1 rounded-lg border border-dashed border-default bg-primary-bg px-2 py-1 text-xs text-primary shadow-2xs active:cursor-grabbing hover:border-primary transition-colors ${
                    highlightedFieldCode === option.Code ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                >
                  <span className="font-medium truncate">{option.Libelle}</span>
                </div>
              ))}
              {normalAvailableOptions.length === 0 && (
                <span className="text-[11px] text-secondary/60 italic">Aucun champ standard</span>
              )}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-medium text-secondary uppercase tracking-wider block mb-1">
              Caractères / Séparateurs ({specialAvailableOptions.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {specialAvailableOptions.map((option) => (
                <div
                  key={option.Code}
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    setDraggedItem({ column: "available", fieldCode: option.Code });
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", option.Code);
                  }}
                  onMouseEnter={() => setHighlightedFieldCode(option.Code)}
                  onMouseLeave={() => setHighlightedFieldCode(null)}
                  className={`flex cursor-grab items-center gap-1 rounded-lg border border-dashed border-default bg-primary-bg px-2 py-1 text-xs text-primary shadow-2xs active:cursor-grabbing hover:border-primary transition-colors ${
                    highlightedFieldCode === option.Code ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                >
                  <span className="font-medium truncate">{option.Libelle}</span>
                </div>
              ))}
              {specialAvailableOptions.length === 0 && (
                <span className="text-[11px] text-secondary/60 italic">Aucun caractère spécial</span>
              )}
            </div>
          </div>

          <div className="mt-2 text-[11px] text-secondary">
            Organisez les informations de la carte mobile. Glissez un champ directement sur la carte pour l&apos;insérer
            à l&apos;endroit désigné par la barre verticale.
          </div>
        </div>

        <div className="rounded-xlbg-secondary-bg/40 space-y-3 h-full">
          <div className="flex items-center gap-2 pb-1.5 border-b border-ultra-light"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-light bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary">Concepteur d’affichage</span>
                <button
                  type="button"
                  onClick={() => addRow("primaryFields")}
                  className="cursor-pointer px-2 py-0.5 rounded border border-dashed border-primary/40 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  + Ligne
                </button>
              </div>

              <AppointmentCard
                app={previewAppointment}
                items={[previewItem]}
                employees={[previewEmployee]}
                mobileAppointmentFieldOptions={setting.options || []}
                preview
                showFieldNamesCard
                fieldNamesColumn="primaryFields"
                draggedFieldCode={draggedItem?.fieldCode}
                dragOverInfo={dragOverInfo}
                highlightedFieldCode={highlightedFieldCode || undefined}
                onFieldDragStart={(e, column, fieldCode) => {
                  setDraggedItem({ column, fieldCode });
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", fieldCode);
                }}
                onPreviewDragOver={(_, column, rowIndex, fieldCode, blocked, insertRow, surface) => {
                  setDragOverInfo({ column, rowIndex, fieldCode, blocked, insertRow, surface });
                }}
                onPreviewDragLeave={() => setDragOverInfo(null)}
                onPreviewDrop={handlePreviewDrop}
                onRemoveField={removeField}
                onRemoveRow={(column, rowIndex) => removeRow(column, rowIndex)}
                displayConfig={{
                  primaryFields: flattenFieldRows(localValue.primaryFieldRows || []),
                  secondaryFields: [],
                  primaryFieldRows: localValue.primaryFieldRows,
                }}
                dragSurface="values"
              />
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-light bg-secondary/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary">Aperçu (secondaire)</span>
                <button
                  type="button"
                  onClick={() => addRow("secondaryFields")}
                  className="cursor-pointer px-2 py-0.5 rounded border border-dashed border-secondary/40 text-[10px] font-medium text-secondary hover:bg-secondary/10 transition-colors"
                >
                  + Ligne
                </button>
              </div>

              <AppointmentCard
                app={previewAppointment}
                items={[previewItem]}
                employees={[previewEmployee]}
                mobileAppointmentFieldOptions={setting.options || []}
                preview
                showCard={false}
                draggedFieldCode={draggedItem?.fieldCode}
                dragOverInfo={dragOverInfo}
                highlightedFieldCode={highlightedFieldCode || undefined}
                onFieldDragStart={(e, column, fieldCode) => {
                  setDraggedItem({ column, fieldCode });
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", fieldCode);
                }}
                onPreviewDragOver={(_, column, rowIndex, fieldCode, blocked, insertRow, surface) => {
                  setDragOverInfo({ column, rowIndex, fieldCode, blocked, insertRow, surface });
                }}
                onPreviewDragLeave={() => setDragOverInfo(null)}
                onPreviewDrop={handlePreviewDrop}
                onRemoveField={removeField}
                onRemoveRow={(column, rowIndex) => removeRow(column, rowIndex)}
                displayConfig={{
                  primaryFields: [],
                  secondaryFields: flattenFieldRows(localValue.secondaryFieldRows || []),
                  secondaryFieldRows: localValue.secondaryFieldRows,
                }}
                dragSurface="values"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewDayTypeForm = ({
  onAdd,
  setError,
}: {
  onAdd?: (newType: any) => Promise<{ success: boolean; message?: string }>;
  setError: (msg: string | null) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [Libelle, setLibelle] = useState("");
  const [CouleurFond, setCouleurFond] = useState("#2563eb");
  const [CouleurTexte, setCouleurTexte] = useState("#ffffff");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setLibelle("");
    setCouleurFond("#2563eb");
    setCouleurTexte("#ffffff");
    setIsBold(false);
    setIsItalic(false);
    setFormError(null);
  };

  const handleCreate = async () => {
    if (!Libelle.trim()) {
      setFormError("Le libellé est obligatoire.");
      return;
    }
    setFormError(null);
    setError(null);
    setIsSubmitting(true);

    try {
      if (onAdd) {
        const res = await onAdd({
          Libelle: Libelle.trim(),
          CouleurFond: normalizeColorForInput(CouleurFond),
          CouleurTexte: normalizeColorForInput(CouleurTexte),
          isBold: isBold,
          isItalic: isItalic,
        });

        if (res && res.success) {
          resetForm();
          setIsOpen(false);
        } else {
          setError(res?.message || "Erreur lors de la création du type de jour.");
        }
      }
    } catch (e: any) {
      setError(e?.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-sm poppins flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] shadow-sm mb-4 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Ajouter un type de jour
      </button>
    );
  }

  return (
    <div className="p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col gap-4 shadow-sm mb-4">
      <div className="flex items-center justify-between pb-2 border-b border-primary/20">
        <h4 className="text-sm font-semibold text-primary poppins flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nouveau type de jour
        </h4>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
          className="text-secondary hover:text-primary transition-colors p-1 cursor-pointer"
          title="Fermer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label htmlFor="newDayTypeLabel" className="text-xs text-secondary font-medium poppins">
              Libellé
            </label>
            <input
              id="newDayTypeLabel"
              type="text"
              value={Libelle}
              onChange={(e) => {
                setLibelle(e.target.value);
                if (formError) setFormError(null);
                setError(null);
              }}
              placeholder="Ex: Astreinte, Congé..."
              className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-xs bg-primary-bg shadow-sm hover:shadow-md w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-color-fond-hex" className="text-xs text-secondary font-medium poppins">
              Couleur Fond
            </label>
            <div className="flex items-center gap-1.5 bg-primary-bg border border-default rounded-xl p-1 shadow-sm">
              <label
                htmlFor="new-color-fond"
                className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
                style={{ backgroundColor: normalizeColorForInput(CouleurFond) }}
                title="Choisir couleur de fond"
              />
              <input
                id="new-color-fond"
                type="color"
                value={normalizeColorForInput(CouleurFond)}
                onChange={(e) => setCouleurFond(e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              />
              <input
                id="new-color-fond-hex"
                type="text"
                value={CouleurFond}
                onChange={(e) => setCouleurFond(e.target.value)}
                placeholder="#2563EB"
                className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-color-texte-hex" className="text-xs text-secondary font-medium poppins">
              Couleur Texte
            </label>
            <div className="flex items-center gap-1.5 bg-primary-bg border border-default rounded-xl p-1 shadow-sm">
              <label
                htmlFor="new-color-texte"
                className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
                style={{ backgroundColor: normalizeColorForInput(CouleurTexte, "#FFFFFF") }}
                title="Choisir couleur de texte"
              />
              <input
                id="new-color-texte"
                type="color"
                value={normalizeColorForInput(CouleurTexte, "#FFFFFF")}
                onChange={(e) => setCouleurTexte(e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              />
              <input
                id="new-color-texte-hex"
                type="text"
                value={CouleurTexte}
                onChange={(e) => setCouleurTexte(e.target.value)}
                placeholder="#FFFFFF"
                className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-secondary font-medium poppins">Style</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsBold((prev) => !prev)}
                title="Gras"
                className={`h-9 px-3.5 rounded-xl border text-sm font-black poppins transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                  isBold
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-primary-bg text-primary border-light hover:bg-secondary/10"
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => setIsItalic((prev) => !prev)}
                title="Italique"
                className={`h-9 px-3.5 rounded-xl border text-sm italic font-serif transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                  isItalic
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-primary-bg text-primary border-light hover:bg-secondary/10"
                }`}
              >
                I
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-secondary font-medium poppins">Aperçu</span>
            <div className="w-12 h-12 border border-light rounded-xl overflow-hidden shrink-0 shadow-sm bg-primary-bg">
              <div
                className="flex flex-col justify-center items-center h-full w-full text-center relative transition-all p-1"
                style={{
                  backgroundColor: normalizeColorForInput(CouleurFond, "#2563eb"),
                  color: normalizeColorForInput(CouleurTexte, "#ffffff"),
                  fontWeight: isBold ? "700" : "400",
                  fontStyle: isItalic ? "italic" : "normal",
                }}
              >
                <span className="block text-sm leading-none font-semibold">14</span>
                <span className="block text-[9px] opacity-80 uppercase tracking-wider mt-0.5">Lun.</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-xs font-medium poppins opacity-0 pointer-events-none select-none hidden sm:block">
              Action
            </span>
            <div className="flex items-center h-full">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                title="Valider la création"
                className="cursor-pointer bg-primary text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {formError && <p className="text-xs text-red-500 font-medium poppins">{formError}</p>}
    </div>
  );
};

const DayTypeSingleEditor = ({
  dayType,
  isSelected,
  onSelect,
  onUpdate,
  onCheckDelete,
  onDelete,
  setError,
  canDelete,
  canEdit,
  registerSaveAction,
}: {
  dayType: DayType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate?: (updated: any) => Promise<{ success: boolean; message?: string }>;
  onCheckDelete?: (id: number | string) => Promise<{ checkRequired: boolean; message?: string }>;
  onDelete?: (id: number | string, count: number) => Promise<{ success: boolean; message?: string }>;
  setError: (msg: string | null) => void;
  canDelete: boolean;
  canEdit: boolean;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}) => {
  const [localType, setLocalType] = useState(dayType);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    checkRequired: boolean;
    message: string;
    expectedCount: number | null;
  }>({
    isOpen: false,
    checkRequired: false,
    message: "",
    expectedCount: null,
  });

  const [confirmInput, setConfirmInput] = useState<string>("");

  useEffect(() => {
    setLocalType(dayType);
  }, [dayType]);

  const isDirty =
    localType.Libelle !== dayType.Libelle ||
    localType.CouleurFond !== dayType.CouleurFond ||
    localType.CouleurTexte !== dayType.CouleurTexte ||
    localType.isBold !== dayType.isBold ||
    localType.isItalic !== dayType.isItalic;

  const handleLabelChange = (value: string) => {
    setLocalType((prev: any) => ({ ...prev, Libelle: value }));
    setError(null);
  };

  const handleColorChange = (key: "CouleurFond" | "CouleurTexte", value: string) => {
    setLocalType((prev: any) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleToggle = (key: "isBold" | "isItalic") => {
    setLocalType((prev: any) => ({ ...prev, [key]: !prev[key] }));
    setError(null);
  };

  const handleSave = useCallback(async () => {
    if (!onUpdate || !canEdit) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await onUpdate({
        ...localType,
        CouleurFond: normalizeColorForInput(localType.CouleurFond),
        CouleurTexte: normalizeColorForInput(localType.CouleurTexte),
      });
      if (res && !res.success) {
        setError(res?.message || "Erreur lors de la mise à jour.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la mise à jour.");
    } finally {
      setIsSaving(false);
    }
  }, [onUpdate, canEdit, localType, setError]);

  const handleInitiateDelete = async () => {
    if (!canDelete) return;
    setError(null);
    setConfirmInput("");

    if (!onCheckDelete) {
      setDeleteModalState({
        isOpen: true,
        checkRequired: false,
        message: "",
        expectedCount: null,
      });
      return;
    }

    setIsCheckingDelete(true);

    try {
      const res = await onCheckDelete(dayType.Id);

      let parsedCount: number | null = null;
      if (res.checkRequired && res.message) {
        const match = res.message.match(/\d+/);
        if (match) {
          parsedCount = parseInt(match[0], 10);
        }
      }

      setDeleteModalState({
        isOpen: true,
        checkRequired: res.checkRequired,
        message: res.message || "",
        expectedCount: parsedCount,
      });
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la vérification de la suppression.");
    } finally {
      setIsCheckingDelete(false);
    }
  };

  const confirmDelete = async () => {
    if (!onDelete || !canDelete) return;

    const countToSend = deleteModalState.checkRequired ? parseInt(confirmInput, 10) || 0 : 0;

    setDeleteModalState((prev) => ({ ...prev, isOpen: false }));
    setIsDeleting(true);
    setError(null);

    try {
      const res = await onDelete(dayType.Id, countToSend);
      if (res && !res.success) {
        setError(res?.message || "Erreur lors de la suppression.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmDisabled =
    deleteModalState.checkRequired &&
    (deleteModalState.expectedCount !== null
      ? parseInt(confirmInput.trim(), 10) !== deleteModalState.expectedCount
      : !confirmInput.trim());

  useEffect(() => {
    const actionId = `day-type-${dayType.Id}`;
    registerSaveAction(actionId, { isDirty, save: handleSave });
    return () => registerSaveAction(actionId, null);
  }, [dayType.Id, isDirty, handleSave, registerSaveAction]);

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-wrap items-center justify-between gap-3 shadow-sm relative ${
        isSelected ? "border-primary bg-primary/10 " : "border-light bg-secondary/10 hover:border-primary/30"
      }`}
    >
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-primary-bg p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <h5 className="font-semibold text-sm text-primary poppins">Supprimer le type de jour ?</h5>
            </div>

            {deleteModalState.checkRequired ? (
              <div className="space-y-3">
                <p className="text-xs text-secondary leading-relaxed poppins font-medium">{deleteModalState.message}</p>
                <div className="space-y-1">
                  <label htmlFor={`confirmInput-${dayType.Id}`} className="text-[11px] text-secondary font-semibold poppins">
                    Veuillez saisir le nombre de jour(s) pour confirmer :
                  </label>
                  <input
                    id={`confirmInput-${dayType.Id}`}
                    type="number"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={
                      deleteModalState.expectedCount !== null
                        ? `Entrez ${deleteModalState.expectedCount}`
                        : "Nombre de jours"
                    }
                    className="w-full border border-default rounded-xl px-3 py-1.5 text-xs bg-primary-bg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-secondary leading-relaxed poppins">
                Êtes-vous sûr de vouloir supprimer le type de jour{" "}
                <strong className="text-primary">{dayType.Libelle}</strong> ? Cette action est irréversible.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer poppins"
                onClick={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isConfirmDisabled}
                className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer poppins"
                onClick={confirmDelete}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label htmlFor={`dayTypeLabelInput-${dayType.Id}`} className="text-xs text-secondary font-medium poppins">
            Libellé
          </label>
          <input
            id={`dayTypeLabelInput-${dayType.Id}`}
            type="text"
            value={localType.Libelle || ""}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Ex: Jour Férié..."
            className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-xs bg-primary-bg shadow-sm hover:shadow-md w-full"
            disabled={dayType.isLocked || !canEdit}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Couleur Fond</span>
          <div className="flex items-center gap-1.5 bg-primary-bg border border-default rounded-xl p-1 shadow-sm">
            <label
              htmlFor={`color-fond-${dayType.Id}`}
              className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
              style={{ backgroundColor: normalizeColorForInput(localType.CouleurFond, "#1E40AF") }}
              title="Changer couleur de fond"
            />
            <input
              id={`color-fond-${dayType.Id}`}
              type="color"
              value={normalizeColorForInput(localType.CouleurFond)}
              onChange={(e) => handleColorChange("CouleurFond", e.target.value)}
              className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              disabled={!canEdit}
            />
            <input
              type="text"
              value={localType.CouleurFond || ""}
              onChange={(e) => handleColorChange("CouleurFond", e.target.value)}
              placeholder="#1E40AF"
              className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Couleur Texte</span>
          <div className="flex items-center gap-1.5 bg-primary-bg border border-default rounded-xl p-1 shadow-sm">
            <label
              htmlFor={`color-texte-${dayType.Id}`}
              className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
              style={{ backgroundColor: normalizeColorForInput(localType.CouleurTexte, "#FFFFFF") }}
              title="Changer couleur de texte"
            />
            <input
              id={`color-texte-${dayType.Id}`}
              type="color"
              value={normalizeColorForInput(localType.CouleurTexte, "#FFFFFF")}
              onChange={(e) => handleColorChange("CouleurTexte", e.target.value)}
              className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              disabled={!canEdit}
            />
            <input
              type="text"
              value={localType.CouleurTexte || ""}
              onChange={(e) => handleColorChange("CouleurTexte", e.target.value)}
              placeholder="#FFFFFF"
              className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Style</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleToggle("isBold")}
              title="Gras"
              className={`${
                !canEdit ? "opacity-50 cursor-not-allowed" : ""
              } h-9 px-3.5 rounded-xl border text-sm font-black poppins transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                localType.isBold
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-primary-bg text-primary border-light hover:bg-secondary/10"
              }`}
              disabled={!canEdit}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => handleToggle("isItalic")}
              title="Italique"
              className={` ${
                !canEdit ? "opacity-50 cursor-not-allowed" : ""
              } h-9 px-3.5 rounded-xl border text-sm italic font-serif transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                localType.isItalic
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-primary-bg text-primary border-light hover:bg-secondary/10"
              }`}
              disabled={!canEdit}
            >
              I
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Aperçu</span>
          <div className="w-12 h-12 border border-light rounded-xl overflow-hidden shrink-0 shadow-sm bg-primary-bg">
            <div
              className="flex flex-col justify-center items-center h-full w-full text-center relative transition-all p-1"
              style={{
                backgroundColor: normalizeColorForInput(localType.CouleurFond, "#1E40AF"),
                color: normalizeColorForInput(localType.CouleurTexte, "#FFFFFF"),
                fontWeight: localType.isBold ? "700" : "400",
                fontStyle: localType.isItalic ? "italic" : "normal",
              }}
            >
              <span className="block text-xs leading-none font-semibold">14</span>
              <span className="block text-[9px] opacity-80 uppercase tracking-wider mt-0.5">Lun.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <span className="text-xs font-medium poppins opacity-0 pointer-events-none select-none hidden sm:block">
          Actions
        </span>

        <div className="flex items-center gap-2 h-full">
          {isDirty && canEdit ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              title="Enregistrer les modifications"
              className="cursor-pointer bg-primary text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ) : !dayType.isLocked || canDelete ? (
            <button
              type="button"
              onClick={handleInitiateDelete}
              disabled={isDeleting || isCheckingDelete}
              title="Supprimer ce type de jour"
              className="cursor-pointer bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
            >
              {isDeleting || isCheckingDelete ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onSelect}
            className={`px-3 py-2 rounded-xl text-xs font-semibold poppins transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isSelected
                ? "bg-primary text-white ring-2 ring-primary/20"
                : "bg-primary-bg border border-light hover:bg-primary/5 text-primary"
            }`}
          >
            <span>Voir les jours</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const NonWorkingDaysEditor = ({
  setting,
  selectedDayTypeId,
  setSelectedDayTypeId,
  canEdit,
  canDelete,
  canAdd,
}: {
  setting: any;
  selectedDayTypeId: string | null;
  setSelectedDayTypeId: (id: string | null) => void;
  canEdit: boolean;
  canDelete: boolean;
  canAdd: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYearsState, setAvailableYearsState] = useState<number[]>([]);
  const [newDate, setNewDate] = useState<string>("");
  const [newTypeId, setNewTypeId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingYear, setIsLoadingYear] = useState(false);
  const [deletingDates, setDeletingDates] = useState<Record<string, boolean>>({});
  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pendingDeleteDate, setPendingDeleteDate] = useState<{
    dateKey: string;
    id: number | string;
    formattedDate: string;
  } | null>(null);

  const [hasInteracted, setHasInteracted] = useState<boolean>(Boolean(selectedDayTypeId));
  const [filterType, setFilterType] = useState<string>(selectedDayTypeId || "all");

  useEffect(() => {
    if (selectedDayTypeId) {
      setHasInteracted(true);
      setFilterType(selectedDayTypeId);
      if (selectedDayTypeId !== "all") {
        setNewTypeId(selectedDayTypeId);
      }
    }
  }, [selectedDayTypeId]);

  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>("");
  const [editTypeIdValue, setEditTypeIdValue] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [pendingPastDateAction, setPendingPastDateAction] = useState<{
    type: "add" | "edit";
    dateStr: string;
    typeId: string;
    originalKey?: string;
    originalVal?: any;
  } | null>(null);

  const settingRef = useRef(setting);
  useEffect(() => {
    settingRef.current = setting;
  }, [setting]);

  useEffect(() => {
    const fetchYears = settingRef.current.getAvailablesYearForNonWorkingDate || settingRef.current.fetchAvailableYears;
    if (typeof fetchYears === "function") {
      fetchYears()
        .then((res: any) => {
          if (Array.isArray(res)) {
            setAvailableYearsState(res);
          } else if (res && res.success && Array.isArray(res.data)) {
            setAvailableYearsState(res.data);
          }
        })
        .catch(() => {});
    }
  }, []);

  const availableYears: number[] = useMemo(() => {
    if (availableYearsState.length > 0) return availableYearsState;
    if (setting.availableYears && setting.availableYears.length > 0) {
      return setting.availableYears;
    }
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, [availableYearsState, setting.availableYears]);

  useEffect(() => {
    const currentSetting = settingRef.current;
    const fetchDays = currentSetting.fetchNonWorkingDays || currentSetting.fetchNonWorkingDates;

    if (typeof fetchDays === "function") {
      setIsLoadingYear(true);
      setError(null);

      fetchDays(selectedYear)
        .then((res: any) => {
          if (res && !res.success && res.message) {
            setError(res.message);
          }
          if (res && res.data) {
            const nonWorkingDates = res.data.nonWorkingDates || [];
            const recordData = Object.fromEntries(
              nonWorkingDates.map(
                (item: { DatePlanningJourNontravaille: any; IdPlanningJourNontravaille: string; TypeJourCode: string }) => [
                  item.DatePlanningJourNontravaille,
                  { Id: Number(item.IdPlanningJourNontravaille), TypeJourCode: item.TypeJourCode },
                ]
              )
            );
            currentSetting.setNonWorkingDates(recordData);
          }
        })
        .catch((err: any) => {
          setError(err?.message || "Erreur lors de la récupération des jours.");
        })
        .finally(() => {
          setIsLoadingYear(false);
        });
    }
  }, [selectedYear, setError]);

  const filteredDates = useMemo(() => {
    const dates = setting.nonWorkingDates || {};
    return Object.entries(dates).filter(([dateKey, val]: [string, any]) => {
      const year = new Date(dateKey).getFullYear();
      const itemObj = typeof val === "object" ? val : { TypeJourCode: val };

      const matchYear = year === Number(selectedYear);
      const matchType = filterType === "all" || String(itemObj.TypeJourCode) === String(filterType);

      return matchYear && matchType;
    });
  }, [setting.nonWorkingDates, selectedYear, filterType]);

  const resetForm = () => {
    setNewDate("");
    setDateErrorMessage(null);
  };

  const executeAddDate = async (dateStr: string, typeId: string) => {
    if (!canAdd) return;
    const formattedInputDate = format(new Date(dateStr), "yyyy-MM-dd");

    setDateErrorMessage(null);
    setError(null);
    setIsAdding(true);

    const parsedDate = new Date(dateStr).getTime();

    try {
      if (setting.addNonWorkingDatesToPlanning) {
        const response = await setting.addNonWorkingDatesToPlanning(parsedDate, typeId);
        if (response && response.success && response.data) {
          setting.setNonWorkingDates((prev: any) => {
            const updated = {
              ...prev,
              [formattedInputDate]: {
                Id: Number(response.data),
                TypeJourCode: typeId,
              },
            };

            const sortedKeys = Object.keys(updated).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            return sortedKeys.reduce((acc: Record<string, any>, key) => {
              acc[key] = updated[key];
              return acc;
            }, {});
          });
          setAvailableYearsState((prev) => {
            const yearToAdd = new Date(dateStr).getFullYear();
            if (!prev.includes(yearToAdd)) {
              return [...prev, yearToAdd].sort((a, b) => a - b);
            }
            return prev;
          });
          resetForm();
          setIsOpen(false);
        } else {
          setError(response?.message || "Erreur lors de l'ajout de la date.");
        }
      }
    } catch (error: any) {
      setError(error?.message || "Erreur réseau lors de l'ajout de la date.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddDate = async () => {
    if (!canAdd) return;

    if (!newDate) {
      setDateErrorMessage("Veuillez choisir une date.");
      return;
    }

    const selectedTypeForAdd =
      newTypeId || (selectedDayTypeId !== "all" ? selectedDayTypeId : null) || setting.dayTypesOptions?.[0]?.Id;

    if (!selectedTypeForAdd) {
      setDateErrorMessage("Veuillez choisir un type de jour.");
      return;
    }

    const formattedInputDate = format(new Date(newDate), "yyyy-MM-dd");

    if (setting.nonWorkingDates && setting.nonWorkingDates[formattedInputDate]) {
      setDateErrorMessage(
        `Un jour non travaillé existe déjà à cette date (${
          setting.dayTypesOptions.find((t: any) => t.Id === setting.nonWorkingDates[formattedInputDate].TypeJourCode)
            ?.Libelle || "Inconnu"
        }).`
      );
      return;
    }

    const inputDateStart = startOfDay(new Date(newDate));
    const todayStart = startOfDay(new Date());

    if (isBefore(inputDateStart, todayStart)) {
      setPendingPastDateAction({
        type: "add",
        dateStr: newDate,
        typeId: String(selectedTypeForAdd),
      });
      return;
    }

    await executeAddDate(newDate, String(selectedTypeForAdd));
  };

  const handleStartEdit = (dateKey: string, currentVal: any) => {
    if (!canEdit) return;

    const itemObj = typeof currentVal === "object" ? currentVal : { TypeJourCode: currentVal };
    setEditingDateKey(dateKey);
    setEditDateValue(dateKey);
    setEditTypeIdValue(
      String(
        itemObj.TypeJourCode ||
          (selectedDayTypeId !== "all" ? selectedDayTypeId : null) ||
          setting.dayTypesOptions?.[0]?.Id ||
          ""
      )
    );
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingDateKey(null);
    setEditDateValue("");
    setEditTypeIdValue("");
  };

  const executeSaveEdit = async (
    originalDateKey: string,
    originalVal: any,
    newDateValueStr: string,
    newTypeIdStr: string
  ) => {
    if (!canEdit) return;

    const formattedNewDate = format(new Date(newDateValueStr), "yyyy-MM-dd");
    const itemObj = typeof originalVal === "object" ? originalVal : { id: originalVal };
    const dateId = itemObj.Id || itemObj.id;

    setIsSavingEdit(true);
    setError(null);

    try {
      if (setting.updateNonWorkingDate) {
        const response = await setting.updateNonWorkingDate({
          id: dateId,
          date: new Date(newDateValueStr),
          typeJourCode: newTypeIdStr,
        });

        if (!response || !response.success) {
          setError(response?.message || "Erreur lors de la modification du jour.");
          setIsSavingEdit(false);
          return;
        }
      }

      setting.setNonWorkingDates((prev: any) => {
        const updated = { ...prev };
        delete updated[originalDateKey];

        updated[formattedNewDate] = {
          Id: dateId,
          TypeJourCode: newTypeIdStr,
        };

        const sortedKeys = Object.keys(updated).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        return sortedKeys.reduce((acc: Record<string, any>, key) => {
          acc[key] = updated[key];
          return acc;
        }, {});
      });

      handleCancelEdit();
    } catch (error: any) {
      setError(error?.message || "Erreur lors de la mise à jour du jour.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveEdit = async (originalDateKey: string, originalVal: any) => {
    if (!editDateValue || !editTypeIdValue || !canEdit) return;

    const formattedNewDate = format(new Date(editDateValue), "yyyy-MM-dd");

    if (formattedNewDate !== originalDateKey && setting.nonWorkingDates?.[formattedNewDate]) {
      setError(
        `Un jour non travaillé existe déjà à cette date (${
          setting.dayTypesOptions.find((t: any) => t.Id === setting.nonWorkingDates[formattedNewDate].TypeJourCode)
            ?.Libelle || "Inconnu"
        }).`
      );
      return;
    }

    const inputDateStart = startOfDay(new Date(editDateValue));
    const todayStart = startOfDay(new Date());

    if (isBefore(inputDateStart, todayStart)) {
      setPendingPastDateAction({
        type: "edit",
        dateStr: editDateValue,
        typeId: editTypeIdValue,
        originalKey: originalDateKey,
        originalVal: originalVal,
      });
      return;
    }

    await executeSaveEdit(originalDateKey, originalVal, editDateValue, editTypeIdValue);
  };

  const executeDeleteDate = async (dateKey: string, dateId: number | string) => {
    if (!canDelete) return;

    setDeletingDates((prev) => ({ ...prev, [dateKey]: true }));
    setError(null);

    try {
      if (setting.removeNonWorkingDatesFromPlanning) {
        const response = await setting.removeNonWorkingDatesFromPlanning(dateId);
        if (response && response.success) {
          setting.setNonWorkingDates((prev: any) => {
            const newDates = { ...prev };
            delete newDates[dateKey];
            return newDates;
          });
        } else {
          setError(response?.message || "Erreur lors de la suppression.");
        }
      } else {
        setting.setNonWorkingDates((prev: any) => {
          const newDates = { ...prev };
          delete newDates[dateKey];
          return newDates;
        });
      }
    } catch (error: any) {
      setError(error?.message || "Erreur lors de la suppression.");
    } finally {
      setDeletingDates((prev) => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
    }
  };

  const getDayTypeColor = (typeCode: string) => {
    const dt = setting.dayTypesOptions?.find((item: any) => String(item.Id) === String(typeCode));
    return normalizeColorForInput(dt?.CouleurFond, "#2563eb");
  };

  if (!hasInteracted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-primary-bg/40 rounded-2xl border border-dashed border-light min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-primary poppins">Aucun type de jour sélectionné</p>
        <p className="text-xs text-secondary/80 mt-1 max-w-xs poppins leading-relaxed">
          Veuillez cliquer sur <span className="font-semibold text-primary">« Voir les jours »</span> sur un type de
          jour à gauche pour afficher et gérer ses jours configurés.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-0 relative">
      <h4 className="text-sm font-semibold text-primary pb-2 border-b border-ultra-light">Jours enregistrés</h4>

      {pendingDeleteDate && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-primary-bg p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <h5 className="font-semibold text-sm text-primary poppins">Supprimer ce jour ?</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed poppins">
              Êtes-vous sûr de vouloir supprimer la date du{" "}
              <strong className="text-primary">{pendingDeleteDate.formattedDate}</strong> ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer poppins"
                onClick={() => setPendingDeleteDate(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer poppins"
                onClick={async () => {
                  const target = pendingDeleteDate;
                  setPendingDeleteDate(null);
                  await executeDeleteDate(target.dateKey, target.id);
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPastDateAction && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-primary-bg p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h5 className="font-semibold text-sm text-primary">Date antérieure détectée</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              La date choisie (<strong>{format(new Date(pendingPastDateAction.dateStr), "dd/MM/yyyy")}</strong>) est
              antérieure à aujourd&apos;hui. Souhaitez-vous vraiment continuer ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                onClick={() => setPendingPastDateAction(null)}
              >
                Non
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-600 shadow-sm transition-colors cursor-pointer"
                onClick={async () => {
                  const action = pendingPastDateAction;
                  setPendingPastDateAction(null);
                  if (action.type === "add") {
                    await executeAddDate(action.dateStr, action.typeId);
                  } else if (action.type === "edit" && action.originalKey) {
                    await executeSaveEdit(action.originalKey, action.originalVal, action.dateStr, action.typeId);
                  }
                }}
              >
                Oui, confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-bg p-3 rounded-xl border border-light shadow-sm">
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold text-secondary whitespace-nowrap">Année :</span>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            disabled={isLoadingYear}
            className="border border-default rounded-xl px-3 py-1.5 text-xs bg-primary-bg font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm disabled:opacity-50"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canAdd &&
        (!isOpen ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDateErrorMessage(null);
              setIsOpen(true);
            }}
            className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter une date
          </button>
        ) : (
          <div className="p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col gap-2.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between pb-1 border-b border-primary/20">
              <h5 className="text-xs font-semibold text-primary">Nouveau jour</h5>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsOpen(false);
                }}
                className="text-secondary hover:text-primary transition-colors p-0.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  if (dateErrorMessage) setDateErrorMessage(null);
                }}
                className="border border-default rounded-lg px-2.5 py-1.5 text-xs bg-primary-bg shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none"
              />

              <select
                value={
                  newTypeId ||
                  (selectedDayTypeId !== "all" ? selectedDayTypeId : null) ||
                  setting.dayTypesOptions?.[0]?.Id ||
                  ""
                }
                onChange={(e) => setNewTypeId(e.target.value)}
                className="border border-default rounded-lg px-2.5 py-1.5 text-xs bg-primary-bg shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none truncate"
              >
                {setting.dayTypesOptions?.map((dt: any) => (
                  <option key={dt.Id} value={dt.Id}>
                    {dt.Libelle}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddDate}
                disabled={isAdding}
                className="px-3 py-1.5 cursor-pointer bg-primary text-white rounded-lg font-medium text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-1 shrink-0 disabled:opacity-50 min-w-[70px]"
              >
                {isAdding ? (
                  <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  "Valider"
                )}
              </button>
            </div>

            {dateErrorMessage && <p className="text-[11px] text-red-500 font-medium">{dateErrorMessage}</p>}
            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
          </div>
        ))}

      <div className="bg-primary-bg/60 rounded-xl p-3 min-h-[160px] relative flex-1 min-h-0 border border-light overflow-y-auto">
        {isLoadingYear ? (
          <div className="py-8">
            <Loader size="md" message={`Chargement...`} />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDates.length > 0 ? (
              filteredDates.map(([dateKey, val]: [string, any]) => {
                const itemObj = typeof val === "object" ? val : { id: val, TypeJourCode: selectedDayTypeId };
                const isEditingThisDate = editingDateKey === dateKey;

                if (isEditingThisDate) {
                  return (
                    <div
                      key={dateKey}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-primary/10 rounded-xl p-2.5 shadow-sm border border-primary/30 gap-2"
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="date"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1 text-xs bg-primary-bg shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none"
                        />

                        <select
                          value={editTypeIdValue}
                          onChange={(e) => setEditTypeIdValue(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1 text-xs bg-primary-bg shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none truncate"
                        >
                          {setting.dayTypesOptions?.map((dt: any) => (
                            <option key={dt.Id} value={dt.Id}>
                              {dt.Libelle}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 justify-end">
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => handleSaveEdit(dateKey, val)}
                          title="Enregistrer"
                          className="text-white bg-primary p-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={handleCancelEdit}
                          title="Annuler"
                          className="text-secondary bg-primary-bg p-1.5 rounded-lg border border-light transition-all cursor-pointer shadow-xs hover:bg-secondary/10"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }

                const dateObj = new Date(dateKey);
                const isDeletingThisDate = Boolean(deletingDates[dateKey]);
                const currentTypeColor = getDayTypeColor(itemObj.TypeJourCode);
                const currentTypeObj = setting.dayTypesOptions?.find(
                  (dt: any) => String(dt.Id) === String(itemObj.TypeJourCode)
                );
                const formattedDateStr = format(dateObj, "dd/MM/yyyy");

                return (
                  <div
                    key={dateKey}
                    className="flex items-center justify-between bg-primary-bg rounded-lg p-2.5 shadow-sm border border-light hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: currentTypeColor }}
                        title={currentTypeObj?.Libelle || `Type ID: ${itemObj.TypeJourCode}`}
                      />
                      <span className="text-xs font-medium text-primary">{formattedDateStr}</span>
                      {currentTypeObj && (
                        <span className="text-[10px] text-secondary/70 bg-secondary-bg px-2 py-0.5 rounded-full border border-ultra-light">
                          {currentTypeObj.Libelle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <button
                          type="button"
                          className={
                            "text-secondary hover:text-primary p-1 rounded transition-all cursor-pointer" +
                            (isDeletingThisDate || !canEdit ? " disabled" : "")
                          }
                          title="Modifier le jour (date et type)"
                          onClick={() => handleStartEdit(dateKey, val)}
                          disabled={isDeletingThisDate || !canEdit}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          className={
                            "text-red-400 hover:text-red-600 p-1 rounded transition-all cursor-pointer disabled:opacity-50" +
                            (isDeletingThisDate || !canDelete ? " disabled" : "")
                          }
                          disabled={isDeletingThisDate || !canDelete}
                          title="Supprimer"
                          onClick={() => {
                            setPendingDeleteDate({
                              dateKey,
                              id: itemObj.Id || itemObj.id,
                              formattedDate: formattedDateStr,
                            });
                          }}
                        >
                          {isDeletingThisDate ? (
                            <svg className="animate-spin w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-secondary italic text-center py-4">
                Aucun jour configuré pour cette sélection en {selectedYear}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CalendarConfigurationsEditor = ({ setting, onFormStateChange, registerSaveAction }: { setting: any; onFormStateChange?: (isOpen: boolean) => void; registerSaveAction: (id: string, action: SaveAction | null) => void; }) => {
  const {
    user,
    availableConfigs = [],
    currentConfig,
    onConfigChange,
    onSaveConfig,
    onDeleteConfig,
    handleOpenImageModal,
    addImage,
  } = setting;

  const { hasPermission } = useAuth();

  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<CalendarConfig | null>(null);
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);

  const [configName, setConfigName] = useState("");
  const [configDescription, setConfigDescription] = useState("");
  const [configImage, setConfigImage] = useState<ImageType | undefined>(undefined);
  const [groupingLevel1, setGroupingLevel1] = useState<GroupingLevel | undefined>(undefined);
  const [groupingLevel2, setGroupingLevel2] = useState<GroupingLevel | undefined>(undefined);

  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<{ Id: number; Nom: string }[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingConfigId, setDeletingConfigId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [filtresPerso, setFiltresPerso] = useState<
    {
      IdFiltre: number;
      LibelleFiltre: string;
      EstFiltreGandara: boolean;
      Valeurs: { Selection: number; Id: string; Nom: string }[] | [];
      isDeleted?: boolean;
    }[]
  >([]);

  const [editingFilterId, setEditingFilterId] = useState<number | null>(null);
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [selectedRdvTypes, setSelectedRdvTypes] = useState<string[]>(["Chantier", "Absence", "Perso"]);

  const activeFilters = filtresPerso.filter(
    (f) => Array.isArray(f.Valeurs) && f.Valeurs.some((v) => v.Selection === 1)
  );
  const availableFilters = filtresPerso.filter(
    (f) => !Array.isArray(f.Valeurs) || !f.Valeurs.some((v) => v.Selection === 1)
  );

  const myUserId = Number(user?.IdPersonnel);

  const userOptions = useMemo(() => {
    return allUsers.map((u: any) => {
      const uid = Number(u.IdPersonnel);
      const nom = u.nom || u.Nom || "";
      const prenom = u.prenom || u.Prenom || "";
      const isMe = uid === myUserId;
      return {
        value: String(uid),
        label: `${nom} ${prenom}${isMe ? " (Moi)" : ""}`.trim(),
      };
    });
  }, [allUsers, myUserId]);

  const effectiveSelectedUsers = useMemo(() => {
    if (!myUserId) return selectedUsers.map(String);
    return Array.from(new Set([myUserId, ...selectedUsers])).map(String);
  }, [selectedUsers, myUserId]);


  const resetForm = () => {
    setConfigName("");
    setConfigDescription("");
    setConfigImage(undefined);
    setGroupingLevel1(undefined);
    setGroupingLevel2(undefined);
    setFiltresPerso([]);
    setEditingFilterId(null);
    setIsAddingFilter(false);
    setSelectedRdvTypes(["Chantier", "Absence", "Perso"]);
    setSaveError(null);
    setIsPrivate(false);
    setSelectedUsers([]);
  };

  const buildSnapshot = (data: {
    configName: string;
    configDescription: string;
    configImage?: ImageType;
    groupingLevel1?: GroupingLevel;
    groupingLevel2?: GroupingLevel;
    isPrivate: boolean;
    selectedUsers: number[];
    selectedRdvTypes: string[];
    filtresPerso: {
      IdFiltre: number;
      Valeurs: { Selection: number; Id: string }[];
    }[];
  }) =>
    JSON.stringify({
      configName: data.configName.trim(),
      configDescription: data.configDescription.trim(),
      configImageId: data.configImage?.id ?? null,
      configImageUrl: data.configImage?.image ?? null,
      groupingLevel1: data.groupingLevel1 || null, // <-- || null normalise "" et undefined en null !
      groupingLevel2: data.groupingLevel2 || null,
      isPrivate: data.isPrivate,
      selectedUsers: [...data.selectedUsers].map(Number).sort((a, b) => a - b),
      selectedRdvTypes: [...data.selectedRdvTypes].sort(),
      filtresPerso: data.filtresPerso
        .map((f) => ({
          IdFiltre: Number(f.IdFiltre),
          Valeurs: (f.Valeurs || [])
            .filter((v) => v.Selection === 1)
            .map((v) => String(v.Id))
            .sort(),
        }))
        .sort((a, b) => a.IdFiltre - b.IdFiltre),
  });

  const handleRemoveFilter = (e: React.MouseEvent, idFiltre: number) => {
    e.stopPropagation();
    setFiltresPerso((prev) =>
      prev.map((f) => {
        if (f.IdFiltre === idFiltre) {
          return {
            ...f,
            Valeurs: f.Valeurs.map((v: any) => ({ ...v, Selection: 0 })),
            isDeleted: true,
          };
        }
        return f;
      })
    );

    if (editingFilterId === idFiltre) {
      setEditingFilterId(null);
    }
  };

  const handleDeleteConfig = async (e: React.MouseEvent, configId: number) => {
    e.stopPropagation();
    if (deletingConfigId === configId) return;

    setDeletingConfigId(Number(configId));
    setDeleteError(null);

    try {
      const response = await onDeleteConfig(configId);
      if (response && response.success === false) {
        setDeleteError(response.message || "Impossible de supprimer cette configuration.");
        setDeletingConfigId(null);
      } else {
        if (editingConfig?.IdPlanningVue === configId) {
          setEditingConfig(null);
          resetForm();
        }
        setDeletingConfigId(null);
      }
    } catch (error) {
      setDeletingConfigId(null);
      setDeleteError("Erreur réseau ou inattendue lors de la suppression.");
    }
  };

  useEffect(() => {
    if (editingConfig || isCreatingConfig) {
      setIsLoadingForm(true);
      setInitialSnapshot(null);
      setSaveError(null);
      setIsLoadingUsers(true);

      if (employeeService.getAllUsersActif) {
        employeeService
          .getAllUsersActif()
          .then((res: any) => setAllUsers(res.data || res || []))
          .catch(console.error)
          .finally(() => setIsLoadingUsers(false));
      } else {
        setIsLoadingUsers(false);
      }

      const fetchId = editingConfig ? editingConfig.IdPlanningVue : 0;

      if (editingConfig) {
        calendarConfigService
          .lockCalendarConfig(fetchId)
          .then((response) => {
            if (response?.success === false) {
              console.error("Erreur lors du verrouillage de la configuration :", response?.message);
            }
          })
          .catch(console.error);
      }

      calendarConfigService.getVueDetails(fetchId)
        .then((response: any) => {
          const apiData = response.data || response;
          const { planningVue, filtrePerso, utilisateursAutorises } = apiData;

          const nextName = planningVue?.LibellePlanningVue || "";
          const nextDesc = planningVue?.DescriptionPlanningVue || "";
          const nextImage = planningVue?.PlanningVueImage;
          const nextGroup1 = planningVue?.Group?.ChampsPremierGroupePlanningVue || undefined;
          const nextGroup2 = planningVue?.Group?.ChampsDeuxiemeGroupePlanningVue || undefined;

          const types: string[] = [];
          if (planningVue?.chantierEvenement) types.push("Chantier");
          if (planningVue?.paieEvenement) types.push("Absence");
          if (planningVue?.persoEvenement) types.push("Perso");
          const nextTypes = types.length > 0 ? types : ["Chantier", "Absence", "Perso"];

          const hasAuthorizedUsers = Array.isArray(utilisateursAutorises) && utilisateursAutorises.length > 0;
          const nextIsPrivate = hasAuthorizedUsers;
          const nextUsers = hasAuthorizedUsers
            ? utilisateursAutorises.map((u: any) => Number(u.Id) || Number(u))
            : [];

          const normalizedFiltres = (filtrePerso || []).map((fp: any) => {
            const rawVals = fp.Valeurs || fp.Valeur || [];
            return {
              ...fp,
              LibelleFiltre: fp.LibelleFiltre || fp.NomFiltre || fp.Nom,
              Valeurs: isCreatingConfig
                ? rawVals.map((v: any) => ({ ...v, Selection: 0 }))
                : rawVals,
            };
          });

          // Mise à jour atomique de tous les états + du snapshot initial dans le même batch React
          setConfigName(nextName);
          setConfigDescription(nextDesc);
          setConfigImage(nextImage);
          setGroupingLevel1(nextGroup1);
          setGroupingLevel2(nextGroup2);
          setSelectedRdvTypes(nextTypes);
          setIsPrivate(nextIsPrivate);
          setSelectedUsers(nextUsers);
          setFiltresPerso(normalizedFiltres);

          setInitialSnapshot(
            buildSnapshot({
              configName: nextName,
              configDescription: nextDesc,
              configImage: nextImage,
              groupingLevel1: nextGroup1,
              groupingLevel2: nextGroup2,
              isPrivate: nextIsPrivate,
              selectedUsers: nextUsers,
              selectedRdvTypes: nextTypes,
              filtresPerso: normalizedFiltres,
            })
          );

          setIsLoadingForm(false);
        })
        .catch((error: any) => {
          console.error("Erreur lors de la récupération des détails de la vue :", error);
          setIsLoadingForm(false);
        });
    } else {
      setInitialSnapshot(null);
      resetForm();
    }
  }, [editingConfig, isCreatingConfig]);

  const handleSave =useCallback( async () => {
    if (!configName.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    if (groupingLevel1 && groupingLevel2 && groupingLevel1 === groupingLevel2) {
      setSaveError("Les niveaux de regroupement doivent être différents.");
      setIsSaving(false);
      console.error("Les niveaux de regroupement doivent être différents.");
      throw new Error("Les niveaux de regroupement doivent être différents.");
    }

    if (selectedRdvTypes.length === 0) {
      setSaveError("Au moins un type de rendez-vous doit être sélectionné.");
      setIsSaving(false);
      console.error("Au moins un type de rendez-vous doit être sélectionné.");
      throw new Error("Au moins un type de rendez-vous doit être sélectionné.");
    }

    if (groupingLevel1 === undefined) {
      setSaveError("Le premier niveau de regroupement doit être sélectionné.");
      setIsSaving(false);
      console.error("Le premier niveau de regroupement doit être sélectionné.");
      throw new Error("Le premier niveau de regroupement doit être sélectionné.");
    }

    const planningVue = {
      IdPlanningVue: editingConfig?.IdPlanningVue || 0,
      LibellePlanningVue: configName.trim(),
      DescriptionPlanningVue: configDescription?.trim(),
      IdPlanningImage: configImage?.id,
      Group:
        groupingLevel1 || groupingLevel2
          ? {
              ChampsPremierGroupePlanningVue: groupingLevel1,
              ChampsDeuxiemeGroupePlanningVue: groupingLevel2,
            }
          : undefined,
      chantierEvenement: selectedRdvTypes.includes("Chantier"),
      paieEvenement: selectedRdvTypes.includes("Absence"),
      persoEvenement: selectedRdvTypes.includes("Perso"),
      utilisateursAutorises: isPrivate
        ? Array.from(new Set([user.IdPersonnel, ...selectedUsers]))
        : [],
    };

    const filtre = filtresPerso
      .filter(
        (f) => Array.isArray(f.Valeurs) && (f.Valeurs.some((v) => v.Selection === 1) || f.isDeleted)
      )
      .map((f) => {
        const valeursSelectionnees = f.Valeurs.filter((v) => v.Selection === 1).map((v) => v.Id);
        return {
          IdFiltre: f.IdFiltre,
          EstFiltreGandara: f.EstFiltreGandara,
          Valeurs: valeursSelectionnees.length > 0 ? valeursSelectionnees : [],
        };
      });

    try {
      console.log("Enregistrement de la configuration :")
      if (configImage?.image && planningVue.IdPlanningImage === 0) {
        const result = await addImage(configImage.image);
        if (!result.success || !result.id) {
          setSaveError(result.message || "Erreur lors de l'ajout de l'image.");
          setIsSaving(false);
          return;
        }
        planningVue.IdPlanningImage = result.id;
      }

      const response = await onSaveConfig(
        {
          planningVue,
          filtrePerso: filtre,
          utilisateursAutorises: isPrivate
            ? Array.from(new Set([user.IdPersonnel, ...selectedUsers]))
            : [],
        }, 
        isCreatingConfig ? "create" : "update"
      );
      console.log("Réponse de l'enregistrement :", response);

      if (response && response.success === false || !response) {
        setSaveError(
          (response as any).message || "Une erreur s'est produite lors de l'enregistrement de la vue."
        );
        setIsSaving(false);
        return;
      }

      resetForm();
      setIsCreatingConfig(false);
      setEditingConfig(null);
    } catch (error) {
      setSaveError("Erreur réseau ou erreur inattendue lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  }, [
    configName,
    configDescription,
    configImage,
    groupingLevel1,
    groupingLevel2,
    selectedRdvTypes,
    isPrivate,
    selectedUsers,
    filtresPerso,
    editingConfig,
    user,
    addImage,
    onSaveConfig,
  ]);;


  const isFormActive = isCreatingConfig || Boolean(editingConfig);

  useEffect(() => {
    onFormStateChange?.(isFormActive);
  }, [isFormActive, onFormStateChange]);

  const currentSnapshot = useMemo(() => {
    if (!isFormActive || isLoadingForm) return null;
    return buildSnapshot({
      configName,
      configDescription,
      configImage,
      groupingLevel1,
      groupingLevel2,
      isPrivate,
      selectedUsers,
      selectedRdvTypes,
      filtresPerso,
    });
  }, [
    isFormActive,
    isLoadingForm,
    configName,
    configDescription,
    configImage,
    groupingLevel1,
    groupingLevel2,
    isPrivate,
    selectedUsers,
    selectedRdvTypes,
    filtresPerso,
  ]);


  const isDirty =
    isFormActive &&
    !isLoadingForm &&
    Boolean(configName.trim()) &&
    initialSnapshot !== null &&
    currentSnapshot !== initialSnapshot;

  console.log(isFormActive)
  console.log(!isLoadingForm)
  console.log(Boolean(configName.trim()))
  console.log(initialSnapshot !== null, initialSnapshot)
  console.log(currentSnapshot !== initialSnapshot, currentSnapshot)
  console.log("isDirty:", isDirty);
  console.log("\n\n\n\n\n\n\n\n\n\n\n");


  useEffect(() => {
    registerSaveAction("calendar-configurations", { isDirty, save: handleSave });
    return () => registerSaveAction("calendar-configurations", null);
  }, [isDirty, handleSave, registerSaveAction]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden poppins">
      {/* PANNEAU GAUCHE : Liste des configurations */}
      <div
        className={`${
          isFormActive ? "lg:col-span-5" : "lg:col-span-12"
        } flex flex-col gap-4 min-h-0 overflow-y-auto pr-2 transition-all duration-300`}
      >
        {/* Vue active */}
        <div className="bg-gradient-to-br from-primary-ultra-light/50 to-primary-light/50 p-4 rounded-2xl border border-primary/20 shadow-sm relative overflow-hidden shrink-0">
          <h3 className="font-semibold text-primary text-sm mb-3 flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            Vue active
          </h3>

          {currentConfig ? (
            <div className="flex items-start gap-3">
              {currentConfig.PlanningVueImage?.image && (
                <img
                  src={currentConfig.PlanningVueImage.image}
                  className="w-12 h-12 object-cover rounded-xl shadow-sm shrink-0 border border-white"
                  alt="Config"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary mb-0.5 flex items-center gap-2">
                  <span className="truncate">{currentConfig.LibellePlanningVue}</span>
                  {currentConfig.isLocked && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 shrink-0">
                      Verrouillé
                    </span>
                  )}
                </p>
                {currentConfig.DescriptionPlanningVue && (
                  <p className="text-xs text-secondary/80 mb-2 line-clamp-2">
                    {currentConfig.DescriptionPlanningVue}
                  </p>
                )}
                {currentConfig.Group && (
                  <span className="text-[11px] bg-primary-bg text-primary px-2 py-0.5 rounded-md border border-primary/10 font-medium inline-block">
                    {currentConfig.Group.ChampsPremierGroupePlanningVue &&
                      `Niv.1: ${currentConfig.Group.ChampsPremierGroupePlanningVue}`}
                    {currentConfig.Group.ChampsDeuxiemeGroupePlanningVue &&
                      ` | Niv.2: ${currentConfig.Group.ChampsDeuxiemeGroupePlanningVue}`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-secondary italic">Aucune configuration sélectionnée</p>
          )}
        </div>

        {/* En-tête liste + bouton création */}
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-primary">Vues disponibles</h4>
          {hasPermission(214, 23) && (
            <button
              type="button"
              onClick={() => {
                setEditingConfig(null);
                setIsCreatingConfig(true);
              }}
              className="px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-600 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nouvelle vue
            </button>
          )}
        </div>

        {deleteError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-200 flex items-center gap-2">
            <span className="font-medium">{deleteError}</span>
          </div>
        )}

        {/* Liste des vues */}
        <div className="space-y-2.5 pb-2">
          {availableConfigs.map((config: CalendarConfig) => (
            <div
              key={config.IdPlanningVue}
              className={`p-3.5 rounded-2xl border transition-all duration-200 group ${
                currentConfig?.IdPlanningVue === config.IdPlanningVue
                  ? "border-primary bg-primary/10 shadow-sm"
                  : config.isLocked
                  ? "border-red-100 bg-red-50/30 opacity-75"
                  : "border-light bg-primary-bg hover:border-primary/40"
              }`}
            >
              <div className="flex items-start gap-3">
                {config.PlanningVueImage?.image && (
                  <img
                    src={config.PlanningVueImage.image}
                    className="w-10 h-10 object-cover rounded-lg shrink-0 border border-light"
                    alt="Config"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onConfigChange(config)}
                  className="flex-1 text-left cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-primary truncate">
                      {config.LibellePlanningVue}
                    </span>
                    {currentConfig?.IdPlanningVue === config.IdPlanningVue && (
                      <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                    )}
                  </div>
                  {config.DescriptionPlanningVue && (
                    <p className="text-xs text-secondary/70 line-clamp-1 mb-1.5">
                      {config.DescriptionPlanningVue}
                    </p>
                  )}
                  {config.Group && (
                    <span className="text-[11px] bg-secondary-bg px-2 py-0.5 rounded border border-ultra-light text-secondary font-medium inline-block">
                      {config.Group.ChampsPremierGroupePlanningVue &&
                        `Niv.1: ${config.Group.ChampsPremierGroupePlanningVue}`}
                      {config.Group.ChampsDeuxiemeGroupePlanningVue &&
                        ` | Niv.2: ${config.Group.ChampsDeuxiemeGroupePlanningVue}`}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!config.isLocked) {
                        setIsCreatingConfig(false);
                        setEditingConfig(config);
                      }
                    }}
                    disabled={config.isLocked}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      config.isLocked
                        ? "text-red-300 cursor-not-allowed"
                        : "text-secondary hover:text-primary hover:bg-primary/10"
                    }`}
                    title={config.isLocked ? "Verrouillé" : "Modifier"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteConfig(e, config.IdPlanningVue)}
                    disabled={config.isLocked || deletingConfigId === config.IdPlanningVue}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      config.isLocked || deletingConfigId === config.IdPlanningVue
                        ? "text-red-300 cursor-not-allowed"
                        : "text-secondary hover:text-red-500 hover:bg-red-50"
                    }`}
                    title="Supprimer"
                  >
                    {deletingConfigId === Number(config.IdPlanningVue) ? (
                      <Spinner size="sm" className="text-red-500" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PANNEAU DROIT : Formulaire de création / édition */}
      {isFormActive && (
        <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-l border-ultra-light pt-4 lg:pt-0 lg:pl-6 flex flex-col min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-ultra-light mb-4 shrink-0">
            <h4 className="font-bold text-primary text-base flex items-center gap-2">
              {editingConfig ? "Modifier la vue" : "Nouvelle vue"}
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsCreatingConfig(false);
                setEditingConfig(null);
                resetForm();
              }}
              className="text-secondary hover:text-primary p-1 cursor-pointer"
              title="Fermer le formulaire"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoadingForm ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Spinner size="lg" className="text-primary" />
              <p className="text-sm text-primary font-medium">Chargement des données...</p>
            </div>
          ) : (
            <div className="space-y-5 flex-1">
              {saveError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-200 font-medium">
                  {saveError}
                </div>
              )}

              {/* Nom & Description */}
              <div className="space-y-3 bg-primary-bg p-4 rounded-2xl border border-light">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Nom de la configuration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    className="w-full px-3 py-2 bg-primary-bg border border-default rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    placeholder="Ex: Vue Technique par contrats"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Description</label>
                  <textarea
                    value={configDescription}
                    onChange={(e) => setConfigDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-primary-bg border border-default rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    placeholder="Donnez un contexte à cette vue..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Visibilité */}
              <div className="bg-primary-bg border border-light rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-bold text-primary">Visibilité</h5>
                <div className="flex gap-3">
                  <label
                    className={`flex-1 border p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2.5 ${
                      !isPrivate ? "border-emerald-400 bg-emerald-500/10" : "border-light hover:bg-secondary/10"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={!isPrivate}
                      onChange={() => {
                        setIsPrivate(false);
                        setSelectedUsers([]);
                      }}
                      className="hidden"
                    />
                    <div>
                      <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                      <div className="text-xs font-bold text-primary">Publique</div>
                    </div>
                  </label>

                  <label
                    className={`flex-1 border p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2.5 ${
                      isPrivate ? "border-primary bg-primary/10" : "border-light hover:bg-secondary/10"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={isPrivate}
                      onChange={() => setIsPrivate(true)}
                      className="hidden"
                    />
                    <div>
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <div className="text-xs font-bold text-primary">Privée</div>            
                    </div>
                  </label>
                </div>

                {isPrivate && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Membres autorisés
                    </label>
                    {isLoadingUsers ? (
                      <div className="flex justify-center p-4 border border-light rounded-xl">
                        <Spinner size="sm" className="text-primary" />
                      </div>
                    ) : (
                      <Combobox
                        multiple={true}
                        options={userOptions}
                        value={effectiveSelectedUsers}
                        onValueChange={(nextValues: string[]) => {
                          const numericIds = nextValues.map(Number);
                          const withMe = myUserId
                            ? Array.from(new Set([myUserId, ...numericIds]))
                            : numericIds;
                          setSelectedUsers(withMe);
                        }}
                        placeholder="Rechercher un collaborateur..."
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Icône & Arborescence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-primary-bg p-4 rounded-2xl border border-light flex flex-col">
                  <label className="block text-xs font-semibold text-primary mb-2">Icône de la vue</label>
                  <div
                    onClick={() => handleOpenImageModal(configImage, setConfigImage)}
                    className="flex-1 border-2 border-dashed border-default rounded-xl p-2.5 flex items-center justify-center hover:border-primary transition-all cursor-pointer"
                  >
                    {configImage ? (
                      <div className="flex items-center gap-3 w-full justify-between">
                        <img src={configImage.image} alt="Config" className="w-9 h-9 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfigImage(undefined);
                          }}
                          className="cursor-pointer text-red-500 p-1.5 bg-red-50 rounded-lg"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-secondary font-medium">Choisir une icône</span>
                    )}
                  </div>
                </div>

                <div className="bg-primary-bg p-4 rounded-2xl border border-light space-y-2">
                  <label className="block text-xs font-semibold text-primary">Arborescence</label>
                  <div className="flex bg-secondary-bg p-1 rounded-lg border border-light">
                    <span className="text-[10px] uppercase font-bold text-secondary my-auto px-2 w-12">Niv 1</span>
                    <button
                      type="button"
                      onClick={() => {
                        const val = groupingLevel1 === "equipe" ? undefined : "equipe";
                        setGroupingLevel1(val);
                        if (val === groupingLevel2) setGroupingLevel2(undefined);
                      }}
                      className={`flex-1 py-1 text-xs rounded-md font-medium cursor-pointer ${
                        groupingLevel1 === "equipe" ? "bg-primary text-white" : "text-secondary"
                      }`}
                    >
                      Équipe
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const val = groupingLevel1 === "pole" ? undefined : "pole";
                        setGroupingLevel1(val);
                        if (val === groupingLevel2) setGroupingLevel2(undefined);
                      }}
                      className={`flex-1 py-1 text-xs rounded-md font-medium cursor-pointer ${
                        groupingLevel1 === "pole" ? "bg-primary text-white" : "text-secondary"
                      }`}
                    >
                      Pôle
                    </button>
                  </div>

                  <div className="flex bg-secondary-bg p-1 rounded-lg border border-light">
                    <span className="text-[10px] uppercase font-bold text-secondary my-auto px-2 w-12">Niv 2</span>
                    <button
                      type="button"
                      disabled={groupingLevel1 === "equipe"}
                      onClick={() => {
                        if (groupingLevel1 !== "equipe")
                          setGroupingLevel2(groupingLevel2 === "equipe" ? undefined : "equipe");
                      }}
                      className={`flex-1 py-1 text-xs rounded-md font-medium cursor-pointer ${
                        groupingLevel2 === "equipe"
                          ? "bg-primary text-white"
                          : groupingLevel1 === "equipe"
                          ? "opacity-30 cursor-not-allowed"
                          : "text-secondary"
                      }`}
                    >
                      Équipe
                    </button>
                    <button
                      type="button"
                      disabled={groupingLevel1 === "pole"}
                      onClick={() => {
                        if (groupingLevel1 !== "pole")
                          setGroupingLevel2(groupingLevel2 === "pole" ? undefined : "pole");
                      }}
                      className={`flex-1 py-1 text-xs rounded-md font-medium cursor-pointer ${
                        groupingLevel2 === "pole"
                          ? "bg-primary text-white"
                          : groupingLevel1 === "pole"
                          ? "opacity-30 cursor-not-allowed"
                          : "text-secondary"
                      }`}
                    >
                      Pôle
                    </button>
                  </div>
                </div>
              </div>

              {/* Ressources ciblées */}
              <div className="bg-primary-bg border border-light rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-primary">Ressources ciblées</h5>
                  <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {activeFilters.length} actif{activeFilters.length > 1 ? "s" : ""}
                  </span>
                </div>

                {editingFilterId !== null ? (
                  <div className="bg-secondary-bg border border-light rounded-xl p-3 space-y-3 animate-in fade-in duration-150">
                    {(() => {
                      const filterToEdit = filtresPerso.find((f) => f.IdFiltre === editingFilterId);
                      if (!filterToEdit) return null;
                      const isSingleSelect = [3, 6, 7].includes(Number(filterToEdit.IdFiltre));

                      return (
                        <>
                          <div className="flex items-center justify-between border-b border-ultra-light pb-2">
                            <span className="text-xs font-bold text-primary">{filterToEdit.LibelleFiltre}</span>
                            <button
                              type="button"
                              onClick={() => setEditingFilterId(null)}
                              className="text-secondary hover:text-primary cursor-pointer p-1"
                              title="Fermer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {filterToEdit.Valeurs.map((val: any) => {
                              const isSelected = val.Selection === 1;
                              return (
                                <button
                                  key={val.Id}
                                  type="button"
                                  onClick={() => {
                                    setFiltresPerso((prev) =>
                                      prev.map((f) => {
                                        if (f.IdFiltre === filterToEdit.IdFiltre) {
                                          return {
                                            ...f,
                                            Valeurs: f.Valeurs.map((v: any) => {
                                              if (isSingleSelect) {
                                                return { ...v, Selection: v.Id === val.Id ? 1 : 0 };
                                              }
                                              return v.Id === val.Id
                                                ? { ...v, Selection: v.Selection === 1 ? 0 : 1 }
                                                : v;
                                            }),
                                          };
                                        }
                                        return f;
                                      })
                                    );
                                    // Si sélection unique, on ferme automatiquement pour enchaîner plus vite
                                    if (isSingleSelect) {
                                      setEditingFilterId(null);
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 ${
                                    isSelected
                                      ? "bg-primary text-white border-primary shadow-2xs"
                                      : "bg-primary-bg text-primary border-light hover:border-primary/40"
                                  }`}
                                >
                                  {isSelected && (
                                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  <span>{val.Nom}</span>
                                </button>
                              );
                            })}
                          </div>

                          {!isSingleSelect && (
                            <button
                              type="button"
                              onClick={() => setEditingFilterId(null)}
                              className="w-full bg-primary text-white py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-primary-600 transition-colors"
                            >
                              Terminer la sélection
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : isAddingFilter ? (
                  <div className="bg-secondary-bg border border-light rounded-xl p-3 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1.5 border-b border-ultra-light">
                      <span className="text-xs font-bold text-primary">Choisir un critère</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingFilter(false)}
                        className="text-secondary hover:text-primary cursor-pointer p-0.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    {availableFilters.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {availableFilters.map((filtre) => (
                          <button
                            key={filtre.IdFiltre}
                            type="button"
                            onClick={() => {
                              setEditingFilterId(filtre.IdFiltre);
                              setIsAddingFilter(false);
                            }}
                            className="px-3 py-1.5 bg-primary-bg hover:scale-105 border border-light rounded-lg text-xs font-medium text-primary flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                          >
                            <span>+</span>
                            <span>{filtre.LibelleFiltre}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-secondary italic text-center py-2">
                        Tous les filtres sont déjà utilisés.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {activeFilters.length > 0 ? (
                      <div className="space-y-2">
                        {activeFilters.map((filtre) => {
                          const selectedValues = filtre.Valeurs.filter((v) => v.Selection === 1);
                          return (
                            <div
                              key={filtre.IdFiltre}
                              onClick={() => setEditingFilterId(filtre.IdFiltre)}
                              className="bg-secondary-bg/60 border border-light p-3 rounded-xl cursor-pointer hover:border-primary/40 space-y-1.5 transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-primary">{filtre.LibelleFiltre}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveFilter(e, filtre.IdFiltre)}
                                  className="text-red-500 hover:bg-red-50 p-1 rounded cursor-pointer"
                                  title="Retirer ce critère"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {selectedValues.map((val) => (
                                  <span
                                    key={val.Id}
                                    className="text-[11px] bg-primary-bg text-secondary px-2 py-0.5 rounded border border-light"
                                  >
                                    {val.Nom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-secondary italic text-center py-3 bg-secondary-bg/40 rounded-xl border border-dashed border-light">
                        Aucun filtre ciblé (toutes les ressources affichées).
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsAddingFilter(true)}
                      disabled={availableFilters.length === 0}
                      className="w-full py-2 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      + Ajouter un critère
                    </button>
                  </>
                )}
              </div>

              {/* Événements affichés */}
              <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'Chantier', label: 'Chantiers', color: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200' },
                    { id: 'Absence', label: 'Absences & Social', color: 'bg-amber-400', bg: 'bg-amber-50', border: 'border-amber-200' },
                    { id: 'Perso', label: 'Autres (Perso)', color: 'bg-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' }
                  ].map(type => (
                    <label key={type.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${selectedRdvTypes.includes(type.id) ? `${type.bg} ${type.border} shadow-sm` : 'border-gray-200 hover:bg-gray-50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm text-white ${selectedRdvTypes.includes(type.id) ? type.color : 'bg-gray-300'}`}>
                        {type.id === 'Chantier' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                        {type.id === 'Absence' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        {type.id === 'Perso' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                      </div>
                      <span className={`text-sm flex-1 font-semibold ${selectedRdvTypes.includes(type.id) ? 'text-gray-900' : 'text-gray-500'}`}>{type.label}</span>
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selectedRdvTypes.includes(type.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedRdvTypes([...selectedRdvTypes, type.id]);
                            else setSelectedRdvTypes(selectedRdvTypes.filter(t => t !== type.id));
                          }}
                        />
                        <div className={`w-10 h-5 bg-gray-200 rounded-full transition-colors ${selectedRdvTypes.includes(type.id) ? 'bg-green-500' : ''}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${selectedRdvTypes.includes(type.id) ? 'translate-x-5' : ''}`}></div>
                      </div>
                    </label>
                  ))}
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DaysManagementCategoryContent: React.FC<{
  categoryObj: any;
  selectedDayTypeId: string | null;
  setSelectedDayTypeId: (id: string | null) => void;
  setApiError: (err: string | null) => void;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}> = ({
  categoryObj,
  selectedDayTypeId,
  setSelectedDayTypeId,
  setApiError,
  registerSaveAction,
}) => {
  const dayTypeSetting = categoryObj.items?.find((item: any) => item.type === "day-type-settings");
  const nonWorkingSetting = categoryObj.items?.find((item: any) => item.type === "custom-non-working-dates");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
      {/* PANNEAU GAUCHE : Types de jours */}
      <div className="lg:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
        <h4 className="text-sm font-semibold text-primary pb-2 border-b border-ultra-light">
          Types de jours
        </h4>

        {dayTypeSetting?.canAdd && (
          <NewDayTypeForm onAdd={dayTypeSetting.onAddDayType} setError={setApiError} />
        )}

        <div className="space-y-3">
          <div
            className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-sm cursor-pointer ${
              selectedDayTypeId === "all"
                ? "border-primary bg-primary/10"
                : "border-light bg-secondary/10 hover:border-primary/30"
            }`}
            onClick={() => setSelectedDayTypeId("all")}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              <span className="text-xs font-semibold text-primary poppins">Tous les types</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDayTypeId("all");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold poppins transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                selectedDayTypeId === "all"
                  ? "bg-primary text-white ring-2 ring-primary/20"
                  : "bg-primary-bg border border-light hover:bg-primary/5 text-primary"
              }`}
            >
              <span>Voir les jours</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {dayTypeSetting?.dayTypes?.map((dayType: DayType) => (
            <DayTypeSingleEditor
              key={dayType.Id}
              dayType={dayType}
              isSelected={String(dayType.Id) === String(selectedDayTypeId)}
              onSelect={() => setSelectedDayTypeId(String(dayType.Id))}
              onUpdate={dayTypeSetting.onUpdateDayType}
              onCheckDelete={dayTypeSetting.onCheckDeleteDayType}
              onDelete={async (id: string | number, count: number) => {
                const result = await dayTypeSetting.onDeleteDayType?.(id, count);
                if (result?.success) {
                  setSelectedDayTypeId("all");
                }
                return result;
              }}
              setError={setApiError}
              canEdit={dayTypeSetting.canEdit}
              canDelete={dayTypeSetting.canDelete}
              registerSaveAction={registerSaveAction}
            />
          ))}
        </div>
      </div>

      {/* PANNEAU DROIT : Dates non travaillées */}
      <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-ultra-light pt-6 lg:pt-0 lg:pl-6 flex flex-col min-h-0 overflow-y-auto">
        {nonWorkingSetting ? (
          <NonWorkingDaysEditor
            setting={nonWorkingSetting}
            selectedDayTypeId={selectedDayTypeId}
            setSelectedDayTypeId={setSelectedDayTypeId}
            canAdd={nonWorkingSetting.canAdd}
            canEdit={nonWorkingSetting.canEdit}
            canDelete={nonWorkingSetting.canDelete}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-primary-bg/40 rounded-xl border border-dashed border-light min-h-[250px]">
            <p className="text-sm font-medium text-secondary poppins">Aucune donnée de configuration</p>
          </div>
        )}
      </div>
    </div>
  );
};

const MobileAppointmentFieldsCategoryContent: React.FC<{
  categoryObj: any;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}> = ({ categoryObj, registerSaveAction }) => {
  const mobileSetting = categoryObj.items?.find(
    (item: any) => item.type === "mobile-appointment-fields"
  );

  if (!mobileSetting) return null;

  return (
    <div className="flex-1 h-full min-h-0">
      <MobileDisplayEditor setting={mobileSetting} registerSaveAction={registerSaveAction} />
    </div>
  );
};

const DisplaySettingsCategoryContent: React.FC<{
  categoryObj: any;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}> = ({ categoryObj, registerSaveAction }) => {
  return (
    <div className="space-y-6 flex-1">
      {categoryObj.items?.map((setting: any, settingIdx: number) => (
        <div
          key={setting.id}
          className={`flex flex-col lg:flex-row justify-between lg:items-center ${
            settingIdx !== categoryObj.items.length - 1 ? "border-b border-ultra-light pb-4" : ""
          }`}
        >
          {setting.type === "default-display-settings" ? (
            <DefaultDisplaySettingsEditor setting={setting} registerSaveAction={registerSaveAction} />
          ) : setting.type === "select" ? (
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
};


const SettingsModalContent: React.FC<{
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
        <div className="bg-secondary-bg shadow-sm flex flex-col min-h-0 overflow-y-auto flex-1">
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
              ? "bg-secondary-bg border border-light text-primary hover:bg-secondary/10"
              : "bg-primary text-white hover:bg-primary-600"
          }`}
          onClick={handleCloseWithSave}
          disabled={isSavingPending}
        >
          Fermer
        </button>

        {showFooterSave && (
          <button
            type="button"
            className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 min-w-[220px]"
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

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, isSettingsOpen, settings }) => {
  const [activeCategory] = useState<string>(() => {
    return sessionStorage.getItem("activeSettingsCategory") || settings?.[0]?.key || "";
  });

  const [isCalendarFormOpen, setIsCalendarFormOpen] = useState(false);
  const [selectedDayTypeId, setSelectedDayTypeId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saveActions, setSaveActions] = useState<Record<string, SaveAction>>({});
  const [isSavingPending, setIsSavingPending] = useState(false);

  const saveCallbacksRef = useRef<Record<string, () => Promise<void>>>({});
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});

  const hasFetchedRef = useRef(false);

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
    setDirtyMap((prev) => {
      if (prev[id] === action.isDirty) return prev; // Aucun re-render si isDirty est identique
      return { ...prev, [id]: action.isDirty };
    });
  }, []);

  const isAnyDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);

  useEffect(() => {
    if (isSettingsOpen && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      settings.forEach((cat: any) => {
        cat.items?.forEach((setting: any) => {
          if (setting.type === "day-type-settings" && typeof setting.fetchDayTypes === "function") {
            setting
              .fetchDayTypes()
              .then((res: any) => {
                if (res && !res.success && res.message) {
                  setApiError(res.message);
                }
              })
              .catch((err: any) => {
                setApiError(err?.message || "Erreur lors du chargement des types de jours.");
              });
          }
        });
      });
    }

    if (!isSettingsOpen) {
      setApiError(null);
      setSaveActions({});
      setSelectedDayTypeId(null);
      setIsCalendarFormOpen(false);
    }
  }, [isSettingsOpen, settings]);

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
        return "w-[min(98vw,1500px)]";
      case "mobileAppointmentFields":
        return "w-[min(95vw,1400px)]";
      case "calendarConfigurations":
        return isCalendarFormOpen
          ? "w-[min(96vw,1300px)] h-[90vh]" // Taille élargie avec le panneau droit ouvert
          : "w-[min(95vw,620px)]";  // Taille compacte pour la liste seule
      default:
        return "w-[min(95vw,607px)]";
    }
  }, [currentCategoryObj?.key, isCalendarFormOpen]);


  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={onClose}
      title={currentCategoryObj?.category || "Paramètres"}
      className={`${modalWidthClass} max-h-[950px] overflow-hidden flex flex-col transition-all duration-300`}
      classNameContent="flex-1 overflow-hidden p-4 flex flex-col min-h-0"
      confirmCloseOnOverlay={(currentCategoryObj?.hasUnsavedChanges ?? true) && isAnyDirty}
      onSave={handleSaveAll}
    >
      <SettingsModalContent
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

export default memo(SettingsModal);