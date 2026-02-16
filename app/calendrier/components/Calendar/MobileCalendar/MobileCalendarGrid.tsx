/**
 * @fileoverview Composant de grille de calendrier pour mobile
 * 
 * Affiche un mois complet avec indicateurs de rendez-vous
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React from 'react';
import { 
  format, 
  isSameDay, 
  isSameMonth, 
  isToday, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval 
} from 'date-fns';
import { Appointment } from '../../../types';

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  appointments: Appointment[];
  onDateSelect: (date: Date) => void;
}

export const MobileCalendarGrid: React.FC<CalendarGridProps> = ({ 
  currentDate, 
  selectedDate, 
  appointments, 
  onDateSelect 
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Semaine commence lundi
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; // Jours de la semaine

  // Vérifier si un jour a des rendez-vous
  const hasAppointment = (day: number) => {
    const start = new Date(day).setHours(0, 0, 0, 0);
    const end = new Date(day).setHours(23, 59, 59, 999);
    return appointments.some(app => app.startDate <= end && app.endDate >= start);
  };

  // Compter le nombre de rendez-vous pour un jour
  const getDayAppointmentCount = (day: number) => {
    const start = new Date(day).setHours(0, 0, 0, 0);
    const end = new Date(day).setHours(23, 59, 59, 999);
    return appointments.filter(app => app.startDate <= end && app.endDate >= start).length;
  };

  return (
    <div className="px-6 pb-6">
      <div className="bg-white rounded-[2.5rem] p-6 shadow-soft">
        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 mb-4">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-xs font-semibold text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7 gap-y-4 gap-x-1">
          {days.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const today = isToday(day);
            const hasApps = hasAppointment(day.getTime());
            const appCount = getDayAppointmentCount(day.getTime());

            return (
              <div 
                key={index} 
                className="flex flex-col items-center justify-center relative cursor-pointer"
                onClick={() => onDateSelect(day)}
              >
                <div 
                  className={`
                    w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300
                    ${isSelected 
                      ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30 transform scale-105' 
                      : (today ? 'text-teal-500 font-bold bg-teal-50' : 'text-gray-700 hover:bg-gray-50')
                    }
                    ${!isCurrentMonth ? 'opacity-20 text-gray-400' : ''}
                  `}
                >
                  {format(day, 'd')}
                </div>
                
                {/* Indicateur visuel de rendez-vous */}
                <div className="h-1.5 mt-1 flex space-x-0.5">
                  {hasApps && isCurrentMonth && (
                    <span 
                      className={`
                        w-1.5 h-1.5 rounded-full 
                        ${isSelected 
                          ? 'bg-white/50' 
                          : (appCount > 2 ? 'bg-purple-400' : (appCount > 1 ? 'bg-yellow-400' : 'bg-teal-400'))
                        }
                      `}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
