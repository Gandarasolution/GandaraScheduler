import { useState, useRef, useCallback, useMemo } from 'react';
import { setHours, setMinutes, addHours, eachDayOfInterval } from "date-fns";
import { Appointment, Employee, HistoryAction, Item } from '../types';
import { createAppointmentUtils } from '../utils/appointmentUtils';
import { notificationService } from "../services";
import { getWorkedDayIntervals, isWeekend } from "../utils/dates";
import { DAY_INTERVALS, HALF_DAY_INTERVALS } from "../utils/constants";

// Type pour les données de répétition
export type RepeatData = {
  numberCount: number;
  repeatCount: number | null;
  repeatInterval: "day" | "week" | "month";
  endDate: Date | null;
};

interface LogicProps {
  appointmentsRef: React.MutableRefObject<Appointment[]>;
  employeesRef: React.MutableRefObject<any[]>;
  eventsRef: React.MutableRefObject<Item[]>;
  timelineState: {
    isFullDay: boolean;
    isDisplayWeekend: boolean;
    includeWeekend: boolean;
    respectNonWorkingDays: boolean;
    nonWorkingDates: Date[];
  };
  onUpdate: () => void; // Callback pour forcer le rafraîchissement de l'UI
}

export const useAppointmentLogic = ({ 
  appointmentsRef, 
  eventsRef, 
  timelineState, 
  onUpdate 
}: LogicProps) => {
  
  // --- Initialisation des Utilitaires ---
  const appointmentUtils = useMemo(() => createAppointmentUtils(), []);
  
  // --- Refs pour la persistance hors rendu ---
  const history = useRef<HistoryAction[]>([]);
  const idCounter = useRef(10000);
  const clipboardAppointment = useRef<Appointment | null>(null);
  const timestampCounter = useRef(1000);

  // --- États UI nécessaires à la logique ---
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedAppointmentForm, setSelectedAppointmentForm] = useState<Appointment | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; date: Date } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAppointmentInfo, setNewAppointmentInfo] = useState<{ date: Date; employeeId: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  
  // États pour les actions complexes
  const [repeatData, setRepeatData] = useState<RepeatData | null>(null);
  const [extendData, setExtendData] = useState<Date | null>(null);
  
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

  // --- GESTION DE L'HISTORIQUE (UNDO) ---

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
  const onResize = useCallback((id: number, newStartDate: Date, newEndDate: Date, newEmployeeId?: number, saveToHistory: boolean = true) => {     
      const appointmentToResize = appointmentsRef.current.find(app => app.id === id);
      
      if (appointmentToResize && saveToHistory) {
        saveAppointmentState(appointmentToResize, 'update', { ...appointmentToResize });
      }

      appointmentsRef.current = appointmentsRef.current.map((app) =>
        app.id === id
          ? { ...app, startDate: newStartDate, endDate: newEndDate, employeeId: newEmployeeId || app.employeeId }
          : app
      );
      onUpdate();
  }, [appointmentsRef, onUpdate, saveAppointmentState]);

  // Création unitaire d'un RDV
  const createAppointment = useCallback((
    startDate: Date, endDate: Date, employeeId: number, eventId: number, 
    saveToHistory: boolean = true, type: 'chantier' | 'absence' | 'autre', description?: string
  ) => {
      const id = ++idCounter.current;
      const newApp: Appointment = {
        id: id,
        description: description || `Nouveau rendez-vous`,
        startDate,
        endDate,
        employeeId,
        type: type,
        EventId: eventId,
      };
      appointmentsRef.current.push(newApp);
      
      if (saveToHistory) {
        saveAppointmentState(newApp, 'create');
      }
      
      onUpdate();
      return newApp;
  }, [appointmentsRef, onUpdate, saveAppointmentState]);

  // --- LOGIQUE MÉTIER COMPLEXE (Move, Split, Save) ---

  const moveAppointment = useCallback((id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection: 'left' | 'right' = 'right', saveToHistory: boolean = true) => {
      const appointment = appointmentsRef.current.find((app) => app.id === id);
      if (!appointment) return;

      // Calcul des intervalles (Jours/Demi-journées)
      const intervalType = timelineState.isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
      const days = getWorkedDayIntervals(
        newStartDate, 
        newEndDate,
        intervalType,
        timelineState.respectNonWorkingDays || !timelineState.isDisplayWeekend,
        timelineState.includeWeekend || !timelineState.isDisplayWeekend,
        timelineState.nonWorkingDates
      );    
          
      if (days.length === 0) return;
      
      const previousAppointment = saveToHistory ? { ...appointment } : undefined;
      const createdAppointments: Appointment[] = [];
      
      // Helper pour traiter les jours
      const processIntervals = (startIndex: number, endIndex: number, step: number, mainIndex: number) => {
        // 1. Modifier le RDV principal (le premier jour)
        const mainDay = days[mainIndex];
        const mainStart = resizeDirection === 'left' ? mainDay.start : newStartDate;
        const mainEnd = resizeDirection === 'right' ? mainDay.end : newEndDate;
        
        // Note: On ne sauvegarde pas l'historique ici, on le fait à la fin pour grouper
        onResize(appointment.id, mainStart, new Date(mainEnd.setHours(23,59,59,999)), newEmployeeId, false);
        
        // 2. Créer des nouveaux RDV pour les jours suivants (Split)
        for (let i = startIndex; i !== endIndex; i += step) {
          const day = days[i];
          const newApp = createAppointment(
            day.start, 
            new Date(day.end.setHours(23,59,59,999)),
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
  }, [appointmentsRef, timelineState, onResize, createAppointment, saveAppointmentState, onUpdate]);

  // Sauvegarde depuis le formulaire (Création ou Édition)
  const handleSaveAppointment = useCallback((appointment: Appointment, eventUpdate: Item, includeNonWorkingDays: boolean) => {
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
            appointment.employeeId as number,
            eventUpdate.id,
            true,
            appointment.type,
            appointment.description
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
                description: appointment.description || app.description,
                startDate: days[0].start,
                endDate: days[0].end,
                employeeId: appointment.employeeId,
                type: appointment.type,
                EventId: appointment.EventId,
              };   
            }
            return app;
          });
          
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
    const { startDate, endDate, employeeId } = appointmentToDivide;
    
    console.log('startDate', startDate);
    console.log('endDate', endDate);

    // Calcul du milieu
    let totalDuration = (endDate.getTime() - startDate.getTime()) + 1;
    const timeInterval = timelineState.isFullDay 
      ? DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour 
      : HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour;
    
      
    const allDates = eachDayOfInterval({ start: startDate, end: endDate });

    let compteur = 0;
    allDates.forEach(date => {
      if (isWeekend(date) && !timelineState.isDisplayWeekend && !timelineState.includeWeekend) {
          compteur++;
      } 
    });

    totalDuration -= (timelineState.isFullDay ? compteur : compteur * 2) * (timeInterval * 60 * 60 * 1000);

    const nbOfIntervals = Math.floor(totalDuration / (timeInterval * 60 * 60 * 1000));
    const splitDate = new Date(startDate.getTime() + (Math.floor(nbOfIntervals / 2) * (timeInterval * 60 * 60 * 1000)));
  

    // 1. Redimensionner l'original
    onResize(id, startDate, splitDate, employeeId as number, false);
    
    // 2. Créer le nouveau
    const newAppointmentId = Date.now() + Math.floor(Math.random() * 1000);
    const newAppointment: Appointment = {
      id: newAppointmentId,
      description: appointmentToDivide.description,
      startDate: splitDate,
      endDate: endDate,
      employeeId: employeeId as number,
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
      selectedAppointment.employeeId as number,
      selectedAppointment.endDate.getTime() < extendData.getTime() ? 'right' : 'left'
    );

    setExtendData(null);
  }, [extendData, selectedAppointment, moveAppointment]);

  // --- INTERACTION EXTERNE (Drag & Drop, Search) ---

  const createAppointmentFromDrag = useCallback(
    (title: string, date: Date, intervalName: "morning" | "afternoon" | "day", employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => {
      const startHour = intervalName === "day" ? DAY_INTERVALS[0].startHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].startHour : HALF_DAY_INTERVALS[1].startHour;
      const endHour = intervalName === "day" ? DAY_INTERVALS[0].endHour : intervalName === "morning" ? HALF_DAY_INTERVALS[0].endHour : HALF_DAY_INTERVALS[1].endHour;

      const startDate = setHours(setMinutes(new Date(date), 0), startHour);
      const endDate = setHours(setMinutes(new Date(date), 0), endHour);

      let eventTypeId = eventsRef.current.find(e => e.label === title)?.id;
      if (!eventTypeId) {
        console.warn(`Événement introuvable pour le titre : ${title}`);
        return;
      }

      createAppointment(
        startDate, 
        endDate, 
        employeeId, 
        eventTypeId,
        true,
        typeEvent.toLowerCase() as 'chantier' | 'absence' | 'autre'
      );
    },
    [eventsRef, createAppointment]
  );

  const handleSearchItemAction = useCallback((event: any) => {
      if(!selectedCell) return;
      
      handleSaveAppointment(
        {
          description: event.label,
          startDate: new Date(selectedCell.date),
          endDate: new Date((timelineState.isFullDay ? addHours(selectedCell.date, 23) : addHours(selectedCell.date, 11)).setMinutes(59, 59)),
          employeeId: selectedCell.employeeId,
          type: (event as any).type.toLowerCase() as "chantier" | "absence" | "autre",
        } as Appointment,
        event as Item,
        false
      );
  }, [selectedCell, timelineState.isFullDay, handleSaveAppointment]);

  // --- PRESSE-PAPIER ---

  const copyAppointmentToClipboard = useCallback((app: Appointment) => {
    if (app) {
      clipboardAppointment.current = appointmentUtils.copyAppointment(app);
      notificationService.info('Rendez-vous copié', 'Le rendez-vous a été copié dans le presse-papier');
      return clipboardAppointment.current;
    } 
    return null;
  }, [appointmentUtils]);

  const pasteAppointment = useCallback((targetCell?: { employeeId: number; date: Date } | null) => {
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

      appointmentsRef.current = [...appointmentsRef.current, ...newAppointments];
      onUpdate();
      notificationService.appointmentCreated(newAppointments.length);
    } catch (error) {
      notificationService.error('Erreur', (error as Error).message);
    }
  }, [appointmentUtils, selectedCell, timelineState, appointmentsRef, onUpdate]);

  // Handler pour ouvrir la modal d'édition
  const handleOpenEditModal = useCallback((appointment: Appointment) => {
    setSelectedAppointmentForm(appointment);
    setSelectedAppointment(appointment);
    setSelectedItem(eventsRef.current.find(e => e.id === appointment.EventId) || null);
    setIsModalOpen(true);
  }, []);

  return {
    // États exposés
    selectedAppointment, setSelectedAppointment,
    selectedAppointmentForm,
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