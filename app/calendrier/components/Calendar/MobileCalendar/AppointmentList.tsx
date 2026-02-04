import React from 'react';
import { Appointment, Item } from '../../../types/index';
import { Clock, MapPin } from 'lucide-react';

interface AppointmentListProps {
  appointments: Appointment[];
  selectedDate: Date;
  items: Item[];
}

const AppointmentCard: React.FC<{ app: Appointment, colorClass: string, items: Item[], timeSlot: string }> = ({ app, colorClass, items, timeSlot }) => {
  return (
    <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-50 flex items-start group hover:shadow-md transition-all duration-300">
      <div className={`w-1.5 h-12 rounded-full ${colorClass} mr-4 mt-1`}></div>
      <div className="flex-1">
        <h3 className="text-gray-800 font-semibold text-base mb-1 group-hover:text-teal-600 transition-colors">{items.find(item => item.id === app.EventId)?.label || 'Rendez-vous'}</h3>
        <div className="flex items-center text-gray-400 text-xs mb-2">
          <span className="capitalize">{app.type}</span>
        </div>
        {/* <div className="inline-flex items-center bg-gray-50 px-3 py-1 rounded-full">
          <Clock size={12} className="text-gray-400 mr-1.5" />
          <span className="text-xs font-medium text-gray-600">{timeSlot}</span>
        </div> */}
      </div>
    </div>
  );
};

const AppointmentList: React.FC<AppointmentListProps> = ({ appointments, selectedDate, items }) => {
  // Helper to check if appointment covers a specific period of a day
  const getAppointmentPeriodForDay = (app: Appointment, targetDate: Date) => {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const noonOfDay = new Date(targetDate);
    noonOfDay.setHours(12, 0, 0, 0);
    
    const appStart = new Date(app.startDate);
    const appEnd = new Date(app.endDate);
    
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
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
           <Clock size={32} />
        </div>
        <p className="text-gray-500 font-medium">Aucun rendez-vous ce jour.</p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
      
      {fullDayApps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Journée complète</h4>
          {fullDayApps.map(app => (
            <AppointmentCard key={app.id} app={app} colorClass="bg-purple-500" items={items} timeSlot="Toute la journée" />
          ))}
        </div>
      )}
      
      {morningApps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Matin</h4>
          {morningApps.map(app => (
            <AppointmentCard key={app.id} app={app} colorClass="bg-teal-500" items={items} timeSlot="Matin" />
          ))}
        </div>
      )}

      {afternoonApps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Après-midi</h4>
          {afternoonApps.map(app => (
            <AppointmentCard key={app.id} app={app} colorClass="bg-orange-400" items={items} timeSlot="Après-midi" />
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentList;