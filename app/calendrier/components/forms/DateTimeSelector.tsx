"use client";
import React from 'react';
import { addMinutes, format } from 'date-fns';
import DatePicker from '../ui/DatePicker';

export interface TimeInterval {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
}

export interface DateTimeSelectorProps {
  startDate: number;
  endDate: number;
  onDateChange: (dateType: 'start' | 'end', newDate: number) => void;
  intervals?: TimeInterval[];
  isFullDay?: boolean;
  validationError?: string;
  canEdit?: boolean;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  startDate,
  endDate,
  onDateChange,
  intervals = [],
  isFullDay = false,
  validationError,
  canEdit = true,
}) => {
  const handleDateChange = (dateType: 'start' | 'end', value: string) => {
    if (!canEdit || !value) return;

    const baseDate = new Date(value);
    const baseTs = baseDate.getTime();
    if (Number.isNaN(baseTs)) return;

    const currentTimestamp = dateType === 'start' ? startDate : endDate;
    const timeSource = new Date(currentTimestamp);
    const timeSourceTs = timeSource.getTime();
    const safeTimeSource = Number.isNaN(timeSourceTs) ? new Date() : timeSource;

    baseDate.setHours(
      safeTimeSource.getHours(),
      safeTimeSource.getMinutes(),
      0,
      0
    );

    onDateChange(dateType, baseDate.getTime());
  };

  const handleIntervalChange = (dateType: 'start' | 'end', intervalId: string) => {
    if (!canEdit) return;

    const interval = intervals.find(i => i.id === intervalId);
    if (!interval) return;

    const currentDate = dateType === 'start' ? startDate : endDate;
    const targetDate = new Date(currentDate);

    if (dateType === 'start') {
      targetDate.setHours(interval.startHour, 0, 0, 0);
    } else {
      targetDate.setHours(interval.endHour - 1, 59, 59, 999);
    }

    onDateChange(dateType, targetDate.getTime());
  };

  const getCurrentInterval = (timestamp: number, type: 'start' | 'end'): string => {
    if (intervals.length === 0) return '';

    const date = new Date(timestamp);
    if (type === 'end') {
      if (date.getHours() === 0) {
        return intervals[intervals.length - 1].id;
      }
      date.setHours(date.getHours() - 1, 59, 59, 999);
    }
    const hours = date.getHours();

    for (const interval of intervals) {
      if (hours >= interval.startHour && hours < interval.endHour) {
        return interval.id;
      }
    }

    return intervals[0]?.id || '';
  };

  const isEndIntervalDisabled = (intervalId: string): boolean => {
    if (format(startDate, 'yyyy-MM-dd') !== format(endDate, 'yyyy-MM-dd')) {
      return false;
    }

    const startHours = new Date(startDate).getHours();
    const interval = intervals.find(i => i.id === intervalId);
    if (!interval) return false;

    return interval.endHour <= startHours;
  };

  const isStartIntervalDisabled = (intervalId: string): boolean => {
    if (format(startDate, 'yyyy-MM-dd') !== format(endDate, 'yyyy-MM-dd')) {
      return false;
    }

    const endHours = new Date(endDate).getHours();
    const interval = intervals.find(i => i.id === intervalId);
    if (!interval) return false;

    return interval.startHour >= endHours;
  };

  const disabledInputStyles = !canEdit ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  return (
    <div className="flex flex-col gap-4 bg-transparent">
      {/* Date de début */}
      <div className="flex-1 flex flex-row gap-2 items-center justify-between">
        <label htmlFor="startDate" className="block text-sm font-medium">Début</label>
        <div className="flex flex-row gap-2 w-full justify-end">
          <DatePicker
            value={startDate}
            onChange={(d) => handleDateChange('start', format(new Date(d), 'yyyy-MM-dd'))}
            disabled={!canEdit}
            className="w-[145px]"
            inputClassName={`w-full p-2 border ${validationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm ${disabledInputStyles}`}
            showIcon={true}
          />

          <div className="w-[145px]">
            {!isFullDay && intervals.length > 0 && (
              <select
                id="intervalNameStart"
                name="intervalName"
                value={getCurrentInterval(startDate, 'start')}
                onChange={(e) => handleIntervalChange('start', e.target.value)}
                disabled={!canEdit}
                className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color disabled:opacity-50 disabled:cursor-not-allowed"
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
              value={addMinutes(new Date(endDate), -1)}
              onChange={(d) => handleDateChange('end', format(new Date(d), 'yyyy-MM-dd'))}
              disabled={!canEdit}
              className="w-[145px]"
              inputClassName={`w-full p-2 border ${validationError ? 'border-red-500' : 'border-default'} rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm ${disabledInputStyles}`}
              showIcon={true}
            />

            <div className="w-[145px]">
              {!isFullDay && intervals.length > 0 && (
                <select
                  id="intervalNameEnd"
                  name="intervalName"
                  value={getCurrentInterval(endDate, 'end')}
                  onChange={(e) => handleIntervalChange('end', e.target.value)}
                  disabled={!canEdit}
                  className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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