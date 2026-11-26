import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { eachDayOfInterval } from "date-fns";
import { Appointment, User, HistoryAction, Item, Tag, AutreItem } from '../../types';
import { createAppointmentUtils } from '../../utils/appointmentUtils';
import { getWorkedDayIntervals, isWeekend } from "../../utils/dates";
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from "../../utils/constants";
import ressourceService from '@/app/service/ressource.service';
import displaySettingsService, { DisplaySettings } from '@/app/service/displaySettings.service';

export type RepeatData = {
  numberCount: number;
  repeatCount: number | null;
  repeatInterval: "day" | "week" | "month";
  endDate: number | null;
};

type ActionResult = { success: boolean; message?: string };

interface LogicProps {
  employees: User[];
  appointmentsRef: React.MutableRefObject<Appointment[]>;
  eventsRef: React.MutableRefObject<Record<number, Item>>;
  timelineState: {
    isFullDay: boolean;
    isDisplayWeekend: boolean;
    includeWeekend: boolean;
    respectNonWorkingDays: boolean;
    nonWorkingDates: Record<string, { Id: number; TypeJourCode: string }>;
  };
  onUpdate: () => void;
  setIsSearchOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDimensionsSearchInput: React.Dispatch<React.SetStateAction<string>>;
  onLockedError: (message: string) => void;
  api: {
    createEvenement: (data: any) => Promise<any>;
    updateEvenement: (id: string, data: any) => Promise<any>;
    deleteEvenement: (id: string) => Promise<any>;
    updateEvenementAndRessource: (id: string, data: any) => Promise<any>;
    divideEvenement: (id: string, data: any) => Promise<any>;
    repeatEvenement: (data: any) => Promise<any>;
    deleteEvenements: (ids: string[]) => Promise<any>;
    unlockEvenement: (id: number | null | undefined) => Promise<any>;
    lockEvenement: (id: number | null | undefined) => Promise<any>;
    addImage: (base64: string) => Promise<{ success: boolean; id?: number; message?: string }>;
  };
}

const isApiSuccess = (resp: any): boolean => {
  if (!resp || resp.success === false) return false;
  if (typeof resp.error !== 'undefined') return !resp.error;
  if (typeof resp.data?.error !== 'undefined') return !resp.data.error;
  return resp.success === true || typeof resp.error === 'undefined';
};

const getApiErrorMessage = (resp: any): string => {
  const message =
    resp?.message ??
    resp?.data?.message ??
    resp?.data?.data ??
    (typeof resp?.data === 'string' ? resp.data : undefined);

  return typeof message === 'string' && message.trim()
    ? message
    : 'Le serveur a refusé la sauvegarde.';
};

const cloneAppointments = (list: Appointment[]): Appointment[] =>
  list.map((app) => ({ ...app }));

export const useAppointmentLogic = ({
  employees,
  appointmentsRef,
  eventsRef,
  timelineState,
  onUpdate,
  setIsSearchOverlayOpen,
  setDimensionsSearchInput,
  api,
  onLockedError,
}: LogicProps) => {
  // Indexation O(1) des employés par IdPersonnel
  const employeesMap = useMemo(() => {
    const map = new Map<number, User>();
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]!;
      map.set(Number(emp.IdPersonnel), emp);
    }
    return map;
  }, [employees]);

  const appointmentUtils = useMemo(() => createAppointmentUtils(employees), [employees]);

  // --- Refs pour la persistance hors rendu ---
  const history = useRef<HistoryAction[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const clipboardAppointment = useRef<Appointment | null>(null);
  const timestampCounter = useRef(1000);

  // --- États UI ---
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; date: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: number; employeeId: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [repeatData, setRepeatData] = useState<RepeatData | null>(null);
  const [extendData, setExtendData] = useState<number | null>(null);

  const [alertState, setAlertState] = useState<{
    isVisible: boolean;
    title: string;
    onConfirm: () => void;
    onCancel: () => void;
    fetchToLockAppointment?: () => Promise<any>;
  }>({
    isVisible: false,
    title: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Ref centralisant toutes les dépendances volatiles pour stabiliser les useCallback
  const latestRef = useRef({
    timelineState,
    selectedAppointment,
    selectedCell,
    repeatData,
    extendData,
    employeesMap,
    appointmentUtils,
    api,
    onUpdate,
    onLockedError,
    setIsSearchOverlayOpen,
    setDimensionsSearchInput,
  });
  latestRef.current = {
    timelineState,
    selectedAppointment,
    selectedCell,
    repeatData,
    extendData,
    employeesMap,
    appointmentUtils,
    api,
    onUpdate,
    onLockedError,
    setIsSearchOverlayOpen,
    setDimensionsSearchInput,
  };

  // --- Helpers internes ---
  const addMissingResourcesToCache = useCallback(
    (resources: Item[]) => {
      if (!Array.isArray(resources) || resources.length === 0) return;

      let updatedCache: Record<number, Item> | null = null;
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        const resourceId = Number(resource?.IdPlanningRessource);
        if (Number.isFinite(resourceId) && !eventsRef.current[resourceId]) {
          if (!updatedCache) updatedCache = { ...eventsRef.current };
          updatedCache[resourceId] = resource!;
        }
      }

      if (updatedCache) {
        eventsRef.current = updatedCache;
      }
    },
    [eventsRef]
  );

  const uploadImageIfNeeded = useCallback(
    async (image?: { id: number; image: string }): Promise<{ success: boolean; imageId?: number; message?: string }> => {
      if (!image || image.id !== 0) {
        return { success: true, imageId: image?.id };
      }
      const result = await latestRef.current.api.addImage(image.image);
      if (!result.success || !result.id) {
        return { success: false, message: result.message || "Erreur lors de l'ajout de l'image." };
      }
      return { success: true, imageId: result.id };
    },
    []
  );

  const buildEventApiPayload = useCallback(
    (app: {
      DebutPlanningEvenement: number;
      FinPlanningEvenement: number;
      IdEmploye: number;
      IdPlanningRessource: number;
      AnnotationPlanningEvenement?: string;
      PlanningEvenementPriorite?: number;
      Etiquette?: Tag;
    }) => {
      const employee = latestRef.current.employeesMap.get(Number(app.IdEmploye));
      return {
        DebutPlanningEvenement: app.DebutPlanningEvenement,
        FinPlanningEvenement: app.FinPlanningEvenement,
        Type: employee?.Type,
        IdEmploye: app.IdEmploye,
        IdPlanningRessource: app.IdPlanningRessource,
        AnnotationPlanningEvenement: app.AnnotationPlanningEvenement,
        PlanningEvenementPriorite: app.PlanningEvenementPriorite ?? 0,
        IdPlanningEtiquette: app.Etiquette?.IdPlanningEtiquette,
      };
    },
    []
  );

  // --- GESTION DES PRIORITÉS ---
  const reorganizePriorities = useCallback(
    (movedAppointmentId: number, newPriority: number, employeeId: number, startDate: number, endDate: number) => {
      const targetEmpId = Number(employeeId);
      const list = appointmentsRef.current;
      for (let i = 0; i < list.length; i++) {
        const app = list[i]!;
        if (
          app.IdPlanningEvenement !== movedAppointmentId &&
          Number(app.IdEmploye) === targetEmpId &&
          app.DebutPlanningEvenement < endDate &&
          app.FinPlanningEvenement > startDate &&
          (app.PlanningEvenementPriorite ?? 0) >= newPriority
        ) {
          app.PlanningEvenementPriorite = (app.PlanningEvenementPriorite ?? 0) + 1;
        }
      }
    },
    [appointmentsRef]
  );

  const normalizePriorities = useCallback(
    (employeeIds?: number[]) => {
      const employeeFilter = employeeIds ? new Set(employeeIds.map(Number)) : undefined;
      const appointmentsByEmployee = new Map<number, Appointment[]>();

      for (let i = 0; i < appointmentsRef.current.length; i++) {
        const app = appointmentsRef.current[i]!;
        const employeeId = Number(app.IdEmploye);
        if (employeeFilter && !employeeFilter.has(employeeId)) continue;

        let list = appointmentsByEmployee.get(employeeId);
        if (!list) {
          list = [];
          appointmentsByEmployee.set(employeeId, list);
        }
        list.push(app);
      }

      appointmentsByEmployee.forEach((employeeAppointments) => {
        if (employeeAppointments.length === 0) return;
        const sorted = [...employeeAppointments].sort(
          (a, b) => a.DebutPlanningEvenement - b.DebutPlanningEvenement
        );

        let currentGroup: Appointment[] = [];
        let groupEnd = 0;

        const flushGroup = (group: Appointment[]) => {
          group.sort(
            (a, b) =>
              (a.PlanningEvenementPriorite ?? 0) - (b.PlanningEvenementPriorite ?? 0) ||
              a.DebutPlanningEvenement - b.DebutPlanningEvenement
          );
          for (let i = 0; i < group.length; i++) {
            group[i]!.PlanningEvenementPriorite = i;
          }
        };

        for (let i = 0; i < sorted.length; i++) {
          const app = sorted[i]!;
          if (currentGroup.length > 0 && app.DebutPlanningEvenement >= groupEnd) {
            flushGroup(currentGroup);
            currentGroup = [];
          }
          currentGroup.push(app);
          if (app.FinPlanningEvenement > groupEnd) {
            groupEnd = app.FinPlanningEvenement;
          }
        }

        if (currentGroup.length > 0) flushGroup(currentGroup);
      });
    },
    [appointmentsRef]
  );

  const persistPriorityChanges = useCallback(
    async (previousAppointments: Appointment[], excludedId?: number) => {
      const { api: currentApi, onLockedError: handleErr } = latestRef.current;
      if (!currentApi?.updateEvenement) return;

      const previousPriorityById = new Map<number, number>();
      for (let i = 0; i < previousAppointments.length; i++) {
        const prev = previousAppointments[i]!;
        previousPriorityById.set(prev.IdPlanningEvenement, prev.PlanningEvenementPriorite ?? 0);
      }

      const changedAppointments = appointmentsRef.current.filter((app) => {
        if (app.IdPlanningEvenement === excludedId) return false;
        const prevPrio = previousPriorityById.get(app.IdPlanningEvenement);
        return prevPrio !== undefined && (app.PlanningEvenementPriorite ?? 0) !== prevPrio;
      });

      if (changedAppointments.length === 0) return;

      try {
        await Promise.all(
          changedAppointments.map((app) =>
            currentApi.updateEvenement(String(app.IdPlanningEvenement), buildEventApiPayload(app))
          )
        );
      } catch (error) {
        console.error('Erreur lors de la persistance des priorités réorganisées', error);
        handleErr('Les priorités des rendez-vous chevauchants n’ont pas pu être sauvegardées.');
      }
    },
    [appointmentsRef, buildEventApiPayload]
  );

  const getPriorityForNewAppointment = useCallback(
    (employeeId: number, startDate: number, endDate: number, id: number) => {
      const targetEmpId = Number(employeeId);
      let maxPriority = -1;
      const list = appointmentsRef.current;

      for (let i = 0; i < list.length; i++) {
        const app = list[i]!;
        if (
          Number(app.IdEmploye) === targetEmpId &&
          app.DebutPlanningEvenement < endDate &&
          app.FinPlanningEvenement > startDate &&
          app.IdPlanningEvenement !== id
        ) {
          const prio = app.PlanningEvenementPriorite ?? 0;
          if (prio > maxPriority) maxPriority = prio;
        }
      }

      return maxPriority + 1;
    },
    [appointmentsRef]
  );

  // --- GESTION DE L'HISTORIQUE (UNDO) ---
  const saveAppointmentState = useCallback(
    (
      appointment: Appointment | null,
      type: 'create' | 'update' | 'delete' | 'move' | 'resize_split',
      previousAppointment?: Appointment,
      createdAppointments?: Appointment[]
    ) => {
      if (!appointment) return;

      history.current.push({
        type,
        timestamp: ++timestampCounter.current,
        appointment: { ...appointment },
        previousAppointment: previousAppointment ? { ...previousAppointment } : undefined,
        createdAppointments: createdAppointments ? cloneAppointments(createdAppointments) : undefined,
        appointments: cloneAppointments(appointmentsRef.current),
      });

      if (history.current.length > 50) {
        history.current.shift();
      }
      setHistoryVersion((version) => version + 1);
    },
    [appointmentsRef]
  );

  const undoLastAction = useCallback(async () => {
    if (history.current.length === 0) return;

    const lastAction = history.current.pop();
    if (!lastAction) return;
    setHistoryVersion((version) => version + 1);

    const { api: currentApi, onUpdate: triggerUpdate } = latestRef.current;
    const before = cloneAppointments(appointmentsRef.current);

    switch (lastAction.type) {
      case 'create': {
        if (lastAction.appointment) {
          const targetId = lastAction.appointment.IdPlanningEvenement;
          appointmentsRef.current = appointmentsRef.current.filter(
            (app) => app.IdPlanningEvenement !== targetId
          );

          const result = await currentApi?.deleteEvenement(String(targetId));
          if (!isApiSuccess(result)) {
            appointmentsRef.current = before;
          }
        }
        break;
      }

      case 'delete': {
        if (lastAction.appointment) {
          appointmentsRef.current = [...appointmentsRef.current, { ...lastAction.appointment }];
          const result = await currentApi?.createEvenement(buildEventApiPayload(lastAction.appointment));
          if (!isApiSuccess(result)) {
            appointmentsRef.current = before;
          }
        }
        break;
      }

      case 'update':
      case 'move': {
        if (lastAction.previousAppointment) {
          const prevApp = lastAction.previousAppointment;
          appointmentsRef.current = appointmentsRef.current.map((app) =>
            app.IdPlanningEvenement === prevApp.IdPlanningEvenement ? { ...prevApp } : app
          );

          const result = await currentApi?.updateEvenement(
            String(prevApp.IdPlanningEvenement),
            buildEventApiPayload(prevApp)
          );
          if (!isApiSuccess(result)) {
            appointmentsRef.current = before;
          }
        }
        break;
      }

      case 'resize_split': {
        if (lastAction.previousAppointment && lastAction.createdAppointments) {
          const prevApp = lastAction.previousAppointment;
          const createdIds = new Set(lastAction.createdAppointments.map((app) => app.IdPlanningEvenement));

          appointmentsRef.current = appointmentsRef.current
            .filter((app) => !createdIds.has(app.IdPlanningEvenement))
            .map((app) => (app.IdPlanningEvenement === prevApp.IdPlanningEvenement ? { ...prevApp } : app));

          try {
            const results = await Promise.all([
              currentApi?.updateEvenement(String(prevApp.IdPlanningEvenement), buildEventApiPayload(prevApp)),
              currentApi?.deleteEvenements(lastAction.createdAppointments.map((app) => String(app.IdPlanningEvenement))),
            ]);
            if (results.some((res) => !isApiSuccess(res))) {
              appointmentsRef.current = before;
            }
          } catch (error) {
            console.error('Error occurred while undoing resize_split:', error);
            appointmentsRef.current = before;
          }
        }
        break;
      }
    }

    triggerUpdate();
  }, [appointmentsRef, buildEventApiPayload]);

  // --- FONCTIONS CRUD INTERNES ---
  const updateAppointmentBounds = useCallback(
    (
      data: { id: number; newStartDate: number; newEndDate: number; newEmployee?: User; annotation?: string; Etiquette?: Tag },
      saveToHistory: boolean = true,
      newPriority?: number,
      syncWithApi: boolean = true,
      reorganizeOverlappingPriorities: boolean = true
    ) => {
      const { id, newStartDate, newEndDate, newEmployee, annotation, Etiquette } = data;
      const numericId = Number(id);
      const appointmentToResize = appointmentsRef.current.find(
        (app) => Number(app.IdPlanningEvenement) === numericId
      );
      if (!appointmentToResize) return;

      const previousAppointments = cloneAppointments(appointmentsRef.current);

      if (saveToHistory) {
        saveAppointmentState(appointmentToResize, 'update', { ...appointmentToResize });
      }

      let updatedAppointment: Appointment | undefined;
      appointmentsRef.current = appointmentsRef.current.map((app) => {
        if (Number(app.IdPlanningEvenement) !== numericId) return app;
        updatedAppointment = {
          ...app,
          DebutPlanningEvenement: newStartDate,
          FinPlanningEvenement: newEndDate,
          IdEmploye: newEmployee ? newEmployee.IdPersonnel : app.IdEmploye,
          PlanningEvenementPriorite: newPriority !== undefined ? newPriority : app.PlanningEvenementPriorite,
          AnnotationPlanningEvenement: annotation !== undefined ? annotation : app.AnnotationPlanningEvenement,
          Etiquette,
        };
        return updatedAppointment;
      });

      if (newPriority !== undefined && newEmployee && reorganizeOverlappingPriorities) {
        reorganizePriorities(id, newPriority, newEmployee.IdPersonnel, newStartDate, newEndDate);
        normalizePriorities([Number(newEmployee.IdPersonnel)]);
      }

      const { api: currentApi, onUpdate: triggerUpdate } = latestRef.current;
      if (!syncWithApi || !updatedAppointment || !currentApi?.updateEvenement) return;

      void currentApi
        .updateEvenement(String(id), {
          DebutPlanningEvenement: updatedAppointment.DebutPlanningEvenement,
          FinPlanningEvenement: updatedAppointment.FinPlanningEvenement,
          Type: newEmployee?.Type,
          IdEmploye: newEmployee?.IdPersonnel,
          IdPlanningRessource: updatedAppointment.IdPlanningRessource,
          AnnotationPlanningEvenement: updatedAppointment.AnnotationPlanningEvenement,
          PlanningEvenementPriorite: updatedAppointment.PlanningEvenementPriorite,
          IdPlanningEtiquette: updatedAppointment.Etiquette?.IdPlanningEtiquette,
        })
        .then((resp) => {
          if (!isApiSuccess(resp)) {
            appointmentsRef.current = previousAppointments;
            triggerUpdate();
          }
        })
        .catch((err) => {
          console.error('Erreur réseau updateEvenement', err);
          appointmentsRef.current = previousAppointments;
          triggerUpdate();
        });
    },
    [appointmentsRef, saveAppointmentState, reorganizePriorities, normalizePriorities]
  );

  const createAppointment = useCallback(
    (
      data: { startDate: number; endDate: number; employeeId: number; ressource: Item; priority: number },
      saveToHistory: boolean = true,
      description?: string,
      syncWithApi: boolean = true
    ): Appointment | null => {
      const { startDate, endDate, employeeId, ressource, priority } = data;
      const { employeesMap: empMap, api: currentApi, onUpdate: triggerUpdate, onLockedError: handleErr } = latestRef.current;

      const employee = empMap.get(Number(employeeId));
      if (!employee) return null;

      const idTemp = Date.now() + Math.floor(Math.random() * 1000);
      const previousAppointments = cloneAppointments(appointmentsRef.current);

      const localAppointment: Appointment = {
        IdPlanningEvenement: idTemp,
        AnnotationPlanningEvenement: description || 'Nouveau rendez-vous',
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        IdEmploye: employeeId,
        IdPlanningRessource: ressource.IdPlanningRessource,
        PlanningEvenementPriorite: priority,
        isLocked: false,
      };

      appointmentsRef.current = [...appointmentsRef.current, localAppointment];
      triggerUpdate();

      if (!syncWithApi || !currentApi?.createEvenement) {
        if (saveToHistory) {
          saveAppointmentState(localAppointment, 'create');
        }
        return localAppointment;
      }

      const payload = {
        AnnotationPlanningEvenement: localAppointment.AnnotationPlanningEvenement,
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        IdEmploye: employeeId,
        Type: employee.Type,
        IdPlanningRessource: ressource.IdPlanningRessource,
        PlanningEvenementPriorite: priority,
      };

      currentApi
        .createEvenement(payload)
        .then((resp) => {
          try {
            if (isApiSuccess(resp)) {
              const apiData = resp?.data;
              if (Array.isArray(apiData?.ressources)) {
                addMissingResourcesToCache(apiData.ressources);
              }

              const apiCreated = Array.isArray(apiData?.appointments)
                ? apiData.appointments[0]
                : Array.isArray(resp.data)
                  ? resp.data[0]
                  : resp.data;

              if (!apiCreated) return;

              appointmentsRef.current = appointmentsRef.current.map((app) => {
                if (Number(app.IdPlanningEvenement) === Number(idTemp)) {
                  const finalized: Appointment = {
                    ...app,
                    IdPlanningEvenement: apiCreated.IdPlanningEvenement,
                    PlanningEvenementPriorite: apiCreated.PlanningEvenementPriorite ?? app.PlanningEvenementPriorite,
                  };
                  if (saveToHistory) {
                    saveAppointmentState(finalized, 'create');
                  }
                  return finalized;
                }
                return app;
              });
              triggerUpdate();
              return;
            }

            handleErr(getApiErrorMessage(resp));
            appointmentsRef.current = previousAppointments;
            triggerUpdate();
          } catch (e) {
            console.error('Erreur traitement réponse createEvenement', e);
            appointmentsRef.current = previousAppointments;
            triggerUpdate();
          }
        })
        .catch((err) => {
          console.error('Erreur réseau createEvenement', err);
          appointmentsRef.current = previousAppointments;
          triggerUpdate();
        });

      return localAppointment;
    },
    [appointmentsRef, saveAppointmentState, addMissingResourcesToCache]
  );

  // --- LOGIQUE MÉTIER COMPLEXE (Move, Split, Save) ---
  const moveAppointment = useCallback(
    async (
      data: {
        id: number;
        newStartDate: number;
        newEndDate: number;
        newEmployeeId: number;
        idRessource: number;
        resizeDirection?: 'left' | 'right';
      },
      saveToHistory: boolean = true,
      requestedPriority?: number
    ): Promise<ActionResult> => {
      const {
        id,
        newStartDate,
        newEndDate,
        newEmployeeId,
        idRessource,
        resizeDirection = 'right',
      } = data;

      const {
        employeesMap: empMap,
        timelineState: state,
        api: currentApi,
        onUpdate: triggerUpdate,
        onLockedError: handleErr,
      } = latestRef.current;

      const appointment = appointmentsRef.current.find((app) => app.IdPlanningEvenement === id);
      if (!appointment) return { success: false, message: 'Rendez-vous introuvable.' };

      const employee = empMap.get(Number(newEmployeeId));
      if (!employee) return { success: false, message: 'Employé introuvable.' };

      const ressource = eventsRef.current[Number(idRessource)];
      if (!ressource) return { success: false, message: 'Ressource introuvable.' };

      const hasSameBounds =
        appointment.DebutPlanningEvenement === newStartDate &&
        appointment.FinPlanningEvenement === newEndDate &&
        Number(appointment.IdEmploye) === Number(newEmployeeId);
      const hasSamePriority =
        requestedPriority === undefined ||
        (appointment.PlanningEvenementPriorite ?? 0) === requestedPriority;

      if (hasSameBounds && hasSamePriority) {
        currentApi?.unlockEvenement(appointment.IdPlanningEvenement).catch((err) => {
          console.error('Erreur lors du déverrouillage du rendez-vous:', err);
        });
        return { success: true, message: 'Aucun changement détecté.' };
      }

      const previousAppointment = saveToHistory ? { ...appointment } : undefined;
      const previousAppointments = cloneAppointments(appointmentsRef.current);

      const intervalType = state.isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
      const days = getWorkedDayIntervals(
        newStartDate,
        newEndDate,
        intervalType,
        state.respectNonWorkingDays,
        (state.isDisplayWeekend && state.includeWeekend) || !state.isDisplayWeekend,
        state.nonWorkingDates
      );

      if (days.length === 0) {
        return { success: false, message: 'Aucun créneau valide pour effectuer cette action.' };
      }

      const newPriority =
        requestedPriority ?? getPriorityForNewAppointment(newEmployeeId, newStartDate, newEndDate, id);

      const createdAppointments: Appointment[] = [];
      const processIntervals = (startIndex: number, endIndex: number, step: number, mainIndex: number) => {
        const mainDay = days[mainIndex]!;
        const mainStart = resizeDirection === 'left' ? mainDay.start : newStartDate;
        const mainEnd = resizeDirection === 'right' ? mainDay.end : newEndDate;

        updateAppointmentBounds(
          {
            id: appointment.IdPlanningEvenement,
            newStartDate: mainStart,
            newEndDate: mainEnd,
            newEmployee: employee,
            Etiquette: appointment.Etiquette,
            annotation: appointment.AnnotationPlanningEvenement,
          },
          false,
          newPriority,
          false,
          false
        );

        for (let i = startIndex; i !== endIndex; i += step) {
          const day = days[i]!;
          const newApp = createAppointment(
            {
              startDate: day.start,
              endDate: day.end,
              employeeId: newEmployeeId,
              ressource,
              priority: newPriority,
            },
            false,
            appointment.AnnotationPlanningEvenement,
            false
          );
          if (newApp) createdAppointments.push(newApp);
        }
      };

      if (resizeDirection === 'right') {
        processIntervals(1, days.length, 1, 0);
      } else {
        processIntervals(days.length - 2, -1, -1, days.length - 1);
      }

      if (saveToHistory && previousAppointment) {
        const updatedAppointment = appointmentsRef.current.find((app) => app.IdPlanningEvenement === id);
        if (updatedAppointment) {
          const actionType = createdAppointments.length > 0 ? 'resize_split' : 'move';
          saveAppointmentState(updatedAppointment, actionType, previousAppointment, createdAppointments);
        }
      }

      triggerUpdate();

      if (!currentApi?.updateEvenement) {
        await persistPriorityChanges(previousAppointments, id);
        return { success: true };
      }

      const payload = {
        DebutPlanningEvenement: newStartDate,
        FinPlanningEvenement: newEndDate,
        Type: employee.Type,
        IdEmploye: newEmployeeId,
        IdPlanningRessource: ressource.IdPlanningRessource,
        AnnotationPlanningEvenement: appointment.AnnotationPlanningEvenement,
        PlanningEvenementPriorite: newPriority,
        IdPlanningEtiquette: appointment.Etiquette?.IdPlanningEtiquette,
      };

      try {
        const resp = await currentApi.updateEvenement(String(id), payload);
        if (!isApiSuccess(resp)) {
          appointmentsRef.current = previousAppointments;
          triggerUpdate();
          handleErr(getApiErrorMessage(resp));
          return { success: false, message: resp?.message };
        }

        const responseData = resp?.data;
        if (Array.isArray(responseData) && responseData.length > 0) {
          const updatesById = new Map<number, Appointment>();
          for (let i = 0; i < responseData.length; i++) {
            const res = responseData[i];
            if (res?.IdPlanningEvenement) {
              updatesById.set(Number(res.IdPlanningEvenement), {
                ...res,
                IdEmploye: Number(res.IdEmploye),
              });
            }
          }
          if (updatesById.size > 0) {
            appointmentsRef.current = appointmentsRef.current.map(
              (app) => updatesById.get(Number(app.IdPlanningEvenement)) ?? app
            );
            triggerUpdate();
          }
        }
        return { success: true };
      } catch (error) {
        console.error('Erreur réseau updateEvenement', error);
        appointmentsRef.current = previousAppointments;
        triggerUpdate();
        handleErr("Impossible de mettre à jour l'événement sur le serveur. Veuillez réessayer.");
        return { success: false, message: 'Erreur réseau' };
      }
    },
    [
      appointmentsRef,
      eventsRef,
      getPriorityForNewAppointment,
      updateAppointmentBounds,
      createAppointment,
      saveAppointmentState,
      persistPriorityChanges,
    ]
  );

  const handleSaveAppointment = useCallback(
    async (
      appointment: Appointment,
      eventUpdate: Item,
      includeNonWorkingDays: boolean,
      type: 'create' | 'update'
    ): Promise<{ success: boolean; message?: string }> => {
      if ('Actif' in eventUpdate && !eventUpdate.Actif) {
        return { success: false, message: 'Cette rubrique est désactivée.' };
      }

      const { api: currentApi, employeesMap: empMap, timelineState: state, onUpdate: triggerUpdate } = latestRef.current;

      if (type === 'update' && !currentApi?.updateEvenementAndRessource) {
        return { success: false, message: 'API de mise à jour indisponible.' };
      }
      if (type === 'create' && !currentApi?.createEvenement) {
        return { success: false, message: 'API de création indisponible.' };
      }

      const employee = empMap.get(Number(appointment.IdEmploye));

      try {
        const imgResult = await uploadImageIfNeeded(eventUpdate.Image);
        if (!imgResult.success) {
          return { success: false, message: imgResult.message };
        }
        if (eventUpdate.Image && imgResult.imageId !== undefined) {
          eventUpdate.Image.id = imgResult.imageId;
        }

        const payload = {
          DebutPlanningEvenement: appointment.DebutPlanningEvenement,
          FinPlanningEvenement: appointment.FinPlanningEvenement,
          Type: employee?.Type,
          IdEmploye: employee?.IdPersonnel,
          IdPlanningRessource: eventUpdate.IdPlanningRessource,
          AnnotationPlanningEvenement: appointment.AnnotationPlanningEvenement,
          PlanningEvenementPriorite: appointment.PlanningEvenementPriorite,
          IdPlanningEtiquette: appointment.Etiquette?.IdPlanningEtiquette,
          Ressource: {
            CouleurFondPlanningRessource: eventUpdate.CouleurFondPlanningRessource,
            CouleurBordurePlanningRessource: eventUpdate.CouleurBordurePlanningRessource,
            CouleurTextePlanningRessource: eventUpdate.CouleurTextePlanningRessource,
            IdPlanningImage: imgResult.imageId,
          },
        };

        const apiResp =
          type === 'update'
            ? await currentApi.updateEvenementAndRessource(String(appointment.IdPlanningEvenement), payload)
            : await currentApi.createEvenement({
                ...payload,
                IdPlanningEvenement: appointment.IdPlanningEvenement,
              });

        if (!isApiSuccess(apiResp)) {
          return { success: false, message: getApiErrorMessage(apiResp) };
        }

        if (Array.isArray(apiResp?.data?.ressources)) {
          addMissingResourcesToCache(apiResp.data.ressources);
        }

        const days = getWorkedDayIntervals(
          appointment.DebutPlanningEvenement,
          appointment.FinPlanningEvenement,
          state.isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          includeNonWorkingDays || !state.isDisplayWeekend,
          state.includeWeekend || !state.isDisplayWeekend,
          state.nonWorkingDates
        );

        const previousAppointment =
          type === 'update'
            ? appointmentsRef.current.find((app) => app.IdPlanningEvenement === appointment.IdPlanningEvenement)
            : undefined;

        const createdAppointments: Appointment[] = [];
        const createExtraAppointments = (fromIndex = 1) => {
          for (let i = fromIndex; i < days.length; i++) {
            const day = days[i]!;
            const newApp = createAppointment(
              {
                startDate: day.start,
                endDate: day.end,
                employeeId: appointment.IdEmploye as number,
                ressource: eventUpdate,
                priority: appointment.PlanningEvenementPriorite ?? 0,
              },
              false,
              appointment.AnnotationPlanningEvenement,
              false
            );
            if (newApp) createdAppointments.push(newApp);
          }
        };

        if (type === 'update') {
          updateAppointmentBounds(
            {
              id: appointment.IdPlanningEvenement,
              newStartDate: days[0]!.start,
              newEndDate: days[0]!.end,
              newEmployee: employee,
              annotation: appointment.AnnotationPlanningEvenement,
              Etiquette: appointment.Etiquette,
            },
            false,
            appointment.PlanningEvenementPriorite,
            false
          );

          const resId = Number(eventUpdate.IdPlanningRessource);
          if (eventsRef.current[resId]) {
            eventsRef.current[resId] = {
              ...eventsRef.current[resId]!,
              CouleurFondPlanningRessource: eventUpdate.CouleurFondPlanningRessource,
              CouleurBordurePlanningRessource: eventUpdate.CouleurBordurePlanningRessource,
              CouleurTextePlanningRessource: eventUpdate.CouleurTextePlanningRessource,
              Image: eventUpdate.Image,
            };
          }

          reorganizePriorities(
            appointment.IdPlanningEvenement,
            appointment.PlanningEvenementPriorite ?? 0,
            appointment.IdEmploye as number,
            days[0]!.start,
            days[0]!.end
          );

          if (days.length > 1) createExtraAppointments(1);
          triggerUpdate();

          if (previousAppointment) {
            const updatedAppointment = appointmentsRef.current.find(
              (app) => app.IdPlanningEvenement === appointment.IdPlanningEvenement
            );
            if (updatedAppointment) {
              saveAppointmentState(
                updatedAppointment,
                createdAppointments.length > 0 ? 'resize_split' : 'update',
                previousAppointment,
                createdAppointments.length > 0 ? createdAppointments : undefined
              );
            }
          }
        } else {
          const createdMain = createAppointment(
            {
              startDate: days[0]!.start,
              endDate: days[0]!.end,
              employeeId: appointment.IdEmploye as number,
              ressource: eventUpdate,
              priority: appointment.PlanningEvenementPriorite ?? 0,
            },
            false,
            appointment.AnnotationPlanningEvenement,
            false
          );

          if (createdMain) {
            const apiCreated = Array.isArray(apiResp?.data?.appointments)
              ? apiResp.data.appointments[0]
              : Array.isArray(apiResp?.data)
                ? apiResp.data[0]
                : apiResp?.data;

            if (apiCreated?.IdPlanningEvenement) {
              createdMain.IdPlanningEvenement = apiCreated.IdPlanningEvenement;
              appointmentsRef.current = appointmentsRef.current.map((app) =>
                app.IdPlanningEvenement === createdMain.IdPlanningEvenement
                  ? { ...app, IdPlanningEvenement: apiCreated.IdPlanningEvenement }
                  : app
              );
            }
            saveAppointmentState(createdMain, 'create');
          }

          if (days.length > 1) createExtraAppointments(1);
          triggerUpdate();
        }

        return { success: true };
      } catch (error) {
        console.error('Erreur réseau handleSaveAppointment', error);
        const status = (error as { response?: { status?: number } })?.response?.status;
        const serverMessage =
          (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message ??
          (error as { message?: unknown })?.message;

        if (typeof serverMessage === 'string' && serverMessage.trim()) {
          return { success: false, message: serverMessage };
        }

        return {
          success: false,
          message:
            status && status >= 500
              ? 'Une erreur interne est survenue sur le serveur.'
              : "Impossible de sauvegarder l'événement sur le serveur.",
        };
      }
    },
    [
      appointmentsRef,
      eventsRef,
      uploadImageIfNeeded,
      addMissingResourcesToCache,
      createAppointment,
      updateAppointmentBounds,
      reorganizePriorities,
      saveAppointmentState,
    ]
  );

  // --- ACTIONS UTILISATEUR ---
  const handleDeleteAppointmentConfirm = useCallback(
    (appointmentToDelete?: Appointment) => {
      const appointment = appointmentToDelete || latestRef.current.selectedAppointment;
      const id = appointment?.IdPlanningEvenement;
      if (!id) return;

      setAlertState({
        isVisible: true,
        title: "Êtes-vous sûr de vouloir supprimer ce rendez-vous ?",
        onConfirm: () => {
          const { api: currentApi, onUpdate: triggerUpdate } = latestRef.current;
          const appointmentInRef = appointmentsRef.current.find((app) => app.IdPlanningEvenement === id);
          if (appointmentInRef) {
            saveAppointmentState(appointmentInRef, 'delete');
          }

          const previousAppointments = cloneAppointments(appointmentsRef.current);
          appointmentsRef.current = appointmentsRef.current.filter((app) => app.IdPlanningEvenement !== id);
          normalizePriorities(appointmentInRef ? [Number(appointmentInRef.IdEmploye)] : undefined);
          triggerUpdate();

          if (currentApi?.deleteEvenement) {
            void currentApi
              .deleteEvenement(String(id))
              .then((resp) => {
                if (isApiSuccess(resp)) {
                  void persistPriorityChanges(previousAppointments, id);
                  return;
                }
                appointmentsRef.current = previousAppointments;
                triggerUpdate();
              })
              .catch((err) => {
                console.error('Erreur réseau deleteEvenement', err);
                appointmentsRef.current = previousAppointments;
                triggerUpdate();
              });
          }

          setIsModalOpen(false);
          setSelectedAppointment(null);
          setAlertState((prev) => ({ ...prev, isVisible: false }));
        },
        onCancel: () => {
          latestRef.current.api?.unlockEvenement(id).catch((err) => {
            console.error('Erreur lors du déverrouillage du rendez-vous:', err);
          });
          setAlertState((prev) => ({ ...prev, isVisible: false }));
        },
        fetchToLockAppointment: () => latestRef.current.api?.lockEvenement(id),
      });
    },
    [appointmentsRef, saveAppointmentState, normalizePriorities, persistPriorityChanges]
  );

  const handleDivideAppointment = useCallback(
    async (appointment: Appointment) => {
      const { timelineState: state, employeesMap: empMap, api: currentApi, onUpdate: triggerUpdate } = latestRef.current;
      const id = appointment.IdPlanningEvenement;
      const previousAppointments = cloneAppointments(appointmentsRef.current);
      const originalAppointment = { ...appointment };
      const { DebutPlanningEvenement: startDate, FinPlanningEvenement: endDate, IdEmploye: employeeId } = appointment;

      const allDates = eachDayOfInterval({ start: startDate, end: endDate });
      const skipWeekend = !state.isDisplayWeekend && !state.includeWeekend;
      const validDates = skipWeekend
        ? allDates.filter((date) => !isWeekend(date.getTime()))
        : allDates;

      if (validDates.length === 0) return;

      const intervalsPerDay = state.isFullDay ? 1 : 2;
      const totalIntervals = validDates.length * intervalsPerDay;
      const halfIntervals = Math.floor(totalIntervals / 2);
      const splitDayIndex = Math.floor(halfIntervals / intervalsPerDay);
      const splitDateObj = validDates[splitDayIndex];
      if (!splitDateObj) return;

      let splitDate = splitDateObj.getTime();
      if (!state.isFullDay && halfIntervals % 2 !== 0) {
        splitDate += 12 * 60 * 60 * 1000;
      }

      const employee = empMap.get(Number(employeeId));
      const ressource = eventsRef.current[Number(appointment.IdPlanningRessource)];
      if (!employee || !ressource) return;

      updateAppointmentBounds(
        {
          id,
          newStartDate: startDate,
          newEndDate: splitDate,
          newEmployee: employee,
        },
        false,
        appointment.PlanningEvenementPriorite,
        false
      );

      const newAppointment = createAppointment(
        {
          startDate: splitDate,
          endDate,
          employeeId: employee.IdPersonnel as number,
          ressource,
          priority: appointment.PlanningEvenementPriorite ?? 0,
        },
        false,
        appointment.AnnotationPlanningEvenement,
        false
      );

      if (!newAppointment) {
        appointmentsRef.current = previousAppointments;
        triggerUpdate();
        return;
      }

      triggerUpdate();

      try {
        const resp = await currentApi?.divideEvenement?.(String(id), { DateCoupure: splitDate });
        if (isApiSuccess(resp)) {
          const newId = resp?.data?.NouvelIdEvenement;
          if (newId) {
            appointmentsRef.current = appointmentsRef.current.map((app) =>
              Number(app.IdPlanningEvenement) === Number(newAppointment.IdPlanningEvenement)
                ? { ...app, IdPlanningEvenement: newId }
                : app
            );
          }
          triggerUpdate();

          const modifiedOriginal = appointmentsRef.current.find((app) => app.IdPlanningEvenement === id);
          if (modifiedOriginal) {
            saveAppointmentState(originalAppointment, 'resize_split', originalAppointment, [newAppointment]);
          }
        } else {
          appointmentsRef.current = previousAppointments;
          triggerUpdate();
        }
      } catch (err) {
        console.error('Erreur réseau divideEvenement', err);
        appointmentsRef.current = previousAppointments;
        triggerUpdate();
      }

      setIsModalOpen(false);
      setSelectedAppointment(null);
    },
    [appointmentsRef, eventsRef, updateAppointmentBounds, createAppointment, saveAppointmentState]
  );

  const handleDivideConfirm = useCallback(
    async (appointment: Appointment) => {
      setAlertState({
        isVisible: true,
        title: "Êtes-vous sûr de vouloir diviser ce rendez-vous ?",
        onConfirm: () => {
          void handleDivideAppointment(appointment);
          setAlertState((prev) => ({ ...prev, isVisible: false }));
        },
        onCancel: () => {
          latestRef.current.api?.unlockEvenement(appointment.IdPlanningEvenement).catch((err) => {
            console.error('Erreur lors du déverrouillage du rendez-vous:', err);
          });
          setAlertState((prev) => ({ ...prev, isVisible: false }));
        },
        fetchToLockAppointment: () => latestRef.current.api?.lockEvenement(appointment.IdPlanningEvenement),
      });
    },
    [handleDivideAppointment]
  );

  const handleRepeat = useCallback(async (): Promise<ActionResult> => {
    const {
      repeatData: rData,
      selectedAppointment: selApp,
      appointmentUtils: utils,
      timelineState: state,
      employeesMap: empMap,
      api: currentApi,
      onUpdate: triggerUpdate,
    } = latestRef.current;

    if (!rData || !selApp) {
      return { success: false, message: 'Aucun rendez-vous sélectionné pour la répétition.' };
    }
    if (!currentApi?.repeatEvenement) {
      return { success: false, message: 'API de répétition indisponible.' };
    }

    const newAppointments = utils.createRepeatedAppointments({
      appointment: selApp,
      repeatInterval: rData.repeatInterval,
      repeatCount: rData.repeatCount ?? 0,
      endDate: rData.endDate ?? undefined,
      numberCount: rData.numberCount,
      isFullDay: state.isFullDay,
      nonWorkingDates: state.nonWorkingDates,
      includeWeekend: state.includeWeekend,
      includeNonWorkingDays: state.respectNonWorkingDays,
    });

    const payloads = {
      IdPlanningEvenement: Number(selApp.IdPlanningEvenement),
      Type: empMap.get(Number(selApp.IdEmploye))?.Type,
      IdEmploye: Number(selApp.IdEmploye),
      IdPlanningRessource: Number(selApp.IdPlanningRessource),
      AnnotationPlanningEvenement: selApp.AnnotationPlanningEvenement,
      Date: newAppointments.map((app) => ({
        DebutPlanningEvenement: app.DebutPlanningEvenement,
        FinPlanningEvenement: app.FinPlanningEvenement,
      })),
    };

    try {
      const resp = await currentApi.repeatEvenement(payloads);
      if (isApiSuccess(resp)) {
        const createdIds = resp?.data;
        if (Array.isArray(createdIds) && createdIds.length === newAppointments.length) {
          const repeatedAppointments = newAppointments.map((app, index) => ({
            ...app,
            IdPlanningEvenement: Number(createdIds[index]),
          }));
          appointmentsRef.current = [...appointmentsRef.current, ...repeatedAppointments];
          triggerUpdate();
          setRepeatData(null);
          return { success: true };
        }
        return { success: false, message: 'Réponse serveur invalide lors de la répétition.' };
      }

      return { success: false, message: 'Le serveur a refusé la création des rendez-vous répétés.' };
    } catch (err) {
      console.error('Erreur réseau repeatEvenement', err);
      return { success: false, message: 'Impossible de créer les rendez-vous répétés sur le serveur' };
    }
  }, [appointmentsRef]);

  const handleExtend = useCallback(async (): Promise<ActionResult> => {
    const { extendData: extDate, selectedAppointment: selApp } = latestRef.current;
    if (!extDate || !selApp) {
      return { success: false, message: 'Aucun rendez-vous sélectionné pour la prolongation.' };
    }

    const ressource = eventsRef.current[Number(selApp.IdPlanningRessource)];
    if (!ressource) {
      return { success: false, message: 'Ressource introuvable. Le rendez-vous ne peut pas être étendu.' };
    }

    const result = await moveAppointment({
      id: selApp.IdPlanningEvenement,
      newStartDate: selApp.DebutPlanningEvenement,
      newEndDate: extDate,
      newEmployeeId: selApp.IdEmploye as number,
      idRessource: ressource.IdPlanningRessource,
      resizeDirection: selApp.FinPlanningEvenement < extDate ? 'right' : 'left',
    });

    if (!result.success) return result;

    setExtendData(null);
    return { success: true };
  }, [eventsRef, moveAppointment]);

  // --- INTERACTION EXTERNE (Drag & Drop, Search) ---
  const createAppointmentFromDrag = useCallback(
    async (
      item: Item,
      date: number,
      intervalName: "morning" | "afternoon" | "day",
      employeeId: number,
      priority: number
    ) => {
      const interval =
        intervalName === "day"
          ? DAY_INTERVALS[0]!
          : intervalName === "morning"
            ? HALF_DAY_INTERVALS[0]!
            : HALF_DAY_INTERVALS[1]!;

      const startDate = new Date(date).setHours(interval.startHour, 0, 0, 0);
      const endDate = new Date(date).setHours(interval.endHour);

      createAppointment({ startDate, endDate, employeeId, ressource: item, priority }, true);

      latestRef.current.setIsSearchOverlayOpen(false);
      latestRef.current.setDimensionsSearchInput('');
    },
    [createAppointment]
  );

  const handleSearchItemAction = useCallback(
    (event: Item) => {
      const { selectedCell: cell, timelineState: state } = latestRef.current;
      if (!cell) return;
      if ('Actif' in event && !event.Actif) return;

      const durationMs = state.isFullDay
        ? 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000
        : 11 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000;

      createAppointment(
        {
          startDate: cell.date,
          endDate: cell.date + durationMs,
          employeeId: cell.employeeId,
          ressource: event,
          priority: 0,
        },
        true
      );
    },
    [createAppointment]
  );

  // --- PRESSE-PAPIER ---
  const copyAppointmentToClipboard = useCallback((app: Appointment) => {
    if (app) {
      clipboardAppointment.current = app;
      return clipboardAppointment.current;
    }
    return null;
  }, []);

  const pasteAppointment = useCallback(
    async (targetCell?: { employeeId: number; date: number } | null) => {
      const { selectedCell: currentCell, timelineState: state, employeesMap: empMap, api: currentApi, onUpdate: triggerUpdate } = latestRef.current;
      const cell = targetCell || currentCell;
      const copied = clipboardAppointment.current;
      if (!copied || !cell || !currentApi?.createEvenement) return;

      const diff = copied.FinPlanningEvenement - copied.DebutPlanningEvenement;
      const newStartDate = cell.date;
      const newEndDate = newStartDate + diff;

      const days = getWorkedDayIntervals(
        newStartDate,
        newEndDate,
        state.isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
        state.respectNonWorkingDays,
        state.includeWeekend,
        state.nonWorkingDates
      );

      if (days.length === 0) return;

      const payload = {
        DebutPlanningEvenement: newStartDate,
        FinPlanningEvenement: newEndDate,
        Type: empMap.get(Number(cell.employeeId))?.Type,
        IdEmploye: cell.employeeId,
        AnnotationPlanningEvenement: copied.AnnotationPlanningEvenement,
        IdPlanningRessource: copied.IdPlanningRessource,
      };

      try {
        const resp = await currentApi.createEvenement(payload);
        if (!isApiSuccess(resp)) return;

        const apiData = resp?.data;
        if (Array.isArray(apiData?.ressources)) {
          addMissingResourcesToCache(apiData.ressources);
        }

        const responseAppointments = Array.isArray(apiData?.appointments)
          ? apiData.appointments
          : Array.isArray(resp?.data)
            ? resp.data
            : apiData
              ? [apiData]
              : [];

        const createdAppointments: Appointment[] = responseAppointments
          .filter((app: any) => app && typeof app === 'object')
          .map((app: any) => ({
            ...app,
            IdPlanningEvenement: Number(app.IdPlanningEvenement),
            DebutPlanningEvenement: app.DebutPlanningEvenement ?? payload.DebutPlanningEvenement,
            FinPlanningEvenement: app.FinPlanningEvenement ?? payload.FinPlanningEvenement,
            IdEmploye: Number(app.IdEmploye ?? payload.IdEmploye),
            IdPlanningRessource: Number(app.IdPlanningRessource ?? payload.IdPlanningRessource),
            AnnotationPlanningEvenement: app.AnnotationPlanningEvenement ?? copied.AnnotationPlanningEvenement,
          }));

        if (createdAppointments.length === 0) return;

        for (let i = 0; i < createdAppointments.length; i++) {
          saveAppointmentState(createdAppointments[i]!, 'create');
        }

        appointmentsRef.current = [...appointmentsRef.current, ...createdAppointments];
        triggerUpdate();
      } catch (err) {
        console.error('Erreur réseau pasteAppointment/createEvenement', err);
      }
    },
    [appointmentsRef, addMissingResourcesToCache, saveAppointmentState]
  );

  // --- GESTION DES RESSOURCES ---
  const handleOpenEditModal = useCallback(
    async (appointment: Appointment) => {
      const isCreatingResource = appointment.IdPlanningEvenement === -1;
      const defaultItem: Item = {
        IdPlanningRessource: -1,
        CodePlanningRessource: '',
        LibellePlanningRessource: '',
        CouleurFondPlanningRessource: '#1E40AF',
        CouleurBordurePlanningRessource: '#1E40AF',
        CouleurTextePlanningRessource: '#FFFFFF',
        Actif: true,
        Etiquettes: [],
        Type: 'Rubrique Perso',
        Verrou: false,
        Category: '',
      };
      let item = eventsRef.current[Number(appointment.IdPlanningRessource)] || defaultItem;

      if (isCreatingResource) {
        try {
          const result = await displaySettingsService.getDisplaySettings();
          if (result?.success === false) {
            throw new Error(result.message || 'Impossible de récupérer les paramètres d’affichage.');
          }

          const settings = result?.data;
          const defaultImage = settings?.ImageParDefaut;
          const imageId = defaultImage ? Number(defaultImage.id) : NaN;

          item = {
            ...item,
            CouleurFondPlanningRessource: settings?.CouleurFondParDefaut || item.CouleurFondPlanningRessource,
            CouleurBordurePlanningRessource: settings?.CouleurBordureParDefaut || item.CouleurBordurePlanningRessource,
            CouleurTextePlanningRessource: settings?.CouleurTexteParDefaut || item.CouleurTextePlanningRessource,
            ...(defaultImage && Number.isFinite(imageId)
              ? { Image: { id: imageId, image: defaultImage.url } }
              : {}),
          };
        } catch (error) {
          console.error('Erreur lors de la récupération des paramètres d’affichage par défaut', error);
        }
      }

      setSelectedAppointment(appointment);
      setSelectedItem(item);
      setIsModalOpen(true);
    },
    [eventsRef]
  );

  const handleAddManualRessource = useCallback(
    async (dimension: AutreItem): Promise<{ success: boolean; message?: string }> => {
      const tempId = Date.now();
      const newItem =
        dimension.Type === 'Rubrique Perso'
          ? { ...dimension, IdPlanningRessource: tempId, isManual: true }
          : { ...dimension, IdPlanningRessource: tempId };

      eventsRef.current[tempId] = newItem;

      try {
        const imgResult = await uploadImageIfNeeded(dimension.Image);
        if (!imgResult.success) {
          delete eventsRef.current[tempId];
          return { success: false, message: imgResult.message };
        }

        const apiPayload = {
          CodePlanningRessource: dimension.CodePlanningRessource,
          LibellePlanningRessource: dimension.LibellePlanningRessource,
          CouleurFondPlanningRessource: dimension.CouleurFondPlanningRessource,
          CouleurBordurePlanningRessource: dimension.CouleurBordurePlanningRessource,
          CouleurTextePlanningRessource: dimension.CouleurTextePlanningRessource,
          Actif: dimension.Actif,
          IdPlanningImage: imgResult.imageId,
        };

        const result = await ressourceService.addRessourceManual(apiPayload);
        if (isApiSuccess(result) && result.data) {
          const newId = Number(result.data);
          eventsRef.current[newId] = {
            ...eventsRef.current[tempId]!,
            IdPlanningRessource: newId,
            ...(newItem.Image && imgResult.imageId !== undefined
              ? { Image: { ...newItem.Image, id: imgResult.imageId } }
              : {}),
          };
          if (tempId !== newId) {
            delete eventsRef.current[tempId];
          }
        } else {
          delete eventsRef.current[tempId];
          return {
            success: false,
            message: result?.message || "Le serveur a refusé l'ajout de la ressource.",
          };
        }
      } catch (error) {
        delete eventsRef.current[tempId];
        console.error("Erreur réseau lors de l'ajout de la ressource", error);
        return { success: false, message: error instanceof Error ? error.message : 'Erreur inconnue' };
      }

      setIsModalOpen(false);
      latestRef.current.onUpdate();
      return { success: true };
    },
    [eventsRef, uploadImageIfNeeded]
  );

  const handleEditRessource = useCallback(
    async (dimension: Item): Promise<{ success: boolean; message?: string }> => {
      try {
        const imgResult = await uploadImageIfNeeded(dimension.Image);
        if (!imgResult.success) {
          return { success: false, message: imgResult.message };
        }
        if (dimension.Image && imgResult.imageId !== undefined) {
          dimension.Image.id = imgResult.imageId;
        }

        const apiPayload = {
          CouleurFondPlanningRessource: dimension.CouleurFondPlanningRessource,
          CouleurBordurePlanningRessource: dimension.CouleurBordurePlanningRessource,
          CouleurTextePlanningRessource: dimension.CouleurTextePlanningRessource,
          ...(dimension.Type === 'Rubrique Perso'
            ? {
                CodePlanningRessource: dimension.CodePlanningRessource,
                LibellePlanningRessource: dimension.LibellePlanningRessource,
                Actif: dimension.Actif,
              }
            : {}),
          IdPlanningImage: imgResult.imageId,
        };

        const result = await ressourceService.editRessource(dimension.IdPlanningRessource, apiPayload);
        if (!isApiSuccess(result)) {
          return {
            success: false,
            message: result?.message || 'Le serveur a refusé la modification de la ressource.',
          };
        }
      } catch (error) {
        console.error('Erreur réseau lors de la modification de la ressource', error);
        return { success: false, message: 'Erreur réseau' };
      }

      setIsModalOpen(false);
      latestRef.current.onUpdate();
      return { success: true };
    },
    [uploadImageIfNeeded]
  );

  const handleDeleteManualRessource = useCallback(
    (dimensionId: number, forceDelete: boolean = false) => {
      const targetId = Number(dimensionId);
      const isUsedInPlanning = appointmentsRef.current.some(
        (appointment) => Number(appointment.IdPlanningRessource) === targetId
      );

      if (isUsedInPlanning && !forceDelete) {
        return {
          success: false,
          requiresConfirmation: true,
          isUsedInPlanning: true,
          message: 'Cette rubrique est utilisée dans le planning.',
        };
      }

      if (!forceDelete) {
        return {
          success: false,
          requiresConfirmation: true,
          isUsedInPlanning: false,
          message: "Cette rubrique n'est pas utilisée dans le planning. Voulez-vous la supprimer ?",
        };
      }

      delete eventsRef.current[targetId];
      appointmentsRef.current = appointmentsRef.current.filter(
        (appointment) => Number(appointment.IdPlanningRessource) !== targetId
      );

      latestRef.current.onUpdate();
      return {
        success: true,
        requiresConfirmation: false,
        isUsedInPlanning: false,
        message: 'Rubrique supprimée avec succès.',
      };
    },
    [appointmentsRef, eventsRef]
  );

  const handleDeactivateDimension = useCallback(
    (dimensionId: number) => {
      const targetId = Number(dimensionId);
      if (eventsRef.current[targetId]) {
        eventsRef.current[targetId] = {
          ...eventsRef.current[targetId]!,
          Actif: false,
        } as Item;
      }
      latestRef.current.onUpdate();
      return {
        success: true,
        message: 'Rubrique désactivée avec succès. Elle reste visible mais ne peut plus être utilisée.',
      };
    },
    [eventsRef]
  );

  const applyDisplaySettingsToAllEvents = useCallback(
    async (_value: DisplaySettings): Promise<{ success: boolean; message?: string }> => {
      try {
        const result = await ressourceService.appliedEvenementDefaultSettings(Object.keys(eventsRef.current));
        if (!isApiSuccess(result)) {
          return {
            success: false,
            message: result?.message || "Erreur lors de l'application des paramètres par défaut aux événements",
          };
        }

        const data = result?.data;
        if (Array.isArray(data)) {
          for (let i = 0; i < data.length; i++) {
            const eventUpdate = data[i];
            const eventId = Number(eventUpdate.IdPlanningRessource);
            if (eventsRef.current[eventId]) {
              eventsRef.current[eventId] = {
                ...eventsRef.current[eventId]!,
                CouleurFondPlanningRessource: eventUpdate.CouleurFondPlanningRessource,
                CouleurBordurePlanningRessource: eventUpdate.CouleurBordurePlanningRessource,
                CouleurTextePlanningRessource: eventUpdate.CouleurTextePlanningRessource,
                Image: eventUpdate.Image,
              };
            }
          }
        }

        latestRef.current.onUpdate();
        return { success: true };
      } catch (err) {
        console.error("Erreur réseau lors de l'application des paramètres par défaut aux événements", err);
        return {
          success: false,
          message: "Erreur réseau lors de l'application des paramètres par défaut aux événements",
        };
      }
    },
    [eventsRef]
  );

  return {
    // États exposés
    selectedAppointment,
    setSelectedAppointment,
    selectedCell,
    setSelectedCell,
    isModalOpen,
    setIsModalOpen,
    repeatData,
    setRepeatData,
    extendData,
    setExtendData,
    alertState,
    setAlertState,
    newAppointmentInfo,
    setNewAppointmentInfo,
    selectedItem,
    setSelectedItem,
    selectedEmployee,
    setSelectedEmployee,
    clipboardAppointment: clipboardAppointment.current,

    // Méthodes principales
    handleSaveAppointment,
    moveAppointment,
    createAppointmentFromDrag,
    handleOpenEditModal,
    handleAddManualRessource,
    handleEditRessource,
    handleDeleteManualRessource,
    handleDeactivateDimension,
    applyDisplaySettingsToAllEvents,

    // Actions Spécifiques
    handleDeleteAppointmentConfirm,
    handleDivideConfirm,
    handleRepeat,
    handleExtend,
    handleSearchItemAction,

    // Utils
    undoLastAction,
    canUndo: historyVersion > 0,
    copyAppointmentToClipboard,
    pasteAppointment,
  };
};