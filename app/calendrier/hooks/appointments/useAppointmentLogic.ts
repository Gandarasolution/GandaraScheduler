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
  const onResize = useCallback((id: number, newStartDate: number, newEndDate: number, newEmployeeId?: number, saveToHistory: boolean = true, newPriority?: number, syncWithApi: boolean = true) => {
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
              Employee: employeesRef.current.find(emp => Number(emp.IdPersonnel) === Number(newEmployeeId)) || app.Employee,
              PlanningEvenementPriorite: newPriority !== undefined ? newPriority : app.PlanningEvenementPriorite,
            }
          : app
      );

      if (newPriority !== undefined && newEmployeeId !== undefined) {
        reorganizePriorities(id, newPriority, newEmployeeId, newStartDate, newEndDate);
      }

      onUpdate();

      const updatedAppointment = appointmentsRef.current.find(app => Number(app.IdPlanningEvenement) === Number(id));
      if (!syncWithApi || !updatedAppointment || !api?.updateEvenement) return;

      void api.updateEvenement(String(id), {
        DebutPlanningEvenement: updatedAppointment.DebutPlanningEvenement,
        FinPlanningEvenement: updatedAppointment.FinPlanningEvenement,
        Type: updatedAppointment.Type,
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
    startDate: number, endDate: number, employeeId: number, eventId: number, 
    saveToHistory: boolean = true, description?: string, syncWithApi: boolean = true
  ): Appointment | null => {
      const id = ++idCounter.current;

      const employee = employeesRef.current.find(emp => Number(emp.IdPersonnel) === Number(employeeId));

      if (!employee) {
        notificationService.error('Création impossible', 'Employé introuvable.');
        return null;
      }

      if (employee.Actif === false) {
        notificationService.error('Action interdite', 'L\'employé sélectionné est désactivé et ne peut plus être assigné à un rendez-vous.');
        return null;
      }


      const data = {
        IdPlanningEvenement: id,
        AnnotationPlanningEvenement: description || `Nouveau rendez-vous`,
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        IdEmploye: employeeId,
        Type: employee.Type,
        IdPlanningRessource: eventId,
      };

      const localAppointment: Appointment = {
        IdPlanningEvenement: id,
        AnnotationPlanningEvenement: description || `Nouveau rendez-vous`,
        DebutPlanningEvenement: startDate,
        FinPlanningEvenement: endDate,
        Employee: employee,
        Type: ressource.Type,
        Ressource: ressource,
      };

      // Mode local uniquement : pas de synchronisation BDD.
      if (!syncWithApi || !api?.createEvenement) {
        appointmentsRef.current.push(localAppointment);
        onUpdate();
        notificationService.appointmentCreated(1);
        if (saveToHistory) {
          saveAppointmentState(localAppointment, 'create');
        }
        return localAppointment;
      }

      
      
      api.createEvenement(data)
        .then((resp) => {
          try {
            if (resp && resp.error === 0) {
              const newA = Array.isArray(resp.data) ? resp.data[0] : resp.data;
              if (!newA) {
                notificationService.error('Erreur création', 'Réponse serveur invalide.');
                return;
              }
              appointmentsRef.current.push(newA);
              onUpdate();
              notificationService.appointmentCreated(1);
              if (saveToHistory) {
                saveAppointmentState(newA, 'create');
              }
              return;
            }

            notificationService.error('Erreur création', 'Le serveur n\'a pas créé l\'événement.');
          } catch (e) {
            console.error('Erreur traitement réponse createEvenement', e);
          }
        })
        .catch((err) => {
          console.error('Erreur réseau createEvenement', err);
          notificationService.error('Erreur réseau', 'Impossible de créer l\'événement sur le serveur');
        });

      return localAppointment;
    }, [appointmentsRef, onUpdate, saveAppointmentState, api, employeesRef, eventsRef]);

  // --- GESTION DES PRIORITÉS ---

  // --- LOGIQUE MÉTIER COMPLEXE (Move, Split, Save) ---

  const moveAppointment = useCallback((id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection: 'left' | 'right' = 'right', saveToHistory: boolean = true, newPriority?: number) => {
      const appointment = appointmentsRef.current.find((app) => app.IdPlanningEvenement === id);
      if (!appointment) return;
      if (employeesRef.current.find(emp => emp.IdPersonnel === newEmployeeId)?.Actif === false) {
        notificationService.error('Action interdite', `L'employé sélectionné est désactivé et ne peut plus être assigné à un rendez-vous.`);
        return;
      }

      const previousAppointment = saveToHistory ? { ...appointment } : undefined;

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
          onResize(appointment.IdPlanningEvenement, mainStart, mainEnd, newEmployeeId, false, newPriority, false);

          for (let i = startIndex; i !== endIndex; i += step) {
            const day = days[i];
            const newApp = createAppointment(
              day.start,
              day.end,
              newEmployeeId,
              appointment.Ressource.IdPlanningRessource,
              false,
              appointment.Type,
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

      if (!api?.updateEvenement) {
        applyLocalMove();
        return;
      }

      void api.updateEvenement(String(id), {
        DebutPlanningEvenement: newStartDate,
        FinPlanningEvenement: newEndDate,
        Type: appointment.Type,
        IdEmploye: newEmployeeId,
        IdPlanningRessource: appointment.Ressource.IdPlanningRessource,
        AnnotationPlanningEvenement: appointment.AnnotationPlanningEvenement,
        PlanningEvenementPriorite: newPriority !== undefined ? newPriority : appointment.PlanningEvenementPriorite,
        IdPlanningEtiquette: appointment.Etiquette?.IdPlanningEtiquette,
      }).then((resp) => {
        if (!isApiSuccess(resp)) {
          notificationService.error('Déplacement annulé', 'Le serveur a refusé la mise à jour.');
          return;
        }

        applyLocalMove();
        notificationService.appointmentUpdated();
      }).catch((err) => {
        console.error('Erreur réseau moveAppointment/updateEvenement', err);
        notificationService.error('Erreur réseau', 'Impossible de déplacer l\'événement sur le serveur');
      });
    }, [appointmentsRef, employeesRef, timelineStateRef, onResize, createAppointment, saveAppointmentState, onUpdate, reorganizePriorities, api, isApiSuccess]);

  // Sauvegarde depuis le formulaire (Création ou Édition)
  const handleSaveAppointment = useCallback((appointment: Appointment, eventUpdate: Item, includeNonWorkingDays: boolean) => {    
      // // Vérifier si l'événement est désactivé (pour les types absence/autre)
      // if ('actif' in eventUpdate && !eventUpdate.actif) {
      //   notificationService.error('Action interdite', 'Cette rubrique est désactivée et ne peut plus être utilisée pour créer ou modifier des rendez-vous.');
      //   return;
      // }

      // // Mise à jour des métadonnées de l'événement global
      // eventsRef.current = eventsRef.current.map(e =>
      //   e.IdPlanningRessource === eventUpdate.IdPlanningRessource ? { ...e, ...eventUpdate } : e
      // );            

      // const days = getWorkedDayIntervals(
      //   appointment.DebutPlanningEvenement, 
      //   appointment.FinPlanningEvenement,
      //   timelineState.isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
      //   includeNonWorkingDays || !timelineState.isDisplayWeekend,
      //   timelineState.includeWeekend || !timelineState.isDisplayWeekend,
      //   timelineState.nonWorkingDates
      // );        
            
      // let previousAppointment: Appointment | undefined;
      // if (appointment.IdPlanningEvenement) {
      //   previousAppointment = appointmentsRef.current.find(app => app.IdPlanningEvenement === appointment.IdPlanningEvenement);
      // }
      
      // const createdAppointments: Appointment[] = [];
      
      // // Création des RDV supplémentaires si le créneau s'étend sur plusieurs jours
      // const createExtraAppointments = (fromIndex = 1) => {
      //   days.slice(fromIndex).forEach(day => {          
      //     const newApp = createAppointment(
      //       day.start,
      //       day.end,
      //       appointment.Employee.IdPersonnel as number,
      //       eventUpdate.IdPlanningRessource,
      //       true,
      //       appointment.Type,
      //       appointment.AnnotationPlanningEvenement, 
      //       appointment.PlanningEvenementPriorite
      //     );
      //     if (newApp) createdAppointments.push(newApp);
      //   });
      // };

      // if (appointment.IdPlanningEvenement) {        
      //   // --- MODE ÉDITION ---
      //   if (days.length > 0) {
      //     appointmentsRef.current = appointmentsRef.current.map(app => {
      //       if (app.IdPlanningEvenement === appointment.IdPlanningEvenement) {
      //         return {
      //           ...app,           
      //           ...appointment,   
      //           startDate: days[0].start,
      //           endDate: days[0].end
      //         };   
      //       }
      //       return app;
      //     });
      //     reorganizePriorities(appointment.IdPlanningEvenement, appointment.PlanningEvenementPriorite ?? 0, appointment.Employee.IdPersonnel as number, days[0].start, days[0].end);
          
      //     if (days.length > 1) createExtraAppointments(1);
      //   }
      // } else {
      //   // --- MODE CRÉATION ---
      //   createExtraAppointments(0);
      // }      


      // // Gestion Historique
      // if (appointment.IdPlanningEvenement && previousAppointment) {
      //   const updatedAppointment = appointmentsRef.current.find(app => app.IdPlanningEvenement === appointment.IdPlanningEvenement);
      //   if (updatedAppointment) {
      //     if (createdAppointments.length > 0) {
      //       saveAppointmentState(updatedAppointment, 'resize_split', previousAppointment, createdAppointments);
      //     } else {
      //       saveAppointmentState(updatedAppointment, 'update', previousAppointment);
      //     }
      //   }
      // }      
      
      // onUpdate();
      // setIsModalOpen(false);
      // setSelectedAppointment(null);
      // setNewAppointmentInfo(null);
  }, [appointmentsRef, eventsRef, timelineState, createAppointment, saveAppointmentState, onUpdate]);

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
    onResize(id, startDate, splitDate, employee.IdPersonnel as number, false);
    
    // 2. Créer le nouveau
    createAppointment(
      splitDate,
      endDate,
      employee.IdPersonnel as number,
      appointmentToDivide.Ressource.IdPlanningRessource,
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
  }, [appointmentsRef, timelineState, onResize, saveAppointmentState, onUpdate]);

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

    moveAppointment(
      selectedAppointment.IdPlanningEvenement, 
      selectedAppointment.DebutPlanningEvenement, 
      extendData, 
      selectedAppointment.Employee.IdPersonnel as number,
      selectedAppointment.FinPlanningEvenement < extendData ? 'right' : 'left'
    );

    setExtendData(null);
  }, [extendData, selectedAppointment, moveAppointment]);

  // --- INTERACTION EXTERNE (Drag & Drop, Search) ---

  const createAppointmentFromDrag = useCallback(
    async (id: number, date: number, intervalName: "morning" | "afternoon" | "day", employeeId: number) => {
      const startHour = intervalName === "day" ? DAY_INTERVALS[0].startHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].startHour : HALF_DAY_INTERVALS[1].startHour;
      const endHour = intervalName === "day" ? DAY_INTERVALS[0].endHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].endHour : HALF_DAY_INTERVALS[1].endHour;
      

      const startDate =  new Date(date).setHours(startHour, 0, 0, 0);
      const endDate = new Date(date).setHours(endHour - 1, 59, 59 , 999);      

      // Crée un RDV localement (avec id temporaire). La logique de createAppointment
      // va déclencher l'appel API en arrière-plan et mettre à jour l'ID lorsque la
      // réponse serveur sera reçue.
      createAppointment(
        startDate,
        endDate,
        employeeId,
        id,
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
        selectedCell.date, 
        selectedCell.date + (timelineState.isFullDay ? 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 : 11 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000),
        selectedCell.employeeId,
        event.IdPlanningRessource,
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
        color: '#1E40AF',
        borderColor: '#1E40AF',
        textColor: '#FFFFFF',
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