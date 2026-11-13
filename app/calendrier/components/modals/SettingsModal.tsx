import { memo, useState, useMemo, useEffect, useRef, useCallback } from "react";
import Modal, { useModalContext } from "./Modal";
import Loader from "../ui/Loader";
import { format, isBefore, startOfDay } from "date-fns";
import { Appointment, DayType, ImageType, Item, MobileAppointmentDisplayConfig, User } from "../../types";
import { DisplaySettings } from "@/app/service/displaySettings.service";
import { AppointmentCard, DragOverTarget, MobileAppointmentFieldOption } from "../Calendar/MobileCalendar/AppointmentList";

type SettingsModalProps = {
  onClose: () => void;
  settings: any;
  isSettingsOpen: boolean;
};

const normalizeColorForInput = (color: string | undefined, fallback: string = '#1E40AF'): string => {
  if (!color) return fallback;
  if (color.length === 9 && color.startsWith('#')) {
    return color.substring(0, 7);
  }
  if (!color.startsWith('#') && (color.length === 6 || color.length === 3)) {
    return `#${color}`;
  }
  return color;
};

const previewAppointment: Appointment = {
  IdPlanningEvenement: -1,
  AnnotationPlanningEvenement: "Prévoir le matériel nécessaire",
  DebutPlanningEvenement: new Date(2026, 8, 7, 9, 0).getTime(),
  FinPlanningEvenement: new Date(2026, 8, 7, 11, 0).getTime(),
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
  LibellePlanningRessource: "Construction de deux immeubles regroupant 41 logements : 19 en accession et 22 en location",
  CouleurFondPlanningRessource: "#d92e25",
  CouleurBordurePlanningRessource: "#841c17",
  CouleurTextePlanningRessource: "#2f0a08",
  CodePlanningRessource: "16894",
  Type: "Projet",
  ChefChantier: "MONNOT Romain",
  ChargeAffaire: "DECREUSE Vivien",
  AdresseChantier : "Rue Jean Wyrsch 25000 BESANCON",
  Identifiant: '41 lgt wyrsch',
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

const isSpecialField = (field: string, options: MobileAppointmentFieldOption[]) =>
  options.find((option) => option.Code === field)?.CaractereSpecial === true;

const countRegularFields = (row: string[], options: MobileAppointmentFieldOption[], excludedField?: string) =>
  row.filter((field) => field !== excludedField).length;

const isTitleRowFull = (
  row: string[],
  options: MobileAppointmentFieldOption[],
  draggedField?: string
) => {
  const currentFields = row.filter((field) => field !== draggedField);
  const specialCount = currentFields.filter((field) => isSpecialField(field, options)).length;
  const regularCount = currentFields.length - specialCount;

  if (!draggedField) {
    return regularCount >= MAX_TITLE_REGULAR_FIELDS &&
      specialCount >= MAX_TITLE_SPECIAL_FIELDS;
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
    ? value.primaryFieldRows
      .slice(0, MAX_PRIMARY_ROWS)
      .map((row, index) => {
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
    : value.secondaryFields.map((field) => [field])

  // Limite uniquement au nombre de champs max par LIGNE.
  const secondaryFields = secondarySourceRows
    .slice(0, 5)
    .map(row => row.slice(0, MAX_SECONDARY_FIELDS));

  return {
    primaryFields,
    secondaryFields,
  };
};

const flattenFieldRows = (rows: string[][]) => rows.flat();

const DefaultDisplaySettingsEditor = ({
  setting,
  registerSaveAction,
}: {
  setting: {
    value: DisplaySettings | null;
    fetchDisplaySettings: () => Promise<{ success: boolean; message?: string }>;
    onChange: (value: DisplaySettings) => Promise<{ success: boolean; message?: string }>;
    onSelectImage: (onSelect: (image: ImageType) => void, actualImage?: ImageType) => void;
    onApplyToAllEvents?: (value: DisplaySettings) => Promise<{ success: boolean; message?: string }>;
  };
  registerSaveAction: (action: { isDirty: boolean; save: () => Promise<void> } | null) => void;
}) => {
  const [localValue, setLocalValue] = useState<DisplaySettings | null>(setting.value);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(
    setting.value ? JSON.stringify(setting.value) : null
  );
  const [isLoading, setIsLoading] = useState(!setting.value);
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
    registerSaveAction({ isDirty, save });
    return () => registerSaveAction(null);
  }, [isDirty, save, registerSaveAction]);

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
  const selectedImage: ImageType | undefined = image
    ? { id: Number(image.id), image: image.url }
    : undefined;

  return (
    <div className="space-y-5 w-full">
      <div>
        <h4 className="text-sm font-semibold text-primary">Valeurs par défaut</h4>
        <p className="text-xs text-secondary mt-1">
          Ces valeurs sont utilisées lors de la création d’une nouvelle ressource.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {([
          ["CouleurFondParDefaut", "Couleur de fond"],
          ["CouleurBordureParDefaut", "Couleur de bordure"],
          ["CouleurTexteParDefaut", "Couleur de texte"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-2 text-sm text-primary">
            {label}
            <div className="flex items-center gap-2 border border-default rounded-xl p-2">
              <input
                type="color"
                value={normalizeColorForInput(localValue[key])}
                onChange={(event) => updateColor(key, event.target.value)}
                className="h-8 w-10 cursor-pointer"
              />
              <input
                type="text"
                value={localValue[key]}
                onChange={(event) => updateColor(key, event.target.value)}
                className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase focus:outline-none"
              />
            </div>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-default overflow-hidden bg-secondary-bg flex items-center justify-center">
            {image ? (
              <img src={image.url} alt="Image par défaut" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-secondary">Aucune</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-primary">Image par défaut</span>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium cursor-pointer"
              onClick={() =>
                setting.onSelectImage((selected) => {
                  setLocalValue((previous) =>
                    previous
                      ? {
                          ...previous,
                          ImageParDefaut: { id: selected.id, url: selected.image },
                        }
                      : previous
                  );
                }, selectedImage)
              }
            >
              Choisir une image
            </button>
          </div>
        </div>

        {setting.onApplyToAllEvents && (
          <button
            type="button"
            disabled={isApplying}
            onClick={() => setIsConfirmOpen(true)}
            className="px-4 py-2 rounded-xl border border-default text-primary hover:bg-secondary-bg text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isApplying ? "Application en cours..." : "Appliquer à tous les événements"}
          </button>
        )}
      </div>

      {/* Modale de confirmation */}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="w-full max-w-sm rounded-2xl border border-default bg-white dark:bg-neutral-900 p-5 shadow-xl space-y-4"
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
  registerSaveAction: (action: { isDirty: boolean; save: () => Promise<void> } | null) => void;
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

  // --- NOUVEAU : États pour gérer le chargement des options ---
  const [isLoadingOptions, setIsLoadingOptions] = useState(typeof setting.fetchFieldOptions === 'function');
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const hasFetchedOptions = useRef(false);

  // Appel de fetchFieldOptions au montage du composant
  useEffect(() => {
    if (typeof setting.fetchFieldOptions === 'function' && !hasFetchedOptions.current) {
      hasFetchedOptions.current = true;
      setIsLoadingOptions(true);
      
      setting.fetchFieldOptions()
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
    registerSaveAction({ isDirty, save: handleSave });
    return () => registerSaveAction(null);
  }, [isDirty, handleSave, registerSaveAction]);

  const { normalAvailableOptions, specialAvailableOptions, totalAvailableCount } = useMemo(() => {
    const allOptions = (setting.options || []) as MobileAppointmentFieldOption[];

    // 1. Filtrer les options non attribuées
    const unassigned = allOptions.filter((opt) => {
      const inPrimary = localValue.primaryFields.includes(opt.Code);
      const inSecondary = localValue.secondaryFields.includes(opt.Code);
      return !(inPrimary && inSecondary); // Remarque : || garantit qu'il n'est ni dans l'un ni dans l'autre
    });


    // 2. Séparer selon CaractereSpecial
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

      // On le retire TOUJOURS de sa colonne de destination pour éviter les doublons au sein d'une même section.
      if (column === "primaryFields") {
        primaryRows = primaryRows.map((row) => row.filter((f) => f !== fieldCode));
      } else {
        secondaryRows = secondaryRows.map((row) => row.filter((f) => f !== fieldCode));
      }

      // Un déplacement entre deux lignes de la même section doit retirer le champ de sa ligne d'origine.
      // Un déplacement entre les sections conserve volontairement le champ dans la section source.
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
      const rowIsFull = column === "primaryFields" && rowIndex === 0
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

      // Une ligne vide ne doit jamais rester dans la configuration après un déplacement.
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

  // --- NOUVEAU : Affichage du Loader tant que isLoadingOptions est true ---
  if (isLoadingOptions) {
    return (
      <div className="w-full flex items-center justify-center min-h-[300px] bg-secondary-bg/40 rounded-xl border border-dashed border-light">
        <Loader size="md" message="Chargement des champs..." />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3 poppins">
      
      {/* Affichage d'une éventuelle erreur au chargement des options */}
      {optionsError && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
          {optionsError}
        </div>
      )}

      <div className="flex flex-col gap-3 h-full">
        {/* SECTION CHAMPS DISPONIBLES */}
        <div className="rounded-xl border border-default bg-secondary-bg/50 p-2.5 space-y-3">
          {/* En-tête avec compteur global */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-secondary">
              Champs disponibles ({totalAvailableCount})
            </span>
          </div>

          {/* SECTION 1 : Champs standards */}
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
                  className={`flex cursor-grab items-center gap-1 rounded-lg border border-dashed border-default bg-white px-2 py-1 text-xs text-primary shadow-2xs active:cursor-grabbing hover:border-primary transition-colors ${
                    highlightedFieldCode === option.Code ? 'ring-2 ring-primary ring-offset-1' : ''
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

          {/* SECTION 2 : Caractères spéciaux */}
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
                  className={`flex cursor-grab items-center gap-1 rounded-lg border border-dashed border-default bg-white px-2 py-1 text-xs text-primary shadow-2xs active:cursor-grabbing hover:border-primary transition-colors ${
                    highlightedFieldCode === option.Code ? 'ring-2 ring-primary ring-offset-1' : ''
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
            Organisez les informations de la carte mobile. Glissez un champ directement sur la carte pour l'insérer à l'endroit désigné par la barre verticale.
          </div>
        </div>

        {/* SECTION APERÇU CÔTE À CÔTE */}
        <div className="rounded-xlbg-secondary-bg/40 space-y-3 h-full">
          <div className="flex items-center gap-2 pb-1.5 border-b border-ultra-light">
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CÔTÉ GAUCHE : APERÇU PRINCIPALE */}
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

            {/* CÔTÉ DROIT : APERÇU SECONDAIRE */}
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
              className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-xs bg-white shadow-sm hover:shadow-md w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-color-fond-hex" className="text-xs text-secondary font-medium poppins">
              Couleur Fond
            </label>
            <div className="flex items-center gap-1.5 bg-white border border-default rounded-xl p-1 shadow-sm">
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
            <div className="flex items-center gap-1.5 bg-white border border-default rounded-xl p-1 shadow-sm">
              <label 
                htmlFor="new-color-texte"
                className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
                style={{ backgroundColor: normalizeColorForInput(CouleurTexte, '#FFFFFF') }}
                title="Choisir couleur de texte"
              />
              <input
                id="new-color-texte"
                type="color"
                value={normalizeColorForInput(CouleurTexte, '#FFFFFF')}
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
                    : "bg-white text-primary border-light hover:bg-secondary/10"
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
                    : "bg-white text-primary border-light hover:bg-secondary/10"
                }`}
              >
                I
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-secondary font-medium poppins">Aperçu</span>
            <div className="w-12 h-12 border border-light rounded-xl overflow-hidden shrink-0 shadow-sm bg-white">
              <div
                className="flex flex-col justify-center items-center h-full w-full text-center relative transition-all p-1"
                style={{
                  backgroundColor: normalizeColorForInput(CouleurFond, '#2563eb'),
                  color: normalizeColorForInput(CouleurTexte, '#ffffff'),
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
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

      {formError && (
        <p className="text-xs text-red-500 font-medium poppins">{formError}</p>
      )}
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

  const handleSave = async () => {
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
  };

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

    const countToSend = deleteModalState.checkRequired ? (parseInt(confirmInput, 10) || 0) : 0;

    setDeleteModalState(prev => ({ ...prev, isOpen: false }));
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

  const isConfirmDisabled = deleteModalState.checkRequired && (
    deleteModalState.expectedCount !== null 
      ? parseInt(confirmInput.trim(), 10) !== deleteModalState.expectedCount
      : !confirmInput.trim()
  );

  return (
    <div className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-wrap items-center justify-between gap-3 shadow-sm relative ${isSelected ? 'border-primary bg-primary/10 ' : 'border-light bg-secondary/10 hover:border-primary/30'}`}>
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h5 className="font-semibold text-sm text-primary poppins">Supprimer le type de jour ?</h5>
            </div>

            {deleteModalState.checkRequired ? (
              <div className="space-y-3">
                <p className="text-xs text-secondary leading-relaxed poppins font-medium">
                  {deleteModalState.message}
                </p>
                <div className="space-y-1">
                  <label htmlFor={`confirmInput-${dayType.Id}`} className="text-[11px] text-secondary font-semibold poppins">
                    Veuillez saisir le nombre de jour(s) pour confirmer :
                  </label>
                  <input
                    id={`confirmInput-${dayType.Id}`}
                    type="number"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={deleteModalState.expectedCount !== null ? `Entrez ${deleteModalState.expectedCount}` : "Nombre de jours"}
                    className="w-full border border-default rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-secondary leading-relaxed poppins">
                Êtes-vous sûr de vouloir supprimer le type de jour <strong className="text-primary">{dayType.Libelle}</strong> ? Cette action est irréversible.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer poppins"
                onClick={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
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
            className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-xs bg-white shadow-sm hover:shadow-md w-full"
            disabled={dayType.isLocked || !canEdit}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Couleur Fond</span>
          <div className="flex items-center gap-1.5 bg-white border border-default rounded-xl p-1 shadow-sm">
            <label 
              htmlFor={`color-fond-${dayType.Id}`}
              className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
              style={{ backgroundColor: normalizeColorForInput(localType.CouleurFond, '#1E40AF') }}
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
          <div className="flex items-center gap-1.5 bg-white border border-default rounded-xl p-1 shadow-sm">
            <label 
              htmlFor={`color-texte-${dayType.Id}`}
              className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
              style={{ backgroundColor: normalizeColorForInput(localType.CouleurTexte, '#FFFFFF') }}
              title="Changer couleur de texte"
            />
            <input
              id={`color-texte-${dayType.Id}`}
              type="color"
              value={normalizeColorForInput(localType.CouleurTexte, '#FFFFFF')}
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
              className={`${!canEdit ? 'opacity-50 cursor-not-allowed' : ''} h-9 px-3.5 rounded-xl border text-sm font-black poppins transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                localType.isBold
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-primary border-light hover:bg-secondary/10"
              }
              `}
              disabled={!canEdit}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => handleToggle("isItalic")}
              title="Italique"
              className={` ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''} h-9 px-3.5 rounded-xl border text-sm italic font-serif transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                localType.isItalic
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-primary border-light hover:bg-secondary/10"
              }`}
              disabled={!canEdit}
            >
              I
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Aperçu</span>
          <div className="w-12 h-12 border border-light rounded-xl overflow-hidden shrink-0 shadow-sm bg-white">
            <div
              className="flex flex-col justify-center items-center h-full w-full text-center relative transition-all p-1"
              style={{
                backgroundColor: normalizeColorForInput(localType.CouleurFond, '#1E40AF'),
                color: normalizeColorForInput(localType.CouleurTexte, '#FFFFFF'),
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
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                : "bg-white border border-light hover:bg-primary/5 text-primary"
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
      fetchYears().then((res: any) => {
        if (Array.isArray(res)) {
          setAvailableYearsState(res);
        } else if (res && res.success && Array.isArray(res.data)) {
          setAvailableYearsState(res.data);
        }
      }).catch(() => {});
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
              nonWorkingDates.map((item: { DatePlanningJourNontravaille: any; IdPlanningJourNontravaille: string; TypeJourCode: string; }) => [
                item.DatePlanningJourNontravaille,
                { Id: Number(item.IdPlanningJourNontravaille), TypeJourCode: item.TypeJourCode }
              ])
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
        const response = await setting.addNonWorkingDatesToPlanning(
          parsedDate,
          typeId
        );
        if (response && response.success && response.data) {
          setting.setNonWorkingDates((prev: any) => {
            const updated = {
              ...prev,
              [formattedInputDate]: {
                Id: Number(response.data),
                TypeJourCode: typeId,
              },
            };

            const sortedKeys = Object.keys(updated).sort((a, b) => 
              new Date(a).getTime() - new Date(b).getTime()
            );

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

    const selectedTypeForAdd = newTypeId || (selectedDayTypeId !== "all" ? selectedDayTypeId : null) || setting.dayTypesOptions?.[0]?.Id;

    if (!selectedTypeForAdd) {
      setDateErrorMessage("Veuillez choisir un type de jour.");
      return;
    }

    const formattedInputDate = format(new Date(newDate), "yyyy-MM-dd");

    if (setting.nonWorkingDates && setting.nonWorkingDates[formattedInputDate]) {
      setDateErrorMessage(
        `Un jour non travaillé existe déjà à cette date (${setting.dayTypesOptions.find((t: any) => t.Id === setting.nonWorkingDates[formattedInputDate].TypeJourCode)?.Libelle || "Inconnu"}).`
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
    setEditTypeIdValue(String(itemObj.TypeJourCode || (selectedDayTypeId !== "all" ? selectedDayTypeId : null) || setting.dayTypesOptions?.[0]?.Id || ""));
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingDateKey(null);
    setEditDateValue("");
    setEditTypeIdValue("");
  };

  const executeSaveEdit = async (originalDateKey: string, originalVal: any, newDateValueStr: string, newTypeIdStr: string) => {
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

        const sortedKeys = Object.keys(updated).sort((a, b) => 
          new Date(a).getTime() - new Date(b).getTime()
        );

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
      setError(`Un jour non travaillé existe déjà à cette date (${setting.dayTypesOptions.find((t: any) => t.Id === setting.nonWorkingDates[formattedNewDate].TypeJourCode)?.Libelle || "Inconnu"}).`);
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

    setDeletingDates(prev => ({ ...prev, [dateKey]: true }));
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
      setDeletingDates(prev => {
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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/40 rounded-2xl border border-dashed border-light min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-primary poppins">
          Aucun type de jour sélectionné
        </p>
        <p className="text-xs text-secondary/80 mt-1 max-w-xs poppins leading-relaxed">
          Veuillez cliquer sur <span className="font-semibold text-primary">« Voir les jours »</span> sur un type de jour à gauche pour afficher et gérer ses jours configurés.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-0 relative">
      <h4 className="text-sm font-semibold text-primary pb-2 border-b border-ultra-light">
        Jours enregistrés
      </h4>

      {pendingDeleteDate && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-white p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h5 className="font-semibold text-sm text-primary poppins">Supprimer ce jour ?</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed poppins">
              Êtes-vous sûr de vouloir supprimer la date du <strong className="text-primary">{pendingDeleteDate.formattedDate}</strong> ?
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
          <div className="bg-white p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h5 className="font-semibold text-sm text-primary">Date antérieure détectée</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              La date choisie (<strong>{format(new Date(pendingPastDateAction.dateStr), "dd/MM/yyyy")}</strong>) est antérieure à aujourd'hui. Souhaitez-vous vraiment continuer ?
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

      {/* Barre de Filtres */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-light shadow-sm">
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold text-secondary whitespace-nowrap">Année :</span>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            disabled={isLoadingYear}
            className="border border-default rounded-xl px-3 py-1.5 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm disabled:opacity-50"
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
              <h5 className="text-xs font-semibold text-primary">
                Nouveau jour
              </h5>
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
                className="border border-default rounded-lg px-2.5 py-1.5 text-xs bg-white shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none"
              />

              <select
                value={newTypeId || (selectedDayTypeId !== "all" ? selectedDayTypeId : null) || setting.dayTypesOptions?.[0]?.Id || ""}
                onChange={(e) => setNewTypeId(e.target.value)}
                className="border border-default rounded-lg px-2.5 py-1.5 text-xs bg-white shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none truncate"
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
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "Valider"
                )}
              </button>
            </div>

            {dateErrorMessage && (
              <p className="text-[11px] text-red-500 font-medium">{dateErrorMessage}</p>
            )}
            {error && (
              <p className="text-[11px] text-red-500 font-medium">{error}</p>
            )}
          </div>
        ))
      }

      {/* Liste des jours */}
      <div className="bg-white/60 rounded-xl p-3 min-h-[160px] relative flex-1 min-h-0 border border-light overflow-y-auto">
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
                    <div key={dateKey} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-primary/10 rounded-xl p-2.5 shadow-sm border border-primary/30 gap-2">
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="date"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1 text-xs bg-white shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none"
                        />

                        <select
                          value={editTypeIdValue}
                          onChange={(e) => setEditTypeIdValue(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1 text-xs bg-white shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none truncate"
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
                          className="text-secondary bg-white p-1.5 rounded-lg border border-light transition-all cursor-pointer shadow-xs hover:bg-secondary/10"
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
                const currentTypeObj = setting.dayTypesOptions?.find((dt: any) => String(dt.Id) === String(itemObj.TypeJourCode));
                const formattedDateStr = format(dateObj, "dd/MM/yyyy");

                return (
                  <div key={dateKey} className="flex items-center justify-between bg-white rounded-lg p-2.5 shadow-sm border border-light hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                        style={{ backgroundColor: currentTypeColor }} 
                        title={currentTypeObj?.Libelle || `Type ID: ${itemObj.TypeJourCode}`}
                      />
                      <span className="text-xs font-medium text-primary">
                        {formattedDateStr}
                      </span>
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
                          className={"text-secondary hover:text-primary p-1 rounded transition-all cursor-pointer" + (isDeletingThisDate || !canEdit ? " disabled" : "")}
                          title="Modifier le jour (date et type)"
                          onClick={() => handleStartEdit(dateKey, val)}
                          disabled={isDeletingThisDate || !canEdit}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          className={"text-red-400 hover:text-red-600 p-1 rounded transition-all cursor-pointer disabled:opacity-50" + (isDeletingThisDate || !canDelete ? " disabled" : "")}
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
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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


const  SettingsModalContent: React.FC<{
  onClose: () => void;
  settings: any;
  currentCategoryObj: any;
  apiError: string | null;
  setApiError: (err: string | null) => void;
  selectedDayTypeId: string | null;
  setSelectedDayTypeId: (id: string | null) => void;
  pendingSaveAction: { isDirty: boolean; save: () => Promise<void> } | null;
  setPendingSaveAction: React.Dispatch<React.SetStateAction<{ isDirty: boolean; save: () => Promise<void> } | null>>;
  handleFooterSave: () => Promise<void>;
  isSavingPending: boolean;
}> = ({
  onClose,
  settings,
  currentCategoryObj,
  apiError,
  setApiError,
  selectedDayTypeId,
  setSelectedDayTypeId,
  pendingSaveAction,
  setPendingSaveAction,
  handleFooterSave,
  isSavingPending,
}) => {
  // Récupération de la méthode de fermeture sécurisée avec sauvegarde depuis la Modal
  const { handleCloseWithSave } = useModalContext();


  return (
    <div className="flex flex-col h-full min-h-0 poppins gap-4">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="bg-secondary-bg px-5 shadow-sm flex flex-col min-h-0 overflow-y-auto flex-1">
          {currentCategoryObj && (
            <div className="flex flex-col h-full min-h-0">

              {apiError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-700 text-sm poppins shadow-sm shrink-0">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

              {currentCategoryObj.key === "daysManagement" ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
                  {/* PANNEAU GAUCHE */}
                  <div className="lg:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
                    <h4 className="text-sm font-semibold text-primary pb-2 border-b border-ultra-light">
                      Types de jours
                    </h4>
                    {currentCategoryObj.items?.find((item: any) => item.type === "day-type-settings")?.canAdd && (
                      <NewDayTypeForm
                        onAdd={currentCategoryObj.items?.find((item: any) => item.type === "day-type-settings")?.onAddDayType}
                        setError={setApiError}
                      />
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
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
                              : "bg-white border border-light hover:bg-primary/5 text-primary"
                          }`}
                        >
                          <span>Voir les jours</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {currentCategoryObj.items?.find((item: any) => item.type === "day-type-settings")?.dayTypes?.map((dayType: DayType) => {
                        const dayTypeSetting = currentCategoryObj.items?.find((item: any) => item.type === "day-type-settings");
                        return (
                          <DayTypeSingleEditor
                            key={dayType.Id}
                            dayType={dayType}
                            isSelected={String(dayType.Id) === String(selectedDayTypeId)}
                            onSelect={() => setSelectedDayTypeId(String(dayType.Id))}
                            onUpdate={dayTypeSetting?.onUpdateDayType}
                            onCheckDelete={dayTypeSetting?.onCheckDeleteDayType}
                            onDelete={async (id: string | number, count: number) => {
                              const result = await dayTypeSetting?.onDeleteDayType?.(id, count)
                              
                              if (result?.success) {
                                setSelectedDayTypeId("all");  
                              }

                              return result;
                            }}
                            setError={setApiError}
                            canEdit={dayTypeSetting?.canEdit}
                            canDelete={dayTypeSetting?.canDelete}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* PANNEAU DROIT */}
                  <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-ultra-light pt-6 lg:pt-0 lg:pl-6 flex flex-col min-h-0 overflow-y-auto">
                    {currentCategoryObj.items?.find((item: any) => item.type === "custom-non-working-dates") ? (
                      <NonWorkingDaysEditor
                        setting={currentCategoryObj.items?.find((item: any) => item.type === "custom-non-working-dates")}
                        selectedDayTypeId={selectedDayTypeId}
                        setSelectedDayTypeId={setSelectedDayTypeId}
                        canAdd={currentCategoryObj.items?.find((item: any) => item.type === "custom-non-working-dates")?.canAdd}
                        canEdit={currentCategoryObj.items?.find((item: any) => item.type === "custom-non-working-dates")?.canEdit}
                        canDelete={currentCategoryObj.items?.find((item: any) => item.type === "custom-non-working-dates")?.canDelete}
                      />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/40 rounded-xl border border-dashed border-light min-h-[250px]">
                        <p className="text-sm font-medium text-secondary poppins">Aucune donnée de configuration</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 flex-1">
                  {currentCategoryObj.items.map((setting: any, settingIdx: number) => (
                    <div
                      key={setting.id}
                      className={`flex flex-col lg:flex-row  justify-between  ${
                        settingIdx !== currentCategoryObj.items.length - 1 ? "border-b border-ultra-light pb-4" : ""
                        }
                        ${setting.type === "mobile-appointment-fields" ? "h-full" : "lg:items-center"}`
                      }
                    >
                      {setting.type === "default-display-settings" ? (
                        <DefaultDisplaySettingsEditor setting={setting} registerSaveAction={setPendingSaveAction} />
                      ) : setting.type === "mobile-appointment-fields" ? (
                        <MobileDisplayEditor setting={setting} registerSaveAction={setPendingSaveAction} />
                      ) : setting.type === "select" ? (
                        <div className="flex flex-col gap-2">
                          <label htmlFor={setting.id} className="text-sm font-medium text-primary">
                            {setting.label}
                          </label>
                          <select
                            id={setting.id}
                            className="border border-default rounded-xl px-4 py-3 text-sm bg-transparent shadow-sm"
                            value={setting.value}
                            onChange={(e) => setting.onChange(e.target.value)}
                          >
                            {setting.options?.map((option: any) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex justify-end pt-3 border-t border-ultra-light shrink-0 gap-3">
        <button
          type="button"
          className={`px-8 py-3 rounded-xl active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md cursor-pointer ${
            pendingSaveAction?.isDirty
              ? "bg-secondary-bg border border-light text-primary hover:bg-secondary/10"
              : "bg-primary text-white hover:bg-primary-600"
          }`}
          onClick={handleCloseWithSave}
          disabled={isSavingPending}
        >
          Fermer
        </button>

        {(pendingSaveAction?.isDirty || isSavingPending) && (
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
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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


const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isSettingsOpen,
  settings,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    return sessionStorage.getItem('activeSettingsCategory') || settings?.[0]?.category || "";
  });

  const [selectedDayTypeId, setSelectedDayTypeId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [pendingSaveAction, setPendingSaveAction] = useState<{ isDirty: boolean; save: () => Promise<void> } | null>(null);
  const [isSavingPending, setIsSavingPending] = useState(false);

  const hasFetchedRef = useRef(false);

  const currentCategoryObj = useMemo(() => {
    return settings.find((cat: any) => cat.key === activeCategory) || settings[0];
  }, [settings, activeCategory]);

  useEffect(() => {
    if (isSettingsOpen && !hasFetchedRef.current) { 
      hasFetchedRef.current = true;
      settings.forEach((cat: any) => {
        cat.items?.forEach((setting: any) => {
          if (setting.type === "day-type-settings" && typeof setting.fetchDayTypes === "function") {
            setting.fetchDayTypes().then((res: any) => {
              if (res && !res.success && res.message) {
                setApiError(res.message);
              }
            }).catch((err: any) => {
              setApiError(err?.message || "Erreur lors du chargement des types de jours.");
            });
          }
        });
      });
    }

    if (!isSettingsOpen) {
      setApiError(null);
      setPendingSaveAction(null);
      setSelectedDayTypeId(null);
    }
  }, [isSettingsOpen, settings]);

  const handleFooterSave = async () => {
    if (!pendingSaveAction?.save) return;
    setIsSavingPending(true);
    setApiError(null);
    try {
      await pendingSaveAction.save();
      setIsSavingPending(false);
    } catch (error: any) {
      setApiError(error?.message || "Erreur lors de la sauvegarde.");
      setIsSavingPending(false);
    }
  };

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={onClose}
      title={currentCategoryObj?.category || "Paramètres"}
      className={`${
        currentCategoryObj?.key === 'daysManagement' 
          ? 'w-[min(98vw,1500px)]' 
          : currentCategoryObj?.key === 'mobileAppointmentFields'
            ? 'w-[min(95vw,1400px)]'
            : 'w-[min(95vw,900px)]'
      } h-[90vh] max-h-[950px] overflow-hidden flex flex-col`}
      classNameContent="flex-1 overflow-hidden p-4 flex flex-col min-h-0"
      confirmCloseOnOverlay={currentCategoryObj?.hasUnsavedChanges && pendingSaveAction?.isDirty}
      onSave={handleFooterSave}
    >
      <SettingsModalContent
        onClose={onClose}
        settings={settings}
        currentCategoryObj={currentCategoryObj}
        apiError={apiError}
        setApiError={setApiError}
        selectedDayTypeId={selectedDayTypeId}
        setSelectedDayTypeId={setSelectedDayTypeId}
        pendingSaveAction={pendingSaveAction}
        setPendingSaveAction={setPendingSaveAction}
        handleFooterSave={handleFooterSave}
        isSavingPending={isSavingPending}
      />
    </Modal>
  );
};

export default memo(SettingsModal);