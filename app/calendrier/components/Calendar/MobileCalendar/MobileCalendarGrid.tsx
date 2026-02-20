/**
 * @fileoverview Composant de grille de calendrier pour mobile
 * 
 * Affiche un mois complet avec indicateurs de rendez-vous
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import {useState} from 'react';
import { 
  format, 
  isSameDay, 
  isSameMonth, 
  isToday, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  addWeeks
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Appointment } from '../../../types';

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  appointments: Appointment[];
  onDateSelect: (date: Date) => void;
  onChange: (date: Date) => void;
}

export const MobileCalendarGrid: React.FC<CalendarGridProps> = ({ 
  currentDate, 
  selectedDate, 
  appointments, 
  onDateSelect,
  onChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculer les dates de début et fin selon l'état expandé
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  
  const startDate = isExpanded 
    ? startOfWeek(monthStart, { weekStartsOn: 1 })  // Mois entier
    : startOfWeek(currentDate, { weekStartsOn: 1 }); // Début de la semaine actuelle
  
  const endDate = isExpanded
    ? endOfWeek(monthEnd, { weekStartsOn: 1 })      // Mois entier
    : endOfWeek(addWeeks(currentDate, 1), { weekStartsOn: 1 }); // Fin de la semaine suivante

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
    <div className="flex flex-col px-6 pb-6 h-auto transition-all duration-300">
      <div className="mb-4 flex items-center justify-between">
        <span 
          className="text-sm font-medium capitalize transition-all duration-300 ease-in-out"
          style={{ color: 'var(--text-secondary)' }}
        >
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </span>
        <input
          type="date"
          id="start"
          name="trip-start"
          value={format(currentDate, 'yyyy-MM-dd')}
          onChange={(e) => onChange(new Date(e.target.value))}
          className="transition-all duration-200 ease-in-out rounded-lg px-2 py-1"
          style={{ 
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-light)'
          }}
        />
      </div>
      
      <div 
        className="rounded-[2.5rem] p-6 relative transition-all duration-300 ease-in-out"
        style={{
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 mb-4">
          {weekDays.map((day, index) => (
            <div 
              key={index} 
              className="text-center text-xs font-semibold"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7 gap-y-4 gap-x-1 transition-all duration-300 ease-in-out">
          {days.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const today = isToday(day);
            const hasApps = hasAppointment(day.getTime());
            const appCount = getDayAppointmentCount(day.getTime());

            return (
              <div 
                key={index} 
                className="flex flex-col items-center justify-center relative cursor-pointer transition-all duration-200 ease-in-out"
                onClick={() => onDateSelect(day)}
              >
                <div 
                  className={`
                    w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300
                    ${isSelected ? 'transform scale-105' : ''}
                    ${!isCurrentMonth ? 'opacity-20' : ''}
                  `}
                  style={{
                    backgroundColor: isSelected 
                      ? 'var(--color-primary)' 
                      : today 
                        ? 'var(--color-primary-lighter)'
                        : 'transparent',
                    color: isSelected 
                      ? 'var(--text-inverse)' 
                      : today 
                        ? 'var(--color-primary)'
                        : 'var(--text-primary)',
                    fontWeight: today ? 'bold' : 'medium',
                    boxShadow: isSelected ? 'var(--shadow-lg)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !today) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !today) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {format(day, 'd')}
                </div>
                
                {/* Indicateur visuel de rendez-vous */}
                <div className="h-1.5 mt-1 flex space-x-0.5 transition-all duration-200 ease-in-out">
                  {hasApps && isCurrentMonth && (
                    <span 
                      className="w-1.5 h-1.5 rounded-full transition-all duration-300 ease-in-out"
                      style={{
                        backgroundColor: isSelected 
                          ? 'rgba(255, 255, 255, 0.5)' 
                          : appCount > 2 
                            ? '#a78bfa'
                            : appCount > 1 
                              ? '#fbbf24'
                              : 'var(--color-primary)'
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button 
          className={`absolute -bottom-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-sm hover:shadow-lg active:scale-95 transition-all duration-300 ease-in-out ${!isExpanded ? 'rotate-180' : ''}`}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--text-inverse)',
            boxShadow: 'var(--shadow-md)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-up transition-transform duration-300 ease-in-out" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};
