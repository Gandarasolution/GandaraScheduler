import React, { memo, useState } from 'react';
import { Appointment, Item, MobileAppointmentDisplayConfig, MobileAppointmentField, User } from '../../../types/index';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentListProps {
  appointments: Appointment[];
  selectedDate: Date;
  items: Item[];
  employees: User[];
  displayConfig: MobileAppointmentDisplayConfig;
}

const AppointmentCard: React.FC<{ app: Appointment, items: Item[], employees: User[], displayConfig: MobileAppointmentDisplayConfig }> = ({ app, items, employees, displayConfig }) => {
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);
  const item = items.find(i => i.IdPlanningRessource === app.IdPlanningRessource);
  const employee = employees.find(e => e.IdPersonnel === app.IdEmploye);
  const formatDate = (value: number) => format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: fr });
  const getFieldValue = (field: MobileAppointmentField): string => {
    switch (field) {
      case 'LibellePlanningRessource': return item?.LibellePlanningRessource || 'Rendez-vous';
      case 'Type': return item?.Type || '';
      case 'DebutPlanningEvenement': return formatDate(app.DebutPlanningEvenement);
      case 'FinPlanningEvenement': return formatDate(app.FinPlanningEvenement);
      case 'AnnotationPlanningEvenement': return app.AnnotationPlanningEvenement || '';
      case 'IdEmploye': return employee ? `${employee.Nom} ${employee.Prenom}`.trim() : '';
      case 'EtapeValidation': return app.EtapeValidation || '';
      case 'Etiquette': return app.Etiquette?.LibelleLongPlanningEtiquette || '';
    }
  };
  const getFields = (fields: MobileAppointmentField[]) => fields
    .map(field => ({ field, value: getFieldValue(field) }))
    .filter(({ value }) => value);
  const primaryFields = getFields(displayConfig.primaryFields);
  const secondaryFields = getFields(displayConfig.secondaryFields);
  const titleField = primaryFields[0] || secondaryFields[0];
  
  return (
    <>
      <div 
        className="rounded-3xl p-5 mb-4 border flex items-start group transition-all duration-300"
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
            className="font-semibold text-base mb-1 transition-colors"
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
            {primaryFields.map(({ field, value }) => (
              <div key={field} className="flex items-center gap-1">
                <span>{value}</span>
              </div>
            ))}
          </div>
          {secondaryFields.length > 0 && (
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-primary underline underline-offset-2"
              onClick={() => setIsSecondaryOpen(true)}
            >
              Voir plus
            </button>
          )}
        </div>
      </div>
      {isSecondaryOpen && (
        <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label="Détails du rendez-vous">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fermer les détails"
            onClick={() => setIsSecondaryOpen(false)}
          />
          <div className="relative w-full rounded-t-[2rem] bg-secondary-bg p-5 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-secondary" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-primary">Détails du rendez-vous</h2>
              <button type="button" className="text-sm font-semibold text-primary" onClick={() => setIsSecondaryOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto flex flex-col gap-3">
              {secondaryFields.map(({ field, value }) => (
                <div key={field} className="flex flex-col gap-1 rounded-xl border border-ultra-light p-3">
                  <span className="text-xs text-secondary">
                    {field === 'LibellePlanningRessource' ? 'Libellé de la rubrique' :
                      field === 'Type' ? 'Type de ressource' :
                      field === 'DebutPlanningEvenement' ? 'Date et heure de début' :
                      field === 'FinPlanningEvenement' ? 'Date et heure de fin' :
                      field === 'AnnotationPlanningEvenement' ? 'Annotation du rendez-vous' :
                      field === 'IdEmploye' ? 'Employé du rendez-vous' :
                      field === 'EtapeValidation' ? 'Étape de validation' : 'Étiquette du rendez-vous'}
                  </span>
                  <span className="text-sm text-primary">{value}</span>
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
    
    // Check if appointment intersects with this day
    if (appEnd < startOfDay || appStart > endOfDay) {
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
