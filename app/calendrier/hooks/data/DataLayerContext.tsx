import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import {
  Appointment,
  User,
  Item,
  ImageType,
  Equipe,
  PoleActivite,
} from '../../types';
import { createSearchAndFilterUtils } from '../../utils/searchAndFilterUtils';
import {
  employeeService,
  equipeService,
  evenementService,
  imageService,
} from '@/app/service';

// --- Types ---
export interface ManualEventPayload {
  code: string;
  label: string;
  description: string;
  image?: ImageType;
  color: string;
  borderColor: string;
  textColor: string;
  actif: boolean;
  type: 'autre';
  category: string;
}

export interface DataLayerContextType {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  itemsRef: React.MutableRefObject<Record<number, Item>>;
  appointmentsRef: React.MutableRefObject<Appointment[]>;
  initialTeams: Record<number, Equipe>;
  poleActivites: Record<number, PoleActivite>;
  appointmentsVersion: number;
  globalEmployees: User[];
  refreshData: () => void;
  resetPlanningData: () => void;
  loadTeams: () => Promise<any>;
  loadPoleActivites: () => Promise<any>;
  loadAppointmentsInRange: (
    startDate: number,
    endDate: number,
    employeeIds?: number[]
  ) => Promise<boolean>;
  addMissingResourcesToCache: (resources: Item[]) => void;
  updateEmployeeTeam: (
    employee: User,
    teamId: number | null
  ) => Promise<{ success: boolean }>;
  addManualEvent: (payload: ManualEventPayload) => Item;
  toggleManualEvent: (id: number) => void;
  updateManualEventCategory: (id: number, category: string) => void;
  deleteManualEvent: (id: number) => void;
  addImage: (
    base64String: string,
    filename?: string
  ) => Promise<{ success: boolean; id?: number; message?: string }>;
  fetchPaginatedImages: (
    page: number,
    limit?: number
  ) => Promise<{ image: ImageType[]; totalLignes: number }>;
  updateEventImage: (id: number, newImage: ImageType) => void;
  updateEmployeeImage: (id: number, newImage: ImageType) => void;
  addTeam: (newTeam: { Nom: string }) => Promise<{ success: boolean; message?: string }>;
  updateTeam: (updatedTeam: Equipe) => Promise<{ success: boolean; message?: string }>;
  deleteTeam: (id: number) => Promise<{ success: boolean; message?: string }>;
  addPersonnelToTeam: (teamId: number, personnelId: number) => Promise<{ success: boolean; message?: string }>;
  removePersonnelFromTeam: (personnelId: number) => Promise<{ success: boolean; message?: string }>;
  fetchTeamMembers: (
    teamId: number
  ) => Promise<{ success: boolean; data?: User[]; message?: string }>;
  onCheckDeleteTeam: (id: number) => Promise<{ checkRequired: boolean; message?: string }>;
  lockTeam: (teamId: number) => Promise<{ success: boolean; message?: string }>;
  unlockTeam: (teamId: number) => Promise<{ success: boolean; message?: string }>;


  setTeamLockStatus: (teamId: number, isLocked: boolean) => void;
  setEmployeeLockStatus: (employeeId: number, isLocked: boolean, timestamp?: number, updatedById?: number, updatedByNom?: string) => void;
  upsertTeamInCache: (team: Partial<Equipe> & { Id: number }) => void;
  removeTeamFromCache: (teamId: number) => void;
}

interface DataLayerProviderProps {
  children: ReactNode;
  globalEmployees: User[];
  setGlobalEmployees: React.Dispatch<React.SetStateAction<User[]>>;
  setNotification: (message: string) => void;
  isMobile?: boolean;
  onError: (message: string) => void;
}

// --- Création du Context ---
const DataLayerContext = createContext<DataLayerContextType | undefined>(undefined);

// --- Provider ---
export const DataLayerProvider: React.FC<DataLayerProviderProps> = ({
  children,
  globalEmployees,
  setGlobalEmployees,
  setNotification,
  isMobile = false,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<Record<number, Equipe>>({});
  const [poleActivites, setPoleActivites] = useState<Record<number, PoleActivite>>({});

  const itemsRef = useRef<Record<number, Item>>({});
  const appointmentsRef = useRef<Appointment[]>([]);

  const lastLoadedRangeRef = useRef<{
    startDate: number;
    endDate: number;
    employeeIds: Set<number> | null;
  } | null>(null);
  const inFlightRequestKeysRef = useRef(new Set<string>());

  const [appointmentsVersion, setAppointmentsVersion] = useState(0);

  const loadTeams = useCallback(async () => {
    const response = await equipeService.getEquipes();

    if (response?.success && Array.isArray(response.data)) {
      const teamsRecord: Record<number, Equipe> = {};
      response.data.forEach((team: Equipe) => {
        teamsRecord[team.Id] = team;
      });
      setTeams(teamsRecord);
      return response;
    }
  }, []);

  const loadPoleActivites = useCallback(async () => {
    const response = await equipeService.getPoleActivites();
    if (response?.success && Array.isArray(response.data)) {
      const poleActivitesRecord: Record<number, PoleActivite> = {};
      response.data.forEach((pole: PoleActivite) => {
        poleActivitesRecord[pole.Id] = pole;
      });
      setPoleActivites(poleActivitesRecord);
      return response;
    }
  }, []);

  const resetPlanningData = useCallback(() => {
    itemsRef.current = {};
    appointmentsRef.current = [];
    lastLoadedRangeRef.current = null;
    inFlightRequestKeysRef.current.clear();
    setTeams({});
    setPoleActivites({});
    setAppointmentsVersion((prev) => prev + 1);
  }, []);


  const addMissingResourcesToCache = useCallback((resources: Item[]) => {
    if (!Array.isArray(resources) || resources.length === 0) return;

    const existingIds = new Set(
      Object.values(itemsRef.current).map((item) => Number(item.IdPlanningRessource))
    );
    const toAdd = resources.filter((resource) => {
      const resourceId = Number(resource?.IdPlanningRessource);
      return Number.isFinite(resourceId) && !existingIds.has(resourceId);
    });

    if (toAdd.length > 0) {
      const newItems = { ...itemsRef.current };
      toAdd.forEach((item) => {
        newItems[Number(item.IdPlanningRessource)] = item;
      });
      itemsRef.current = newItems;
    }
  }, []);

  const addMissingAppointmentsToCache = useCallback((appointments: Appointment[]) => {
    if (!Array.isArray(appointments) || appointments.length === 0) return;
    const existingIds = new Set(
      appointmentsRef.current.map((app) => Number(app.IdPlanningEvenement))
    );
    const toAdd = appointments.filter((app) => {
      const appId = Number(app?.IdPlanningEvenement);
      return Number.isFinite(appId) && !existingIds.has(appId);
    });
    if (toAdd.length > 0) {
      appointmentsRef.current = [...appointmentsRef.current, ...toAdd];
    }
  }, []);

  const loadAppointmentsInRange = useCallback(
    async (
      startDate: number,
      endDate: number,
      employeeIds?: number[]
    ): Promise<boolean> => {
      const normalizedEmployeeIds = [...new Set((employeeIds ?? []).map(Number))].filter(
        Number.isFinite
      );
      let employeeIdsToRequest = normalizedEmployeeIds;

      if (!isMobile) {
        const diff = endDate - startDate;
        const loadedRange = lastLoadedRangeRef.current;
        const loadedEmployeeIds = loadedRange?.employeeIds;
        const isEmployeeSetLoaded =
          loadedRange &&
          (loadedEmployeeIds === null ||
            (loadedEmployeeIds !== undefined &&
              normalizedEmployeeIds.every((id) => loadedEmployeeIds.has(id))));

        if (
          loadedRange &&
          isEmployeeSetLoaded &&
          startDate >= loadedRange.startDate &&
          endDate <= loadedRange.endDate
        ) {
          setIsLoading(false);
          return true; // Déjà chargé
        }

        const isDateRangeLoaded =
          loadedRange &&
          startDate >= loadedRange.startDate &&
          endDate <= loadedRange.endDate;

        if (isDateRangeLoaded && loadedEmployeeIds !== null && loadedEmployeeIds !== undefined) {
          employeeIdsToRequest = normalizedEmployeeIds.filter(
            (id) => !loadedEmployeeIds.has(id)
          );
          if (employeeIdsToRequest.length === 0) {
            return true;
          }
        }

        if (
          loadedRange &&
          isEmployeeSetLoaded &&
          startDate < loadedRange.endDate &&
          endDate > loadedRange.endDate
        ) {
          startDate = loadedRange.endDate;
          endDate = startDate + diff;
        }

        if (
          loadedRange &&
          isEmployeeSetLoaded &&
          endDate > loadedRange.startDate &&
          startDate < loadedRange.startDate
        ) {
          endDate = loadedRange.startDate;
          startDate = endDate - diff;
        }
      }

      const requestKey = [startDate, endDate, employeeIdsToRequest.join(',')].join('|');
      if (inFlightRequestKeysRef.current.has(requestKey)) {
        return true;
      }

      inFlightRequestKeysRef.current.add(requestKey);

      try {
        const requestedEmployeeIds = new Set(employeeIdsToRequest);
        const response = await evenementService.getEvenements(
          startDate,
          endDate,
          employeeIdsToRequest
        );
        const payloadData = response?.data;

        if (response?.success === false) {
          console.error(
            'Erreur lors du chargement des rendez-vous:',
            response?.message || 'Erreur inconnue'
          );
          setNotification(
            'Erreur lors du chargement des rendez-vous. Veuillez réessayer plus tard.'
          );
          return false;
        }

        const newAppointments =
          response?.success === true && Array.isArray(payloadData?.appointments)
            ? payloadData.appointments
            : [];

        const newResources =
          response?.success === true && Array.isArray(payloadData?.ressources)
            ? payloadData.ressources
            : [];

        if (isMobile) {
          appointmentsRef.current = newAppointments;
          addMissingResourcesToCache(newResources);
          setAppointmentsVersion((prev) => prev + 1);
          return true;
        }

        addMissingResourcesToCache(newResources);
        addMissingAppointmentsToCache(newAppointments);

        if (!isMobile) {
          const previousRange = lastLoadedRangeRef.current;
          const canMergeEmployeeIds =
            previousRange &&
            previousRange.startDate <= startDate &&
            previousRange.endDate >= endDate;

          const employeeIdsForRange =
            previousRange?.employeeIds === null
              ? null
              : new Set([
                  ...(canMergeEmployeeIds && previousRange?.employeeIds
                    ? previousRange.employeeIds
                    : []),
                  ...requestedEmployeeIds,
                ]);

          lastLoadedRangeRef.current = {
            startDate:
              canMergeEmployeeIds && previousRange ? previousRange.startDate : startDate,
            endDate: canMergeEmployeeIds && previousRange ? previousRange.endDate : endDate,
            employeeIds: employeeIdsForRange,
          };
        }
        setAppointmentsVersion((prev) => prev + 1);
      } catch (error) {
        console.error('Erreur lors du chargement des rendez-vous:', error);
      } finally {
        inFlightRequestKeysRef.current.delete(requestKey);
        setIsLoading(false);
      }
      return true;
    },
    [addMissingResourcesToCache, addMissingAppointmentsToCache, isMobile, setNotification]
  );

  // --- Trigger de refresh ---
  const refreshData = useCallback(() => setAppointmentsVersion((prev) => prev + 1), []);

  const addImage = useCallback(
    async (
      base64String: string,
      filename?: string
    ): Promise<{ success: boolean; id?: number; message?: string }> => {
      try {
        const result = await imageService.uploadImage(base64String);
        if (result.success && result.id) {
          return { success: true, id: result.id };
        } else {
          onError(result.message || "Erreur lors de l'upload de l'image.");
          console.error("Erreur lors de l'upload de l'image:", result.message);
          return { success: false, message: "Erreur lors de l'upload de l'image." };
        }
      } catch (error) {
        console.error("Erreur lors de l'upload de l'image:", error);
        return { success: false, message: "Erreur lors de l'upload de l'image." };
      }
    },
    [onError]
  );

  const fetchPaginatedImages = useCallback(
    async (
      page: number,
      limit?: number
    ): Promise<{ image: ImageType[]; totalLignes: number }> => {
      try {
        const response = await imageService.getImagesPaginated(page, limit || 8);
        if (response?.success && Array.isArray(response.data.image)) {
          return {
            image: response.data.image,
            totalLignes: response.data.totalLignes || 0,
          };
        }

        console.error(
          'Erreur lors de la récupération des images paginées:',
          response?.message || 'Erreur inconnue'
        );
        return { image: [], totalLignes: 0 };
      } catch (error) {
        console.error('Erreur lors de la récupération des images paginées:', error);
        return { image: [], totalLignes: 0 };
      }
    },
    []
  );

  const updateEventImage = useCallback(
    (id: number, newImage: ImageType) => {
      refreshData();
    },
    [refreshData]
  );

  const updateEmployeeImage = useCallback(
    (id: number, newImage: ImageType) => {
      setGlobalEmployees((prevEmployees) =>
        prevEmployees.map((emp) =>
          emp.IdPersonnel === id ? { ...emp, IdImage: newImage.id } : emp
        )
      );
    },
    [setGlobalEmployees]
  );

  const updateEmployeeTeam = useCallback(
    async (employee: User, teamId: number | null): Promise<{ success: boolean }> => {
      const prevEmployees = globalEmployees;
      setGlobalEmployees((prev) =>
        prev.map((emp) =>
          emp.IdPersonnel === employee.IdPersonnel ? { ...emp, Equipe: teamId } : emp
        )
      );

      try {
        const response = await employeeService.updateEquipeEmployee(employee.IdPersonnel, {
          Type: employee.Type,
          IdEquipe: teamId,
        });
        if (response?.success) {
          return { success: true };
        }
        console.error(
          "Erreur lors de la mise à jour de l'équipe de l'employé:",
          response?.message || 'Erreur inconnue'
        );
        setGlobalEmployees(prevEmployees);
        return { success: false };
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'équipe de l'employé:", error);
        setGlobalEmployees(prevEmployees);
        return { success: false };
      }
    },
    [globalEmployees, setGlobalEmployees]
  );

  const addTeam = useCallback(
    async (newTeam: { Nom: string }): Promise<{ success: boolean; message?: string }> => {
        try {
        const response = await equipeService.createEquipe(newTeam);
        if (response?.success) {
            if (response.data?.Id) {
            setTeams((prev) => ({
                ...prev,
                [response.data.Id]: response.data,
            }));
            } else {
            await loadTeams();
            }
            return { success: true };
        }
        return {
            success: false,
            message: response?.message || "Erreur lors de la création de l'équipe.",
        };
        } catch (error: any) {
        console.error("Erreur lors de la création de l'équipe:", error);
        return {
            success: false,
            message: error?.message || "Erreur lors de la création de l'équipe.",
        };
        }
    },
    [loadTeams]
    );

    const updateTeam = useCallback(
        async (updatedTeam: Equipe): Promise<{ success: boolean; message?: string }> => {
            const previousTeams = teams;
            setTeams((prev) => ({
            ...prev,
            [updatedTeam.Id]: updatedTeam,
            }));

            try {
            const response = await equipeService.updateEquipe(updatedTeam.Id, updatedTeam);
            if (response?.success) {
                return { success: true };
            }
            setTeams(previousTeams);
            return {
                success: false,
                message: response?.message || "Erreur lors de la mise à jour de l'équipe.",
            };
            } catch (error: any) {
            console.error("Erreur lors de la mise à jour de l'équipe:", error);
            setTeams(previousTeams);
            return {
                success: false,
                message: error?.message || "Erreur lors de la mise à jour de l'équipe.",
            };
            }
        },
        [teams]
    );

    const onCheckDeleteTeam = useCallback(
      async (id: number): Promise<{ checkRequired: boolean; message?: string }> => {
        try {
          const response = await equipeService.checkDeleteEquipe(id);
          if (response?.success && response.checkRequired && response.message) {
            return {
              checkRequired: Boolean(response.checkRequired),
              message: response.message,
            };
          }
          return { checkRequired: false };
        } catch (error: any) {
          console.error("Erreur lors de la vérification de suppression de l'équipe:", error);
          throw error;
        }
      },
      []
    );

    const deleteTeam = useCallback(
      async (id: number, numberEmployeeCheck: number = 0): Promise<{ success: boolean; message?: string }> => {
        const previousTeams = teams;
        const previousEmployees = globalEmployees;

        setTeams((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });

        // Détache les employés qui appartenaient à l'équipe supprimée
        setGlobalEmployees((prev) =>
          prev.map((emp) => (Number(emp.Equipe) === Number(id) ? { ...emp, Equipe: null } : emp))
        );

        try {
          const response = await equipeService.deleteEquipe(id, numberEmployeeCheck);
          if (response?.success) {
              return { success: true };
          }
          setTeams(previousTeams);
          setGlobalEmployees(previousEmployees);
          return {
              success: false,
              message: response?.message || "Erreur lors de la suppression de l'équipe.",
          };
        } catch (error: any) {
          console.error("Erreur lors de la suppression de l'équipe:", error);
          setTeams(previousTeams);
          setGlobalEmployees(previousEmployees);
          return {
              success: false,
              message: error?.message || "Erreur lors de la suppression de l'équipe.",
          };
        }
      },
      [teams, globalEmployees, setGlobalEmployees]
    );
    const addPersonnelToTeam = useCallback(
        async (teamId: number, personnelId: number): Promise<{ success: boolean; message?: string }> => {
            const employee = globalEmployees.find((emp) => Number(emp.IdPersonnel) === Number(personnelId));
            if (!employee) {
            return { success: false, message: "Employé introuvable." };
            }
            const res = await updateEmployeeTeam(employee, teamId);
            return res.success
            ? { success: true }
            : { success: false, message: "Erreur lors de l'ajout du personnel à l'équipe." };
        },
        [globalEmployees, updateEmployeeTeam]
    );

    const removePersonnelFromTeam = useCallback(
        async (personnelId: number): Promise<{ success: boolean; message?: string }> => {
            const employee = globalEmployees.find((emp) => Number(emp.IdPersonnel) === Number(personnelId));
            if (!employee) {
            return { success: false, message: "Employé introuvable." };
            }
            const res = await updateEmployeeTeam(employee, null);
            return res.success
            ? { success: true }
            : { success: false, message: "Erreur lors du retrait du personnel de l'équipe." };
        },
        [globalEmployees, updateEmployeeTeam]
    );

    const fetchTeamMembers = useCallback(
        async (
            teamId: number
        ): Promise<{ success: boolean; data?: User[]; message?: string }> => {
            try {
            const response = await equipeService.getEquipePersonnel(teamId);
            if (response?.success && Array.isArray(response.data)) {
                return { success: true, data: response.data };
            }
            return {
                success: false,
                message: response?.message || "Erreur lors du chargement du personnel de l'équipe.",
            };
            } catch (error: any) {
            console.error("Erreur lors du chargement du personnel de l'équipe:", error);
            return {
                success: false,
                message: error?.message || "Erreur lors du chargement du personnel de l'équipe.",
            };
            }
        },
        []
    );

  const addManualEvent = useCallback(
    (payload: ManualEventPayload) => {
      const newId = Date.now();
      const newItem = {
        IdPlanningRessource: newId,
        CodePlanningRessource: payload.code,
        LibellePlanningRessource: payload.label,
        AnnotationPlanningRessource: payload.description,
        CouleurFondPlanningRessource: payload.color,
        CouleurBordurePlanningRessource: payload.borderColor,
        CouleurTextePlanningRessource: payload.textColor,
        code: payload.code,
        image: payload.image,
        Type: 'Rubrique Perso',
        Verrou: false,
        Actif: payload.actif,
        Category: payload.category,
        isManual: true,
      } as Item;

      itemsRef.current = { [newId]: newItem, ...itemsRef.current };
      refreshData();
      return newItem;
    },
    [refreshData]
  );

  const updateManualEventCategory = useCallback(
    (id: number, category: string) => {
      itemsRef.current[id] = {
        ...itemsRef.current[id],
        Category: category,
      } as Item;
      refreshData();
    },
    [refreshData]
  );

  const deleteManualEvent = useCallback(
    (id: number) => {
      delete itemsRef.current[id];
      refreshData();
    },
    [refreshData]
  );

  const toggleManualEvent = useCallback(
    (id: number) => {
      itemsRef.current[id] = {
        ...itemsRef.current[id],
        Actif: !(itemsRef.current[id] as any).Actif,
      } as Item;
      refreshData();
    },
    [refreshData]
  );


  const lockTeam = useCallback(
    async (teamId: number): Promise<{ success: boolean; expiresIn?: number; message?: string }> => {
      try {
        const response = await equipeService.lockEquipe(teamId);
        const data = response?.data ?? response;

        if (response?.success || data?.isLocked) {
          setTeams((prev) => ({
            ...prev,
            [teamId]: {
              ...prev[teamId],
              isLocked: { status: false, timestamp: Date.now() },
            },
          }));
          return {
            success: true,
            expiresIn: data?.expiresIn ?? Date.now() + 300_000,
          };
        }

        return {
          success: false,
          message: data?.message || response?.message || "Erreur lors du verrouillage de l'équipe.",
        };
      } catch (error: any) {
        console.error("Erreur lors du verrouillage de l'équipe:", error);
        return {
          success: false,
          message:
            error?.response?.data?.message ||
            error?.message ||
            "Cette équipe est actuellement verrouillée par un autre utilisateur.",
        };
      }
    },
    []
  );

  const unlockTeam = useCallback(
    async (teamId: number): Promise<{ success: boolean; message?: string }> => {
      try {
        const response = await equipeService.unlockEquipe(teamId);
        if (response?.success || response?.isLocked === false) {
          setTeams((prev) => ({
            ...prev,
            [teamId]: {
              ...prev[teamId],
              isLocked: { status: false, timestamp: Date.now() },
            },
          }));
          return { success: true };
        }
        return {
          success: false,
          message: response?.message || "Erreur lors du déverrouillage de l'équipe.",
        };
      } catch (error: any) {
        console.error("Erreur lors du déverrouillage de l'équipe:", error);
        return {
          success: false,
          message: error?.message || "Erreur lors du déverrouillage de l'équipe.",
        };
      }
    },
    []
  );

  
  const setTeamLockStatus = useCallback((teamId: number, isLocked: boolean) => {
    setTeams((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], isLocked: { status: isLocked, timestamp: Date.now() } },
    }));
  }, []);

  const setEmployeeLockStatus = useCallback((employeeId: number, isLocked: boolean, timestamp?: number, updatedById?: number, updatedByNom?: string) => {
    setGlobalEmployees((prev) => prev.map((emp) => (Number(emp.IdPersonnel) === Number(employeeId) ? { ...emp, isLocked : { status: isLocked, timestamp, updatedById, updatedByNom } } : emp)));
  }, []);


  const upsertTeamInCache = useCallback((team: Partial<Equipe> & { Id: number }) => {
    setTeams((prev) => {
      const existing = prev[team.Id];
      return {
        ...prev,
        [team.Id]: {
          ...existing,
          ...team,
        } as Equipe,
      };
    });
  }, []);

  const removeTeamFromCache = useCallback((teamId: number) => {
    setTeams((prev) => {
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
    setGlobalEmployees((prev) =>
      prev.map((emp) => (Number(emp.Equipe) === Number(teamId) ? { ...emp, Equipe: null } : emp))
    );
  }, [setGlobalEmployees]);


  // Mémorisation de la valeur du contexte pour éviter les re-renders inutiles
  const value = useMemo<DataLayerContextType>(
    () => ({
        isLoading,
        setIsLoading,
        itemsRef,
        appointmentsRef,
        initialTeams: teams,
        poleActivites,
        appointmentsVersion,
        globalEmployees,
        refreshData,
        resetPlanningData,
        loadTeams,
        loadPoleActivites,
        loadAppointmentsInRange,
        addMissingResourcesToCache,
        updateEmployeeTeam,
        addManualEvent,
        toggleManualEvent,
        updateManualEventCategory,
        deleteManualEvent,
        addImage,
        fetchPaginatedImages,
        updateEventImage,
        updateEmployeeImage,
        addTeam,   
        updateTeam,
        deleteTeam,
        addPersonnelToTeam,
        removePersonnelFromTeam,
        fetchTeamMembers,
        onCheckDeleteTeam,
        lockTeam,
        unlockTeam,
        setTeamLockStatus,
        setEmployeeLockStatus,
        upsertTeamInCache,
        removeTeamFromCache
    }),
    [
        isLoading,
        teams,
        poleActivites,
        appointmentsVersion,
        refreshData,
        resetPlanningData,
        loadTeams,
        loadPoleActivites,
        loadAppointmentsInRange,
        addMissingResourcesToCache,
        updateEmployeeTeam,
        addManualEvent,
        toggleManualEvent,
        updateManualEventCategory,
        deleteManualEvent,
        addImage,
        fetchPaginatedImages,
        updateEventImage,
        updateEmployeeImage,
        addTeam,
        updateTeam,
        deleteTeam,
        addPersonnelToTeam,
        removePersonnelFromTeam,
        onCheckDeleteTeam
    ]
  );

  return (
    <DataLayerContext.Provider value={value}>
      {children}
    </DataLayerContext.Provider>
  );
};

// --- Hook personnalisé pour consommer le Context ---
export const useDataLayer = (): DataLayerContextType => {
  const context = useContext(DataLayerContext);
  if (!context) {
    throw new Error('useDataLayer doit être utilisé à l’intérieur d’un DataLayerProvider');
  }
  return context;
};