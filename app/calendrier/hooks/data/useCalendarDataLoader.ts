import { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE,
  INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER,
} from '../../utils/constants';

interface UseCalendarDataLoaderParams {
  visibleWindowStart: number;
  visibleWindowEnd: number;
  isGrabbing: boolean;
  isScrolling: boolean;
  visibleEmployeeIds: number[];
  onLoadAppointmentsInRange: (startDate: number, endDate: number, employeeIds?: number[]) => Promise<boolean>;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const SOFT_THRESHOLD_BEFORE = (INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE - 2) * MS_PER_WEEK;
const SOFT_THRESHOLD_AFTER = (INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER - 2) * MS_PER_WEEK;
const HARD_THRESHOLD = 3 * 24 * 60 * 60 * 1000;
const LOAD_BUFFER_BEFORE = INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE * MS_PER_WEEK;
const LOAD_BUFFER_AFTER = INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER * MS_PER_WEEK;

export const useCalendarDataLoader = ({
  visibleWindowStart,
  visibleWindowEnd,
  isGrabbing,
  isScrolling,
  visibleEmployeeIds,
  onLoadAppointmentsInRange,
}: UseCalendarDataLoaderParams): void => {
  const isLoadingRef = useRef(false);
  const loadedStartRef = useRef(0);
  const loadedEndRef = useRef(0);
  const loadedEmployeeIdsRef = useRef<Set<number>>(new Set());

  const uniqueEmployeeIds = useMemo(
    () => Array.from(new Set(visibleEmployeeIds)).sort((a, b) => a - b),
    [visibleEmployeeIds]
  );
  const employeeIdsKey = useMemo(() => uniqueEmployeeIds.join(','), [uniqueEmployeeIds]);

  const latestRef = useRef({
    visibleWindowStart,
    visibleWindowEnd,
    uniqueEmployeeIds,
    onLoadAppointmentsInRange,
  });
  latestRef.current = {
    visibleWindowStart,
    visibleWindowEnd,
    uniqueEmployeeIds,
    onLoadAppointmentsInRange,
  };

  const checkAndLoadData = useCallback((forceCriticalCheck = false): boolean => {
    if (isLoadingRef.current) return false;

    const {
      visibleWindowStart: winStart,
      visibleWindowEnd: winEnd,
      uniqueEmployeeIds: empIds,
      onLoadAppointmentsInRange: loadFn,
    } = latestRef.current;

    if (empIds.length === 0 || (winStart === 0 && winEnd === 0)) return false;

    const thresholdBefore = forceCriticalCheck ? HARD_THRESHOLD : SOFT_THRESHOLD_BEFORE;
    const thresholdAfter = forceCriticalCheck ? HARD_THRESHOLD : SOFT_THRESHOLD_AFTER;

    const isFirstLoad = loadedStartRef.current === 0;
    const isOutOfBoundLeft = !isFirstLoad && winStart < loadedStartRef.current - thresholdBefore;
    const isOutOfBoundRight = !isFirstLoad && winEnd > loadedEndRef.current + thresholdAfter;

    // Identifier uniquement les nouveaux employés non encore chargés sur cette plage
    const missingEmployeeIds = empIds.filter((id) => !loadedEmployeeIdsRef.current.has(id));

    if (!isFirstLoad && !isOutOfBoundLeft && !isOutOfBoundRight && missingEmployeeIds.length === 0) {
      return false;
    }

    isLoadingRef.current = true;

    const newLoadStart = isFirstLoad || isOutOfBoundLeft ? winStart - LOAD_BUFFER_BEFORE : loadedStartRef.current;
    const newLoadEnd = isFirstLoad || isOutOfBoundRight ? winEnd + LOAD_BUFFER_AFTER : loadedEndRef.current;
    const targetEmployees = isFirstLoad || isOutOfBoundLeft || isOutOfBoundRight ? empIds : missingEmployeeIds;

    loadFn(newLoadStart, newLoadEnd, targetEmployees).finally(() => {
      isLoadingRef.current = false;
    });

    loadedStartRef.current = newLoadStart;
    loadedEndRef.current = newLoadEnd;
    for (let i = 0; i < targetEmployees.length; i++) {
      loadedEmployeeIdsRef.current.add(targetEmployees[i]!);
    }

    return true;
  }, []);

  // Chargement initial et changement d'employés virtualisés (scroll vertical)
  useEffect(() => {
    if (!employeeIdsKey || (visibleWindowStart === 0 && visibleWindowEnd === 0)) return;

    const debounceTimer = window.setTimeout(() => {
      checkAndLoadData(false);
    }, 150);

    return () => window.clearTimeout(debounceTimer);
  }, [employeeIdsKey, visibleWindowStart, visibleWindowEnd, checkAndLoadData]);

  // SCÉNARIO A : Relâchement du grab
  const prevIsGrabbing = useRef(false);
  useEffect(() => {
    if (prevIsGrabbing.current && !isGrabbing) {
      checkAndLoadData(false);
    }
    prevIsGrabbing.current = isGrabbing;
  }, [isGrabbing, checkAndLoadData]);

  // SCÉNARIO B : Arrêt du scroll
  const prevIsScrolling = useRef(false);
  useEffect(() => {
    if (prevIsScrolling.current && !isScrolling && !isGrabbing) {
      checkAndLoadData(false);
    }
    prevIsScrolling.current = isScrolling;
  }, [isScrolling, isGrabbing, checkAndLoadData]);

  // SCÉNARIO C : Limite critique pendant le scroll
  useEffect(() => {
    if (isScrolling && !isGrabbing) {
      checkAndLoadData(true);
    }
  }, [visibleWindowStart, visibleWindowEnd, isScrolling, isGrabbing, checkAndLoadData]);
};