import React, { memo, useRef, useState } from 'react';
import { Appointment, Item, MobileAppointmentDisplayConfig, User } from '../../../types/index';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, FileText, Folder, HardHat, MessageSquareText, Tag, UserRound, X } from 'lucide-react';
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
const MAX_TITLE_REGULAR_FIELDS = 2;
const MAX_TITLE_SPECIAL_FIELDS = 1;
const MAX_ROWS = 5;


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
          isTarget ? (blocked ? 'bg-red-100/60' : 'bg-primary-100/60') : ''
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
          <span className={`h-0.5 w-full rounded ${blocked ? 'bg-red-500' : 'bg-primary-500'}`} />
        )}
      </div>
    );
  };

  const isConfiguredSpecialField = (field: string) =>
    displayConfig.specialFields?.includes(field) === true;

  const isSpecialField = (field: string) =>
    isConfiguredSpecialField(field) || mobileAppointmentFieldOptions
      .find((option) => option.Code === field)
      ?.CaractereSpecial === true;

  const getFieldValue = (field: string): string => {
    if (isSpecialField(field)) return field;
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
    return value != null ? String(value) : '';
  };

  const getFields = (fields: string[]) => fields
    .map(field => ({ field, value: getFieldValue(field) }))
    .filter(({ value }) => value.trim().length > 0);

  const primaryRows = displayConfig.primaryFieldRows?.length
    ? displayConfig.primaryFieldRows
    : [displayConfig.primaryFields];

  const rawSecondaryRows = displayConfig.secondaryFieldRows?.length
    ? displayConfig.secondaryFieldRows
    : [displayConfig.secondaryFields];

  const configuredPrimaryRows = isProjectAppointment
    ? primaryRows
    : [['LibellePlanningRessource']];
  const configuredSecondaryRows = isProjectAppointment ? rawSecondaryRows : [];
  
  const displayedPrimaryRows = configuredPrimaryRows
    .map((row, rowIndex) => {
      const maxRegular = rowIndex === 0 ? 2 : 3;
      const maxSpecial = 1;
      return row.filter((field, index, fields) => {
        const previousFields = fields.slice(0, index);
        const specialCount = previousFields.filter(isSpecialField).length;
        const regularCount = previousFields.length - specialCount;
        return isSpecialField(field)
          ? specialCount < maxSpecial
          : regularCount < maxRegular;
      });
    })
    .filter((row) => preview || getFields(row).length > 0);

  const displayedSecondaryRows = configuredSecondaryRows.filter((row) =>
    preview || getFields(row).length > 0
  );

  const getFieldOption = (field: string) => mobileAppointmentFieldOptions
    .find((option) => option.Code === field);

  const getFieldLabel = (field: string) => {
    if (field === 'AdresseChantier') return 'Adresse du chantier';
    return displayConfig.fieldLabels?.[field] || getFieldOption(field)?.Libelle || field;
  };
    
  const secondaryRows = displayedSecondaryRows;
  
  const primaryFields = displayedPrimaryRows.flatMap(getFields);
  const secondaryFields = secondaryRows.flatMap(getFields);
  const titleRow = getFields(displayedPrimaryRows[0] || []);
  const titleField = titleRow[0] || primaryFields[0];
  const canRenderCard = showCard;
  const fieldNameRows = fieldNamesColumn === "primaryFields"
    ? displayedPrimaryRows
    : secondaryRows;

  const isMaxPrimaryRowsReached = displayedPrimaryRows.length >= MAX_ROWS;
  const isMaxSecondaryRowsReached = secondaryRows.length >= MAX_ROWS;
  const isMaxRowsReached = fieldNamesColumn === "primaryFields" ? isMaxPrimaryRowsReached : isMaxSecondaryRowsReached;

  const countFields = (fields: string[], excludedField?: string) =>
    fields.filter((field) => field !== excludedField).length;

  const isRowFull = (
    column: "primaryFields" | "secondaryFields",
    rowIndex: number,
    fields: string[],
    draggedField?: string
  ) => {
    if (column === "primaryFields") {
      const currentFields = fields.filter((field) => field !== draggedField);
      const specialCount = currentFields.filter(isSpecialField).length;
      const regularCount = currentFields.length - specialCount;

      const maxRegular = rowIndex === 0 ? 2 : 3;
      const maxSpecial = 1;

      if (!draggedField) {
        return regularCount >= maxRegular && specialCount >= maxSpecial;
      }

      return isSpecialField(draggedField)
        ? specialCount >= maxSpecial
        : regularCount >= maxRegular;
    }

    return countFields(fields, draggedField) >= MAX_SECONDARY_FIELDS;
  };

  const isBlockedRowTarget = (
    column: "primaryFields" | "secondaryFields",
    rowIndex: number,
    surface: "fieldNames" | "values" = dragSurface
  ) =>
    preview &&
    dragOverInfo?.surface === surface &&
    dragOverInfo.column === column &&
    dragOverInfo.rowIndex === rowIndex &&
    dragOverInfo.blocked === true &&
    !dragOverInfo.insertRow;

  const renderBlockedRowMessage = (
    column: "primaryFields" | "secondaryFields",
    rowIndex: number,
    surface: "fieldNames" | "values" = dragSurface
  ) => {
    if (!isBlockedRowTarget(column, rowIndex, surface)) {
      return null;
    }

    return (
      <span 
        className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 shadow-sm z-20" 
        role="status"
      >
        Ligne pleine : limite de champs atteinte
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

    const rowFields = column === "primaryFields"
      ? displayedPrimaryRows[rowIndex] || []
      : secondaryRows[rowIndex] || [];
    const blocked = isRowFull(column, rowIndex, rowFields, draggedFieldCode);
    const isLastField = rowFields[rowFields.length - 1] === fieldCode;

    // Déterminer quel est le champ qui suit immédiatement celui-ci
    const currentIndex = rowFields.indexOf(fieldCode);
    const nextFieldCode = currentIndex + 1 < rowFields.length ? rowFields[currentIndex + 1] : undefined;

    const isTargetBefore = dragOverInfo?.surface === surface &&
      dragOverInfo?.column === column &&
      dragOverInfo?.rowIndex === rowIndex &&
      dragOverInfo?.fieldCode === fieldCode;

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
          
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const isBefore = offsetX < rect.width / 2;
          
          // Si on est sur la moitié gauche, on s'insère AVANT ce champ.
          // Si on est sur la moitié droite, on s'insère AVANT le champ SUIVANT (ou à la fin si c'est le dernier).
          const targetFieldCode = isBefore ? fieldCode : nextFieldCode;
          onPreviewDragOver?.(e, column, rowIndex, targetFieldCode, blocked, false, surface);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPreviewDragLeave?.();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const isBefore = offsetX < rect.width / 2;
          const targetFieldCode = isBefore ? fieldCode : nextFieldCode;
          
          if (!blocked) onPreviewDrop?.(e, column, rowIndex, targetFieldCode, false);
        }}
        className={`overflow-visible relative group/field inline-flex w-fit min-w-0 max-w-full items-center cursor-grab active:cursor-grabbing p-1 transition-all border border-transparent`}
      >
        {/* Trait avant le champ */}
        {isTargetBefore && !blocked && (
          <span className={`absolute -left-1.5 inset-y-0 w-1 bg-primary-500 rounded-full shadow-md z-30 animate-pulse`} />
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

        {/* Espace vide après le champ */}
        <div
          className={`relative min-h-[20px] flex items-center justify-center w-3 ${
            isLastField ? 'flex-1' : 'shrink-0'
          } transition-all`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = blocked ? 'none' : 'move';
            // Survoler l'espace vide équivaut à vouloir insérer avant le prochain champ
            onPreviewDragOver?.(e, column, rowIndex, nextFieldCode, blocked, false, surface);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPreviewDragLeave?.();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!blocked) onPreviewDrop?.(e, column, rowIndex, nextFieldCode, false);
          }}
          aria-label={blocked ? 'Ligne pleine' : 'Déposer après ce champ'}
        >
          {/* L'indicateur de fin de ligne ne s'affiche QUE si on est à la fin du TOUT DERNIER champ */}
          {dragOverInfo?.surface === surface &&
           dragOverInfo?.column === column &&
           dragOverInfo?.rowIndex === rowIndex &&
           !dragOverInfo?.fieldCode && 
           !dragOverInfo?.insertRow && !blocked && isLastField && (
            <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-primary-500 rounded-full shadow-md z-30 animate-pulse" />
          )}
        </div>
      </div>
    );
  };

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
              <h3 
                className={`relative ${preview ? 'text-sm overflow-visible' : 'text-base truncate'} font-semibold mb-1 transition-colors rounded ${
                  isBlockedRowTarget("primaryFields", 0, "fieldNames") ? 'pb-4 border-b-2 border-red-500 bg-red-50/30' : ''
                }`} 
                style={{ color: 'var(--text-primary)' }}
                onDragOver={(e) => {
                  if (!preview) return;
                  const rowFields = nameRows[0] || [];
                  const blocked = isRowFull(
                    "primaryFields",
                    0,
                    rowFields,
                    draggedFieldCode || e.dataTransfer.getData("text/plain")
                  );

                  // Détermine si on est plutôt vers la fin de la ligne pour insérer à la fin
                  const rect = e.currentTarget.getBoundingClientRect();
                  const isNearEnd = (e.clientX - rect.left) > (rect.width / 2);

                  if (blocked) {
                    e.dataTransfer.dropEffect = 'none';
                    e.preventDefault();
                    e.stopPropagation();
                    onPreviewDragOver?.(e, "primaryFields", 0, isNearEnd ? undefined : rowFields[0], true, false, "fieldNames");
                    return;
                  }

                  e.preventDefault();
                  e.stopPropagation();
                  // Si on survole la seconde moitié du bloc titre, on passe undefined mais avec l'indice de fin ou on gère le ciblage de fin
                  onPreviewDragOver?.(e, "primaryFields", 0, undefined, false, false, "fieldNames");
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
                  const rowFields = nameRows[0] || [];
                  const blocked = isRowFull(
                    "primaryFields",
                    0,
                    rowFields,
                    draggedFieldCode || e.dataTransfer.getData("text/plain")
                  );
                  if (!blocked) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const isNearEnd = (e.clientX - rect.left) > (rect.width / 2);
                    
                    onPreviewDrop?.(e, "primaryFields", 0, isNearEnd ? undefined : rowFields[0]);
                  }
                }}
              >
                <span className="inline-flex items-center gap-1 flex-wrap w-full pointer-events-none">
                  {(nameRows[0] || []).map((field, index) => (
                    <React.Fragment key={field}>
                      <span className="pointer-events-auto">
                        {renderFieldWithDropZone(
                          "primaryFields",
                          0,
                          field,
                          <span className={`${highlightedFieldCode === field ? 'border border-primary-500 bg-primary-50/40 rounded-md shadow-sm ' : ''} p-1`}>
                            {getFieldLabel(field)}
                          </span>,
                          "fieldNames"
                        )}
                      </span>
                    </React.Fragment>
                  ))}
                </span>
                {renderBlockedRowMessage("primaryFields", 0, "fieldNames")}
              </h3>
              
              <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {nameRows.slice(1, 5).map((row, rowIndex) => {
                  const actualRowIndex = rowIndex + 1;
                  const isEmptyRow = row.length === 0;
                  const isRowTarget = dragOverInfo?.surface === "fieldNames" &&
                    dragOverInfo?.column === "primaryFields" &&
                    dragOverInfo?.rowIndex === actualRowIndex &&
                    !dragOverInfo?.fieldCode &&
                    !dragOverInfo?.insertRow;

                  return (
                    <React.Fragment key={`field-names-primary-row-${actualRowIndex}`}>
                      {renderRowInsertionZone("primaryFields", actualRowIndex, nameRows.length, "fieldNames")}
                      <div
                        className={`relative flex min-w-0 items-center gap-1 flex-wrap min-h-[28px] p-1 pr-7 rounded transition-colors group/row ${
                          isBlockedRowTarget("primaryFields", actualRowIndex, "fieldNames") 
                            ? 'pb-4 border-b-2 border-red-500 bg-red-50/30' 
                            : isRowTarget && !isEmptyRow
                              ? 'bg-primary/5'
                              : isEmptyRow
                                ? isRowTarget 
                                  ? 'border-2 border-dashed border-primary-500 bg-primary-50/60' 
                                  : 'border-2 border-dashed border-gray-200 bg-gray-50/40'
                                : ''
                        }`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const blocked = isRowFull(
                            "primaryFields",
                            actualRowIndex,
                            row,
                            draggedFieldCode || event.dataTransfer.getData("text/plain")
                          );
                          event.dataTransfer.dropEffect = blocked ? "none" : "move";
                          onPreviewDragOver?.(event, "primaryFields", actualRowIndex, undefined, blocked, false, "fieldNames");
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const blocked = isRowFull(
                            "primaryFields",
                            actualRowIndex,
                            row,
                            draggedFieldCode || event.dataTransfer.getData("text/plain")
                          );
                          if (!blocked) onPreviewDrop?.(event, "primaryFields", actualRowIndex);
                        }}
                      >
                        {isEmptyRow ? (
                          <span className={`text-[11px] italic pointer-events-none select-none ${isRowTarget ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
                            {isRowTarget ? 'Déposer le champ ici' : 'Ligne vide — Déposez un champ ici'}
                          </span>
                        ) : (
                          row.map((field) => (
                            <React.Fragment key={field}>
                              {renderFieldWithDropZone(
                                "primaryFields",
                                actualRowIndex,
                                field,
                                <span className={`p-1 ${highlightedFieldCode === field ? 'border border-primary-500 bg-primary-50/40 rounded-md shadow-sm ' : ''} font-medium`}>{getFieldLabel(field)}</span>,
                                "fieldNames"
                              )}
                            </React.Fragment>
                          ))
                        )}

                        {renderBlockedRowMessage("primaryFields", actualRowIndex, "fieldNames")}

                        {preview && (
                          <button
                            type="button"
                            onClick={() => onRemoveRow?.("primaryFields", actualRowIndex)}
                            className="cursor-pointer absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Supprimer la ligne"
                            aria-label="Supprimer la ligne"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                {renderRowInsertionZone("primaryFields", nameRows.length, nameRows.length, "fieldNames")}
              </div>
            </>
          ) : (
            <>
              <h2 className={`${preview ? 'text-sm' : 'text-[18px]'} font-semibold text-primary mb-2`}>
                Détails du rendez-vous
              </h2>
              <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {nameRows.map((row, rowIndex) => {
                  const isEmptyRow = row.length === 0;
                  const isRowTarget = dragOverInfo?.surface === "fieldNames" &&
                    dragOverInfo?.column === "secondaryFields" &&
                    dragOverInfo?.rowIndex === rowIndex &&
                    !dragOverInfo?.fieldCode &&
                    !dragOverInfo?.insertRow;

                  return (
                    <React.Fragment key={`field-names-secondary-row-${rowIndex}`}>
                      {renderRowInsertionZone("secondaryFields", rowIndex, nameRows.length, "fieldNames")}
                      <div
                        className={`relative min-w-0 min-h-[40px] py-2 pr-7 flex items-center gap-3 border-b border-ultra-light last:border-b-0 group/row ${
                          isBlockedRowTarget("secondaryFields", rowIndex, "fieldNames") 
                            ? 'pb-4 border-b-2 border-red-500 bg-red-50/30' 
                            : isEmptyRow
                              ? isRowTarget 
                                ? 'border-2 border-dashed border-primary-500 bg-primary-50/60 rounded' 
                                : 'border-2 border-dashed border-gray-200 bg-gray-50/40 rounded'
                              : ''
                        }`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
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
                          event.stopPropagation();
                          const blocked = isRowFull(
                            "secondaryFields",
                            rowIndex,
                            row,
                            draggedFieldCode || event.dataTransfer.getData("text/plain")
                          );
                          if (!blocked) onPreviewDrop?.(event, "secondaryFields", rowIndex);
                        }}
                      >
                        <div className="flex-1 flex items-center gap-1 flex-wrap min-w-0">
                          {isEmptyRow ? (
                            <span className={`text-[11px] italic pointer-events-none select-none ${isRowTarget ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
                              {isRowTarget ? 'Déposer le champ ici' : 'Ligne vide — Déposez un champ ici'}
                            </span>
                          ) : (
                            row.map((field, fieldIndex) => (
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
                                    <span className={`p-1 ${highlightedFieldCode === field ? 'border border-primary-500 bg-primary-50/40 rounded-md shadow-sm ' : ''} font-medium`}>{getFieldLabel(field)}</span>
                                  </span>,
                                  "fieldNames"
                                )}
                              </React.Fragment>
                            ))
                          )}
                        </div>

                        {renderBlockedRowMessage("secondaryFields", rowIndex, "fieldNames")}

                        {preview && (
                          <button
                            type="button"
                            onClick={() => onRemoveRow?.("secondaryFields", rowIndex)}
                            className="cursor-pointer absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Supprimer la ligne"
                            aria-label="Supprimer la ligne secondaire"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                {renderRowInsertionZone("secondaryFields", nameRows.length, nameRows.length, "fieldNames")}
              </div>
            </>
          )}
        </div>
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
      {preview && isMaxRowsReached && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-orange-50 p-3.5 text-sm font-medium text-orange-800 border border-orange-200 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
          <span>
            Nombre maximum de lignes atteint ({MAX_ROWS}/{MAX_ROWS}). Impossible d'ajouter une nouvelle ligne.
          </span>
        </div>
      )}

      {renderFieldNamesCard()}

      {showFieldNamesCard && fieldNamesColumn === "primaryFields" && canRenderCard && (
        <h4 className={`${preview ? 'text-[11px]' : 'text-sm'} font-semibold text-primary mb-2`}>
          Aperçu (principale)
        </h4>
      )}

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
            <h3 className={`${preview ? 'text-sm overflow-visible' : 'text-base truncate'} relative font-semibold mb-1`} style={{ color: 'var(--text-primary)' }}>
              <span className="inline-flex items-center gap-0.5">
                {titleField?.value ? (
                  <span>{titleField.value}</span>
                ) : (
                  <span className="italic text-gray-400">Rendez-vous</span>
                )}
                {titleRow.slice(1).map(({ field, value }) =>
                  <span key={field} className={isSpecialField(field) ? 'ml-0' : 'ml-1'}>{value}</span>
                )}
              </span>
            </h3>

            <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {displayedPrimaryRows.slice(1, 5).map((row, rowIndex) => {
                const actualRowIndex = rowIndex + 1;
                const fields = getFields(row);
                return (
                  <div key={`primary-row-${actualRowIndex}`} className="flex min-w-0 items-center gap-1 flex-wrap min-h-[20px] p-0.5">
                    {fields.map(({ field, value }) => (
                      <span key={field} className="max-w-full break-words">{value}</span>
                    ))}
                  </div>
                );
              })}
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
                      preview && dragOverInfo?.surface === dragSurface && dragOverInfo?.column === 'secondaryFields' && dragOverInfo?.rowIndex === rowIndex && !dragOverInfo?.fieldCode && !dragOverInfo?.insertRow
                        ? dragOverInfo?.blocked
                          ? 'ring-1 ring-dashed ring-red-500 bg-red-50 text-red-600'
                          : 'ring-1 ring-dashed ring-primary-500 bg-primary-50/40 text-primary-700'
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
                    {getFields(row).map(({ field, value }) =>
                      renderFieldWithDropZone(
                        "secondaryFields",
                        rowIndex,
                        field,
                        <span key={field} className={`p-1 inline-flex min-w-0 max-w-full items-start ${isSpecialField(field) ? 'gap-0' : 'gap-1'} ${highlightedFieldCode === field ? 'border border-primary-500 bg-primary-50/40 rounded-md shadow-sm ' : ''}`}>
                          {!isSpecialField(field) && (
                            <span className="mt-0.5 shrink-0 text-secondary">{getFieldIcon(field)}</span>
                          )}
                          <span className="min-w-0">
                            {(!isSpecialField(field) || displayConfig.fieldLabels?.[field]) && (
                              <span className="block text-[11px] font-semibold uppercase leading-4 tracking-wide text-primary/60">
                                {getFieldLabel(field)}
                              </span>
                            )}
                            <span className={`${preview ? 'text-xs' : 'text-sm'} ${isSpecialField(field) ? '' : 'mt-0.5'} block max-w-full break-words leading-5 text-primary`}>{value}</span>
                          </span>
                        </span>,
                        dragSurface
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