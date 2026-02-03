import React from 'react';
import { Appointment, Item } from '../../../types/index';
import { Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentListProps {
  appointments: Appointment[];
  selectedDate: Date;
  items: Item[];
}

const AppointmentCard: React.FC<{ app: Appointment, colorClass: string, items: Item[] }> = ({ app, colorClass, items }) => {
  const diffInMs = app.endDate - app.startDate;
  
  const timeSlot= diffInMs >= 24 * 59 * 1 * 1000 ? 'Toute la journée' :
    new Date(app.startDate).getHours() === 0 && new Date(app.endDate).getHours() === 11 ? 'Matin' :
    new Date(app.startDate).getHours() === 12 && new Date(app.endDate).getHours() === 23 ? 'Après-midi' :
    `${format(new Date(app.startDate), 'HH:mm', { locale: fr })} - ${format(new Date(app.endDate), 'HH:mm', { locale: fr })}`;


  return (
    <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-50 flex items-start group hover:shadow-md transition-all duration-300">
      <div className={`w-1.5 h-12 rounded-full ${colorClass} mr-4 mt-1`}></div>
      <div className="flex-1">
        <h3 className="text-gray-800 font-semibold text-base mb-1 group-hover:text-teal-600 transition-colors">{items.find(item => item.id === app.EventId)?.label || 'Rendez-vous'}</h3>
        <div className="flex items-center text-gray-400 text-xs mb-2">
          <span className="capitalize">{app.type}</span>
        </div>
        <div className="inline-flex items-center bg-gray-50 px-3 py-1 rounded-full">
          <Clock size={12} className="text-gray-400 mr-1.5" />
          <span className="text-xs font-medium text-gray-600">{timeSlot}</span>
        </div>
      </div>
    </div>
  );
};

const AppointmentList: React.FC<AppointmentListProps> = ({ appointments, items }) => {
  // Group appointments by time of day
  const morningApps = appointments.filter(a => {
    const hour = new Date(a.startDate).getHours();
    return hour < 12;
  });
  
  const afternoonApps = appointments.filter(a => {
    const hour = new Date(a.startDate).getHours();
    return hour >= 12 && hour < 18;
  });
  
  const eveningApps = appointments.filter(a => {
    const hour = new Date(a.startDate).getHours();
    return hour >= 18;
  });

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 opacity-60">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
           <Clock size={32} />
        </div>
        <p className="text-gray-500 font-medium">Aucun rendez-vous ce jour.</p>
        <p className="text-xs text-gray-400 mt-1">Profitez de votre temps libre !</p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-24 animate-in slide-in-from-bottom-4 duration-500">
      
      {morningApps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Matin</h4>
          {morningApps.map(app => (
            <AppointmentCard key={app.id} app={app} colorClass="bg-teal-500" items={items} />
          ))}
        </div>
      )}

      {afternoonApps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Après-midi</h4>
          {afternoonApps.map(app => (
            <AppointmentCard key={app.id} app={app} colorClass="bg-orange-400" items={items} />
          ))}
        </div>
      )}
      
      {eveningApps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-2">Soir</h4>
          {eveningApps.map(app => (
            <AppointmentCard key={app.id} app={app} colorClass="bg-purple-500" items={items} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentList;