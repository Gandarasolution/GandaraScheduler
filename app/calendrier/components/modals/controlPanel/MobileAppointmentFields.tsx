import { MobileAppointmentDisplayConfig } from "@/app/calendrier/types";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AppointmentCard } from "../../Calendar";
import { DragOverTarget, MobileAppointmentFieldOption } from "../../Calendar/MobileCalendar/AppointmentList";
import { SaveAction, previewAppointment, previewItem, previewEmployee } from "./ControlPanelModal";
import { Loader } from "../..";


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
      <div className="w-full flex items-center justify-center min-h-[300px] bg-secondary/40 rounded-xl border border-dashed border-light">
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
        <div className="rounded-xl border border-default bg-secondary/50 p-2.5 space-y-3">
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
                  className={`flex cursor-grab items-center gap-1 rounded-lg border border-dashed border-default bg-primary-500-bg px-2 py-1 text-xs text-primary shadow-2xs active:cursor-grabbing hover:border-primary transition-colors ${
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
                  className={`flex cursor-grab items-center gap-1 rounded-lg border border-dashed border-default bg-primary-500-bg px-2 py-1 text-xs text-primary shadow-2xs active:cursor-grabbing hover:border-primary transition-colors ${
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
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-light bg-primary-500/5 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary">Concepteur d’affichage</span>
                <button
                  type="button"
                  onClick={() => addRow("primaryFields")}
                  className="cursor-pointer px-2 py-0.5 rounded border border-dashed border-primary/40 text-[10px] font-medium text-primary hover:bg-primary-500/10 transition-colors"
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


export const MobileAppointmentFieldsCategoryContent: React.FC<{
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
