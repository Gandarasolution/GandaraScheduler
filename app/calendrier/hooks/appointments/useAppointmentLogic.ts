import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { addHours, eachDayOfInterval } from "date-fns";
import { Appointment, User, HistoryAction, Item, Tag, AutreItem } from '../../types';
import { createAppointmentUtils } from '../../utils/appointmentUtils';
import { getWorkedDayIntervals, isWeekend } from "../../utils/dates";
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from "../../utils/constants";
import ressourceService from '@/app/service/ressource.service';
import { useAuth } from '../utils/AuthContext';
import imageService from '@/app/service/image.service';

// Type pour les données de répétition
export type RepeatData = {
  numberCount: number;
  repeatCount: number | null;
  repeatInterval: "day" | "week" | "month";
  endDate: number | null;
};

type ActionResult = { success: boolean; message?: string };

interface LogicProps {
  employees:User[];
  appointmentsRef: React.MutableRefObject<Appointment[]>;
  eventsRef: React.MutableRefObject<Record<number, Item>>;
  timelineState: {
    isFullDay: boolean;
    isDisplayWeekend: boolean;
    includeWeekend: boolean;
    respectNonWorkingDays: boolean;
    nonWorkingDates: Record<string, number>;
  };
  onUpdate: () => void; // Callback pour forcer le rafraîchissement de l'UI
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
  };
}

export const useAppointmentLogic = ({ 
  employees,
  appointmentsRef, 
  eventsRef, 
  timelineState, 
  onUpdate,
  setIsSearchOverlayOpen,
  setDimensionsSearchInput,
  api,
  onLockedError
}: LogicProps) => {
  
  const { currentPlanningId } = useAuth();
  
  // --- Initialisation des Utilitaires ---
  const appointmentUtils = useMemo(() => createAppointmentUtils(employees), []);
  
  // --- Refs pour la persistance hors rendu ---
  const history = useRef<HistoryAction[]>([]);
  const clipboardAppointment = useRef<Appointment | null>(null);
  const timestampCounter = useRef(1000);
  const timelineStateRef = useRef(timelineState);

  useEffect(() => {
    timelineStateRef.current = timelineState;
  }, [timelineState]);



  // --- États UI nécessaires à la logique ---
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; date: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: number; employeeId: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  
  
  // États pour les actions complexes
  const [repeatData, setRepeatData] = useState<RepeatData | null>(null);
  const [extendData, setExtendData] = useState<number | null>(null);
  
  // État de l'alerte de confirmation
  const [alertState, setAlertState] = useState<{
    isVisible: boolean;
    title: "Êtes-vous sûr de vouloir supprimer ce rendez-vous ?" | "Êtes-vous sûr de vouloir diviser ce rendez-vous ?" | string;
    onConfirm: () => void;
    onCancel: () => void;
    fetchToLockAppointment?: () => Promise<any>;
  }>({
    isVisible: false,
    title: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const isApiSuccess = useCallback((resp: any) => {
    return !!resp && (resp.success || typeof resp.error === 'undefined');
  }, []);

  const addMissingResourcesToCache = useCallback((resources: Item[]) => {
    if (!Array.isArray(resources) || resources.length === 0) return;

    const existingIds = new Set(Object.values(eventsRef.current).map((item) => Number(item.IdPlanningRessource)));
    const toAdd = resources.filter((resource) => {
      const resourceId = Number(resource?.IdPlanningRessource);
      return Number.isFinite(resourceId) && !existingIds.has(resourceId);
    });

    if (toAdd.length > 0) {
      eventsRef.current = { ...eventsRef.current, ...toAdd.reduce((acc, item) => ({ ...acc, [item.IdPlanningRessource]: item }), {}) };
    }
  }, [eventsRef]);

  const getCachedResourceById = useCallback((resourceId?: number, fallback?: Item) => {
    if (!resourceId) return fallback;
    return eventsRef.current[resourceId] || fallback;
  }, [eventsRef]);
  

  /**
   * Réorganise les priorités des rendez-vous qui chevauchent quand un rdv change de priorité
   */
  const reorganizePriorities = useCallback((
    movedAppointmentId: number,
    newPriority: number,
    employeeId: number,
    startDate: number,
    endDate: number
  ) => {
    // Trouver tous les rdv qui chevauchent (même employé et même période)
    const overlappingAppointments = appointmentsRef.current.filter(app => 
      app.IdPlanningEvenement !== movedAppointmentId &&
      app.IdEmploye === employeeId &&
      app.DebutPlanningEvenement < endDate &&
      app.FinPlanningEvenement > startDate
    );

    // Réorganiser : tous les rdv avec priorité >= newPriority doivent être décalés
    overlappingAppointments.forEach(app => {
      if ((app.PlanningEvenementPriorite ?? 0) >= newPriority) {        
        app.PlanningEvenementPriorite = (app.PlanningEvenementPriorite ?? 0) + 1;
      }
    });
  }, [appointmentsRef]);

  // --- GESTION DE L'HISTORIQUE (UNDO) ---

  /**
   * Sauvegarde l'état actuel d'un rendez-vous dans l'historique
   * @param appointment Rendez-vous à sauvegarder
   * @param type Type d'action ('create', 'update', 'delete', 'move', 'resize_split')
   * @param previousAppointment État précédent du rendez-vous (pour 'update', 'move', 'resize_split')
   * @param createdAppointments Rendez-vous créés (pour 'resize_split')
   */
  const saveAppointmentState = useCallback((
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
      createdAppointments: createdAppointments ? createdAppointments.map(app => ({ ...app })) : undefined,
      appointments: appointmentsRef.current.map(app => ({ ...app })) // Sauvegarde snapshot sécurité
    });

    if (history.current.length > 50) {
      history.current.shift();
    }
  }, [appointmentsRef]);

  const undoLastAction = useCallback(async () => {    
    if (history.current.length === 0) {
      return;
    }

    const lastAction = history.current.pop();
    if (!lastAction) return;

    const before =  appointmentsRef.current

    switch (lastAction.type) {
      case 'create':
        // Annuler une création = supprimer le rendez-vous
        if (lastAction.appointment) {
          appointmentsRef.current = appointmentsRef.current.filter(app => app.IdPlanningEvenement !== lastAction.appointment!.IdPlanningEvenement);

          const result = await api?.deleteEvenement(String(lastAction.appointment.IdPlanningEvenement));
          if (result.success === false || result.error === 1) {
            appointmentsRef.current = before;
          }
        }
        break;

      case 'delete':
        // Annuler une suppression = restaurer le rendez-vous
        if (lastAction.appointment) {
          appointmentsRef.current.push({ ...lastAction.appointment });

          const payload = {
            DebutPlanningEvenement: lastAction.appointment.DebutPlanningEvenement,
            FinPlanningEvenement: lastAction.appointment.FinPlanningEvenement,
            IdEmploye: lastAction.appointment.IdEmploye,
            IdPlanningRessource: lastAction.appointment.IdPlanningRessource,
            AnnotationPlanningEvenement: lastAction.appointment.AnnotationPlanningEvenement,
            PlanningEvenementPriorite: lastAction.appointment.PlanningEvenementPriorite,
            IdPlanningEtiquette: lastAction.appointment.Etiquette?.IdPlanningEtiquette,
          };

          const result = await api?.createEvenement(payload);
          if (result.success === false || result.error === 1) {
            appointmentsRef.current = before;
          }
        }
        break;

      case 'update':
      case 'move':
        // Annuler une modification/déplacement = restaurer l'ancien état
        if (lastAction.previousAppointment) {
          appointmentsRef.current = appointmentsRef.current.map(app =>
            app.IdPlanningEvenement === lastAction.previousAppointment!.IdPlanningEvenement ? { ...lastAction.previousAppointment! } : app
          );
          const payload = {
            DebutPlanningEvenement: lastAction.previousAppointment.DebutPlanningEvenement,
            FinPlanningEvenement: lastAction.previousAppointment.FinPlanningEvenement,
            IdEmploye: lastAction.previousAppointment.IdEmploye,
            IdPlanningRessource: lastAction.previousAppointment.IdPlanningRessource,
            AnnotationPlanningEvenement: lastAction.previousAppointment.AnnotationPlanningEvenement,
            PlanningEvenementPriorite: lastAction.previousAppointment.PlanningEvenementPriorite,
            IdPlanningEtiquette: lastAction.previousAppointment.Etiquette?.IdPlanningEtiquette,
          };

          const result = await api?.createEvenement(payload);
          if (result.success === false || result.error === 1) {
            appointmentsRef.current = before;
          }

        }
        break;

      case 'resize_split':
        // Annuler une division automatique (ex: déplacement sur plusieurs jours)
        if (lastAction.previousAppointment && lastAction.createdAppointments) {
          // Restaurer le RDV principal
          appointmentsRef.current = appointmentsRef.current.map(app =>
            app.IdPlanningEvenement === lastAction.previousAppointment!.IdPlanningEvenement ? { ...lastAction.previousAppointment! } : app
          );
          
          // Supprimer les RDV créés par le split
          const createdIds = lastAction.createdAppointments.map(app => app.IdPlanningEvenement);
          appointmentsRef.current = appointmentsRef.current.filter(app => !createdIds.includes(app.IdPlanningEvenement));

          try {
            const result = await Promise.all([
              // Restaurer le RDV principal
              api?.updateEvenement(String(lastAction.previousAppointment.IdPlanningEvenement), {
                DebutPlanningEvenement: lastAction.previousAppointment.DebutPlanningEvenement,
                FinPlanningEvenement: lastAction.previousAppointment.FinPlanningEvenement,
                IdEmploye: lastAction.previousAppointment.IdEmploye,
                IdPlanningRessource: lastAction.previousAppointment.IdPlanningRessource,
                AnnotationPlanningEvenement: lastAction.previousAppointment.AnnotationPlanningEvenement,
                PlanningEvenementPriorite: lastAction.previousAppointment.PlanningEvenementPriorite,
                IdPlanningEtiquette: lastAction.previousAppointment.Etiquette?.IdPlanningEtiquette,
              }),

              api?.deleteEvenements(lastAction.createdAppointments.map(app => String(app.IdPlanningEvenement)))
            ]);
            if (result.some(res => res?.success === false || res?.error === 1)) {
              appointmentsRef.current = before;
            }
            
          } catch (error) {
            console.error('Error occurred while undoing resize_split:', error);
          }

        }
        break;
    }
    onUpdate(); // Rafraichir l'interface
  }, [appointmentsRef, onUpdate]);

  // --- FONCTIONS CRUD INTERNES ---

  // Resize interne (mise à jour simple)
  const updateAppointmentBounds = useCallback((
    data: { id: number; newStartDate: number; newEndDate: number; newEmployee?: User, annotation?: string, Etiquette?: Tag },
    saveToHistory: boolean = true,
    newPriority?: number,
    syncWithApi: boolean = true,
  ) => {
      const { id, newStartDate, newEndDate, newEmployee, annotation, Etiquette } = data;
      const appointmentToResize = appointmentsRef.current.find(app => Number(app.IdPlanningEvenement) === Number(id));
      if (!appointmentToResize) return;

      const previousAppointments = appointmentsRef.current.map(app => ({ ...app }));

      if (saveToHistory) {
        saveAppointmentState(appointmentToResize, 'update', { ...appointmentToResize });
      }

      
      appointmentsRef.current = appointmentsRef.current.map((app) =>
        Number(app.IdPlanningEvenement) === Number(id)
          ? {
              ...app,
              DebutPlanningEvenement: newStartDate,
              FinPlanningEvenement: newEndDate,
              IdEmploye: newEmployee ? newEmployee.IdPersonnel : app.IdEmploye,
              PlanningEvenementPriorite: newPriority !== undefined ? newPriority : app.PlanningEvenementPriorite,
              AnnotationPlanningEvenement: annotation !== undefined ? annotation : app.AnnotationPlanningEvenement,
              Etiquette: Etiquette
            }
          : app
      );

      if (newPriority !== undefined && newEmployee) {
        reorganizePriorities(id, newPriority, newEmployee.IdPersonnel, newStartDate, newEndDate);
      }
      const updatedAppointment = appointmentsRef.current.find(app => Number(app.IdPlanningEvenement) === Number(id));
      if (!syncWithApi || !updatedAppointment || !api?.updateEvenement) return;

      void api.updateEvenement(String(id), {
        DebutPlanningEvenement: updatedAppointment.DebutPlanningEvenement,
        FinPlanningEvenement: updatedAppointment.FinPlanningEvenement,
        Type: newEmployee?.Type,
        IdEmploye: newEmployee?.IdPersonnel,
        IdPlanningRessource: updatedAppointment.IdPlanningRessource,
        AnnotationPlanningEvenement: updatedAppointment.AnnotationPlanningEvenement,
        PlanningEvenementPriorite: updatedAppointment.PlanningEvenementPriorite,
        IdPlanningEtiquette: updatedAppointment.Etiquette?.IdPlanningEtiquette,
      }).then((resp) => {
        if (isApiSuccess(resp)) {
          return;
        }

        appointmentsRef.current = previousAppointments;
      }).catch((err) => {
        console.error('Erreur réseau updateEvenement', err);
        appointmentsRef.current = previousAppointments;
      });
  }, [appointmentsRef, onUpdate, saveAppointmentState, api, employees, reorganizePriorities, isApiSuccess]);

  // Création unitaire d'un RDV
  const createAppointment = useCallback((
    data: { startDate: number; endDate: number; employeeId: number; ressource: Item; priority: number },
    saveToHistory: boolean = true,
    description?: string,
    syncWithApi: boolean = true
  ): Appointment | null => {
      const { startDate, endDate, employeeId, ressource, priority } = data;
      const employee = employees.find(emp => Number(emp.IdPersonnel) === Number(employeeId));

      if (!employee) {
        return null;
      }

      console.log(new Date(startDate), new Date(endDate));

      const payload = {
        AnnotationPlanningEvenement: description || `Nouveau rendez-vous`,
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        IdEmploye: employeeId,
        Type: employee.Type,
        IdPlanningRessource: ressource.IdPlanningRessource,
      };

      const idTemp = Date.now();

      const previousAppointments = appointmentsRef.current.map(app => ({ ...app }));
      const localAppointment: Appointment = {
        IdPlanningEvenement: idTemp, // ID temporaire pour le rendu local
        AnnotationPlanningEvenement: description || `Nouveau rendez-vous`,
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        IdEmploye: employeeId,
        IdPlanningRessource: ressource.IdPlanningRessource,
        PlanningEvenementPriorite: priority,
        isLocked: false,
      };

      appointmentsRef.current.push(localAppointment);
      onUpdate();

      // Mode local uniquement : pas de synchronisation BDD.
      if (!syncWithApi || !api?.createEvenement) {
        if (saveToHistory) {
          saveAppointmentState(localAppointment, 'create');
        }
        return localAppointment;
      }

      
      api.createEvenement(payload)
        .then((resp) => {
          try {

            console.log('createEvenement response:', resp);

            if (resp && resp.success) {
              const apiData = resp?.data;
              const apiResources = Array.isArray(apiData?.ressources) ? apiData.ressources : [];
              
              addMissingResourcesToCache(apiResources);

              const apiCreated = Array.isArray(apiData?.appointments)
                ? apiData.appointments[0]
                : Array.isArray(resp.data)
                  ? resp.data[0]
                  : resp.data;

              if (!apiCreated) {
                return;
              }

              appointmentsRef.current = appointmentsRef.current.map((app) =>{
                if (Number(app.IdPlanningEvenement) === Number(idTemp)) {
                  const a = {...app, IdPlanningEvenement: apiCreated.IdPlanningEvenement, PlanningEvenementPriorite: apiCreated.PlanningEvenementPriorite };
                  if (saveToHistory) {
                    saveAppointmentState(a, 'create');
                  }
                  return a;
                }
                return app;
              });
              onUpdate();
              
              return;
            }

            onLockedError(resp?.message);
            appointmentsRef.current = previousAppointments;
          } catch (e) {
            console.error('Erreur traitement réponse createEvenement', e);
            appointmentsRef.current = previousAppointments;
            onUpdate();
          }
        })
        .catch((err) => {
          console.error('Erreur réseau createEvenement', err);
          appointmentsRef.current = previousAppointments;
        });

      return localAppointment;
    }, [appointmentsRef, onUpdate, saveAppointmentState, api, employees, eventsRef, addMissingResourcesToCache, getCachedResourceById]);

  // --- GESTION DES PRIORITÉS ---

  // --- LOGIQUE MÉTIER COMPLEXE (Move, Split, Save) ---

  const moveAppointment = useCallback(async (
    data: {
      id: number;
      newStartDate: number;
      newEndDate: number;
      newEmployeeId: number;
      idRessource: number;
      resizeDirection?: 'left' | 'right';
    },
    saveToHistory: boolean = true,
    newPriority?: number
  ): Promise<ActionResult> => {
      const {
        id,
        newStartDate,
        newEndDate,
        newEmployeeId,
        idRessource,
        resizeDirection = 'right',
      } = data;

      console.log('moveAppointment called with:', data);
      const appointment = appointmentsRef.current.find((app) => app.IdPlanningEvenement === id);
      if (!appointment) {
        return { success: false, message: 'Rendez-vous introuvable.' };
      }
      console.log('Found appointment:', appointment);
      const employee = employees.find(emp => Number(emp.IdPersonnel) === Number(newEmployeeId));
      if (!employee) {   
        return { success: false, message: 'Employé introuvable.' };
      }
      console.log('Found employee:', employee);

      const ressource = eventsRef.current[Number(idRessource)] ;
      if (!ressource) {
        
        return { success: false, message: 'Ressource introuvable.' };
      }

      console.log('Found ressource:', ressource);

      if(appointment.DebutPlanningEvenement === newStartDate && appointment.FinPlanningEvenement === newEndDate && appointment.IdEmploye === newEmployeeId) {
        api?.unlockEvenement(appointment.IdPlanningEvenement).catch((err) => {
          console.error('Erreur lors du déverrouillage du rendez-vous:', err);
        });
        return { success: true, message: 'Aucun changement détecté.' };
      }


      const previousAppointment = saveToHistory ? { ...appointment } : undefined;
      const previousAppointments = appointmentsRef.current.map(app => ({ ...app }));

      const state = timelineStateRef.current;

      // Calcul des intervalles (Jours/Demi-journées)
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

      const applyLocalMove = () => {
        const createdAppointments: Appointment[] = [];

        if (newPriority !== undefined) {
          reorganizePriorities(id, newPriority, newEmployeeId, newStartDate, newEndDate);
          appointment.PlanningEvenementPriorite = newPriority;
        }

        const processIntervals = (startIndex: number, endIndex: number, step: number, mainIndex: number) => {
          const mainDay = days[mainIndex];
          const mainStart = resizeDirection === 'left' ? mainDay.start : newStartDate;
          const mainEnd = resizeDirection === 'right' ? mainDay.end : newEndDate;

          // Déjà validé côté API : on applique localement sans rappel API.
          updateAppointmentBounds(
            {
              id: appointment.IdPlanningEvenement,
              newStartDate: mainStart,
              newEndDate: mainEnd,
              newEmployee: employee,
            },
            false,
            newPriority,
            false
          );

          for (let i = startIndex; i !== endIndex; i += step) {
            const day = days[i];
            const newApp = createAppointment(
              {
                startDate: day.start,
                endDate: day.end,
                employeeId: newEmployeeId,
                ressource: ressource,
                priority: newPriority !== undefined ? newPriority + 1 : (appointment.PlanningEvenementPriorite ?? 0) + 1,
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

        onUpdate();
      };

      applyLocalMove();

      if (!api?.updateEvenement) {
        return { success: true };
      }

      const payload = {
        DebutPlanningEvenement: newStartDate,
        FinPlanningEvenement: newEndDate,
        Type: employee.Type,
        IdEmploye: newEmployeeId,
        IdPlanningRessource: ressource.IdPlanningRessource,
        AnnotationPlanningEvenement: appointment.AnnotationPlanningEvenement,
        PlanningEvenementPriorite: newPriority !== undefined ? newPriority : appointment.PlanningEvenementPriorite,
        IdPlanningEtiquette: appointment.Etiquette?.IdPlanningEtiquette,
      };

      try{
        const resp = await api.updateEvenement(String(id), payload);
        if (!isApiSuccess(resp)) {
          appointmentsRef.current = previousAppointments;
          onUpdate();
          onLockedError(resp?.message);

          return { success: false, message: resp.message};
        } else 
        
        return { success: true };
      }catch (error) {
        console.error('Erreur réseau updateEvenement', error);
        appointmentsRef.current = previousAppointments;
        onUpdate();
        onLockedError('Impossible de mettre à jour l\'événement sur le serveur. Veuillez réessayer.');
        return { success: false, message: 'Erreur réseau' };
      }
      
      
  }, [appointmentsRef, employees, timelineStateRef, updateAppointmentBounds, createAppointment, saveAppointmentState, onUpdate, reorganizePriorities, api, isApiSuccess]);

  // Sauvegarde depuis le formulaire (Création ou Édition)

  //Ajout de gestion de modification ressource + événement -> faire une route commune qui appelle les deux procédure stockée
  //Séparé la modification d'un événement et la cration d'une ressource pour éviter les problèmes de synchronisation et de logique métier (ex: changement de ressource d'un rdv existant)
  const handleSaveAppointment = useCallback(async (
    appointment: Appointment,
    eventUpdate: Item,
    includeNonWorkingDays: boolean,
    type: 'create' | 'update'
  ): Promise<{ success: boolean; message?: string }> => {
      // Vérifier si l'événement est désactivé (pour les types absence/autre)      
      if ('Actif' in eventUpdate && !eventUpdate.Actif) {
        return { success: false, message: 'Cette rubrique est désactivée.' };
      }

      if (type === 'update' && !api?.updateEvenementAndRessource) {
        return { success: false, message: 'API de mise à jour indisponible.' };
      }
      else if (type === 'create' && !api?.createEvenement) {
        return { success: false, message: 'API de création indisponible.' };
      }

      const employee = employees.find(emp => Number(emp.IdPersonnel) === Number(appointment.IdEmploye));

      try {
        if(eventUpdate.Image?.id === 0){
          let result: { success: boolean; id?: number; message?: string } = { success: true };

          const imageBase64 = eventUpdate.Image.image;

          result = await addImage(imageBase64)

          if(!result.success || !result.id) {
            return { success: false, message: result.message || 'Erreur lors de l\'ajout de l\'image.' };
          }
          eventUpdate.Image.id = result.id;
            
        }
        console.log('handleSaveAppointment called with:', eventUpdate);
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
            IdImage: eventUpdate.Image?.id,
          },
        };

        const apiResp = type === 'update'
          ? await api!.updateEvenementAndRessource!(String(appointment.IdPlanningEvenement), payload)
          : await api!.createEvenement!({
              ...payload,
              IdPlanningEvenement: appointment.IdPlanningEvenement,
            });

        if (!isApiSuccess(apiResp)) {
          const apiMessage = apiResp?.message || 'Le serveur a refusé la sauvegarde.';
          return { success: false, message: apiMessage };
        }

        const apiResources = Array.isArray(apiResp?.data?.ressources) ? apiResp.data.ressources : [];
        addMissingResourcesToCache(apiResources);

        const days = getWorkedDayIntervals(
          appointment.DebutPlanningEvenement,
          appointment.FinPlanningEvenement,
          timelineState.isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          includeNonWorkingDays || !timelineState.isDisplayWeekend,
          timelineState.includeWeekend || !timelineState.isDisplayWeekend,
          timelineState.nonWorkingDates
        );


        let previousAppointment: Appointment | undefined;
        if (type === 'update') {
          previousAppointment = appointmentsRef.current.find(app => app.IdPlanningEvenement === appointment.IdPlanningEvenement);
        }

        const createdAppointments: Appointment[] = [];

        const createExtraAppointments = (fromIndex = 1) => {
          days.slice(fromIndex).forEach(day => {
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
          });
        };

        if (type === 'update') {
          updateAppointmentBounds(
            {
              id: appointment.IdPlanningEvenement,
              newStartDate: days[0].start,
              newEndDate: days[0].end,
              newEmployee: employee,
              annotation: appointment.AnnotationPlanningEvenement,
              Etiquette: appointment.Etiquette,
            },
            false,
            appointment.PlanningEvenementPriorite,
            false
          );

          eventsRef.current[Number(eventUpdate.IdPlanningRessource)] = {
              ...eventsRef.current[Number(eventUpdate.IdPlanningRessource)],
              CouleurFondPlanningRessource: eventUpdate.CouleurFondPlanningRessource,
              CouleurBordurePlanningRessource: eventUpdate.CouleurBordurePlanningRessource,
              CouleurTextePlanningRessource: eventUpdate.CouleurTextePlanningRessource,
              Image: eventUpdate.Image,
          };

          reorganizePriorities(
            appointment.IdPlanningEvenement,
            appointment.PlanningEvenementPriorite ?? 0,
            appointment.IdEmploye as number,
            days[0].start,
            days[0].end
          );          

          if (days.length > 1) {
            createExtraAppointments(1);
          }
          onUpdate();
        } else {
          const createdMain = createAppointment(
            {
              startDate: days[0].start,
              endDate: days[0].end,
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
              appointmentsRef.current = appointmentsRef.current.map(app =>
                app.IdPlanningEvenement === createdMain.IdPlanningEvenement
                  ? {
                      ...app,
                      IdPlanningEvenement: apiCreated.IdPlanningEvenement,
                    }
                  : app
              );
            }
            saveAppointmentState(createdMain, 'create');
          }

          if (days.length > 1) {
            createExtraAppointments(1);
          }
          onUpdate();
        }

        if (type === 'update' && previousAppointment) {
          const updatedAppointment = appointmentsRef.current.find(app => app.IdPlanningEvenement === appointment.IdPlanningEvenement);
          if (updatedAppointment) {
            if (createdAppointments.length > 0) {
              saveAppointmentState(updatedAppointment, 'resize_split', previousAppointment, createdAppointments);
            } else {
              saveAppointmentState(updatedAppointment, 'update', previousAppointment);
            }
          }
        }

        return { success: true };
      } catch (error) {
        console.error('Erreur réseau handleSaveAppointment', error);
        return { success: false, message: 'Impossible de sauvegarder l\'événement sur le serveur.' };
      }
  }, [appointmentsRef, eventsRef, timelineState, createAppointment, saveAppointmentState, onUpdate, api, isApiSuccess, updateAppointmentBounds, reorganizePriorities, addMissingResourcesToCache]);

  
  // --- ACTIONS UTILISATEUR (Delete, Divide, Repeat, Extend) ---

  const handleDeleteAppointmentConfirm = useCallback((appointmentToDelete?: Appointment) => {
    // Utiliser le paramètre ou le state
    const appointment = appointmentToDelete || selectedAppointment;
    const id = appointment?.IdPlanningEvenement;
    
    if (!id) return;

    setAlertState({
      isVisible: true,
      title: "Êtes-vous sûr de vouloir supprimer ce rendez-vous ?",
      onConfirm: () => {
        const appointmentInRef = appointmentsRef.current.find(app => app.IdPlanningEvenement === id);
        if (appointmentInRef) {
          saveAppointmentState(appointmentInRef, 'delete');
        }

        const previousAppointments = appointmentsRef.current.map(app => ({ ...app }));
        appointmentsRef.current = appointmentsRef.current.filter((app) => app.IdPlanningEvenement !== id);
        onUpdate();

        if (api?.deleteEvenement) {
          void api.deleteEvenement(String(id))
            .then((resp) => {
              if (isApiSuccess(resp)) {
                return;
              }

              appointmentsRef.current = previousAppointments;
              onUpdate();
            })
            .catch((err) => {
              console.error('Erreur réseau deleteEvenement', err);
              appointmentsRef.current = previousAppointments;
              onUpdate();
            });
        }

        setIsModalOpen(false);
        setSelectedAppointment(null);
        setAlertState(prev => ({ ...prev, isVisible: false }));
      },
      onCancel: () => {
        api?.unlockEvenement(id).catch((err) => {
          console.error('Erreur lors du déverrouillage du rendez-vous:', err);
        });
        setAlertState(prev => ({ ...prev, isVisible: false }));
      },
      fetchToLockAppointment: () => api?.lockEvenement(id),
    });
  }, [selectedAppointment, appointmentsRef, saveAppointmentState, onUpdate, api, isApiSuccess]);

  const handleDivideAppointment = useCallback(async (appointment: Appointment) => {
    const id = appointment.IdPlanningEvenement;


    const previousAppointments = { ...appointmentsRef.current };
    const originalAppointment = { ...appointment };
    const { DebutPlanningEvenement: startDate, FinPlanningEvenement: endDate, IdEmploye: employeeId } = appointment;

    // 1. On liste tous les jours de l'intervalle
    const allDates = eachDayOfInterval({ start: startDate, end: endDate });

    // 2. On FILTRE pour ne garder que les jours "travaillés" (on exclut les week-ends si nécessaire)
    const validDates = allDates.filter(date => {
        const isWknd = isWeekend(date.getTime()); // ou date (selon comment est faite ta fonction isWeekend)
        const skipWeekend = !timelineState.isDisplayWeekend && !timelineState.includeWeekend;
        return !(isWknd && skipWeekend);
    });

    // 3. On calcule le nombre d'intervalles par jour (1 pour FullDay, 2 pour Demi-journée)
    const intervalsPerDay = timelineState.isFullDay ? 1 : 2;
    const totalIntervals = validDates.length * intervalsPerDay;

    // 4. On trouve l'intervalle du milieu
    const halfIntervals = Math.floor(totalIntervals / 2);

    // 5. On déduit l'index du jour dans notre tableau filtré
    const splitDayIndex = Math.floor(halfIntervals / intervalsPerDay);
    const splitDateObj = validDates[splitDayIndex];

    // 6. On convertit en timestamp
    let splitDate = splitDateObj.getTime();

    // 7. Si on est en demi-journée et que la coupure tombe l'après-midi, on rajoute 12h
    if (!timelineState.isFullDay && (halfIntervals % 2 !== 0)) {
        splitDate += (12 * 60 * 60 * 1000); // Ajoute 12 heures en millisecondes
    }

    const employee = employees.find(emp => Number(emp.IdPersonnel) === Number(employeeId));

    const ressource = eventsRef.current[Number(appointment.IdPlanningRessource)];

    if (!employee || !ressource) {
      return;
    }

    console.log(new Date(splitDate).toLocaleString(), 'Date de coupure calculée pour la division du rendez-vous');
  

    // 1. Redimensionner l'original
    updateAppointmentBounds(
      {
        id: appointment.IdPlanningEvenement,
        newStartDate: startDate,
        newEndDate: splitDate,
        newEmployee: employee,
      },
      false,
      appointment.PlanningEvenementPriorite,
      false
    );
    
    // 2. Créer le nouveau
    const newAppointment = createAppointment(
      {
        startDate: splitDate,
        endDate,
        employeeId: employee?.IdPersonnel as number,
        ressource: ressource,
        priority: appointment.PlanningEvenementPriorite ?? 0,
      },
      false,
      appointment.AnnotationPlanningEvenement,
      false
    );
    
    if (!newAppointment) {
      appointmentsRef.current = previousAppointments;
      onUpdate();
      return;
    }

    onUpdate();


    await api?.divideEvenement?.(String(id), {
      DateCoupure: splitDate,
    }).then((resp) => {
      if (isApiSuccess(resp)) {
        const newid = resp?.data?.NouvelIdEvenement;

        if (newid) {
          appointmentsRef.current = appointmentsRef.current.map(app => 
            app.IdPlanningEvenement === -1 ? { ...app, IdPlanningEvenement: newid } : app
          );
        }

        //notificationService.appointmentUpdated();
        return;
      }
      appointmentsRef.current = previousAppointments;
      onUpdate();
    })
    .catch((err) => {
      console.error('Erreur réseau divideEvenement', err);
      appointmentsRef.current = previousAppointments;
      onUpdate();
    });
    

    // // 3. Sauvegarder l'action complète
    
    
    const modifiedOriginal = appointmentsRef.current.find(app => app.IdPlanningEvenement === id);
    if (modifiedOriginal) {
      saveAppointmentState(originalAppointment, 'resize_split', originalAppointment, [newAppointment]);
    }

    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, [appointmentsRef, timelineState, updateAppointmentBounds, saveAppointmentState, onUpdate, createAppointment]);

  const handleDivideConfirm = useCallback( async (appointment: Appointment) => {
      setAlertState({
          isVisible: true,
          title: "Êtes-vous sûr de vouloir diviser ce rendez-vous ?",
          onConfirm: () => {
              handleDivideAppointment(appointment);
              setAlertState(prev => ({ ...prev, isVisible: false }));
          },
          onCancel: () => {
            api?.unlockEvenement(appointment.IdPlanningEvenement).catch((err) => {
              console.error('Erreur lors du déverrouillage du rendez-vous:', err);
            });
            setAlertState(prev => ({ ...prev, isVisible: false }));
          },
          fetchToLockAppointment: () => api?.lockEvenement(appointment.IdPlanningEvenement),
      });
  }, [selectedAppointment, handleDivideAppointment]);

  const handleRepeat = useCallback(async (): Promise<ActionResult> => {
    if (!repeatData || !selectedAppointment) {
      return { success: false, message: 'Aucun rendez-vous sélectionné pour la répétition.' };
    }
    

    const { repeatCount, endDate, repeatInterval, numberCount } = repeatData;
    
    const newAppointments = appointmentUtils.createRepeatedAppointments({
      appointment: selectedAppointment,
      repeatInterval,
      repeatCount: repeatCount ?? 0,
      endDate: endDate ?? undefined,
      numberCount: numberCount,
      isFullDay: timelineState.isFullDay,
      nonWorkingDates: timelineState.nonWorkingDates,
      includeWeekend: timelineState.includeWeekend,
      includeNonWorkingDays: timelineState.respectNonWorkingDays,
    });
    
    const payloads = {
      IdPlanningEvenement: Number(selectedAppointment.IdPlanningEvenement),
      Type: employees.find(emp => Number(emp.IdPersonnel) === Number(selectedAppointment.IdEmploye))?.Type,
      IdEmploye: Number(selectedAppointment.IdEmploye),
      IdPlanningRessource: Number(selectedAppointment.IdPlanningRessource),
      AnnotationPlanningEvenement: selectedAppointment.AnnotationPlanningEvenement,
      Date: newAppointments.map(app => {
        return {
          DebutPlanningEvenement: app.DebutPlanningEvenement,
          FinPlanningEvenement: app.FinPlanningEvenement,
        }
      }),
    }
     
    const previousAppointments = appointmentsRef.current.map(app => ({ ...app }));

    if (!api?.repeatEvenement) {
      const message = 'API de répétition indisponible.';
      return { success: false, message };
    }

    const result = await api.repeatEvenement(payloads)
    .then((resp) => {
      console.log('repeatEvenement response:', resp);
      if (isApiSuccess(resp)) {
        console.log('repeatEvenement success:', resp);
        const createdIds = resp?.data;
        if (Array.isArray(createdIds) && createdIds.length === newAppointments.length) {
          const repeatedAppointments = newAppointments.map((app, index) => ({
            ...app,
            IdPlanningEvenement: Number(createdIds[index]),
          }));
          appointmentsRef.current = [...appointmentsRef.current, ...repeatedAppointments];
    
          console.log('Rendez-vous répétés créés localement:', repeatedAppointments);
          onUpdate();
          return { success: true } as ActionResult;
        }

        const message = 'Réponse serveur invalide lors de la répétition.';
        return { success: false, message } as ActionResult;
      }else {
        appointmentsRef.current = previousAppointments;
        onUpdate();
        const message = 'Le serveur a refusé la création des rendez-vous répétés.';
        return { success: false, message } as ActionResult;
      }
    })
    .catch((err) => {      
      console.error('Erreur réseau repeatEvenement', err);
      appointmentsRef.current = previousAppointments;
      onUpdate();
      const message = 'Impossible de créer les rendez-vous répétés sur le serveur';
      return { success: false, message } as ActionResult;
    });

    if (!result.success) {
      return result;
    }
    onUpdate();
    setRepeatData(null);
    return { success: true };
  }, [repeatData, selectedAppointment, appointmentUtils, timelineState, appointmentsRef, onUpdate]);

  const handleExtend = useCallback(async (): Promise<ActionResult> => {
    if (!extendData || !selectedAppointment) {
      return { success: false, message: 'Aucun rendez-vous sélectionné pour la prolongation.' };
    }

    const ressource = eventsRef.current[Number(selectedAppointment.IdPlanningRessource)];
    if (!ressource) {
      return { success: false, message: 'Ressource introuvable. Le rendez-vous ne peut pas être étendu.' };
    }
    
    const result = await moveAppointment({
      id: selectedAppointment.IdPlanningEvenement,
      newStartDate: selectedAppointment.DebutPlanningEvenement,
      newEndDate: extendData,
      newEmployeeId: selectedAppointment.IdEmploye as number,
      idRessource: ressource.IdPlanningRessource,
      resizeDirection: selectedAppointment.FinPlanningEvenement < extendData ? 'right' : 'left',
    });

    if (!result.success) {
      return result;
    }

    setExtendData(null);
    return { success: true };
  }, [extendData, selectedAppointment, moveAppointment]);

  // --- INTERACTION EXTERNE (Drag & Drop, Search) ---

  const createAppointmentFromDrag = useCallback(
    async (item: Item, date: number, intervalName: "morning" | "afternoon" | "day", employeeId: number, priority: number) => {
      
      const startHour = intervalName === "day" ? DAY_INTERVALS[0].startHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].startHour : HALF_DAY_INTERVALS[1].startHour;
      const endHour = intervalName === "day" ? DAY_INTERVALS[0].endHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].endHour : HALF_DAY_INTERVALS[1].endHour;
      

      const startDate =  new Date(date).setHours(startHour, 0, 0, 0);
      const endDate = new Date(date).setHours(endHour);      

      // Crée un RDV localement (avec id temporaire). La logique de createAppointment
      // va déclencher l'appel API en arrière-plan et mettre à jour l'ID lorsque la
      // réponse serveur sera reçue.
      createAppointment(
        {
          startDate,
          endDate,
          employeeId,
          ressource: item,
          priority,
        },
        true,
      );

      setIsSearchOverlayOpen(false);
      setDimensionsSearchInput('');
    },
    [createAppointment, setIsSearchOverlayOpen, setDimensionsSearchInput]
  );

  const handleSearchItemAction = useCallback((event: Item) => {
      if(!selectedCell) return;
      
      // Vérifier si l'événement est désactivé (pour les types absence/autre)
      if ('actif' in event && !event.actif) {
        return;
      }  
      createAppointment(
        {
          startDate: selectedCell.date,
          endDate: selectedCell.date + (timelineState.isFullDay ? 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 : 11 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000),
          employeeId: selectedCell.employeeId,
          ressource: event,
          priority: 0, // Valeur par défaut, à remplacer si nécessaire
        },
        true,
      );
  }, [selectedCell, timelineState.isFullDay, handleSaveAppointment, employees]);

  // --- PRESSE-PAPIER ---

  const copyAppointmentToClipboard = useCallback((app: Appointment) => {
    if (app) {
      clipboardAppointment.current = app;
      return clipboardAppointment.current;
    } 
    return null;
  }, [appointmentUtils]);

  const pasteAppointment = useCallback( async (targetCell?: { employeeId: number; date: number } | null) => {
    const cell = targetCell || selectedCell;
    if (!clipboardAppointment.current || !cell) return;

    const a = clipboardAppointment.current;
    const startDate = a.DebutPlanningEvenement;
    const endDate = a.FinPlanningEvenement;
    const diff = endDate - startDate;
    
    const newStartDate = cell.date;
    const newEndDate = newStartDate + diff;
  
    const days = getWorkedDayIntervals(
      newStartDate, 
      newEndDate,
      timelineState.isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      timelineState.respectNonWorkingDays,
      timelineState.includeWeekend,
      timelineState.nonWorkingDates
    );
    
    if (days.length === 0) {
      return;
    }

    const payload = {
      DebutPlanningEvenement: cell.date,
      FinPlanningEvenement: cell.date + (a.FinPlanningEvenement - a.DebutPlanningEvenement),
      Type: employees.find(emp => Number(emp.IdPersonnel) === Number(cell.employeeId))?.Type,
      IdEmploye: cell.employeeId,
      AnnotationPlanningEvenement: a.AnnotationPlanningEvenement,
      IdPlanningRessource: a.IdPlanningRessource,
    };

    if (!api?.createEvenement) {
      return;
    }

    
    await api.createEvenement({ ...payload })
    .then((resp) => {;
      console.log('Response from createEvenement:', resp);
    if (!isApiSuccess(resp)) {
      const apiMessage = resp?.message || 'Le serveur a refusé la création du rendez-vous.';
      return;
    }

    const apiData = resp?.data;
    const apiResources = Array.isArray(apiData?.ressources) ? apiData.ressources : [];
    addMissingResourcesToCache(apiResources);

    const responseAppointments = Array.isArray(apiData?.appointments)
      ? apiData.appointments
      : Array.isArray(resp?.data)
        ? resp.data
        : (apiData ? [apiData] : []);

    const createdAppointments: Appointment[] = responseAppointments
      .filter((app: any) => app && typeof app === 'object')
      .map((app: any) => ({
        ...app,
        IdPlanningEvenement: Number(app.IdPlanningEvenement),
        DebutPlanningEvenement: app.DebutPlanningEvenement ?? payload.DebutPlanningEvenement,
        FinPlanningEvenement: app.FinPlanningEvenement ?? payload.FinPlanningEvenement,
        IdEmploye: Number(app.IdEmploye ?? payload.IdEmploye),
        IdPlanningRessource: Number(app.IdPlanningRessource ?? payload.IdPlanningRessource),
        AnnotationPlanningEvenement: app.AnnotationPlanningEvenement ?? a.AnnotationPlanningEvenement,
      }));

    if (createdAppointments.length === 0) {
      return;
    }

    createdAppointments.forEach((app) => {
      saveAppointmentState(app, 'create');
    });

    appointmentsRef.current = [...appointmentsRef.current, ...createdAppointments];
    onUpdate();
    })
    .catch((err) => {
      console.error('Erreur réseau pasteAppointment/createEvenement', err);
    });
  }, [selectedCell, timelineState, appointmentsRef, onUpdate, api, isApiSuccess, addMissingResourcesToCache]);

  // Handler pour ouvrir la modal d'édition
  const handleOpenEditModal = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setSelectedItem(eventsRef.current[Number(appointment.IdPlanningRessource)] || 
      {
        IdPlanningRessource: -1,
        CodePlanningRessource: '',
        LibellePlanningRessource: '',
        CouleurFondPlanningRessource: '#1E40AF',
        CouleurBordurePlanningRessource: '#1E40AF',
        CouleurTextePlanningRessource: '#FFFFFF',
        Actif: true,
        Etiquettes: [],
        Type: 'Rubrique Perso',
        verrou: false,
        category: '',
        isManual: true  // Ressource manuelle par défaut lors de la création
      }
    );
    setIsModalOpen(true);
  }, []);

  const handleAddManualRessource = useCallback( async (dimension: AutreItem): Promise<{ success: boolean, message?: string }> => {
    // Marquer les Items de type 'Rubrique Perso' comme manuels

    dimension.IdPlanningRessource = Date.now(); // Générer un ID unique temporaire
    const newItem = dimension.Type === 'Rubrique Perso' 
      ? { ...dimension, isManual: true } 
      : dimension;
    eventsRef.current[Number(dimension.IdPlanningRessource)] = newItem;

    try {
      if(dimension.Image?.id === 0){
        let result: { success: boolean; id?: number; message?: string } = { success: true };

        const imageBase64 = dimension.Image.image;

        result = await addImage(imageBase64)

        if(!result.success || !result.id) {
          return { success: false, message: result.message || 'Erreur lors de l\'ajout de l\'image.' };
        }
        dimension.Image.id = result.id;
          
      }

      const apiPayload = {
        CodePlanningRessource: dimension.CodePlanningRessource,
        LibellePlanningRessource: dimension.LibellePlanningRessource,
        CouleurFondPlanningRessource: dimension.CouleurFondPlanningRessource,
        CouleurBordurePlanningRessource: dimension.CouleurBordurePlanningRessource,
        CouleurTextePlanningRessource: dimension.CouleurTextePlanningRessource,
        Actif: dimension.Actif,
        IdPlanningImage: dimension.Image?.id,
      };
      const result = await ressourceService.addRessourceManual(apiPayload);
      console.log('Résultat de l\'ajout de ressource', result);
      if (isApiSuccess(result) && result.data) {
        const newId = result.data;
        // Mettre à jour l'ID de la ressource dans le cache et tous les rendez-vous qui l'utilisent
        const oldId = dimension.IdPlanningRessource;
        if (oldId !== newId) {
          // Mettre à jour la ressource dans le cache
          eventsRef.current[Number(newId)] = {
            ...eventsRef.current[Number(oldId)],
            IdPlanningRessource: newId,
          };
          delete eventsRef.current[Number(oldId)];
        }
        console.log('Ressource ajoutée avec succès, ID:', newId);
      } else {
        const message = result?.message || 'Le serveur a refusé l\'ajout de la ressource.';
          // Nettoyer la ressource ajoutée localement en cas d'échec
        delete eventsRef.current[Number(dimension.IdPlanningRessource)];
        return { success: false, message: message };
      }
    } catch (error) {
      console.error('Erreur réseau lors de l\'ajout de la ressource', error);
      return { success: false, message: error instanceof Error ? error.message : 'Erreur inconnue' };
    }

    console.log('Ressource ajoutée avec succès');
    
    setIsModalOpen(false);
    onUpdate();
    return { success: true };
  }, []);


  const handleEditRessource = useCallback(async (dimension: Item): Promise<{ success: boolean, message?: string }> => {
    try{

      if(dimension.Image?.id === 0){
        let result: { success: boolean; id?: number; message?: string } = { success: true };

        const imageBase64 = dimension.Image.image;

        result = await addImage(imageBase64)

        if(!result.success || !result.id) {
          return { success: false, message: result.message || 'Erreur lors de l\'ajout de l\'image.' };
        }
        dimension.Image.id = result.id;
          
      }

      const apiPayload = {
        CouleurFondPlanningRessource: dimension.CouleurFondPlanningRessource,
        CouleurBordurePlanningRessource: dimension.CouleurBordurePlanningRessource,
        CouleurTextePlanningRessource: dimension.CouleurTextePlanningRessource,
        ...(dimension.Type === 'Rubrique Perso' ? 
          { 
            CodePlanningRessource: dimension.CodePlanningRessource,
            LibellePlanningRessource: dimension.LibellePlanningRessource,
            Actif: dimension.Actif,
          } : {}),
        IdPlanningImage: dimension.Image?.id,
      };
      const result = await ressourceService.editRessource(dimension.IdPlanningRessource, apiPayload);
      console.log('Résultat de la modification de ressource', result);
      if (!isApiSuccess(result)) {
        const message = result?.message || 'Le serveur a refusé la modification de la ressource.';
        return { success: false, message };
      }     }
    catch(error){
      console.error('Erreur réseau lors de la modification de la ressource', error);
      return { success: false, message: 'Erreur réseau' };
    }

    setIsModalOpen(false);
    onUpdate();
    return { success: true };
  }, []);

  const handleDeleteManualRessource = useCallback((dimensionId: number, forceDelete: boolean = false) => {
    
    // Vérifier si la rubrique est utilisée dans le planning
    const isUsedInPlanning = appointmentsRef.current.some(
      appointment => appointment.IdPlanningRessource === dimensionId
    );
    
    

    if (isUsedInPlanning && !forceDelete) {
      // Retourner un objet indiquant qu'une confirmation est nécessaire
      return {
        success: false,
        requiresConfirmation: true,
        isUsedInPlanning: true,
        message: 'Cette rubrique est utilisée dans le planning.'
      };
    }

    if (forceDelete) {

      console.log("oui on force delete");
      
      // Suppression forcée : supprimer la rubrique et tous les RDV associés
      delete eventsRef.current[Number(dimensionId)];
      appointmentsRef.current = appointmentsRef.current.filter(
        appointment => appointment.IdPlanningRessource !== dimensionId
      );
    } else {
      return {
        success: false,
        requiresConfirmation: true,
        isUsedInPlanning: false,
        message: 'Cette rubrique n\'est pas utilisée dans le planning. Voulez-vous la supprimer ?'
      };
    }

    onUpdate();
    return {
      success: true,
      requiresConfirmation: false,
      isUsedInPlanning: false,
      message: 'Rubrique supprimée avec succès.'
    };
  }, []);

  const handleDeactivateDimension = useCallback((dimensionId: number) => {
    // Désactiver la rubrique au lieu de la supprimer
    eventsRef.current[Number(dimensionId)] = {
      ...eventsRef.current[Number(dimensionId)],
      Actif: false
    } as Item;
    onUpdate();
    return {
      success: true,
      message: 'Rubrique désactivée avec succès. Elle reste visible mais ne peut plus être utilisée.'
    };
  }, []);


  const addImage = useCallback(async (base64String: string, filename?: string): Promise<{ success: boolean; id?: number; message?: string }> => {
    try {
        const result = await imageService.uploadImage(base64String)
        if (result.success && result.id) {
          return { success: true, id: result.id };
        } else {
          onLockedError(result.message || 'Erreur lors de l\'upload de l\'image.');
          console.error('Erreur lors de l\'upload de l\'image:', result.message);
          return { success: false, message: 'Erreur lors de l\'upload de l\'image.' };
        }
    }catch (error) {
      console.error('Erreur lors de l\'upload de l\'image:', error);
      return { success: false, message: 'Erreur lors de l\'upload de l\'image.' };
    }
  }, []);


  return {
    // États exposés
    selectedAppointment, setSelectedAppointment,
    selectedCell, setSelectedCell,
    isModalOpen, setIsModalOpen,
    repeatData, setRepeatData,
    extendData, setExtendData,
    alertState, setAlertState,
    newAppointmentInfo, setNewAppointmentInfo,
    selectedItem, setSelectedItem,
    selectedEmployee, setSelectedEmployee,
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

    // Actions Spécifiques
    handleDeleteAppointmentConfirm,
    handleDivideConfirm,
    handleRepeat,
    handleExtend,
    handleSearchItemAction,
    
    // Utils
    undoLastAction,
    copyAppointmentToClipboard,
    pasteAppointment
  };
};


async function base64ToFile(base64String: string, filename: string): Promise<File> {
  const res = await fetch(base64String);
  const blob = await res.blob();
  
  // On retourne un vrai objet File, prêt à être mis dans un FormData
  return new File([blob], filename, { type: blob.type });
}