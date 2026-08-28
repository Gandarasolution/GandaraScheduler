import { useState, useRef, useEffect, useMemo, useCallback, use } from 'react';
import { Appointment, User, Item, CalendarConfig, ImageType, UserRole, Equipe, PoleActivite, ChantierItem } from '../../types';
import { ActiveFilters, createSearchAndFilterUtils } from '../../utils/searchAndFilterUtils';
import { employeeService, equipeService, evenementService, imageService } from '@/app/service';
import { useCalendarWorker } from '@/app/calendrier/hooks/data/useCalendarWorker';
import { getCachedImages, subscribeToImageCache, upsertCachedImage } from '../../utils/imageCacheStore';
import { set } from 'date-fns';


interface DataLayerProps {
  globalEmployees: User[];
  setGlobalEmployees: React.Dispatch<React.SetStateAction<User[]>>;
   setNotification: (message: string) => void
}

export const useDataLayer = ({
  globalEmployees,
  setGlobalEmployees,
  setNotification
}: DataLayerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const worker = useCalendarWorker();
  const [teams, setTeams] = useState<Record<number, Equipe>>({});
  const [poleActivites, setPoleActivites] = useState<Record<number, PoleActivite>>({});
  
  const itemsRef = useRef<Record<number, Item>>({});
  const appointmentsRef = useRef<Appointment[]>([]);

  const lastLoadedRangeRef = useRef<{ startDate: number; endDate: number } | null>(null);
  
  // Données Filtrées (State pour l'UI)
  const [appointmentsVersion, setAppointmentsVersion] = useState(0); // Trigger manuel
  //const [loadingWindowVersion, setLoadingWindowVersion] = useState(0);
  const [availableImages, setAvailableImages] = useState<ImageType[]>(() => getCachedImages());


 
  useEffect(() => {
    const unsubscribe = subscribeToImageCache((images) => {
      setAvailableImages(images);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadTeams = useCallback(async () => {    
    const response = await equipeService.getEquipes();
    
    if (response?.error === 0 && Array.isArray(response.data)) {
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
    if (response?.error === 0 && Array.isArray(response.data)) {
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
    setTeams({});
    setPoleActivites({});
    setAppointmentsVersion(prev => prev + 1);
    //setLoadingWindowVersion(prev => prev + 1);
  }, []);

  // Instanciation Utils
  const searchUtils = useMemo(() => createSearchAndFilterUtils(), []);

  const addMissingResourcesToCache = useCallback((resources: Item[]) => {
    if (!Array.isArray(resources) || resources.length === 0) return;

    const existingIds = new Set(Object.values(itemsRef.current).map(item => Number(item.IdPlanningRessource)));
    const toAdd = resources.filter((resource) => {
      const resourceId = Number(resource?.IdPlanningRessource);
      return Number.isFinite(resourceId) && !existingIds.has(resourceId);
    });

    if (toAdd.length > 0) {
      const newItems = { ...itemsRef.current };
      toAdd.forEach(item => {
        newItems[Number(item.IdPlanningRessource)] = item;
      });
      itemsRef.current = newItems;
    }
  }, []);


  const addMissingAppointmentsToCache = useCallback((appointments: Appointment[]) => {
    if (!Array.isArray(appointments) || appointments.length === 0) return;
    const existingIds = new Set(appointmentsRef.current.map(app => Number(app.IdPlanningEvenement)));
    const toAdd = appointments.filter((app) => {
      const appId = Number(app?.IdPlanningEvenement);
      return Number.isFinite(appId) && !existingIds.has(appId);
    });
    if (toAdd.length > 0) {
      appointmentsRef.current = [...appointmentsRef.current, ...toAdd];
    }
  }, []);

  



  const loadAppointmentsInRange = useCallback(async (startDate: number, endDate: number): Promise<boolean> => {
    setIsLoading(true);
    const diff = endDate - startDate;
    if (lastLoadedRangeRef.current && startDate >= lastLoadedRangeRef.current.startDate && endDate <= lastLoadedRangeRef.current.endDate) {
      setIsLoading(false);
      return true; // Déjà chargé
    }

    if (lastLoadedRangeRef.current && startDate < lastLoadedRangeRef.current.endDate && endDate > lastLoadedRangeRef.current?.endDate) {
      startDate = lastLoadedRangeRef.current.endDate;
      endDate = startDate + diff; // On garde la même durée
    }

    if (lastLoadedRangeRef.current && endDate > lastLoadedRangeRef.current.startDate && startDate < lastLoadedRangeRef.current?.startDate) {
      endDate = lastLoadedRangeRef.current.startDate;
      startDate = endDate - diff; // On garde la même durée
    }

    try {
      const response = await evenementService.getEvenements(startDate, endDate);
      const payloadData = response?.data;

      if(response?.error !== 0) {
        console.error("Erreur lors du chargement des rendez-vous:", response?.message || "Erreur inconnue");
        setNotification("Erreur lors du chargement des rendez-vous. Veuillez réessayer plus tard.");
        return false;
      }

      const newAppointments = response?.error === 0
        ? (Array.isArray(payloadData?.appointments)
            ? payloadData.appointments
            : []
          )
        : [];

      const newResources = response?.error === 0 && Array.isArray(payloadData?.ressources)
        ? payloadData.ressources
        : [];
        
      // Ajouter au cache uniquement les ressources absentes.
      addMissingResourcesToCache(newResources);
      
      // Ajouter au cache uniquement les rendez-vous absents.
      addMissingAppointmentsToCache(newAppointments);
      setAppointmentsVersion(prev => prev + 1);
    } catch (error) {
      console.error("Erreur lors du chargement des rendez-vous:", error);
    } finally {
      setIsLoading(false);
    }
    return true;
  }, [addMissingResourcesToCache, addMissingAppointmentsToCache]);

  

  // --- Trigger de refresh ---
  const refreshData = useCallback(() => setAppointmentsVersion(prev => prev + 1), []);

  const addImage = (newImage: ImageType) => {
    upsertCachedImage(newImage);
    return newImage;
  };

  const fetchPaginatedImages = useCallback(async (page: number, limit?: number): Promise<{ image: ImageType[]; totalLignes: number }> => {
    try {
      const response = await imageService.getImagesPaginated(page, limit || 8);
      if (response?.error === 0 && Array.isArray(response.data.image)) {
              console.log('Réponse de l\'API getImagesPaginated:', response);

        const images = response.data.image;
        images.forEach((img: ImageType) => upsertCachedImage(img));
        return { image: images, totalLignes: response.data.totalLignes || 0 };
      }

      console.error("Erreur lors de la récupération des images paginées:", response?.message || "Erreur inconnue");
      return { image: [], totalLignes: 0 };
    } catch (error) {
      console.error("Erreur lors de la récupération des images paginées:", error);
      return { image: [], totalLignes: 0 };
    }
  }, []);

  const updateEventImage = (id: number, newImage: ImageType) => {
    //itemsRef.current[id] = { ...itemsRef.current[id], Image: newImage.id };
    refreshData(); // Force le re-render
  };

  const updateEmployeeImage = (id: number, newImage: ImageType) => {
    setGlobalEmployees(prevEmployees => 
      prevEmployees.map(emp => 
        emp.IdPersonnel === id ? { ...emp, IdImage: newImage.id } : emp
      )
    );
  };

  const updateEmployeeGroup = async (employee: User, groupId: number | null): Promise<{ success: boolean }> => {
    const prevEmployees = globalEmployees;
    setGlobalEmployees(prev => 
      prev.map(emp => emp.IdPersonnel === employee.IdPersonnel ? { ...emp, Equipe: groupId } : emp)
    );

    try {
      const response = await employeeService.updateEquipeEmployee(employee.IdPersonnel, { Type: employee.Type, IdEquipe: groupId });
      if (response?.error === 0) {
        return { success: true };
      }
      console.error("Erreur lors de la mise à jour de l'équipe de l'employé:", response?.message || "Erreur inconnue");
      // Revert en cas d'erreur
      setGlobalEmployees(prevEmployees);
      return { success: false };
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'équipe de l'employé:", error);
      // Revert en cas d'erreur
      setGlobalEmployees(prevEmployees);
      return { success: false };
    }
  };

  const addManualEvent = (payload: { code: string; label: string; description: string; image?: ImageType; color: string; borderColor: string; textColor: string; actif: boolean; type: 'autre'; category: string; }) => {
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
      isManual: true
    } as Item;

    itemsRef.current = { [newId]: newItem, ...itemsRef.current };
    refreshData();
    return newItem;
  };

  const updateManualEventCategory = (id: number, category: string) => {
    itemsRef.current[id] = {
      ...itemsRef.current[id],
      Category: category,
    } as Item;
    refreshData();
  };

  const deleteManualEvent = (id: number) => {
    delete itemsRef.current[id];
    refreshData();
  };

  const toggleManualEvent = (id: number) => {
    itemsRef.current[id] = {
      ...itemsRef.current[id],
      Actif: !(itemsRef.current[id] as any).Actif,
      
    } as Item;
    refreshData();
  };


  return {
    isLoading,
    itemsRef,
    appointmentsRef,
    availableImages,
    initialTeams: teams,
    poleActivites,
    updateEmployeeGroup,
    addManualEvent,
    toggleManualEvent,
    updateManualEventCategory,
    deleteManualEvent,
    refreshData,
    appointmentsVersion,
    //loadingWindowVersion,
    addImage,
    updateEventImage,
    updateEmployeeImage,
    resetPlanningData,
    loadAppointmentsInRange,
    loadTeams, loadPoleActivites,
    addMissingResourcesToCache,
    setIsLoading,
    fetchPaginatedImages
  };
};
