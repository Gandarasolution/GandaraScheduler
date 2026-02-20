import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { addHours, eachDayOfInterval } from "date-fns";
import { Appointment, User, HistoryAction, Item } from '../types';
import { createAppointmentUtils } from '../utils/appointmentUtils';
import { notificationService } from "../services";
import { getWorkedDayIntervals, isWeekend } from "../utils/dates";
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from "../utils/constants";

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
}

export const useAppointmentLogic = ({ 
  employeesRef,
  appointmentsRef, 
  eventsRef, 
  timelineState, 
  onUpdate,
  setIsSearchOverlayOpen,
  setDimensionsSearchInput,
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
      app.id !== movedAppointmentId &&
      app.employee.id === employeeId &&
      app.startDate < endDate &&
      app.endDate > startDate
    );

    // Réorganiser : tous les rdv avec priorité >= newPriority doivent être décalés
    overlappingAppointments.forEach(app => {
      if ((app.priority ?? 0) >= newPriority) {        
        app.priority = (app.priority ?? 0) + 1;
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
          appointmentsRef.current = appointmentsRef.current.filter(app => app.id !== lastAction.appointment!.id);
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
            app.id === lastAction.previousAppointment!.id ? { ...lastAction.previousAppointment! } : app
          );
          notificationService.undoSuccess(lastAction.type === 'move' ? 'Déplacement' : 'Modification');
        }
        break;

      case 'resize_split':
        // Annuler une division automatique (ex: déplacement sur plusieurs jours)
        if (lastAction.previousAppointment && lastAction.createdAppointments) {
          // Restaurer le RDV principal
          appointmentsRef.current = appointmentsRef.current.map(app =>
            app.id === lastAction.previousAppointment!.id ? { ...lastAction.previousAppointment! } : app
          );
          
          // Supprimer les RDV créés par le split
          const createdIds = lastAction.createdAppointments.map(app => app.id);
          appointmentsRef.current = appointmentsRef.current.filter(app => !createdIds.includes(app.id));
          
          notificationService.undoSuccess('Division');
        }
        break;
    }
    onUpdate(); // Rafraichir l'interface
  }, [appointmentsRef, onUpdate]);

  // --- FONCTIONS CRUD INTERNES ---

  // Resize interne (mise à jour simple)
  const onResize = useCallback((id: number, newStartDate: number, newEndDate: number, newEmployeeId?: number, saveToHistory: boolean = true, newPriority?: number) => {     
      const appointmentToResize = appointmentsRef.current.find(app => app.id === id);
      
      if (appointmentToResize && saveToHistory) {
        saveAppointmentState(appointmentToResize, 'update', { ...appointmentToResize });
      }

      appointmentsRef.current = appointmentsRef.current.map((app) =>
        app.id === id
          ? { ...app, startDate: newStartDate, endDate: newEndDate, employeeId: newEmployeeId || app.employee.id, priority: newPriority !== undefined ? newPriority : app.priority }
          : app
      );
      if (newPriority !== undefined && newEmployeeId !== undefined) {
        reorganizePriorities(id, newPriority, newEmployeeId , newStartDate, newEndDate);
      }
      onUpdate();
  }, [appointmentsRef, onUpdate, saveAppointmentState]);

  // Création unitaire d'un RDV
  const createAppointment = useCallback((
    startDate: number, endDate: number, employeeId: number, eventId: number, 
    saveToHistory: boolean = true, type: 'chantier' | 'absence' | 'autre', description?: string, priority?: number
  ) => {
      const id = ++idCounter.current;
      
      // Calculer la priorité par défaut basée sur les rdv existants qui chevauchent
      const overlappingAppointments = appointmentsRef.current.filter(app =>
        app.employee.id === employeeId &&
        app.startDate < endDate &&
        app.endDate > startDate
      );
      const maxPriority = priority !== undefined 
        ? priority 
        : (overlappingAppointments.length > 0
          ? Math.max(...overlappingAppointments.map(app => app.priority || 0)) + 1
          : 0);
      
      const newApp: Appointment = {
        id: id,
        description: description || `Nouveau rendez-vous`,
        startDate,
        endDate,
        employee: employeesRef.current.find(emp => emp.id === employeeId) as User,
        type: type,
        EventId: eventId,
        priority: maxPriority, // Nouveau rdv au-dessus de la pile
      };
      appointmentsRef.current.push(newApp);
      
      if (saveToHistory) {
        saveAppointmentState(newApp, 'create');
      }
      
      onUpdate();
      return newApp;
  }, [appointmentsRef, onUpdate, saveAppointmentState]);

  // --- GESTION DES PRIORITÉS ---

  // --- LOGIQUE MÉTIER COMPLEXE (Move, Split, Save) ---

  const moveAppointment = useCallback((id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection: 'left' | 'right' = 'right', saveToHistory: boolean = true, newPriority?: number) => {
      const appointment = appointmentsRef.current.find((app) => app.id === id);
      if (!appointment) return;
      
      const previousAppointment = saveToHistory ? { ...appointment } : undefined;
      
      // Si une nouvelle priorité est fournie, réorganiser les priorités avant d'appliquer
      if (newPriority !== undefined) {
        reorganizePriorities(id, newPriority, newEmployeeId, newStartDate, newEndDate);
        appointment.priority = newPriority;
      }      

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
      
      const createdAppointments: Appointment[] = [];
      
      // Helper pour traiter les jours
      const processIntervals = (startIndex: number, endIndex: number, step: number, mainIndex: number) => {
        // 1. Modifier le RDV principal (le premier jour)
        const mainDay = days[mainIndex];
        const mainStart = resizeDirection === 'left' ? mainDay.start : newStartDate;
        const mainEnd = resizeDirection === 'right' ? mainDay.end : newEndDate;
        
        
        // Note: On ne sauvegarde pas l'historique ici, on le fait à la fin pour grouper
        onResize(appointment.id, mainStart, mainEnd, newEmployeeId, false);
        
        // 2. Créer des nouveaux RDV pour les jours suivants (Split)
        for (let i = startIndex; i !== endIndex; i += step) {
          const day = days[i];
          const newApp = createAppointment(
            day.start, 
            day.end,
            newEmployeeId, 
            appointment.EventId,
            false, // Pas d'historique individuel
            appointment.type
          );
          if (newApp) createdAppointments.push(newApp);
        }
      };
      
      if (resizeDirection === 'right') {
        processIntervals(1, days.length, 1, 0);
      } else {
        processIntervals(days.length - 2, -1, -1, days.length - 1);
      }
      
      // Sauvegarde groupée dans l'historique
      if (saveToHistory && previousAppointment) {
        const updatedAppointment = appointmentsRef.current.find((app) => app.id === id);
        if (updatedAppointment) {
          const actionType = createdAppointments.length > 0 ? 'resize_split' : 'move';
          saveAppointmentState(updatedAppointment, actionType, previousAppointment, createdAppointments);
        }
      }
        onUpdate();
      }, [appointmentsRef, onResize, createAppointment, saveAppointmentState, onUpdate, reorganizePriorities]);

  // Sauvegarde depuis le formulaire (Création ou Édition)
  const handleSaveAppointment = useCallback((appointment: Appointment, eventUpdate: Item, includeNonWorkingDays: boolean) => {    
      // Vérifier si l'événement est désactivé (pour les types absence/autre)
      if ('actif' in eventUpdate && !eventUpdate.actif) {
        notificationService.error('Action interdite', 'Cette rubrique est désactivée et ne peut plus être utilisée pour créer ou modifier des rendez-vous.');
        return;
      }

      // Mise à jour des métadonnées de l'événement global
      eventsRef.current = eventsRef.current.map(e =>
        e.id === eventUpdate.id ? { ...e, ...eventUpdate } : e
      );            

      const days = getWorkedDayIntervals(
        appointment.startDate, 
        appointment.endDate,
        timelineState.isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS,
        includeNonWorkingDays || !timelineState.isDisplayWeekend,
        timelineState.includeWeekend || !timelineState.isDisplayWeekend,
        timelineState.nonWorkingDates
      );        
            
      let previousAppointment: Appointment | undefined;
      if (appointment.id) {
        previousAppointment = appointmentsRef.current.find(app => app.id === appointment.id);
      }
      
      const createdAppointments: Appointment[] = [];
      
      // Création des RDV supplémentaires si le créneau s'étend sur plusieurs jours
      const createExtraAppointments = (fromIndex = 1) => {
        days.slice(fromIndex).forEach(day => {          
          const newApp = createAppointment(
            day.start,
            day.end,
            appointment.employee.id as number,
            eventUpdate.id,
            true,
            appointment.type,
            appointment.description, 
            appointment.priority
          );
          if (newApp) createdAppointments.push(newApp);
        });
      };

      if (appointment.id) {        
        // --- MODE ÉDITION ---
        if (days.length > 0) {
          appointmentsRef.current = appointmentsRef.current.map(app => {
            if (app.id === appointment.id) {
              return {
                ...app,           
                ...appointment,   
                startDate: days[0].start,
                endDate: days[0].end
              };   
            }
            return app;
          });
          reorganizePriorities(appointment.id, appointment.priority ?? 0, appointment.employee.id as number, days[0].start, days[0].end);
          
          if (days.length > 1) createExtraAppointments(1);
        }
      } else {
        // --- MODE CRÉATION ---
        createExtraAppointments(0);
      }      


      // Gestion Historique
      if (appointment.id && previousAppointment) {
        const updatedAppointment = appointmentsRef.current.find(app => app.id === appointment.id);
        if (updatedAppointment) {
          if (createdAppointments.length > 0) {
            saveAppointmentState(updatedAppointment, 'resize_split', previousAppointment, createdAppointments);
          } else {
            saveAppointmentState(updatedAppointment, 'update', previousAppointment);
          }
        }
      }      
      
      onUpdate();
      setIsModalOpen(false);
      setSelectedAppointment(null);
      setNewAppointmentInfo(null);
  }, [appointmentsRef, eventsRef, timelineState, createAppointment, saveAppointmentState, onUpdate]);

  // --- ACTIONS UTILISATEUR (Delete, Divide, Repeat, Extend) ---

  const handleDeleteAppointmentConfirm = useCallback((appointmentToDelete?: Appointment) => {
    // Utiliser le paramètre ou le state
    const appointment = appointmentToDelete || selectedAppointment;
    const id = appointment?.id;
    
    if (!id) return;

    setAlertState({
      isVisible: true,
      title: "Êtes-vous sûr de vouloir supprimer ce rendez-vous ?",
      onConfirm: () => {
        const appointmentInRef = appointmentsRef.current.find(app => app.id === id);
        if (appointmentInRef) {
          saveAppointmentState(appointmentInRef, 'delete');
        }
        
        appointmentsRef.current = appointmentsRef.current.filter((app) => app.id !== id);
                
        onUpdate();
        setIsModalOpen(false);
        setSelectedAppointment(null);
        setAlertState(prev => ({ ...prev, isVisible: false }));
      }
    });
  }, [selectedAppointment, appointmentsRef, saveAppointmentState, onUpdate]);

  const handleDivideAppointment = useCallback((id?: number) => {
    if (!id) return;
    const appointmentToDivide = appointmentsRef.current.find(app => app.id === id);
    if (!appointmentToDivide) return;

    const originalAppointment = { ...appointmentToDivide };
    const { startDate, endDate, employee } = appointmentToDivide;
    
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
    onResize(id, startDate, splitDate, employee.id as number, false);
    
    // 2. Créer le nouveau
    const newAppointmentId = Date.now() + Math.floor(Math.random() * 1000);
    const newAppointment: Appointment = {
      id: newAppointmentId,
      description: appointmentToDivide.description,
      startDate: splitDate,
      endDate: endDate,
      employee: employee,
      type: appointmentToDivide.type,
      EventId: appointmentToDivide.EventId
    };
    appointmentsRef.current.push(newAppointment);

    // 3. Sauvegarder l'action complète
    const modifiedOriginal = appointmentsRef.current.find(app => app.id === id);
    if (modifiedOriginal) {
      saveAppointmentState(originalAppointment, 'resize_split', originalAppointment, [newAppointment]);
    }

    onUpdate();
    setIsModalOpen(false);
    setSelectedAppointment(null);
  }, [appointmentsRef, timelineState, onResize, saveAppointmentState, onUpdate]);

  const handleDivideConfirm = useCallback((appointment: Appointment) => {
      setAlertState({
          isVisible: true,
          title: "Êtes-vous sûr de vouloir diviser ce rendez-vous ?",
          onConfirm: () => {
              handleDivideAppointment(appointment.id);
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
      selectedAppointment.id, 
      selectedAppointment.startDate, 
      extendData, 
      selectedAppointment.employee.id as number,
      selectedAppointment.endDate < extendData ? 'right' : 'left'
    );

    setExtendData(null);
  }, [extendData, selectedAppointment, moveAppointment]);

  // --- INTERACTION EXTERNE (Drag & Drop, Search) ---

  const createAppointmentFromDrag = useCallback(
    (title: string, date: number, intervalName: "morning" | "afternoon" | "day", employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => {
      const startHour = intervalName === "day" ? DAY_INTERVALS[0].startHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].startHour : HALF_DAY_INTERVALS[1].startHour;
      const endHour = intervalName === "day" ? DAY_INTERVALS[0].endHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].endHour : HALF_DAY_INTERVALS[1].endHour;
      

      const startDate =  new Date(date).setHours(startHour, 0, 0, 0);
      const endDate = new Date(date).setHours(endHour - 1, 59, 59 , 999);      


      const event = eventsRef.current.find(e => e.label === title);
      if (!event) {
        console.warn(`Événement introuvable pour le titre : ${title}`);
        return;
      }

      // Vérifier si l'événement est désactivé (pour les types absence/autre)
      if ('actif' in event && !event.actif) {
        notificationService.error('Action interdite', `La rubrique "${title}" est désactivée et ne peut plus être placée dans le planning.`);
        return;
      }

      let eventTypeId = event.id;

      createAppointment(
        startDate, 
        endDate, 
        employeeId, 
        eventTypeId,
        true,
        typeEvent.toLowerCase() as 'chantier' | 'absence' | 'autre'
      );

      setIsSearchOverlayOpen(false);
      setDimensionsSearchInput('');
    },
    [eventsRef, createAppointment]
  );

  const handleSearchItemAction = useCallback((event: any) => {
      if(!selectedCell) return;
      
      // Vérifier si l'événement est désactivé (pour les types absence/autre)
      if ('actif' in event && !event.actif) {
        notificationService.error('Action interdite', `La rubrique "${event.label}" est désactivée et ne peut plus être placée dans le planning.`);
        return;
      }
      
      const employee = employeesRef.current.find(emp => emp.id === selectedCell.employeeId);
      
      createAppointment(
        selectedCell.date, 
        selectedCell.date + (timelineState.isFullDay ? 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 : 11 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000),
        selectedCell.employeeId,
        event.id,
        true,
        event.type.toLowerCase() as "chantier" | "absence" | "autre",
      );
      
      // handleSaveAppointment(
      //   {
      //     id:-1,
      //     description: event.label,
      //     startDate: selectedCell.date,
      //     endDate: (timelineState.isFullDay ? addHours(selectedCell.date, 23) : addHours(selectedCell.date, 11)).getTime() + 59 * 60 * 1000 + 59 * 1000,
      //     employeeId: selectedCell.employeeId,
      //     employee: employee as User,
      //     type: (event as any).type.toLowerCase() as "chantier" | "absence" | "autre",
      //     EventId: event.id,
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
    setSelectedItem(eventsRef.current.find(e => e.id === appointment.EventId) || 
      {
        id: -1,
        code: '',
        label: '',
        color: '#1E40AF',
        borderColor: '#1E40AF',
        textColor: '#FFFFFF',
        actif: true,
        tags: [],
        type: 'autre',
        verrou: false,
        category: '',
        isManual: true  // Ressource manuelle par défaut lors de la création
      }
    );
    setIsModalOpen(true);
  }, []);

  const handleAddDimension = useCallback((dimension: Item) => {
    // Marquer les Items de type 'autre' comme manuels

    dimension.id = Date.now(); // Générer un ID unique temporaire
    const newItem = dimension.type === 'autre' 
      ? { ...dimension, isManual: true } 
      : dimension;
    eventsRef.current.push(newItem);
    setIsModalOpen(false);
    onUpdate();
  }, []);

  const handleEditDimension = useCallback((dimension: Item) => {
    eventsRef.current = eventsRef.current.map(e =>
      e.id === dimension.id ? { ...e, ...dimension } : e
    );
    setIsModalOpen(false);
    onUpdate();
  }, []);

  const handleDeleteDimension = useCallback((dimensionId: number, forceDelete: boolean = false) => {
    
    // Vérifier si la rubrique est utilisée dans le planning
    const isUsedInPlanning = appointmentsRef.current.some(
      appointment => appointment.EventId === dimensionId
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
      eventsRef.current = eventsRef.current.filter(e => e.id !== dimensionId);
      appointmentsRef.current = appointmentsRef.current.filter(
        appointment => appointment.EventId !== dimensionId
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
      e.id === dimensionId ? { ...e, actif: false } : e
    );
    onUpdate();
    return {
      success: true,
      message: 'Rubrique désactivée avec succès. Elle reste visible mais ne peut plus être utilisée.'
    };
  }, []);

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