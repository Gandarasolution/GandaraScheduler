/**
 * @fileoverview Composant générique pour la sélection de dates et créneaux horaires
 * 
 * @component DateTimeSelector
 * @version 1.0.0
 * @remarks Composant agnostique du métier, réutilisable dans n'importe quel contexte
 */

"use client";
import React from 'react';
import { format, startOfDay } from 'date-fns';
import DatePicker from '../ui/DatePicker';

/**
 * Configuration d'un intervalle horaire (matin/après-midi/etc.)
 */
export interface TimeInterval {
  /** Identifiant unique de l'intervalle */
  id: string;
  /** Label affiché */
  label: string;
  /** Heure de début (format 24h) */
  startHour: number;
  /** Heure de fin (format 24h) */
  endHour: number;
}

export interface DateTimeSelectorProps {
  /** Date de début (timestamp) */
  startDate: number;
  /** Date de fin (timestamp) */
  endDate: number;
  /** Callback pour changement de date */
  onDateChange: (dateType: 'start' | 'end', newDate: number) => void;
  /** Intervals disponibles (matin, après-midi, etc.) */
  intervals?: TimeInterval[];
  /** Si true, masque les sélecteurs d'intervalle (mode journée complète) */
  isFullDay?: boolean;
  /** Message d'erreur de validation */
  validationError?: string;
}

/**
 * Composant DateTimeSelector - Sélection de période avec créneaux horaires
 * 
 * Ce composant gère la sélection d'une période (début/fin) avec support
 * des créneaux horaires personnalisables. Complètement agnostique du métier.
 * 
 * @example
 * ```tsx
 * const intervals = [
 *   { id: 'morning', label: 'Matin', startHour: 8, endHour: 12 },
 *   { id: 'afternoon', label: 'Après-midi', startHour: 13, endHour: 17 }
 * ];
 * 
 * <DateTimeSelector
 *   startDate={Date.now()}
 *   endDate={Date.now() + 86400000}
 *   onDateChange={(type, newDate) => updateDate(type, newDate)}
 *   intervals={intervals}
 *   isFullDay={false}
 *   validationError="La date de fin doit être postérieure"
 * />
 * ```
 */
export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  startDate,
  endDate,
  onDateChange,
  intervals = [],
  isFullDay = false,
  validationError,
}) => {
  /**
   * Gère le changement de date
   */
  const handleDateChange = (dateType: 'start' | 'end', value: string) => {
    if (!value) return;

    const baseDate = new Date(value);
    const baseTs = baseDate.getTime();
    if (Number.isNaN(baseTs)) return;

    // Récupérer l'heure actuelle stockée
    const currentTimestamp = dateType === 'start' ? startDate : endDate;
    const timeSource = new Date(currentTimestamp);
    const timeSourceTs = timeSource.getTime();
    const safeTimeSource = Number.isNaN(timeSourceTs) ? new Date() : timeSource;

    // Fusion : appliquer l'heure conservée sur la nouvelle date
    baseDate.setHours(
      safeTimeSource.getHours(), 
      safeTimeSource.getMinutes(), 
      0, 
      0
    );

    onDateChange(dateType, baseDate.getTime());
  };

  /**
   * Gère le changement d'intervalle (matin/après-midi)
   */
  const handleIntervalChange = (dateType: 'start' | 'end', intervalId: string) => {
    const interval = intervals.find(i => i.id === intervalId);
    if (!interval) return;

    const currentDate = dateType === 'start' ? startDate : endDate;
    const targetDate = new Date(currentDate);

    if (dateType === 'start') {
      // Pour le début, on met l'heure de début de l'intervalle
      targetDate.setHours(interval.startHour, 0, 0, 0);
    } else {
      // Pour la fin, on met l'heure de fin - 1 avec 59:59:999
      targetDate.setHours(interval.endHour - 1, 59, 59, 999);
    }

    onDateChange(dateType, targetDate.getTime());
  };

  /**
   * Détermine l'intervalle actuel basé sur l'heure
   */
  const getCurrentInterval = (timestamp: number): string => {
    if (intervals.length === 0) return '';
    
    const date = new Date(timestamp);
    const hours = date.getHours();
    
    // Trouver l'intervalle correspondant
    for (const interval of intervals) {
      if (hours >= interval.startHour && hours < interval.endHour) {
        return interval.id;
      }
    }
    
    // Par défaut, retourner le premier intervalle
    return intervals[0]?.id || '';
  };

  /**
   * Vérifie si un intervalle de fin doit être désactivé
   */
  const isEndIntervalDisabled = (intervalId: string): boolean => {
    // Si les dates sont le même jour
    if (format(startDate, 'yyyy-MM-dd') !== format(endDate, 'yyyy-MM-dd')) {
      return false;
    }

    const startHours = new Date(startDate).getHours();
    const interval = intervals.find(i => i.id === intervalId);
    if (!interval) return false;

    // Désactiver si l'intervalle de fin est avant ou égal à l'intervalle de début
    return interval.endHour <= startHours;
  };

  /**
   * Vérifie si un intervalle de début doit être désactivé
   */
  const isStartIntervalDisabled = (intervalId: string): boolean => {
    // Si les dates sont le même jour
    if (format(startDate, 'yyyy-MM-dd') !== format(endDate, 'yyyy-MM-dd')) {
      return false;
    }

    const endHours = new Date(endDate).getHours();
    const interval = intervals.find(i => i.id === intervalId);
    if (!interval) return false;

    // Désactiver si l'intervalle de début est après l'intervalle de fin
    return interval.startHour >= endHours;
  };

  return (
    <div className="flex flex-col gap-4 bg-transparent">
      {/* Date de début */}
      <div className="flex-1 flex flex-row gap-2 items-center justify-between">
        <label htmlFor="startDate" className="block text-sm font-medium">Début</label>
        <div className="flex flex-row gap-2 w-full justify-end">
          <DatePicker
            value={startDate}
            onChange={(d) => handleDateChange('start', format(new Date(d), 'yyyy-MM-dd'))}
            className="w-[145px]"
            inputClassName={`w-full p-2 border ${validationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm`}
            showIcon={true}
          />
          {/*
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={(e) => handleDateChange('start', e.target.value)}
            required
            className={`w-[145px] p-2 border ${validationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm`}
          />
          */}
    
          <div className="w-[145px]">
            {!isFullDay && intervals.length > 0 && (
              <select
                id="intervalNameStart"
                name="intervalName"
                value={getCurrentInterval(startDate)}
                onChange={(e) => handleIntervalChange('start', e.target.value)}
                className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color"
              >
                {intervals.map(interval => (
                  <option 
                    key={interval.id} 
                    value={interval.id}
                    disabled={isStartIntervalDisabled(interval.id)}
                  >
                    {interval.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Date de fin */}
      <div className="flex-1 flex flex-row gap-2 items-center">
        <label htmlFor="endDate" className="block text-sm font-medium">Fin</label>
        <div className="flex flex-col w-full">
          <div className="flex flex-row gap-2 w-full justify-end">
            <DatePicker
              value={endDate}
              onChange={(d) => handleDateChange('end', format(new Date(d), 'yyyy-MM-dd'))}
              className="w-[145px]"
              inputClassName={`w-full p-2 border ${validationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm`}
              showIcon={true}
            />
            {/* <input
              type="date"
              id="endDate"
              name="endDate"
              value={format(endDate, 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange('end', e.target.value)}
              required
              className={`w-[145px] p-2 border ${validationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm`}
            /> */}

            <div className="w-[145px]">
              {!isFullDay && intervals.length > 0 && (
                <select
                  id="intervalNameEnd"
                  name="intervalName"
                  value={getCurrentInterval(endDate)}
                  onChange={(e) => handleIntervalChange('end', e.target.value)}
                  className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color bg-gray-50"
                >
                  {intervals.map(interval => (
                    <option 
                      key={interval.id} 
                      value={interval.id}
                      disabled={isEndIntervalDisabled(interval.id)}
                    >
                      {interval.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {validationError && (
            <div className="w-full">
              <span className="text-red-500 text-xs mt-1 block">
                {validationError}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateTimeSelector;
