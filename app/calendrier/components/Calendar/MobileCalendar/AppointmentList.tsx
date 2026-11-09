import React, { memo, useRef, useState } from 'react';
import { Appointment, Item, MobileAppointmentDisplayConfig, User } from '../../../types/index';
import { CalendarDays, CheckCircle2, Clock, FileText, Folder, HardHat, MessageSquareText, Tag, UserRound, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentListProps {
  appointments: Appointment[];
  selectedDate: Date;
  items: Item[];
  employees: User[];
  displayConfig: MobileAppointmentDisplayConfig;
}

export type DragOverTarget = {
  column: "primaryFields" | "secondaryFields";
  rowIndex: number;
  fieldCode?: string;
  blocked?: boolean;
  insertRow?: boolean;
  surface?: "fieldNames" | "values";
} | null;

export interface MobileAppointmentFieldOption {
  Id: number;
  Libelle: string;
  Code: string;
  CaractereSpecial: boolean;
}

const MAX_SECONDARY_FIELDS = 2;
const MAX_FIELDS_PER_PRIMARY_ROW = 3;
const MAX_TITLE_FIELDS = 3;
const MAX_ROWS = 5;
const STANDARD_FIELD_CODES = new Set([
  "LibellePlanningRessource",
  "Type",
  "DebutPlanningEvenement",
  "FinPlanningEvenement",
  "AnnotationPlanningEvenement",
  "IdEmploye",
  "EtapeValidation",
  "Etiquette",
  "ChefChantier",
  "ChargeAffaire",
]);

interface AppointmentCardProps {
  app: Appointment;
  items: Item[];
  employees: User[];
  displayConfig: MobileAppointmentDisplayConfig;
  mobileAppointmentFieldOptions?: MobileAppointmentFieldOption[];
  preview?: boolean;
  showCard?: boolean;
  showFieldNamesCard?: boolean;
  fieldNamesColumn?: "primaryFields" | "secondaryFields";
  dragSurface?: "fieldNames" | "values";
  draggedFieldCode?: string;
  dragOverInfo?: DragOverTarget;
  onPreviewDrop?: (event: React.DragEvent<HTMLDivElement>, column: "primaryFields" | "secondaryFields", rowIndex?: number, fieldCode?: string, insertRow?: boolean) => void;
  onPreviewDragOver?: (event: React.DragEvent<HTMLDivElement>, column: "primaryFields" | "secondaryFields", rowIndex: number, fieldCode?: string, blocked?: boolean, insertRow?: boolean, surface?: "fieldNames" | "values") => void;
  onPreviewDragLeave?: () => void;
  onRemoveField?: (column: "primaryFields" | "secondaryFields", fieldCode: string) => void;
  onRemoveRow?: (column: "primaryFields" | "secondaryFields", rowIndex: number) => void;
  onFieldDragStart?: (event: React.DragEvent, column: "primaryFields" | "secondaryFields", fieldCode: string) => void;
  highlightedFieldCode?: string;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  app,
  items,
  employees,
  displayConfig,
  mobileAppointmentFieldOptions = [],
  preview = false,
  showCard = true,
  showFieldNamesCard = false,
  fieldNamesColumn = "primaryFields",
  dragSurface = "values",
  draggedFieldCode,
  dragOverInfo = null,
  onPreviewDrop,
  onPreviewDragOver,
  onPreviewDragLeave,
  onRemoveField,
  onRemoveRow,
  onFieldDragStart,
  highlightedFieldCode,
}) => {
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const activeDragOverInfo = dragOverInfo?.surface === dragSurface ? dragOverInfo : null;
  const fieldNamesDragOverInfo = dragOverInfo?.surface === "fieldNames" ? dragOverInfo : null;

  const item = items.find(i => i.IdPlanningRessource === app.IdPlanningRessource);
  const isProjectAppointment = item?.Type === 'Projet';
  const employee = employees.find(e => e.IdPersonnel === app.IdEmploye);
  const startDate = new Date(app.DebutPlanningEvenement);
  const endDate = new Date(app.FinPlanningEvenement);
  const formatDate = (value: Date) => format(value, 'dd/MM/yyyy HH:mm', { locale: fr });

  const customResolvers: Partial<Record<string, () => string>> = {
    Type: () => (isProjectAppointment ? 'Chantier' : (item?.Type || '')),
    DebutPlanningEvenement: () => formatDate(startDate),
    FinPlanningEvenement: () => formatDate(endDate),
    IdEmploye: () => (employee ? `${employee.Nom} ${employee.Prenom}`.trim() : ''),
    Etiquette: () => app.Etiquette?.LibelleLongPlanningEtiquette || '',
    ChefChantier: () => (item?.Type === 'Projet' ? item.ChefChantier || '' : ''),
    ChargeAffaire: () => (item?.Type === 'Projet' ? item.ChargeAffaire || '' : ''),
  };

  const renderRowInsertionZone = (
    column: "primaryFields" | "secondaryFields",
    rowIndex: number,
    rowCount: number,
    surface: "fieldNames" | "values" = dragSurface
  ) => {
    if (!preview) return null;

    const blocked = rowCount >= MAX_ROWS;
    const surfaceDragOverInfo = dragOverInfo?.surface === surface ? dragOverInfo : null;
    const isTarget = surfaceDragOverInfo?.column === column &&
      surfaceDragOverInfo?.rowIndex === rowIndex &&
      surfaceDragOverInfo?.insertRow;

    return (
      <div
        key={`${column}-insert-row-${rowIndex}`}
        className={`h-3 -my-1 flex items-center rounded transition-colors ${
          isTarget
            ? blocked
              ? 'bg-red-100'
              : 'bg-primary/10'
            : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = blocked ? 'none' : 'move';
          onPreviewDragOver?.(e, column, rowIndex, undefined, blocked, true, surface);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPreviewDragLeave?.();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!blocked) onPreviewDrop?.(e, column, rowIndex, undefined, true);
        }}
        aria-label={blocked ? 'Nombre maximum de lignes atteint' : 'Insérer une ligne'}
      >
        {isTarget && (
          <span className={`h-0.5 w-full rounded ${blocked ? 'bg-red-500' : 'bg-primary'}`} />
        )}
      </div>
    );
  };

  const isConfiguredSpecialField = (field: string) =>
    displayConfig.specialFields?.includes(field) === true;

  const getFieldValue = (field: string): string => {
    if (isConfiguredSpecialField(field)) return field;
    if (field in customResolvers) {
      return customResolvers[field]!();
    }
    const sources = [item, app] as Array<Record<string, unknown> | undefined>;
    const normalizedField = field.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const specialFieldContainers = ["ChampsSpeciaux", "champsSpeciaux", "SpecialFields", "specialFields", "Champs", "champs"];
    const value = sources.reduce<unknown>((result, source) => {
      if (result !== undefined && result !== null && result !== "") return result;
      if (!source) return result;

      const directValue = source[field];
      if (directValue !== undefined && directValue !== null && directValue !== "") return directValue;

      for (const containerName of specialFieldContainers) {
        const container = source[containerName];
        if (!container || typeof container !== "object") continue;
        const entries = Array.isArray(container)
          ? container.map((entry) => {
              if (!entry || typeof entry !== "object") return [null, entry] as const;
              const valueObject = entry as Record<string, unknown>;
              return [
                valueObject.Code ?? valueObject.CodeChamp ?? valueObject.code ?? valueObject.codeChamp,
                valueObject.value ?? valueObject.Value ?? valueObject.Valeur ?? valueObject.valeur ?? valueObject,
              ] as const;
            })
          : Object.entries(container as Record<string, unknown>);
        const match = entries.find(([key]) =>
          typeof key === "string" &&
          (key === field || key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalizedField)
        );
        if (match) {
          const matchedValue = match[1];
          if (matchedValue && typeof matchedValue === "object") {
            const valueObject = matchedValue as Record<string, unknown>;
            return valueObject.value ?? valueObject.Value ?? valueObject.Valeur ?? matchedValue;
          }
          return matchedValue;
        }
      }
      return result;
    }, undefined);
    if (field === 'LibellePlanningRessource' && !value) {
      return 'Rendez-vous';
    }
    if ((value === undefined || value === null || value === "") && !STANDARD_FIELD_CODES.has(field)) {
      return field;
    }
    return value != null ? String(value) : '';
  };

  const getFields = (fields: string[]) => fields
    .map(field => ({ field, value: getFieldValue(field) }))
    .filter(({ value }) => value);

  const primaryRows = displayConfig.primaryFieldRows?.length
    ? displayConfig.primaryFieldRows
    : [displayConfig.primaryFields];

  const rawSecondaryRows = displayConfig.secondaryFieldRows?.length
    ? displayConfig.secondaryFieldRows
    : [displayConfig.secondaryFields];

  const displayedPrimaryRows = isProjectAppointment
    ? primaryRows
    : [['LibellePlanningRessource']];
  const displayedSecondaryRows = isProjectAppointment ? rawSecondaryRows : [];

  const getFieldOption = (field: string) => mobileAppointmentFieldOptions
    .find((option) => option.Code === field);

  const getFieldLabel = (field: string) => {
    if (field === 'AdresseChantier') return 'Adresse du chantier';
    return getFieldOption(field)?.Libelle || field;
  };
    
  const isSpecialField = (field: string) =>
    isConfiguredSpecialField(field) || mobileAppointmentFieldOptions
      .find((option) => option.Code === field)
      ?.CaractereSpecial === true;
    
  // CORRECTION ICI : on ne filtre plus les champs secondaires si le champ est déjà dans primaryRows
  const secondaryRows = displayedSecondaryRows;
  
  const primaryFields = displayedPrimaryRows.flatMap(getFields);
  const secondaryFields = secondaryRows.flatMap(getFields);
  const titleRow = getFields(displayedPrimaryRows[0] || []).filter(({ field }, index, fields) =>
    fields.slice(0, index).length < MAX_TITLE_FIELDS
  );
  const titleField = titleRow[0] || primaryFields[0];
  const canRenderCard = showCard;
  const fieldNameRows = fieldNamesColumn === "primaryFields"
    ? displayedPrimaryRows
    : secondaryRows;

  const renderFieldNamesCard = () => {
    if (!showFieldNamesCard) return null;

    const isPrimary = fieldNamesColumn === "primaryFields";
    const nameRows = fieldNameRows.map((row) => row.filter((field) => getFieldLabel(field)));

    return (
      <div
        className={`${preview ? 'rounded-xl p-3 mb-0' : 'rounded-3xl p-5 mb-4'} border mb-5 flex items-start group transition-all duration-300`}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {isPrimary && (
          <div
            className="w-1.5 h-12 rounded-full mr-4 mt-1 shrink-0"
            style={{ backgroundColor: item?.CouleurFondPlanningRessource || 'var(--color-primary-500)' }}
          />
        )}
        <div className="flex-1 min-w-0">
          {isPrimary ? (
            <>
              <h3 className={`${preview ? 'text-sm overflow-visible' : 'text-base truncate'} font-semibold mb-1`} style={{ color: 'var(--text-primary)' }}>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  {(nameRows[0] || []).map((field, index) => (
                    <React.Fragment key={field}>
                      {index > 0 && <span aria-hidden="true">·</span>}
                      {renderFieldWithDropZone(
                        "primaryFields",
                        0,
                        field,
                        <span>{getFieldLabel(field)}</span>,
                        "fieldNames"
                      )}
                    </React.Fragment>
                  ))}
                </span>
              </h3>
              <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {nameRows.slice(1, 5).map((row, rowIndex) => (
                  <React.Fragment key={`field-names-primary-row-${rowIndex}`}>
                    {renderRowInsertionZone("primaryFields", rowIndex + 1, nameRows.length, "fieldNames")}
                  <div
                    className={`relative flex min-w-0 items-center gap-1 flex-wrap min-h-[20px] rounded p-0.5 pr-6 ${
                      isBlockedRowTarget("primaryFields", rowIndex + 1, "fieldNames") ? 'pb-4' : ''
                    } ${
                      fieldNamesDragOverInfo?.column === "primaryFields" &&
                      fieldNamesDragOverInfo?.rowIndex === rowIndex + 1 &&
                      !fieldNamesDragOverInfo?.fieldCode &&
                      !fieldNamesDragOverInfo?.insertRow
                        ? fieldNamesDragOverInfo?.blocked
                          ? 'ring-1 ring-dashed ring-red-500 bg-red-50 text-red-600'
                          : 'ring-1 ring-dashed ring-primary bg-primary/5'
                        : ''
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      const blocked = isRowFull(
                        "primaryFields",
                        rowIndex + 1,
                        row,
                        draggedFieldCode || event.dataTransfer.getData("text/plain")
                      );
                      event.dataTransfer.dropEffect = blocked ? "none" : "move";
                      onPreviewDragOver?.(event, "primaryFields", rowIndex + 1, undefined, blocked, false, "fieldNames");
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const blocked = isRowFull(
                        "primaryFields",
                        rowIndex + 1,
                        row,
                        draggedFieldCode || event.dataTransfer.getData("text/plain")
                      );
                      if (!blocked) onPreviewDrop?.(event, "primaryFields", rowIndex + 1);
                    }}
                  >
                    {row.map((field, fieldIndex) => (
                      <React.Fragment key={field}>
                        {fieldIndex > 0 && <span aria-hidden="true">·</span>}
                        {renderFieldWithDropZone(
                          "primaryFields",
                          rowIndex + 1,
                          field,
                          <span className="font-medium">{getFieldLabel(field)}</span>,
                          "fieldNames"
                        )}
                      </React.Fragment>
                    ))}
                    {renderBlockedRowMessage("primaryFields", rowIndex + 1, "fieldNames")}
                  </div>
                  </React.Fragment>
                ))}
                {renderRowInsertionZone("primaryFields", nameRows.length, nameRows.length, "fieldNames")}
              </div>
            </>
          ) : (
            <>
            <h2 className={`${preview ? 'text-sm' : 'text-[18px]'} font-semibold text-primary mb-2`}>
              Détails du rendez-vous
            </h2>
            <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {nameRows.map((row, rowIndex) => (
                <React.Fragment key={`field-names-secondary-row-${rowIndex}`}>
                {renderRowInsertionZone("secondaryFields", rowIndex, nameRows.length, "fieldNames")}
                <div
                  className={`relative min-w-0 min-h-[56px] py-2 pr-6 flex items-start gap-1 border-b border-ultra-light last:border-b-0 ${
                    isBlockedRowTarget("secondaryFields", rowIndex, "fieldNames") ? 'pb-7' : ''
                  } ${
                    fieldNamesDragOverInfo?.column === "secondaryFields" &&
                    fieldNamesDragOverInfo?.rowIndex === rowIndex &&
                    !fieldNamesDragOverInfo?.fieldCode &&
                    !fieldNamesDragOverInfo?.insertRow
                      ? fieldNamesDragOverInfo?.blocked
                        ? 'ring-1 ring-dashed ring-red-500 bg-red-50 text-red-600'
                        : 'ring-1 ring-dashed ring-primary bg-primary/5'
                      : ''
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    const blocked = isRowFull(
                      "secondaryFields",
                      rowIndex,
                      row,
                      draggedFieldCode || event.dataTransfer.getData("text/plain")
                    );
                    event.dataTransfer.dropEffect = blocked ? "none" : "move";
                    onPreviewDragOver?.(event, "secondaryFields", rowIndex, undefined, blocked, false, "fieldNames");
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const blocked = isRowFull(
                      "secondaryFields",
                      rowIndex,
                      row,
                      draggedFieldCode || event.dataTransfer.getData("text/plain")
                    );
                    if (!blocked) onPreviewDrop?.(event, "secondaryFields", rowIndex);
                  }}
                >
                  {row.map((field, fieldIndex) => (
                    <React.Fragment key={field}>
                      {fieldIndex > 0 && <span aria-hidden="true">·</span>}
                      {renderFieldWithDropZone(
                        "secondaryFields",
                        rowIndex,
                        field,
                        <span className="flex min-w-0 items-start gap-1">
                        {!isSpecialField(field) && (
                          <span className="mt-0.5 shrink-0 text-secondary">
                            {getFieldIcon(field)}
                          </span>
                        )}
                        <span className="font-medium">{getFieldLabel(field)}</span>
                        </span>,
                        "fieldNames"
                      )}
                    </React.Fragment>
                  ))}
                  {renderBlockedRowMessage("secondaryFields", rowIndex, "fieldNames")}
                </div>
                </React.Fragment>
              ))}
              {renderRowInsertionZone("secondaryFields", nameRows.length, nameRows.length, "fieldNames")}
            </div>
            </>
          )}
        </div>
      </div>
    );
  };

  
  const countFields = (fields: string[], excludedField?: string) =>
    fields.filter((field) => field !== excludedField).length;
  const getRowLimit = (column: "primaryFields" | "secondaryFields", rowIndex: number) => {
    if (column === "secondaryFields") return MAX_SECONDARY_FIELDS;
    return rowIndex === 0 ? MAX_TITLE_FIELDS : MAX_FIELDS_PER_PRIMARY_ROW;
  };
  const isRowFull = (
    column: "primaryFields" | "secondaryFields",
    rowIndex: number,
    fields: string[],
    draggedField?: string
  ) =>
    countFields(fields, draggedField) >= getRowLimit(column, rowIndex);

  const isBlockedRowTarget = (
    column: "primaryFields" | "secondaryFields",
    rowIndex: number,
    surface: "fieldNames" | "values" = dragSurface
  ) =>
    preview &&
    dragOverInfo?.surface === surface &&
    dragOverInfo.column === column &&
    dragOverInfo.rowIndex === rowIndex &&
    dragOverInfo.blocked === true;

  const renderBlockedRowMessage = (
    column: "primaryFields" | "secondaryFields",
    rowIndex: number,
    surface: "fieldNames" | "values" = dragSurface
  ) => {
    if (
      !preview ||
      dragOverInfo?.surface !== surface ||
      dragOverInfo.column !== column ||
      dragOverInfo.rowIndex !== rowIndex ||
      !isBlockedRowTarget(column, rowIndex, surface)
    ) {
      return null;
    }

    return (
      <span className="pointer-events-none absolute bottom-0 left-1 right-6 text-[11px] font-medium leading-4 text-red-600" role="status">
        Ligne pleine : impossible d&apos;ajouter un élément
      </span>
    );
  };

  const getFieldIcon = (field: string) => {
    const iconProps = { size: 16, strokeWidth: 1.8 };
    switch (field) {
      case 'LibellePlanningRessource': return <Folder {...iconProps} />;
      case 'AnnotationPlanningEvenement': return <MessageSquareText {...iconProps} />;
      case 'ChargeAffaire': return <UserRound {...iconProps} />;
      case 'ChefChantier': return <HardHat {...iconProps} />;
      case 'DebutPlanningEvenement':
      case 'FinPlanningEvenement': return <CalendarDays {...iconProps} />;
      case 'EtapeValidation': return <CheckCircle2 {...iconProps} />;
      case 'Etiquette': return <Tag {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  const renderFieldWithDropZone = (
    column: "primaryFields" | "secondaryFields",
    rowIndex: number,
    fieldCode: string,
    content: React.ReactNode,
    surface: "fieldNames" | "values" = dragSurface
  ) => {
    if (!preview) return content;

    const isTarget = dragOverInfo?.surface === surface &&
      dragOverInfo?.column === column &&
      dragOverInfo?.rowIndex === rowIndex &&
      dragOverInfo?.fieldCode === fieldCode;
    const draggedCode = draggedFieldCode;
    const rowFields = column === "primaryFields"
      ? displayedPrimaryRows[rowIndex] || []
      : secondaryRows[rowIndex] || [];
    const blocked = isRowFull(column, rowIndex, rowFields, draggedCode);
    const isHighlighted = highlightedFieldCode === fieldCode;

    return (
      <div
        key={fieldCode}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onFieldDragStart?.(e, column, fieldCode);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPreviewDragOver?.(e, column, rowIndex, fieldCode, blocked, false, surface);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPreviewDragLeave?.();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!blocked) onPreviewDrop?.(e, column, rowIndex, fieldCode, false);
        }}
        className={`overflow-visible relative group/field inline-flex w-fit min-w-0 max-w-full items-center cursor-grab active:cursor-grabbing ${
          isHighlighted ? 'ring-2 ring-primary ring-offset-1 rounded' : ''
        }`}
      >
        {isTarget && (
          <span className="absolute -left-1 top-0 bottom-0 w-1 bg-primary rounded-full z-20 animate-pulse" />
        )}
        
        {content}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveField?.(column, fieldCode);
          }}
          className="cursor-pointer ml-1 shrink-0 opacity-0 group-hover/field:opacity-100 p-0.5 text-red-500 hover:bg-red-50 rounded transition-opacity"
          title="Retirer ce champ"
        >
          <X size={12} />
        </button>
      </div>
    );
  };

  return (
    <div
      className={preview ? "rounded-xl outline-none" : undefined}
      onDragStart={preview ? (e) => e.stopPropagation() : undefined}
      onDragEnter={preview ? (e) => e.stopPropagation() : undefined}
      onDragOver={preview ? (e) => e.stopPropagation() : undefined}
      onDrop={preview ? (e) => e.stopPropagation() : undefined}
    >
      {renderFieldNamesCard()}
      {canRenderCard && (
        <div 
          className={`${preview ? 'rounded-xl p-3 mb-0' : 'rounded-3xl p-5 mb-4'} border flex items-start group transition-all duration-300 ${!preview ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (!preview && isProjectAppointment) setIsSecondaryOpen(true);
          }}
          onKeyDown={(event) => {
            if (!preview && isProjectAppointment && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              setIsSecondaryOpen(true);
            }
          }}
          role={!preview && isProjectAppointment ? 'button' : undefined}
          tabIndex={!preview && isProjectAppointment ? 0 : undefined}
          style={{
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow-sm)',
            borderColor: 'var(--border-light)'
          }}
        >
          <div 
            className="w-1.5 h-12 rounded-full mr-4 mt-1 shrink-0" 
            style={{ backgroundColor: item?.CouleurFondPlanningRessource || 'var(--color-primary-500)' }}
          />
          <div className="flex-1 min-w-0">
            <h3
              className={`${preview ? 'text-sm overflow-visible' : 'text-base truncate'} relative font-semibold mb-1 transition-colors rounded ${
                isBlockedRowTarget("primaryFields", 0) ? 'pb-4' : ''
              } ${
                isRowFull("primaryFields", 0, displayedPrimaryRows[0] || [], draggedFieldCode) ? 'cursor-not-allowed' : 'cursor-copy'
              } ${
                preview && activeDragOverInfo?.column === 'primaryFields' && activeDragOverInfo?.rowIndex === 0 && !activeDragOverInfo?.fieldCode
                  ? activeDragOverInfo?.blocked
                    ? 'ring-1 ring-dashed ring-red-500 bg-red-50 text-red-600'
                    : 'ring-1 ring-dashed ring-primary bg-primary/5'
                  : ''
              }`}
              onDragOver={(e) => {
                if (!preview) return;
                const blocked = isRowFull(
                  "primaryFields",
                  0,
                  displayedPrimaryRows[0] || [],
                  draggedFieldCode || e.dataTransfer.getData("text/plain")
                );
                if (blocked) {
                  e.dataTransfer.dropEffect = 'none';
                  e.preventDefault();
                  e.stopPropagation();
                  onPreviewDragOver?.(e, "primaryFields", 0, titleField?.field, true, false, dragSurface);
                  return;
                }
                e.preventDefault();
                e.stopPropagation();
                onPreviewDragOver?.(e, "primaryFields", 0, titleField?.field, undefined, false, dragSurface);
              }}
              onDragLeave={(e) => {
                if (!preview) return;
                e.preventDefault();
                onPreviewDragLeave?.();
              }}
              onDrop={(e) => {
                if (!preview) return;
                e.preventDefault();
                e.stopPropagation();
                onPreviewDrop?.(e, "primaryFields", 0, titleField?.field);
              }}
            >
              <span className="inline-flex items-center gap-0.5">
                {titleField?.value ? (
                  renderFieldWithDropZone("primaryFields", 0, titleField.field, <span>{titleField.value}</span>)
                ) : (
                  <span className="italic text-gray-400">Rendez-vous</span>
                )}
                {titleRow.slice(1).map(({ field, value }) =>
                  renderFieldWithDropZone(
                    "primaryFields",
                    0,
                    field,
                    <span key={field} className={isSpecialField(field) ? 'ml-0' : 'ml-1'}>{value}</span>
                  )
                )}
              </span>
              {renderBlockedRowMessage("primaryFields", 0)}
            </h3>

            <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {displayedPrimaryRows.slice(1, 5).map((row, rowIndex) => {
                const actualRowIndex = rowIndex + 1;
                const fields = getFields(row);
                return (
                  <React.Fragment key={`primary-row-${actualRowIndex}`}>
                    {renderRowInsertionZone("primaryFields", actualRowIndex, displayedPrimaryRows.length)}
                    <div
                      className={`relative flex min-w-0 items-center gap-1 flex-wrap min-h-[20px] rounded p-0.5 pr-6 ${
                        isBlockedRowTarget("primaryFields", actualRowIndex) ? 'pb-4' : ''
                      } ${
                        isRowFull("primaryFields", actualRowIndex, row, draggedFieldCode) ? 'cursor-not-allowed' : 'cursor-copy'
                      } ${
                        preview && activeDragOverInfo?.column === 'primaryFields' && activeDragOverInfo?.rowIndex === actualRowIndex && !activeDragOverInfo?.fieldCode && !activeDragOverInfo?.insertRow
                          ? activeDragOverInfo?.blocked
                            ? 'ring-1 ring-dashed ring-red-500 bg-red-50 text-red-600'
                            : 'ring-1 ring-dashed ring-primary bg-primary/5'
                          : ''
                      }`}
                      onDragOver={(e) => {
                        if (!preview) return;
                        const blocked = isRowFull(
                          "primaryFields",
                          actualRowIndex,
                          row,
                          draggedFieldCode || e.dataTransfer.getData("text/plain")
                        );
                        e.dataTransfer.dropEffect = blocked ? 'none' : 'move';
                        e.preventDefault();
                        onPreviewDragOver?.(e, "primaryFields", actualRowIndex, undefined, blocked, false, dragSurface);
                      }}
                      onDrop={(e) => {
                        if (!preview) return;
                        e.preventDefault();
                        const blocked = isRowFull(
                          "primaryFields",
                          actualRowIndex,
                          row,
                          draggedFieldCode || e.dataTransfer.getData("text/plain")
                        );
                        if (!blocked) onPreviewDrop?.(e, "primaryFields", actualRowIndex);
                      }}
                    >
                      {fields.map(({ field, value }) => (
                        <React.Fragment key={field}>
                          {renderFieldWithDropZone("primaryFields", actualRowIndex, field, <span className="max-w-full break-words">{value}</span>)}
                        </React.Fragment>
                      ))}
                      {renderBlockedRowMessage("primaryFields", actualRowIndex)}
                      {preview && (
                        <button
                          type="button"
                          onClick={() => onRemoveRow?.("primaryFields", actualRowIndex)}
                          className="cursor-pointer absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-secondary hover:bg-red-50 hover:text-red-600"
                          title="Supprimer la ligne"
                          aria-label="Supprimer la ligne principale"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              {renderRowInsertionZone("primaryFields", displayedPrimaryRows.length, displayedPrimaryRows.length)}
            </div>
          </div>
        </div>
      )}

      {(isSecondaryOpen || (preview && !showCard)) && (
        <div className={preview ? "w-full" : "fixed inset-0 z-[60] flex items-end"}>
          <div className={preview ? "mt-0 w-full rounded-xl border border-light bg-secondary-bg p-3" : "relative max-h-[68vh] w-full overflow-hidden rounded-t-[2rem] bg-secondary-bg p-5 shadow-2xl"}>
            <div className="flex shrink-0 items-center justify-between mb-2">
              <h2 className={`${preview ? 'text-sm' : 'text-[18px]'} font-semibold text-primary`}>Détails du rendez-vous</h2>
              {!preview && (
                <button
                  type="button"
                  onClick={() => setIsSecondaryOpen(false)}
                  className="rounded-full p-2 text-secondary hover:bg-primary/10"
                  aria-label="Fermer les détails du rendez-vous"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div
              className={`${preview ? 'gap-1' : 'max-h-[calc(68vh-92px)] overflow-y-auto pb-4'} flex flex-col`}
              onTouchStart={!preview ? (event) => {
                touchStartY.current = event.touches[0]?.clientY ?? null;
                setDrawerOffset(0);
              } : undefined}
              onTouchMove={!preview ? (event) => {
                if (touchStartY.current === null) return;
                const offset = (event.touches[0]?.clientY ?? touchStartY.current) - touchStartY.current;
                if (offset > 0) setDrawerOffset(offset);
              } : undefined}
              onTouchEnd={!preview ? () => {
                if (drawerOffset > 100) setIsSecondaryOpen(false);
                setDrawerOffset(0);
                touchStartY.current = null;
              } : undefined}
              style={!preview ? {
                transform: `translateY(${drawerOffset}px)`,
                transition: drawerOffset === 0 ? 'transform 200ms ease-out' : 'none',
              } : undefined}
            >
              {secondaryRows.map((row, rowIndex) => (
                <React.Fragment key={`secondary-row-${rowIndex}`}>
                {renderRowInsertionZone("secondaryFields", rowIndex, secondaryRows.length)}
                <div 
                  className={`relative min-w-0 min-h-[56px] py-2 pr-6 flex items-start gap-1 border-b border-ultra-light last:border-b-0 ${
                    isBlockedRowTarget("secondaryFields", rowIndex) ? 'pb-7' : ''
                  } ${
                    isRowFull("secondaryFields", rowIndex, row, draggedFieldCode) ? 'cursor-not-allowed' : 'cursor-copy'
                  } ${
                    preview && activeDragOverInfo?.column === 'secondaryFields' && activeDragOverInfo?.rowIndex === rowIndex && !activeDragOverInfo?.fieldCode && !activeDragOverInfo?.insertRow
                      ? activeDragOverInfo?.blocked
                        ? 'ring-1 ring-dashed ring-red-500 bg-red-50 text-red-600'
                        : 'ring-1 ring-dashed ring-primary bg-primary/5'
                      : ''
                  }`}
                  onDragOver={(e) => {
                    if (!preview) return;
                    const blocked = isRowFull(
                      "secondaryFields",
                      rowIndex,
                      row,
                      draggedFieldCode || e.dataTransfer.getData("text/plain")
                    );
                    e.dataTransfer.dropEffect = blocked ? 'none' : 'move';
                    e.preventDefault();
                    onPreviewDragOver?.(e, "secondaryFields", rowIndex, undefined, blocked, false, dragSurface);
                  }}
                  onDrop={(e) => {
                    if (!preview) return;
                    e.preventDefault();
                    const blocked = isRowFull(
                      "secondaryFields",
                      rowIndex,
                      row,
                      draggedFieldCode || e.dataTransfer.getData("text/plain")
                    );
                    if (!blocked) onPreviewDrop?.(e, "secondaryFields", rowIndex);
                  }}
                >
                  {getFields(row).map(({ field, value }, fieldIndex) =>
                    renderFieldWithDropZone(
                      "secondaryFields",
                      rowIndex,
                      field,
                      <span key={field} className={`inline-flex min-w-0 max-w-full items-start ${isSpecialField(field) ? 'gap-0' : 'gap-1'}`}>
                        {!isSpecialField(field) && (
                          <span className="mt-0.5 shrink-0 text-secondary">{getFieldIcon(field)}</span>
                        )}
                        <span className="min-w-0">
                          {!isSpecialField(field) && (
                            <span className="block text-[11px] font-semibold uppercase leading-4 tracking-wide text-primary/60">
                              {getFieldLabel(field)}
                            </span>
                          )}
                          <span className={`${preview ? 'text-xs' : 'text-sm'} ${isSpecialField(field) ? '' : 'mt-0.5'} block max-w-full break-words leading-5 text-primary`}>{value}</span>
                        </span>
                      </span>
                    )
                  )}
                  {renderBlockedRowMessage("secondaryFields", rowIndex)}
                  {preview && (
                    <button
                      type="button"
                      onClick={() => onRemoveRow?.("secondaryFields", rowIndex)}
                      className="cursor-pointer absolute right-1 top-2 rounded p-0.5 text-secondary hover:bg-red-50 hover:text-red-600"
                      title="Supprimer la ligne"
                      aria-label="Supprimer la ligne secondaire"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                </React.Fragment>
              ))}
              {renderRowInsertionZone("secondaryFields", secondaryRows.length, secondaryRows.length)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AppointmentList: React.FC<AppointmentListProps> = memo(({ appointments, selectedDate, items, employees, displayConfig }) => {
  const getAppointmentPeriodForDay = (app: Appointment, targetDate: Date) => {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const noonOfDay = new Date(targetDate);
    noonOfDay.setHours(12, 0, 0, 0);
    
    const appStart = new Date(app.DebutPlanningEvenement);
    const appEnd = new Date(app.FinPlanningEvenement);
    
    if (appEnd.getTime() <= startOfDay.getTime() || appStart.getTime() > endOfDay.getTime()) {
      return null;
    }
    
    const effectiveStart = appStart < startOfDay ? startOfDay : appStart;
    const effectiveEnd = appEnd > endOfDay ? endOfDay : appEnd;
    
    const coversFullDay = effectiveStart <= startOfDay && effectiveEnd >= new Date(endOfDay.getTime() - 1000);
    
    if (coversFullDay) {
      return 'full';
    }
    
    if (effectiveEnd <= noonOfDay) {
      return 'morning';
    }
    
    if (effectiveStart >= noonOfDay) {
      return 'afternoon';
    }
    
    return 'full';
  };
  
  const morningApps = appointments.filter(a => {
    const period = getAppointmentPeriodForDay(a, selectedDate);
    return period === 'morning';
  });
  
  const afternoonApps = appointments.filter(a => {
    const period = getAppointmentPeriodForDay(a, selectedDate);
    return period === 'afternoon';
  });
  
  const fullDayApps = appointments.filter(a => {
    const period = getAppointmentPeriodForDay(a, selectedDate);
    return period === 'full';
  });


  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 opacity-60">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ 
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-tertiary)'
          }}
        >
           <Clock size={32} />
        </div>
        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Aucun rendez-vous ce jour.</p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
      
      {fullDayApps.length > 0 && (
        <div className="mb-6">
          <h4 
            className="text-xs font-bold uppercase tracking-wider mb-3 ml-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Journée complète
          </h4>
          {fullDayApps.map(app => (
            <AppointmentCard key={app.IdPlanningEvenement} app={app} items={items} employees={employees} displayConfig={displayConfig} />
          ))}
        </div>
      )}
      
      {morningApps.length > 0 && (
        <div className="mb-6">
          <h4 
            className="text-xs font-bold uppercase tracking-wider mb-3 ml-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Matin
          </h4>
          {morningApps.map(app => (
            <AppointmentCard key={app.IdPlanningEvenement} app={app} items={items} employees={employees} displayConfig={displayConfig} />
          ))}
        </div>
      )}

      {afternoonApps.length > 0 && (
        <div className="mb-6">
          <h4 
            className="text-xs font-bold uppercase tracking-wider mb-3 ml-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Après-midi
          </h4>
          {afternoonApps.map(app => (
            <AppointmentCard key={app.IdPlanningEvenement} app={app} items={items} employees={employees} displayConfig={displayConfig} />
          ))}
        </div>
      )}
    </div>
  );
});