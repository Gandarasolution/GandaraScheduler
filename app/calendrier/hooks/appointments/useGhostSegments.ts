import { useMemo } from 'react';
import { CELL_WIDTH, DAY_MS } from '../../utils/constants';
import { countWeekends } from '../../utils/dates';

export interface GhostSegment {
  widthGhost: number;
  widthNoGhost: number;
  leftOffset: number;
}

interface UseGhostSegmentsParams {
  isGhost: boolean;
  ghostInterval?: { start: number; end: number } | { start: number; end: number }[];
  dragStart: number;
  dragEnd: number;
  isFullDay: boolean;
  isDisplayWeekend: boolean;
}

const EMPTY_SEGMENTS: GhostSegment[] = [];

const calculateSegmentWidth = (
  start: number,
  end: number,
  isFullDay: boolean,
  isDisplayWeekend: boolean
): number => {
  const intervalMs = isFullDay ? DAY_MS : DAY_MS / 2;
  const intervalWidth = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
  const intervals = Math.round((end - start) / intervalMs);
  const weekends = isDisplayWeekend ? 0 : countWeekends(start, end);
  const visualDays = Math.max(0, intervals - weekends * (isFullDay ? 1 : 2));

  return visualDays * intervalWidth;
};

export const useGhostSegments = ({
  isGhost,
  ghostInterval,
  dragStart,
  dragEnd,
  isFullDay,
  isDisplayWeekend,
}: UseGhostSegmentsParams): GhostSegment[] => {
  return useMemo((): GhostSegment[] => {
    if (!isGhost || !ghostInterval) {
      return EMPTY_SEGMENTS;
    }

    const intervals = Array.isArray(ghostInterval) ? ghostInterval : [ghostInterval];
    const sortedIntervals = intervals
      .filter((gi) => gi && gi.end > dragStart && gi.start < dragEnd)
      .sort((a, b) => a.start - b.start);

    if (sortedIntervals.length === 0) {
      return EMPTY_SEGMENTS;
    }

    const ghostWidths: GhostSegment[] = [];
    let currentPos = dragStart;
    let runningLeftOffset = 0;

    for (let i = 0; i < sortedIntervals.length; i++) {
      const gi = sortedIntervals[i]!;
      const overlapStart = Math.max(gi.start, dragStart);
      const overlapEnd = Math.min(gi.end, dragEnd);

      if (overlapStart > currentPos) {
        const visibleSegment = calculateSegmentWidth(currentPos, overlapStart, isFullDay, isDisplayWeekend);
        if (visibleSegment > 0) {
          ghostWidths.push({ widthGhost: 0, widthNoGhost: visibleSegment, leftOffset: runningLeftOffset });
          runningLeftOffset += visibleSegment;
        }
      }

      const ghostSegment = calculateSegmentWidth(overlapStart, overlapEnd, isFullDay, isDisplayWeekend);
      if (ghostSegment > 0) {
        ghostWidths.push({ widthGhost: ghostSegment, widthNoGhost: 0, leftOffset: runningLeftOffset });
        runningLeftOffset += ghostSegment;
      }

      currentPos = overlapEnd;
    }

    if (currentPos < dragEnd) {
      const visibleSegment = calculateSegmentWidth(currentPos, dragEnd, isFullDay, isDisplayWeekend);
      if (visibleSegment > 0) {
        ghostWidths.push({ widthGhost: 0, widthNoGhost: visibleSegment, leftOffset: runningLeftOffset });
      }
    }

    return ghostWidths.length > 0 ? ghostWidths : EMPTY_SEGMENTS;
  }, [isGhost, ghostInterval, dragStart, dragEnd, isFullDay, isDisplayWeekend]);
};