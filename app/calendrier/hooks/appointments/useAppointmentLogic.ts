import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { addHours, eachDayOfInterval } from "date-fns";
import { Appointment, User, HistoryAction, Item, Tag, AutreItem } from '../../types';
import { createAppointmentUtils } from '../../utils/appointmentUtils';
import { notificationService } from "../../services";
import { getWorkedDayIntervals, isWeekend } from "../../utils/dates";
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from "../../utils/constants";
import { on } from 'events';
import ressourceService from '@/app/service/ressource.service';

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
  api?: {
    createEvenement: (data: any) => Promise<any>;
    updateEvenement: (id: string, data: any) => Promise<any>;
    deleteEvenement: (id: string) => Promise<any>;
    updateEvenementAndRessource: (id: string, data: any) => Promise<any>;
    divideEvenement: (id: string, data: any) => Promise<any>;
    repeatEvenement: (data: any) => Promise<any>;
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
}: LogicProps) => {
  
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
  }>({
    isVisible: false,
    title: "",
    onConfirm: () => {},
  });

  const isApiSuccess = useCallback((resp: any) => {
    return !!resp && (resp.error === 0 || typeof resp.error === 'undefined');
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

  const undoLastAction = useCallback(() => {    
    if (history.current.length === 0) {
      notificationService.warning('Aucune action', 'Aucune action à annuler');
      return;
    }

    const lastAction = history.current.pop();
    if (!lastAction) return;

    switch (lastAction.type) {
      case 'create':
        // Annuler une création = supprimer le rendez-vous
        if (lastAction.appointment) {
          appointmentsRef.current = appointmentsRef.current.filter(app => app.IdPlanningEvenement !== lastAction.appointment!.IdPlanningEvenement);
          notificationService.undoSuccess('Création');
        }
        break;

      case 'delete':
        // Annuler une suppression = restaurer le rendez-vous
        if (lastAction.appointment) {
          appointmentsRef.current.push({ ...lastAction.appointment });
          notificationService.undoSuccess('Suppression');
        }
        break;

      case 'update':
      case 'move':
        // Annuler une modification/déplacement = restaurer l'ancien état
        if (lastAction.previousAppointment) {
          appointmentsRef.current = appointmentsRef.current.map(app =>
            app.IdPlanningEvenement === lastAction.previousAppointment!.IdPlanningEvenement ? { ...lastAction.previousAppointment! } : app
          );
          notificationService.undoSuccess(lastAction.type === 'move' ? 'Déplacement' : 'Modification');
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
          
          notificationService.undoSuccess('Division');
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
          notificationService.appointmentUpdated();
          return;
        }

        appointmentsRef.current = previousAppointments;
        notificationService.error('Modification annulée', 'Le serveur a refusé la mise à jour.');
      }).catch((err) => {
        console.error('Erreur réseau updateEvenement', err);
        appointmentsRef.current = previousAppointments;
        notificationService.error('Erreur réseau', 'Impossible de mettre à jour l\'événement sur le serveur');
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
        notificationService.error('Création impossible', 'Employé introuvable.');
        return null;
      }


      const payload = {
        AnnotationPlanningEvenement: description || `Nouveau rendez-vous`,
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        IdEmploye: employeeId,
        Type: employee.Type,
        IdPlanningRessource: ressource.IdPlanningRessource,
      };

      const previousAppointments = appointmentsRef.current.map(app => ({ ...app }));
      const localAppointment: Appointment = {
        IdPlanningEvenement: -1, // ID temporaire pour le rendu local
        AnnotationPlanningEvenement: description || `Nouveau rendez-vous`,
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        IdEmploye: employeeId,
        IdPlanningRessource: ressource.IdPlanningRessource,
        PlanningEvenementPriorite: priority,
      };

      appointmentsRef.current.push(localAppointment);

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
            if (resp && resp.error === 0) {
              const apiData = resp?.data;
              const apiResources = Array.isArray(apiData?.ressources) ? apiData.ressources : [];
              
              addMissingResourcesToCache(apiResources);

              const apiCreated = Array.isArray(apiData?.appointments)
                ? apiData.appointments[0]
                : Array.isArray(resp.data)
                  ? resp.data[0]
                  : resp.data;

              if (!apiCreated) {
                notificationService.error('Erreur création', 'Réponse serveur invalide.');
                return;
              }

              appointmentsRef.current = appointmentsRef.current.map((app) =>{
                if (Number(app.IdPlanningEvenement) === Number(-1)) {
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

            appointmentsRef.current = previousAppointments;
            notificationService.error('Erreur création', 'Le serveur n\'a pas créé l\'événement.');
          } catch (e) {
            console.error('Erreur traitement réponse createEvenement', e);
            appointmentsRef.current = previousAppointments;
            onUpdate();
            notificationService.error('Erreur création', 'Impossible de finaliser la création. Les modifications ont été annulées.');
          }
        })
        .catch((err) => {
          console.error('Erreur réseau createEvenement', err);
          appointmentsRef.current = previousAppointments;
          notificationService.error('Erreur réseau', 'Impossible de créer l\'événement sur le serveur');
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
      const appointment = appointmentsRef.current.find((app) => app.IdPlanningEvenement === id);
      if (!appointment) {
        return { success: false, message: 'Rendez-vous introuvable.' };
      }
      const employee = employees.find(emp => Number(emp.IdPersonnel) === Number(newEmployeeId));
      if (!employee) {
        notificationService.error('Action interdite', 'Employé introuvable. Le rendez-vous ne peut pas être déplacé.');
        return { success: false, message: 'Employé introuvable.' };
      }

      const ressource = eventsRef.current[Number(idRessource)] ;
      if (!ressource) {
        notificationService.error('Action interdite', 'Ressource introuvable. Le rendez-vous ne peut pas être déplacé.');
        return { success: false, message: 'Ressource introuvable.' };
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

      try {
        const resp = await api.updateEvenement(String(id), payload);
        if (!isApiSuccess(resp)) {
          appointmentsRef.current = previousAppointments;
          onUpdate();
          const message = 'Le serveur a refusé la mise à jour.';
          notificationService.error('Déplacement annulé', message);
          return { success: false, message };
        }

        notificationService.appointmentUpdated();
        return { success: true };
      } catch (err) {
        console.error('Erreur réseau moveAppointment/updateEvenement', err);
        appointmentsRef.current = previousAppointments;
        onUpdate();
        const message = 'Impossible de déplacer l\'événement sur le serveur';
        notificationService.error('Erreur réseau', message);
        return { success: false, message };
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
        notificationService.error('Action interdite', 'Cette rubrique est désactivée et ne peut plus être utilisée pour créer ou modifier des rendez-vous.');
        return { success: false, message: 'Cette rubrique est désactivée.' };
      }

      if (type === 'update' && !api?.updateEvenementAndRessource) {
        notificationService.error('Erreur API', 'Impossible de sauvegarder : API de mise à jour indisponible.');
        return { success: false, message: 'API de mise à jour indisponible.' };
      }
      else if (type === 'create' && !api?.createEvenement) {
        notificationService.error('Erreur API', 'Impossible de sauvegarder : API de création indisponible.');
        return { success: false, message: 'API de création indisponible.' };
      }

      const employee = employees.find(emp => Number(emp.IdPersonnel) === Number(appointment.IdEmploye));

      try {
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
            IdImage: eventUpdate.Image,
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
          notificationService.error('Sauvegarde annulée', apiMessage);
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
        notificationService.error('Erreur réseau', 'Impossible de sauvegarder l\'événement sur le serveur');
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
                notificationService.appointmentDeleted();
                return;
              }

              appointmentsRef.current = previousAppointments;
              onUpdate();
              notificationService.error('Suppression annulée', 'Le serveur a refusé la suppression.');
            })
            .catch((err) => {
              console.error('Erreur réseau deleteEvenement', err);
              appointmentsRef.current = previousAppointments;
              onUpdate();
              notificationService.error('Erreur réseau', 'Impossible de supprimer l\'événement sur le serveur');
            });
        }

        setIsModalOpen(false);
        setSelectedAppointment(null);
        setAlertState(prev => ({ ...prev, isVisible: false }));
      }
    });
  }, [selectedAppointment, appointmentsRef, saveAppointmentState, onUpdate, api, isApiSuccess]);

  const handleDivideAppointment = useCallback(async (appointment: Appointment) => {
    const id = appointment.IdPlanningEvenement;


    const previousAppointments = { ...appointmentsRef.current };
    const originalAppointment = { ...appointment };
    const { DebutPlanningEvenement: startDate, FinPlanningEvenement: endDate, IdEmploye: employeeId } = appointment;
    
    // Calcul du milieu
    let totalDuration = (endDate - startDate) + 1;
    const timeInterval = timelineState.isFullDay 
      ? DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour 
      : HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour;
    
      
    const allDates = eachDayOfInterval({ start: startDate, end: endDate });

    let compteur = 0;
    allDates.forEach(date => {
      if (isWeekend(date.getTime()) && !timelineState.isDisplayWeekend && !timelineState.includeWeekend) {
          compteur++;
      } 
    });

    totalDuration -= (timelineState.isFullDay ? compteur : compteur * 2) * (timeInterval * 60 * 60 * 1000);

    const nbOfIntervals = Math.floor(totalDuration / (timeInterval * 60 * 60 * 1000));
    const splitDate = startDate + (Math.floor(nbOfIntervals / 2) * (timeInterval * 60 * 60 * 1000));

    const employee = employees.find(emp => Number(emp.IdPersonnel) === Number(employeeId));

    const ressource = eventsRef.current[Number(appointment.IdPlanningRessource)];

    if (!employee || !ressource) {
      notificationService.error('Action interdite', 'Employé ou ressource introuvable. Le rendez-vous ne peut pas être divisé.');
      return;
    }
  

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
      notificationService.error('Division annulée', 'Impossible de créer le rendez-vous divisé localement.');
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

        notificationService.appointmentUpdated();
        return;
      }
      appointmentsRef.current = previousAppointments;
      onUpdate();
      notificationService.error('Division annulée', 'Le serveur a refusé la division.');
    })
    .catch((err) => {
      console.error('Erreur réseau divideEvenement', err);
      appointmentsRef.current = previousAppointments;
      onUpdate();
      notificationService.error('Erreur réseau', 'Impossible de diviser l\'événement sur le serveur');
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
          }
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
      notificationService.error('Erreur API', message);
      return { success: false, message };
    }

    const result = await api.repeatEvenement(payloads)
    .then((resp) => {
      if (isApiSuccess(resp)) {
        const createdIds = resp?.data;
        if (Array.isArray(createdIds) && createdIds.length === newAppointments.length) {
            newAppointments.forEach((app, index) => {
              app.IdPlanningEvenement = createdIds[index];
            });
            appointmentsRef.current.push(...newAppointments);
      
          onUpdate();
          return { success: true } as ActionResult;
        }

        const message = 'Réponse serveur invalide lors de la répétition.';
        notificationService.error('Répétition annulée', message);
        return { success: false, message } as ActionResult;
      }else {
        appointmentsRef.current = previousAppointments;
        onUpdate();
        const message = 'Le serveur a refusé la création des rendez-vous répétés.';
        notificationService.error('Répétition annulée', message);
        return { success: false, message } as ActionResult;
      }
    })
    .catch((err) => {      
      console.error('Erreur réseau repeatEvenement', err);
      appointmentsRef.current = previousAppointments;
      onUpdate();
      const message = 'Impossible de créer les rendez-vous répétés sur le serveur';
      notificationService.error('Erreur réseau', message);
      return { success: false, message } as ActionResult;
    });

    if (!result.success) {
      return result;
    }

    notificationService.appointmentRepeated(newAppointments.length);
    setRepeatData(null);
    return { success: true };
  }, [repeatData, selectedAppointment, appointmentUtils, timelineState, appointmentsRef, onUpdate]);

  const handleExtend = useCallback(async (): Promise<ActionResult> => {
    if (!extendData || !selectedAppointment) {
      return { success: false, message: 'Aucun rendez-vous sélectionné pour la prolongation.' };
    }

    const ressource = eventsRef.current[Number(selectedAppointment.IdPlanningRessource)];
    if (!ressource) {
      notificationService.error('Action interdite', 'Ressource introuvable. Le rendez-vous ne peut pas être étendu.');
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
        notificationService.error('Action interdite', `La rubrique "${event.LibellePlanningRessource}" est désactivée et ne peut plus être placée dans le planning.`);
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
      
      // handleSaveAppointment(
      //   {
      //     id:-1,
      //     description: event.LibellePlanningRessource,
      //     startDate: selectedCell.date,
      //     endDate: (timelineState.isFullDay ? addHours(selectedCell.date, 23) : addHours(selectedCell.date, 11)).getTime() + 59 * 60 * 1000 + 59 * 1000,
      //     employeeId: selectedCell.employeeId,
      //     employee: employee as User,
      //     type: (event as any).Type.toLowerCase() as "chantier" | "absence" | "autre",
      //     EventId: event.IdPlanningRessource,
      //   } as Appointment,
        
      //   event as Item,
      //   false
      // );
  }, [selectedCell, timelineState.isFullDay, handleSaveAppointment, employees]);

  // --- PRESSE-PAPIER ---

  const copyAppointmentToClipboard = useCallback((app: Appointment) => {
    if (app) {
      clipboardAppointment.current = app;
      notificationService.info('Rendez-vous copié', 'Le rendez-vous a été copié dans le presse-papier');
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
      notificationService.error('Erreur API', 'API de création indisponible. Le collage est annulé.');
      return;
    }

    
    await api.createEvenement({ ...payload })
    .then((resp) => {;

    if (!isApiSuccess(resp)) {
      const apiMessage = resp?.message || 'Le serveur a refusé la création du rendez-vous.';
      notificationService.error('Création annulée', apiMessage);
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
      notificationService.error('Création annulée', 'Réponse serveur invalide : aucun rendez-vous créé.');
      return;
    }

    createdAppointments.forEach((app) => {
      saveAppointmentState(app, 'create');
    });

    appointmentsRef.current = [...appointmentsRef.current, ...createdAppointments];
    onUpdate();
    notificationService.appointmentCreated(createdAppointments.length);
    })
    .catch((err) => {
      console.error('Erreur réseau pasteAppointment/createEvenement', err);
      notificationService.error('Erreur réseau', 'Impossible de coller le rendez-vous sur le serveur');
    });
  }, [selectedCell, timelineState, appointmentsRef, onUpdate, api, isApiSuccess, addMissingResourcesToCache]);

  // Handler pour ouvrir la modal d'édition
  const handleOpenEditModal = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
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
      const apiPayload = {
        CodePlanningRessource: dimension.CodePlanningRessource,
        LibellePlanningRessource: dimension.LibellePlanningRessource,
        CouleurFondPlanningRessource: dimension.CouleurFondPlanningRessource,
        CouleurBordurePlanningRessource: dimension.CouleurBordurePlanningRessource,
        CouleurTextePlanningRessource: dimension.CouleurTextePlanningRessource,
        Actif: dimension.Actif,
        IdImage: dimension.Image,
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
        notificationService.error('Ajout annulé', message);
          // Nettoyer la ressource ajoutée localement en cas d'échec
        delete eventsRef.current[Number(dimension.IdPlanningRessource)];
        return { success: false, message: message };
      }
    } catch (error) {
      console.error('Erreur réseau lors de l\'ajout de la ressource', error);
      notificationService.error('Erreur réseau', 'Impossible d\'ajouter la ressource sur le serveur');
      return { success: false, message: error instanceof Error ? error.message : 'Erreur inconnue' };
    }

    console.log('Ressource ajoutée avec succès');
    
    setIsModalOpen(false);
    onUpdate();
    return { success: true };
  }, []);

  useEffect(() => {
    console.log('isModalOpen', isModalOpen);
  }, [isModalOpen]);

  const handleEditManualRessource = useCallback((dimension: Item) => {
    eventsRef.current[Number(dimension.IdPlanningRessource)] = {
      ...eventsRef.current[Number(dimension.IdPlanningRessource)],
      ...dimension,
    };
    setIsModalOpen(false);
    onUpdate();
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

  /**
   * Supprime une étiquette de tous les rendez-vous qui l'utilisent
   */
  const removeTagFromAppointments = useCallback((tagId: number) => {
    let updatedCount = 0;
    appointmentsRef.current = appointmentsRef.current.map(app => {
      if (app.Etiquette && app.Etiquette.IdPlanningEtiquette === tagId) {
        updatedCount++;
        return { ...app, Etiquette: undefined };
      }
      return app;
    });
    
    onUpdate();
    notificationService.info(
      'Étiquette supprimée', 
      `L'étiquette a été retirée de ${updatedCount} rendez-vous.`
    );
  }, [onUpdate]);

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
    handleEditManualRessource,
    handleDeleteManualRessource,
    handleDeactivateDimension,
    removeTagFromAppointments,

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