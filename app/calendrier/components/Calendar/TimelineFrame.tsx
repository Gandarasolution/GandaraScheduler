"use client";
import React, { useMemo, ReactNode, memo, useEffect, useState, useRef, useCallback } from 'react';
import { format, isToday, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CELL_WIDTH, TIMELINE_HEADERGROUPS_CELL_HEIGHT, TIMELINE_HEADERITEMS_CELL_HEIGHT } from '../../utils/constants';
import FlexibleFrame from '../dnd/FlexibleFrame';
import { getWeekNumber, isHoliday } from '../../utils/dates';
import { useDayTypesContext } from '../../hooks/data/dayTypesContext';
import { createPortal } from "react-dom";

interface TimelineFrameProps {
  dayInTimeline?: number[];
  columns?: {
    groups: { label: string; span: number }[];
    items: string[];
  };
  nonworkingDates?: Record<string, { Id: number; TypeJourCode: string }>;
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  todayLineColor?: string;
  showGroupHeaders?: boolean;
  showItemHeaders?: boolean;
  contentClassName?: string;
  customMonthLabels?: string[];
  customDayLabels?: string[];
  useAutoCells?: boolean;
}

const TimelineFrame: React.FC<TimelineFrameProps> = ({
  dayInTimeline,
  columns,
  mainScrollRef,
  onScroll,
  children,
  nonworkingDates,
  showGroupHeaders = true,
  showItemHeaders = true,
  contentClassName = '',
  customMonthLabels,
  customDayLabels,
  useAutoCells = false
}) => {
  const { DayTypes } = useDayTypesContext();

  const [hoveredHeaderTooltip, setHoveredHeaderTooltip] = useState<{
    day: number;
    dayTypeLabel?: string;
    isTodayDay: boolean;
    rect: DOMRect;
  } | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Indexation O(1) des DayTypes
  const dayTypesMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof DayTypes>[number]>();
    DayTypes?.forEach((dt) => map.set(dt.Id, dt));
    return map;
  }, [DayTypes]);

  const handleMouseEnterItemHeader = useCallback(
    (day: number, dayTypeLabel: string | undefined, isTodayDay: boolean, e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }

      tooltipTimeoutRef.current = setTimeout(() => {
        setHoveredHeaderTooltip({ day, dayTypeLabel, isTodayDay, rect });
      }, 500);
    },
    []
  );

  const handleMouseLeaveItemHeader = useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setHoveredHeaderTooltip(null);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const groupsInTimeline = useMemo(() => {
    const groups: { name: string; span: number; key: string }[] = [];

    if (columns) {
      return columns.groups.map((group, index) => ({
        name: group.label,
        span: group.span,
        key: `group-${index}`
      }));
    }

    if (!dayInTimeline || dayInTimeline.length === 0) return groups;

    if (customMonthLabels && customMonthLabels.length > 0) {
      const daysPerCategory = Math.ceil(dayInTimeline.length / customMonthLabels.length);

      customMonthLabels.forEach((label, categoryIndex) => {
        const startIndex = categoryIndex * daysPerCategory;
        const endIndex = Math.min(startIndex + daysPerCategory, dayInTimeline.length);
        const span = endIndex - startIndex;

        if (span > 0) {
          groups.push({
            name: label,
            span,
            key: `custom-${categoryIndex}`,
          });
        }
      });

      return groups;
    }

    let currentMonth = format(dayInTimeline[0], 'yyyy-MM', { locale: fr });
    let currentMonthStartDayIndex = 0;

    dayInTimeline.forEach((day, index) => {
      const monthKey = format(day, 'yyyy-MM', { locale: fr });
      if (monthKey !== currentMonth) {
        groups.push({
          name: format(dayInTimeline[currentMonthStartDayIndex], 'MMMM yyyy', { locale: fr }),
          span: index - currentMonthStartDayIndex,
          key: currentMonth,
        });
        currentMonth = monthKey;
        currentMonthStartDayIndex = index;
      }
      if (index === dayInTimeline.length - 1) {
        groups.push({
          name: format(day, 'MMMM yyyy', { locale: fr }),
          span: index - currentMonthStartDayIndex + 1,
          key: currentMonth,
        });
      }
    });
    return groups;
  }, [dayInTimeline, customMonthLabels, columns]);

  const itemsInTimeline = useMemo(() => {
    if (columns) return columns.items;
    if (!dayInTimeline) return [];
    if (customDayLabels && customDayLabels.length > 0) return customDayLabels;
    return dayInTimeline.map(day => format(day, 'd', { locale: fr }));
  }, [dayInTimeline, customDayLabels, columns]);

  const computedHeaders = useMemo(() => {
    const headersConfig = [];

    if (showGroupHeaders) {
      headersConfig.push({
        show: true,
        minHeight: TIMELINE_HEADERGROUPS_CELL_HEIGHT,
        containerClassName: 'bg-secondary border-ultra-light',
        items: groupsInTimeline.map(group => ({
          span: group.span,
          key: group.key,
          style: {
            maxHeight: `${TIMELINE_HEADERGROUPS_CELL_HEIGHT}px`,
            minHeight: `${TIMELINE_HEADERGROUPS_CELL_HEIGHT}px`,
          },
          className: `col-span-full text-primary flex items-center justify-start py-2 text-[14px] poppins border-r border-ultra-light bg-secondary border-b`,
          render: () => (
            <div className="sticky left-0 z-30 pl-4">
              <div className="flex sticky flex-col items-center">
                <span className="poppins text-center font-semibold">
                  {group.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </div>
            </div>
          ),
        }))
      });
    }

    if (showItemHeaders) {
      const ferieType = dayTypesMap.get('ferie');

      headersConfig.push({
        show: true,
        minHeight: TIMELINE_HEADERITEMS_CELL_HEIGHT,
        containerClassName: 'bg-secondary border-ultra-light',
        items: itemsInTimeline.map((item, index) => {
          if ((customDayLabels && customDayLabels.length > 0) || columns) {
            return {
              span: 1,
              key: `item-${index}-custom`,
              style: { width: `${CELL_WIDTH}px`, height: 'auto', minWidth: `${CELL_WIDTH}px` },
              render: () => (
                <div className="flex flex-col justify-center border-b border-r border-light text-center text-sm font-semibold text-primary p-2 bg-secondary relative item-cell">
                  <div className="flex flex-col justify-center items-center h-full px-2">
                    <span className="text-xs leading-3 break-words text-center">{item}</span>
                  </div>
                </div>
              )
            };
          }

          if (!dayInTimeline || !dayInTimeline[index]) return { span: 1, key: `empty-${index}`, render: () => null };

          const day = dayInTimeline[index];
          const todayDay = isToday(day);
          const holiday = isHoliday(day);
          const weekNumber = getWeekNumber(day);
          const dayKey = format(day, 'yyyy-MM-dd');

          const nonWorkingEntry = nonworkingDates?.[dayKey];
          const dayType = nonWorkingEntry ? dayTypesMap.get(nonWorkingEntry.TypeJourCode) : undefined;
          const hasTooltipInfo = Boolean(nonWorkingEntry?.TypeJourCode || holiday || todayDay);

          let backgroundColor = 'var(--bg-secondary)';
          let textColor = 'var(--text-primary)';
          let isItalic = false;
          let isBold = false;

          if (todayDay) {
            backgroundColor = 'var(--calendar-bg-today)';
          } else if (holiday) {
            backgroundColor = ferieType?.CouleurFond || '#ffe0e0';
            textColor = ferieType?.CouleurTexte || 'var(--text-primary)';
            isItalic = ferieType?.isItalic || false;
            isBold = ferieType?.isBold || false;
          } else if (isWeekend(day)) {
            backgroundColor = 'var(--calendar-bg-weekend)';
          } else if (nonWorkingEntry) {
            backgroundColor = dayType?.CouleurFond || '#f9f9f9';
            textColor = dayType?.CouleurTexte || 'var(--text-primary)';
            isItalic = dayType?.isItalic || false;
            isBold = dayType?.isBold || false;
          }

          const customLabelParts = customDayLabels?.[index]?.split(' ');
          const dayNumberLabel = customLabelParts ? customLabelParts[0] : format(day, 'd', { locale: fr });
          const rawDayName = customLabelParts
            ? customLabelParts.slice(1).join(' ')
            : format(day, 'EEE', { locale: fr }).replace('.', '');
          const dayNameLabel = customLabelParts
            ? rawDayName
            : rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);

          return {
            span: 1,
            key: `item-${index}-${nonWorkingEntry ? 'nw' : 'w'}`,
            style: {
              maxHeight: `${TIMELINE_HEADERITEMS_CELL_HEIGHT}px`,
              minHeight: `${TIMELINE_HEADERITEMS_CELL_HEIGHT}px`,
              width: `${CELL_WIDTH}px`,
              minWidth: `${CELL_WIDTH}px`
            },
            render: () => (
              <div
                className={`
                  ${isItalic ? 'italic' : ''}
                  ${isBold ? 'font-bold' : ''}
                  flex flex-col justify-end border-b border-r border-light text-center text-sm font-semibold p-1 h-full w-full
                  relative day-cell
                `}
                style={{
                  backgroundColor,
                  color: textColor,
                }}
                onMouseEnter={
                  hasTooltipInfo
                    ? (e) => handleMouseEnterItemHeader(day, dayType?.Libelle, todayDay, e)
                    : undefined
                }
                onMouseLeave={hasTooltipInfo ? handleMouseLeaveItemHeader : undefined}
              >
                {new Date(day).getDay() === 1 && (
                  <span
                    className="absolute -top-4 -left-3 z-30 rounded-full p-2 flex items-center justify-center text-white font-bold"
                    style={{ width: '24px', height: '24px', background: '#23adde' }}
                  >
                    {weekNumber}
                  </span>
                )}
                <div className="flex flex-col justify-center items-center h-full">
                  <span className="block font-bold text-lg">{dayNumberLabel}</span>
                  <span className="block text-xs">{dayNameLabel}</span>
                </div>
              </div>
            )
          };
        })
      });
    }

    return headersConfig;
  }, [
    showGroupHeaders,
    showItemHeaders,
    groupsInTimeline,
    itemsInTimeline,
    dayInTimeline,
    nonworkingDates,
    customDayLabels,
    columns,
    dayTypesMap,
    handleMouseEnterItemHeader,
    handleMouseLeaveItemHeader,
  ]);

  const gridConfig = useMemo(
    () => ({
      mode: useAutoCells ? ('auto' as const) : ('fixed' as const),
      columns: itemsInTimeline.length,
      cellWidth: CELL_WIDTH,
      minColumnWidth: CELL_WIDTH,
    }),
    [useAutoCells, itemsInTimeline.length]
  );

  return (
    <>
      <FlexibleFrame
        mainRef={mainScrollRef}
        onScroll={onScroll}
        className={contentClassName}
        gridConfig={gridConfig}
        headers={computedHeaders}
      >
        {children}
      </FlexibleFrame>

      {hoveredHeaderTooltip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: hoveredHeaderTooltip.rect.bottom - TIMELINE_HEADERITEMS_CELL_HEIGHT - 8,
              left: hoveredHeaderTooltip.rect.left + hoveredHeaderTooltip.rect.width / 2,
              transform: 'translate(-50%, -100%)',
            }}
            className="z-[9999] px-3 py-1.5 text-xs font-medium text-black bg-page rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          >
            <span className="font-semibold">
              {format(hoveredHeaderTooltip.day, 'EEEE dd MMMM yyyy', { locale: fr })}
            </span>
            {hoveredHeaderTooltip.dayTypeLabel && (
              <span className="block text-xs mt-1">{hoveredHeaderTooltip.dayTypeLabel}</span>
            )}
            {hoveredHeaderTooltip.isTodayDay && (
              <span className="block text-xs mt-1">Aujourd&apos;hui</span>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-200" />
          </div>,
          document.body
        )}
    </>
  );
};

export default memo(TimelineFrame);