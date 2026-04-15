import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { addHours, eachDayOfInterval } from "date-fns";
import { Appointment, User, HistoryAction, Item } from '../../types';
import { createAppointmentUtils } from '../../utils/appointmentUtils';
import { notificationService } from "../../services";
import { getWorkedDayIntervals, isWeekend } from "../../utils/dates";
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from "../../utils/constants";

// Type pour les données de répétition
export type RepeatData = {
  numberCount: number;
  repeatCount: number | null;
  repeatInterval: "day" | "week" | "month";
  endDate: number | null;
};

interface LogicProps {
  employeesRef: React.MutableRefObject<User[]>;
  appointmentsRef: React.MutableRefObject<Appointment[]>;
  eventsRef: React.MutableRefObject<Item[]>;
  timelineState: {
    isFullDay: boolean;
    isDisplayWeekend: boolean;
    includeWeekend: boolean;
    respectNonWorkingDays: boolean;
    nonWorkingDates: number[];
  };
  onUpdate: () => void; // Callback pour forcer le rafraîchissement de l'UI
  setIsSearchOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDimensionsSearchInput: React.Dispatch<React.SetStateAction<string>>;
  // Méthodes de collaboration optionnelles
  collaboration?: {
    setAppointment: (appointment: Appointment) => void;
    deleteAppointment: (appointmentId: number) => void;
    setAppointments: (appointments: Appointment[]) => void;
  };
  api?: {
    createEvenement?: (data: any) => Promise<any>;
    updateEvenement?: (id: string, data: any) => Promise<any>;
    deleteEvenement?: (id: string) => Promise<any>;
  };
}

export const useAppointmentLogic = ({ 
  employeesRef,
  appointmentsRef, 
  eventsRef, 
  timelineState, 
  onUpdate,
  setIsSearchOverlayOpen,
  setDimensionsSearchInput,
  api,
}: LogicProps) => {
  
  // --- Initialisation des Utilitaires ---
  const appointmentUtils = useMemo(() => createAppointmentUtils(employeesRef.current), []);
  
  // --- Refs pour la persistance hors rendu ---
  const history = useRef<HistoryAction[]>([]);
  const idCounter = useRef(10000);
  const clipboardAppointment = useRef<Appointment | null>(null);
  const timestampCounter = useRef(1000);
  const timelineStateRef = useRef(timelineState);

  useEffect(() => {
    timelineStateRef.current = timelineState;
  }, [timelineState]);



  // --- États UI nécessaires à la logique ---
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentForm, setSelectedAppointmentForm] = useState<Appointment | null>(null);
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
      app.Employee.IdPersonnel === employeeId &&
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
    data: { id: number; newStartDate: number; newEndDate: number; newEmployee?: User },
    saveToHistory: boolean = true,
    newPriority?: number,
    syncWithApi: boolean = true
  ) => {
      const { id, newStartDate, newEndDate, newEmployee } = data;
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
              Employee: newEmployee || app.Employee,
              PlanningEvenementPriorite: newPriority !== undefined ? newPriority : app.PlanningEvenementPriorite,
            }
          : app
      );

      if (newPriority !== undefined && newEmployee) {
        reorganizePriorities(id, newPriority, newEmployee.IdPersonnel, newStartDate, newEndDate);
      }

      onUpdate();

      const updatedAppointment = appointmentsRef.current.find(app => Number(app.IdPlanningEvenement) === Number(id));
      if (!syncWithApi || !updatedAppointment || !api?.updateEvenement) return;

      void api.updateEvenement(String(id), {
        DebutPlanningEvenement: updatedAppointment.DebutPlanningEvenement,
        FinPlanningEvenement: updatedAppointment.FinPlanningEvenement,
        Type: updatedAppointment.Employee.Type,
        IdEmploye: updatedAppointment.Employee.IdPersonnel,
        IdPlanningRessource: updatedAppointment.Ressource.IdPlanningRessource,
        AnnotationPlanningEvenement: updatedAppointment.AnnotationPlanningEvenement,
        PlanningEvenementPriorite: updatedAppointment.PlanningEvenementPriorite,
        IdPlanningEtiquette: updatedAppointment.Etiquette?.IdPlanningEtiquette,
      }).then((resp) => {
        if (isApiSuccess(resp)) {
          notificationService.appointmentUpdated();
          return;
        }

        appointmentsRef.current = previousAppointments;
        onUpdate();
        notificationService.error('Modification annulée', 'Le serveur a refusé la mise à jour.');
      }).catch((err) => {
        console.error('Erreur réseau updateEvenement', err);
        appointmentsRef.current = previousAppointments;
        onUpdate();
        notificationService.error('Erreur réseau', 'Impossible de mettre à jour l\'événement sur le serveur');
      });
  }, [appointmentsRef, onUpdate, saveAppointmentState, api, employeesRef, reorganizePriorities, isApiSuccess]);

  // Création unitaire d'un RDV
  const createAppointment = useCallback((
    data: { startDate: number; endDate: number; employeeId: number; item: Item },
    saveToHistory: boolean = true,
    description?: string,
    syncWithApi: boolean = true
  ): Appointment | null => {
      const { startDate, endDate, employeeId, item } = data;
      const id = ++idCounter.current;

      const employee = employeesRef.current.find(emp => Number(emp.IdPersonnel) === Number(employeeId));
      const ressource = item;

      if (!employee) {
        notificationService.error('Création impossible', 'Employé introuvable.');
        return null;
      }


      const payload = {
        IdPlanningEvenement: id,
        AnnotationPlanningEvenement: description || `Nouveau rendez-vous`,
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        IdEmploye: employeeId,
        Type: employee.Type,
        IdPlanningRessource: item.IdPlanningRessource,
      };

      const previousAppointments = appointmentsRef.current.map(app => ({ ...app }));
      const localAppointment: Appointment = {
        IdPlanningEvenement: id,
        AnnotationPlanningEvenement: description || `Nouveau rendez-vous`,
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        Employee: employee,
        Type: ressource.Type,
        Ressource: ressource,
      };

      appointmentsRef.current.push(localAppointment);
      onUpdate();
      notificationService.appointmentCreated(1);

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
              const apiCreated = Array.isArray(resp.data) ? resp.data[0] : resp.data;
              if (!apiCreated) {
                notificationService.error('Erreur création', 'Réponse serveur invalide.');
                return;
              }

              const createdAppointment: Appointment = {
                ...apiCreated,
                IdPlanningEvenement: apiCreated.IdPlanningEvenement ?? id,
                AnnotationPlanningEvenement: apiCreated.AnnotationPlanningEvenement ?? (description || `Nouveau rendez-vous`),
                DebutPlanningEvenement: apiCreated.DebutPlanningEvenement ?? startDate,
                FinPlanningEvenement: apiCreated.FinPlanningEvenement ?? endDate,
                Employee: apiCreated.Employee ?? employee,
                Ressource: apiCreated.Ressource ?? ressource,
                Type: apiCreated.Type ?? ressource.Type,
              };

              appointmentsRef.current = appointmentsRef.current.map((app) =>
                Number(app.IdPlanningEvenement) === Number(id) ? createdAppointment : app
              );
              onUpdate();
              if (saveToHistory) {
                saveAppointmentState(createdAppointment, 'create');
              }
              return;
            }

            appointmentsRef.current = previousAppointments;
            onUpdate();
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
          onUpdate();
          notificationService.error('Erreur réseau', 'Impossible de créer l\'événement sur le serveur');
        });

      return localAppointment;
    }, [appointmentsRef, onUpdate, saveAppointmentState, api, employeesRef, eventsRef]);

  // --- GESTION DES PRIORITÉS ---

  // --- LOGIQUE MÉTIER COMPLEXE (Move, Split, Save) ---

  const moveAppointment = useCallback((
    data: {
      id: number;
      newStartDate: number;
      newEndDate: number;
      newEmployeeId: number;
      item: Item;
      resizeDirection?: 'left' | 'right';
    },
    saveToHistory: boolean = true,
    newPriority?: number
  ) => {
      const {
        id,
        newStartDate,
        newEndDate,
        newEmployeeId,
        item,
        resizeDirection = 'right',
      } = data;
      const appointment = appointmentsRef.current.find((app) => app.IdPlanningEvenement === id);
      if (!appointment) return;
      const employee = employeesRef.current.find(emp => Number(emp.IdPersonnel) === Number(newEmployeeId));
      if (!employee) {
        notificationService.error('Action interdite', 'Employé introuvable. Le rendez-vous ne peut pas être déplacé.');
        return;
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

      if (days.length === 0) return;

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
                item,
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
        return;
      }

      void api.updateEvenement(String(id), {
        DebutPlanningEvenement: newStartDate,
        FinPlanningEvenement: newEndDate,
        Type: employee.Type,
        IdEmploye: newEmployeeId,
        IdPlanningRessource: item.IdPlanningRessource,
        AnnotationPlanningEvenement: appointment.AnnotationPlanningEvenement,
        PlanningEvenementPriorite: newPriority !== undefined ? newPriority : appointment.PlanningEvenementPriorite,
        IdPlanningEtiquette: appointment.Etiquette?.IdPlanningEtiquette,
      }).then((resp) => {
        if (!isApiSuccess(resp)) {
          appointmentsRef.current = previousAppointments;
          onUpdate();
          notificationService.error('Déplacement annulé', 'Le serveur a refusé la mise à jour.');
          return;
        }

        notificationService.appointmentUpdated();
      }).catch((err) => {
        console.error('Erreur réseau moveAppointment/updateEvenement', err);
        appointmentsRef.current = previousAppointments;
        onUpdate();
        notificationService.error('Erreur réseau', 'Impossible de déplacer l\'événement sur le serveur');
      });
    }, [appointmentsRef, employeesRef, timelineStateRef, updateAppointmentBounds, createAppointment, saveAppointmentState, onUpdate, reorganizePriorities, api, isApiSuccess]);

  // Sauvegarde depuis le formulaire (Création ou Édition)

  //Ajout de gestion de modification ressource + événement -> faire une route commune qui appelle les deux procédure stockée
  //Séparé la modification d'un événement et la cration d'une ressource pour éviter les problèmes de synchronisation et de logique métier (ex: changement de ressource d'un rdv existant)
  const handleSaveAppointment = useCallback(async (
    appointment: Appointment,
    eventUpdate: Item,
    includeNonWorkingDays: boolean
  ): Promise<{ success: boolean; message?: string }> => {
      // Vérifier si l'événement est désactivé (pour les types absence/autre)
      if ('actif' in eventUpdate && !eventUpdate.actif) {
        notificationService.error('Action interdite', 'Cette rubrique est désactivée et ne peut plus être utilisée pour créer ou modifier des rendez-vous.');
        return { success: false, message: 'Cette rubrique est désactivée.' };
      }

      if (appointment.IdPlanningEvenement && !api?.updateEvenement) {
        notificationService.error('Erreur API', 'Impossible de sauvegarder : API de mise à jour indisponible.');
        return { success: false, message: 'API de mise à jour indisponible.' };
      }

      if (!appointment.IdPlanningEvenement && !api?.createEvenement) {
        notificationService.error('Erreur API', 'Impossible de sauvegarder : API de création indisponible.');
        return { success: false, message: 'API de création indisponible.' };
      }

      try {
        const payload = {
          DebutPlanningEvenement: appointment.DebutPlanningEvenement,
          FinPlanningEvenement: appointment.FinPlanningEvenement,
          Type: appointment.Employee.Type,
          IdEmploye: appointment.Employee.IdPersonnel,
          IdPlanningRessource: eventUpdate.IdPlanningRessource,
          AnnotationPlanningEvenement: appointment.AnnotationPlanningEvenement,
          PlanningEvenementPriorite: appointment.PlanningEvenementPriorite,
          IdPlanningEtiquette: appointment.Etiquette?.IdPlanningEtiquette,
        };

        const apiResp = appointment.IdPlanningEvenement
          ? await api!.updateEvenement!(String(appointment.IdPlanningEvenement), payload)
          : await api!.createEvenement!({
              ...payload,
              IdPlanningEvenement: appointment.IdPlanningEvenement,
            });

        if (!isApiSuccess(apiResp)) {
          const apiMessage = apiResp?.message || 'Le serveur a refusé la sauvegarde.';
          notificationService.error('Sauvegarde annulée', apiMessage);
          return { success: false, message: apiMessage };
        }

        // Mise à jour des métadonnées de l'événement global uniquement après validation serveur.
        eventsRef.current = eventsRef.current.map(e =>
          e.IdPlanningRessource === eventUpdate.IdPlanningRessource ? { ...e, ...eventUpdate } : e
        );

        const days = getWorkedDayIntervals(
          appointment.DebutPlanningEvenement,
          appointment.FinPlanningEvenement,
          timelineState.isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
          includeNonWorkingDays || !timelineState.isDisplayWeekend,
          timelineState.includeWeekend || !timelineState.isDisplayWeekend,
          timelineState.nonWorkingDates
        );

        if (days.length === 0) {
          notificationService.warning('Aucune plage valide', 'Aucun créneau travaillé trouvé pour cette période.');
          return { success: false, message: 'Aucun créneau travaillé trouvé pour cette période.' };
        }

        let previousAppointment: Appointment | undefined;
        if (appointment.IdPlanningEvenement) {
          previousAppointment = appointmentsRef.current.find(app => app.IdPlanningEvenement === appointment.IdPlanningEvenement);
        }

        const createdAppointments: Appointment[] = [];

        const createExtraAppointments = (fromIndex = 1) => {
          days.slice(fromIndex).forEach(day => {
            const newApp = createAppointment(
              {
                startDate: day.start,
                endDate: day.end,
                employeeId: appointment.Employee.IdPersonnel as number,
                item: eventUpdate,
              },
              false,
              appointment.AnnotationPlanningEvenement,
              false
            );
            if (newApp) createdAppointments.push(newApp);
          });
        };

        if (appointment.IdPlanningEvenement) {
          updateAppointmentBounds(
            {
              id: appointment.IdPlanningEvenement,
              newStartDate: days[0].start,
              newEndDate: days[0].end,
              newEmployee: appointment.Employee,
            },
            false,
            appointment.PlanningEvenementPriorite,
            false
          );

          appointmentsRef.current = appointmentsRef.current.map(app => {
            if (app.IdPlanningEvenement === appointment.IdPlanningEvenement) {
              return {
                ...app,
                ...appointment,
                DebutPlanningEvenement: days[0].start,
                FinPlanningEvenement: days[0].end,
                Ressource: eventUpdate,
                Type: eventUpdate.Type,
              };
            }
            return app;
          });

          reorganizePriorities(
            appointment.IdPlanningEvenement,
            appointment.PlanningEvenementPriorite ?? 0,
            appointment.Employee.IdPersonnel as number,
            days[0].start,
            days[0].end
          );

          if (days.length > 1) {
            createExtraAppointments(1);
          }
        } else {
          const createdMain = createAppointment(
            {
              startDate: days[0].start,
              endDate: days[0].end,
              employeeId: appointment.Employee.IdPersonnel as number,
              item: eventUpdate,
            },
            false,
            appointment.AnnotationPlanningEvenement,
            false
          );

          if (createdMain) {
            const apiCreated = Array.isArray(apiResp?.data) ? apiResp.data[0] : apiResp?.data;
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
        }

        if (appointment.IdPlanningEvenement && previousAppointment) {
          const updatedAppointment = appointmentsRef.current.find(app => app.IdPlanningEvenement === appointment.IdPlanningEvenement);
          if (updatedAppointment) {
            if (createdAppointments.length > 0) {
              saveAppointmentState(updatedAppointment, 'resize_split', previousAppointment, createdAppointments);
            } else {
              saveAppointmentState(updatedAppointment, 'update', previousAppointment);
            }
          }
        }

        onUpdate();
        return { success: true };
      } catch (error) {
        console.error('Erreur réseau handleSaveAppointment', error);
        notificationService.error('Erreur réseau', 'Impossible de sauvegarder l\'événement sur le serveur');
        return { success: false, message: 'Impossible de sauvegarder l\'événement sur le serveur.' };
      }
  }, [appointmentsRef, eventsRef, timelineState, createAppointment, saveAppointmentState, onUpdate, api, isApiSuccess, updateAppointmentBounds, reorganizePriorities]);

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

  const handleDivideAppointment = useCallback((id?: number) => {
    if (!id) return;
    const appointmentToDivide = appointmentsRef.current.find(app => app.IdPlanningEvenement === id);
    if (!appointmentToDivide) return;

    const originalAppointment = { ...appointmentToDivide };
    const { DebutPlanningEvenement: startDate, FinPlanningEvenement: endDate, Employee: employee } = appointmentToDivide;
    
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
  

    // 1. Redimensionner l'original
    updateAppointmentBounds(
      {
        id,
        newStartDate: startDate,
        newEndDate: splitDate,
        newEmployee: employee,
      },
      false
    );
    
    // 2. Créer le nouveau
    createAppointment(
      {
        startDate: splitDate,
        endDate,
        employeeId: employee.IdPersonnel as number,
        item: appointmentToDivide.Ressource,
      },
      false,
      appointmentToDivide.AnnotationPlanningEvenement,
    );
    // const newAppointmentId = Date.now() + Math.floor(Math.random() * 1000);
    // const newAppointment: Appointment = {
    //   IdPlanningEvenement : newAppointmentId,
    //   AnnotationPlanningEvenement: appointmentToDivide.AnnotationPlanningEvenement,
    //   DebutPlanningEvenement: splitDate,
    //   FinPlanningEvenement: endDate,
    //   Employee: employee,
    //   Type: appointmentToDivide.Type,
    //   Ressource: eventsRef.current.find(e => e.IdPlanningRessource === appointmentToDivide.Ressource.IdPlanningRessource) as Item,
    // };
    // appointmentsRef.current.push(newAppointment);

    // // 3. Sauvegarder l'action complète
    // const modifiedOriginal = appointmentsRef.current.find(app => app.IdPlanningEvenement === id);
    // if (modifiedOriginal) {
    //   saveAppointmentState(originalAppointment, 'resize_split', originalAppointment, [newAppointment]);
    // }

    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, [appointmentsRef, timelineState, updateAppointmentBounds, saveAppointmentState, onUpdate, createAppointment]);

  const handleDivideConfirm = useCallback((appointment: Appointment) => {
      setAlertState({
          isVisible: true,
          title: "Êtes-vous sûr de vouloir diviser ce rendez-vous ?",
          onConfirm: () => {
              handleDivideAppointment(appointment.IdPlanningEvenement);
              setAlertState(prev => ({ ...prev, isVisible: false }));
          }
      });
  }, [selectedAppointment, handleDivideAppointment]);

  const handleRepeat = useCallback(() => {
    if (!repeatData || !selectedAppointment) return;

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

    appointmentsRef.current = [...appointmentsRef.current, ...newAppointments];
    onUpdate();
    notificationService.appointmentRepeated(newAppointments.length);
    setRepeatData(null);
  }, [repeatData, selectedAppointment, appointmentUtils, timelineState, appointmentsRef, onUpdate]);

  const handleExtend = useCallback(() => {
    if (!extendData || !selectedAppointment) return;

    moveAppointment({
      id: selectedAppointment.IdPlanningEvenement,
      newStartDate: selectedAppointment.DebutPlanningEvenement,
      newEndDate: extendData,
      newEmployeeId: selectedAppointment.Employee.IdPersonnel as number,
      item: selectedAppointment.Ressource,
      resizeDirection: selectedAppointment.FinPlanningEvenement < extendData ? 'right' : 'left',
    });

    setExtendData(null);
  }, [extendData, selectedAppointment, moveAppointment]);

  // --- INTERACTION EXTERNE (Drag & Drop, Search) ---

  const createAppointmentFromDrag = useCallback(
    async (item: Item, date: number, intervalName: "morning" | "afternoon" | "day", employeeId: number) => {
      
      const startHour = intervalName === "day" ? DAY_INTERVALS[0].startHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].startHour : HALF_DAY_INTERVALS[1].startHour;
      const endHour = intervalName === "day" ? DAY_INTERVALS[0].endHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].endHour : HALF_DAY_INTERVALS[1].endHour;
      

      const startDate =  new Date(date).setHours(startHour, 0, 0, 0);
      const endDate = new Date(date).setHours(endHour - 1, 59, 59 , 999);      

      // Crée un RDV localement (avec id temporaire). La logique de createAppointment
      // va déclencher l'appel API en arrière-plan et mettre à jour l'ID lorsque la
      // réponse serveur sera reçue.
      createAppointment(
        {
          startDate,
          endDate,
          employeeId,
          item,
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
          item: event,
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
  }, [selectedCell, timelineState.isFullDay, handleSaveAppointment, employeesRef]);

  // --- PRESSE-PAPIER ---

  const copyAppointmentToClipboard = useCallback((app: Appointment) => {
    if (app) {
      clipboardAppointment.current = app;
      notificationService.info('Rendez-vous copié', 'Le rendez-vous a été copié dans le presse-papier');
      return clipboardAppointment.current;
    } 
    return null;
  }, [appointmentUtils]);

  const pasteAppointment = useCallback((targetCell?: { employeeId: number; date: number } | null) => {
    const cell = targetCell || selectedCell;
    if (!clipboardAppointment.current || !cell) return;

    try {
      const newAppointments = appointmentUtils.pasteAppointment({
        clipboardAppointment: clipboardAppointment.current,
        targetCell: cell,
        isFullDay: timelineState.isFullDay,
        nonWorkingDates: timelineState.nonWorkingDates,
        includeWeekend: timelineState.includeWeekend,
        includeNonWorkingDays: timelineState.respectNonWorkingDays,
      });

      newAppointments.forEach(app => {
        saveAppointmentState(app, 'create');
      });
      appointmentsRef.current = [...appointmentsRef.current, ...newAppointments];
      onUpdate();
      notificationService.appointmentCreated(1);
    } catch (error) {
      notificationService.error('Erreur', (error as Error).message);
    }
  }, [appointmentUtils, selectedCell, timelineState, appointmentsRef, onUpdate]);

  // Handler pour ouvrir la modal d'édition
  const handleOpenEditModal = useCallback((appointment: Appointment) => {
    setSelectedAppointmentForm(appointment);
    setSelectedAppointment(appointment);
    setSelectedItem(eventsRef.current.find(e => e.IdPlanningRessource === appointment.Ressource.IdPlanningRessource) || 
      {
        IdPlanningRessource: -1,
        CodePlanningRessource: '',
        LibellePlanningRessource: '',
        CouleurFondPlanningRessource: '#1E40AF',
        CouleurBordurePlanningRessource: '#1E40AF',
        CouleurTextePlanningRessource: '#FFFFFF',
        Actif: true,
        Etiquettes: [],
        Type: 'autre',
        verrou: false,
        category: '',
        isManual: true  // Ressource manuelle par défaut lors de la création
      }
    );
    setIsModalOpen(true);
  }, []);

  const handleAddDimension = useCallback((dimension: Item) => {
    // Marquer les Items de type 'autre' comme manuels

    dimension.IdPlanningRessource = Date.now(); // Générer un ID unique temporaire
    const newItem = dimension.Type === 'autre' 
      ? { ...dimension, isManual: true } 
      : dimension;
    eventsRef.current.push(newItem);
    setIsModalOpen(false);
    onUpdate();
  }, []);

  const handleEditDimension = useCallback((dimension: Item) => {
    eventsRef.current = eventsRef.current.map(e =>
      e.IdPlanningRessource === dimension.IdPlanningRessource ? { ...e, ...dimension } : e
    );
    setIsModalOpen(false);
    onUpdate();
  }, []);

  const handleDeleteDimension = useCallback((dimensionId: number, forceDelete: boolean = false) => {
    
    // Vérifier si la rubrique est utilisée dans le planning
    const isUsedInPlanning = appointmentsRef.current.some(
      appointment => appointment.Ressource.IdPlanningRessource === dimensionId
    );

    console.log("isUsedInPlanning:", isUsedInPlanning);
    console.log(forceDelete);
    
    

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
      eventsRef.current = eventsRef.current.filter(e => e.IdPlanningRessource !== dimensionId);
      appointmentsRef.current = appointmentsRef.current.filter(
        appointment => appointment.Ressource.IdPlanningRessource !== dimensionId
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
    eventsRef.current = eventsRef.current.map(e =>
      e.IdPlanningRessource === dimensionId ? { ...e, actif: false } : e
    );
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
    selectedAppointmentForm, setSelectedAppointmentForm,
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
    handleAddDimension,
    handleEditDimension,
    handleDeleteDimension,
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