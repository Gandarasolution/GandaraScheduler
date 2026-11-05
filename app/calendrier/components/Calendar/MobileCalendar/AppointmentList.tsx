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
} | null;

export interface MobileAppointmentFieldOption {
  Id: number;
  Libelle: string;
  Code: string;
  CaractereSpecial: boolean;
}

const MAX_SECONDARY_FIELDS = 2;
const MAX_FIELDS_PER_PRIMARY_ROW = 3;
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
  dragOverInfo?: DragOverTarget;
  onPreviewDrop?: (event: React.DragEvent<HTMLDivElement>, column: "primaryFields" | "secondaryFields", rowIndex?: number, fieldCode?: string) => void;
  onPreviewDragOver?: (event: React.DragEvent<HTMLDivElement>, column: "primaryFields" | "secondaryFields", rowIndex: number, fieldCode?: string) => void;
  onPreviewDragLeave?: () => void;
  onRemoveField?: (column: "primaryFields" | "secondaryFields", fieldCode: string) => void;
  onRemoveRow?: (column: "primaryFields" | "secondaryFields", rowIndex: number) => void;
  onFieldDragStart?: (event: React.DragEvent, column: "primaryFields" | "secondaryFields", fieldCode: string) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  app,
  items,
  employees,
  displayConfig,
  mobileAppointmentFieldOptions = [],
  preview = false,
  showCard = true,
  dragOverInfo = null,
  onPreviewDrop,
  onPreviewDragOver,
  onPreviewDragLeave,
  onRemoveField,
  onRemoveRow,
  onFieldDragStart,
}) => {
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);

  const item = items.find(i => i.IdPlanningRessource === app.IdPlanningRessource);
  const employee = employees.find(e => e.IdPersonnel === app.IdEmploye);
  const startDate = new Date(app.DebutPlanningEvenement);
  const endDate = new Date(app.FinPlanningEvenement);
  const formatDate = (value: Date) => format(value, 'dd/MM/yyyy HH:mm', { locale: fr });

  const customResolvers: Partial<Record<string, () => string>> = {
    DebutPlanningEvenement: () => formatDate(startDate),
    FinPlanningEvenement: () => formatDate(endDate),
    IdEmploye: () => (employee ? `${employee.Nom} ${employee.Prenom}`.trim() : ''),
    Etiquette: () => app.Etiquette?.LibelleLongPlanningEtiquette || '',
    ChefChantier: () => (item?.Type === 'Projet' ? item.ChefChantier || '' : ''),
    ChargeAffaire: () => (item?.Type === 'Projet' ? item.ChargeAffaire || '' : ''),
  };

  const getFieldValue = (field: string): string => {
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
    
  // CORRECTION ICI : on ne filtre plus les champs secondaires si le champ est déjà dans primaryRows
  const secondaryRows = rawSecondaryRows;
  
  const primaryFields = primaryRows.flatMap(getFields);
  const secondaryFields = secondaryRows.flatMap(getFields);
  const titleField = primaryFields[0];
  const isPrimaryTitleRowFull = primaryRows[0]?.length >= MAX_FIELDS_PER_PRIMARY_ROW;
  const canRenderCard = showCard;

  const getFieldOption = (field: string) => mobileAppointmentFieldOptions
    .find((option) => option.Code === field);
  const isSpecialField = (field: string) => mobileAppointmentFieldOptions
    .find((option) => option.Code === field)
    ?.CaractereSpecial === true;

  console.log(displayConfig, 'displayConfig');

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
    content: React.ReactNode
  ) => {
    if (!preview) return content;

    const isTarget = dragOverInfo?.column === column && dragOverInfo?.rowIndex === rowIndex && dragOverInfo?.fieldCode === fieldCode;

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
          onPreviewDragOver?.(e, column, rowIndex, fieldCode);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPreviewDragLeave?.();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPreviewDrop?.(e, column, rowIndex, fieldCode);
        }}
        className="relative group/field inline-flex items-center cursor-grab active:cursor-grabbing"
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
          className="cursor-pointer ml-1 opacity-0 group-hover/field:opacity-100 p-0.5 text-red-500 hover:bg-red-50 rounded transition-opacity cursor-pointer"
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
      {canRenderCard && (
        <div 
          className={`${preview ? 'rounded-xl p-3 mb-0' : 'rounded-3xl p-5 mb-4'} border flex items-start group transition-all duration-300`}
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
              className={`${preview ? 'text-sm' : 'text-base'} font-semibold mb-1 transition-colors truncate rounded ${
                isPrimaryTitleRowFull ? 'cursor-not-allowed' : 'cursor-copy'
              } ${
                preview && dragOverInfo?.column === 'primaryFields' && dragOverInfo?.rowIndex === 0 && !dragOverInfo?.fieldCode
                  ? 'ring-1 ring-dashed ring-primary bg-primary/5'
                  : ''
              }`}
              onDragOver={(e) => {
                if (!preview) return;
                if (isPrimaryTitleRowFull) {
                  e.dataTransfer.dropEffect = 'none';
                  return;
                }
                e.preventDefault();
                e.stopPropagation();
                onPreviewDragOver?.(e, "primaryFields", 0, titleField?.field);
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
              {titleField?.value ? (
                renderFieldWithDropZone("primaryFields", 0, titleField.field, <span>{titleField.value}</span>)
              ) : (
                <span className="italic text-gray-400">Rendez-vous</span>
              )}
            </h3>

            <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {primaryRows.map((row, rowIndex) => {
                const fields = getFields(row).filter(({ field }) => field !== titleField?.field);
                return (
                  <div 
                    key={`primary-row-${rowIndex}`}
                    className={`flex items-center gap-1.5 flex-wrap min-h-[20px] rounded p-0.5 ${
                      fields.length >= MAX_FIELDS_PER_PRIMARY_ROW ? 'cursor-not-allowed' : 'cursor-copy'
                    } ${
                      preview && dragOverInfo?.column === 'primaryFields' && dragOverInfo?.rowIndex === rowIndex && !dragOverInfo?.fieldCode 
                        ? 'ring-1 ring-dashed ring-primary bg-primary/5' 
                        : ''
                    }`}
                    onDragOver={(e) => {
                      if (!preview) return;
                      e.preventDefault();
                      onPreviewDragOver?.(e, "primaryFields", rowIndex);
                    }}
                    onDrop={(e) => {
                      if (!preview) return;
                      e.preventDefault();
                      onPreviewDrop?.(e, "primaryFields", rowIndex);
                    }}
                  >
                    {fields.map(({ field, value }) => (
                      <React.Fragment key={field}>
                        {renderFieldWithDropZone("primaryFields", rowIndex, field, <span>{value}</span>)}
                      </React.Fragment>
                    ))}
                    {preview && (
                      <button
                        type="button"
                        onClick={() => onRemoveRow?.("primaryFields", rowIndex)}
                        className="cursor-pointer ml-auto shrink-0 rounded p-0.5 text-secondary hover:bg-red-50 hover:text-red-600"
                        title="Supprimer la ligne"
                        aria-label="Supprimer la ligne principale"
                      >
                        <X size={12} />
                      </button>
                    )}
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
            </div>
            <div className={`${preview ? 'gap-1' : 'max-h-[calc(68vh-92px)] overflow-y-auto pb-4'} flex flex-col`}>
              {secondaryRows.map((row, rowIndex) => (
                <div 
                  key={`secondary-row-${rowIndex}`} 
                  className={`min-h-[56px] py-2 flex items-start gap-3 border-b border-ultra-light last:border-b-0 ${
                    row.length >= MAX_SECONDARY_FIELDS ? 'cursor-not-allowed' : 'cursor-copy'
                  } ${
                    preview && dragOverInfo?.column === 'secondaryFields' && dragOverInfo?.rowIndex === rowIndex && !dragOverInfo?.fieldCode 
                      ? 'ring-1 ring-dashed ring-primary bg-primary/5' 
                      : ''
                  }`}
                  onDragOver={(e) => {
                    if (!preview) return;
                    e.preventDefault();
                    onPreviewDragOver?.(e, "secondaryFields", rowIndex);
                  }}
                  onDrop={(e) => {
                    if (!preview) return;
                    e.preventDefault();
                    onPreviewDrop?.(e, "secondaryFields", rowIndex);
                  }}
                >
                  {getFields(row).map(({ field, value }, fieldIndex) =>
                    renderFieldWithDropZone(
                      "secondaryFields",
                      rowIndex,
                      field,
                      <div key={field} className={`flex min-w-0 flex-1 items-start gap-1 ${isSpecialField(field) && fieldIndex > 0 ? '-ml-3' : ''}`}>
                        {!isSpecialField(field) && (
                          <span className="mt-0.5 shrink-0 text-secondary">{getFieldIcon(field)}</span>
                        )}
                        <div className={`min-w-0 ${isSpecialField(field) ? 'pt-4' : ''}`}>
                          {!isSpecialField(field) && (
                            <span className="block text-[11px] font-semibold uppercase leading-4 tracking-wide text-primary/60">
                              {getFieldOption(field)?.Libelle || field}
                            </span>
                          )}
                          <span className={`${preview ? 'text-xs' : 'text-sm'} ${isSpecialField(field) ? '' : 'mt-0.5'} block leading-5 text-primary`}>{value}</span>
                        </div>
                      </div>
                    )
                  )}
                  {preview && (
                    <button
                      type="button"
                      onClick={() => onRemoveRow?.("secondaryFields", rowIndex)}
                      className="ml-auto shrink-0 rounded p-0.5 text-secondary hover:bg-red-50 hover:text-red-600"
                      title="Supprimer la ligne"
                      aria-label="Supprimer la ligne secondaire"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
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