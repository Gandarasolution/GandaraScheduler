import React, { memo, useRef, useState } from 'react';
import { Appointment, Item, MobileAppointmentDisplayConfig, MobileAppointmentField, User } from '../../../types/index';
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

export const AppointmentCard: React.FC<{ app: Appointment, items: Item[], employees: User[], displayConfig: MobileAppointmentDisplayConfig; preview?: boolean; showCard?: boolean }> = ({ app, items, employees, displayConfig, preview = false, showCard = true }) => {
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const item = items.find(i => i.IdPlanningRessource === app.IdPlanningRessource);
  const employee = employees.find(e => e.IdPersonnel === app.IdEmploye);
  const startDate = new Date(app.DebutPlanningEvenement);
  const endDate = new Date(app.FinPlanningEvenement);
  const formatDate = (value: Date) => format(value, 'dd/MM/yyyy HH:mm', { locale: fr });
  const getFieldValue = (field: MobileAppointmentField): string => {
    switch (field) {
      case 'LibellePlanningRessource': return item?.LibellePlanningRessource || 'Rendez-vous';
      case 'Type': return item?.Type || '';
      case 'DebutPlanningEvenement': return formatDate(startDate);
      case 'FinPlanningEvenement': return formatDate(endDate);
      case 'AnnotationPlanningEvenement': return app.AnnotationPlanningEvenement || '';
      case 'IdEmploye': return employee ? `${employee.Nom} ${employee.Prenom}`.trim() : '';
      case 'EtapeValidation': return app.EtapeValidation || '';
      case 'Etiquette': return app.Etiquette?.LibelleLongPlanningEtiquette || '';
      case 'ChefChantier': return item?.Type === 'Projet' ? item.ChefChantier || '' : '';
      case 'ChargeAffaire': return item?.Type === 'Projet' ? item.ChargeAffaire || '' : '';
    }
  };
  const getFields = (fields: MobileAppointmentField[]) => fields
    .map(field => ({ field, value: getFieldValue(field) }))
    .filter(({ value }) => value);

   
  const primaryFields = getFields(displayConfig.primaryFields);
  const secondaryFields = getFields(displayConfig.secondaryFields);
  const titleField = primaryFields[0] || secondaryFields[0];
  const canRenderCard = showCard && (!preview || primaryFields.length > 0);

  const getFieldLabel = (field: MobileAppointmentField) => ({
    LibellePlanningRessource: 'Rubrique',
    Type: 'Type de ressource',
    DebutPlanningEvenement: 'Date et heure de début',
    FinPlanningEvenement: 'Date et heure de fin',
    AnnotationPlanningEvenement: 'Annotation',
    IdEmploye: 'Employé du rendez-vous',
    EtapeValidation: 'Étape de validation',
    Etiquette: 'Étiquette du rendez-vous',
    ChefChantier: 'Chef de chantier',
    ChargeAffaire: "Chargé d'affaire",
  }[field] || field);

  const getFieldIcon = (field: MobileAppointmentField) => {
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

  const handleTouchStart = (event: React.TouchEvent<HTMLButtonElement>) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (touchStartY.current === null) return;
    const distance = event.touches[0]?.clientY - touchStartY.current;
    if (distance > 0) setDrawerOffset(Math.min(distance, 180));
  };

  const handleTouchEnd = () => {
    if (drawerOffset > 80) {
      setIsSecondaryOpen(false);
    }
    setDrawerOffset(0);
    touchStartY.current = null;
  };
  
  return (
    <>
      {canRenderCard && <div 
        className={`${preview ? 'rounded-xl p-3 mb-0' : 'rounded-3xl p-5 mb-4'} border flex items-start group transition-all duration-300`}
        style={{
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-sm)',
          borderColor: 'var(--border-light)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }}
      >
        <div 
          className={`w-1.5 h-12 rounded-full  mr-4 mt-1`} 
          style={{backgroundColor : item?.CouleurFondPlanningRessource || 'var(--color-primary-500)'}}
        ></div>
        <div className="flex-1">
          <h3 
            className={`${preview ? 'text-sm' : 'text-base'} font-semibold mb-1 transition-colors`}
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
          >
            {titleField?.value || 'Rendez-vous'}
          </h3>
          <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {primaryFields.slice(1).map(({ field, value }) => (
              <div key={field} className="flex items-center gap-1">
                <span>{value}</span>
              </div>
            ))}
          </div>
          {secondaryFields.length > 0 && !preview && (
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-primary underline underline-offset-2"
              onClick={() => setIsSecondaryOpen(true)}
            >
              Voir plus
            </button>
          )}
        </div>
      </div>}
      {(isSecondaryOpen || preview) && secondaryFields.length > 0 && (
        <div className={preview ? "w-full" : "fixed inset-0 z-[60] flex items-end"} role={preview ? undefined : "dialog"} aria-modal={!preview} aria-label="Détails du rendez-vous">
          {!preview && <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fermer les détails"
            onClick={() => setIsSecondaryOpen(false)}
          />}
          <div
            className={preview ? "mt-0 w-full rounded-xl border border-light bg-secondary-bg p-3" : "relative max-h-[68vh] w-full overflow-hidden rounded-t-[2rem] bg-secondary-bg p-5 shadow-2xl animate-in slide-in-from-bottom-full duration-300"}
            style={!preview ? { transform: `translateY(${drawerOffset}px)`, transition: drawerOffset ? 'none' : 'transform 180ms ease-out' } : undefined}
          >
            {!preview && <button
              type="button"
              className="-mx-5 -mt-5 mb-1 flex h-6 w-[calc(100%+2.5rem)] touch-none cursor-grab items-start justify-center rounded-t-[2rem] focus:outline-none focus:ring-2 focus:ring-primary active:cursor-grabbing"
              aria-label="Glisser vers le bas pour fermer"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <span className="mt-1 block h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
            </button>}
            <div className={`flex shrink-0 items-center justify-between ${preview ? 'mb-2' : 'mb-5'}`}>
              <h2 className={`${preview ? 'text-sm' : 'text-[18px]'} font-semibold text-primary`}>Détails du rendez-vous</h2>
              {!preview && <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-colors hover:bg-tertiary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Fermer les détails"
                onClick={() => setIsSecondaryOpen(false)}
              >
                <X size={18} />
              </button>}
            </div>
            <div className={`${preview ? 'gap-1' : 'max-h-[calc(68vh-92px)] overflow-y-auto pb-4'} flex flex-col`}>
              {secondaryFields.map(({ field, value }) => (
                <div key={field} className={`${preview ? 'py-1' : 'py-2'} flex items-start gap-3 border-b border-ultra-light last:border-b-0`}>
                  <span className="mt-0.5 shrink-0 text-secondary" aria-hidden="true">{getFieldIcon(field)}</span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase leading-4 tracking-wide text-primary/60">
                      {getFieldLabel(field)}
                    </span>
                    <span className={`${preview ? 'text-xs' : 'text-sm'} mt-0.5 block leading-5 text-primary`}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const AppointmentList: React.FC<AppointmentListProps> = memo(({ appointments, selectedDate, items, employees, displayConfig }) => {
  // Helper to check if appointment covers a specific period of a day
  const getAppointmentPeriodForDay = (app: Appointment, targetDate: Date) => {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const noonOfDay = new Date(targetDate);
    noonOfDay.setHours(12, 0, 0, 0);
    
    const appStart = new Date(app.DebutPlanningEvenement);
    const appEnd = new Date(app.FinPlanningEvenement);
    
    // The end is exclusive: an appointment ending at midnight does not belong
    // to the day that starts at that same midnight.
    if (appEnd.getTime() <= startOfDay.getTime() || appStart.getTime() > endOfDay.getTime()) {
      return null; // Not on this day
    }
    
    // Determine effective start and end for this specific day
    const effectiveStart = appStart < startOfDay ? startOfDay : appStart;
    const effectiveEnd = appEnd > endOfDay ? endOfDay : appEnd;
    
    // Check if it covers the whole day
    const coversFullDay = effectiveStart <= startOfDay && effectiveEnd >= new Date(endOfDay.getTime() - 1000);
    
    if (coversFullDay) {
      return 'full';
    }
    
    // Check if it's only in the morning (before noon)
    if (effectiveEnd <= noonOfDay) {
      return 'morning';
    }
    
    // Check if it's only in the afternoon (starts at noon or after)
    if (effectiveStart >= noonOfDay) {
      return 'afternoon';
    }
    
    // If it spans both morning and afternoon but not full day
    return 'full';
  };
  
  // Group appointments by time of day for the selected date
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
