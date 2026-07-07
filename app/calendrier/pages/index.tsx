/**
 * @fileoverview Page principale du calendrier Gandara Scheduler
 * * Point d'entrée de l'application.
 * Ce composant agit comme un "Orchestrateur" :
 * 1. Il initialise les Hooks de logique métier (Data, Time, Interaction, Logic).
 * 2. Il connecte ces hooks aux composants UI (Header, Grid, Modals).
 * 3. Il ne contient AUCUNE logique métier complexe (tout est délégué).
 * * @author Gandara Solutions
 * @version 2.0.1 (Refactored & Typed)
 */

"use client";

import '../styles/custom.scss';
import React, { useEffect, useRef, useMemo, useCallback, lazy, Suspense, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { format } from "date-fns";


// --- COMPOSANTS UI (Eager loading pour éviter le flash) ---
import { 
  ThemeSelector, 
  RightClickComponent,
  Notificationspanel,
  AlertModal,
  SearchOverlay,
  CalendarHeader,
  CalendarModals,
  DraggableSource,
} from '@/app/calendrier/components';
import type { SearchableItem } from '@/app/calendrier/components/modals/SearchOverlay';
import { getTableStructure } from '../components/Table/tableConfig';


// --- COMPOSANTS UI AVEC CODE SPLITTING ---
const CalendarGrid = lazy(() => import('@/app/calendrier/components').then(mod => ({ default: mod.CalendarGrid })));
const DataTableFrame = lazy(() => import('@/app/calendrier/components').then(mod => ({ default: mod.DataTableFrame })));

// --- CUSTOM HOOKS ---
import { 
  useCalendarView, 
  useTimeline,
  useDataLayer,
  useAppointmentLogic,
  useInteraction,
  useNotifications
 } from "@/app/calendrier/hooks";

import { useTheme } from '../utils/themeManager';

// --- CONTEXTES & SERVICES ---
import { notificationService } from "../services";
import employeeService from '@/app/service/employee.service';
import evenementService from '@/app/service/evenement.service';
import ressourceService from '@/app/service/ressource.service';
import calendarConfigService from '@/app/service/calendarConfig.service';

// --- UTILITAIRES ---
import { createSearchAndFilterUtils, FilterType } from "../utils/searchAndFilterUtils"; // Ajout pour les filtres
import { User, Item } from '../types';
import { INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE, INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER } from '../utils/constants';
import { useAuth, useCurrentUser } from '../hooks/utils/AuthContext';
import { useMercureSync } from '../hooks/utils/useMercureSync';
import TopNotification from '../components/ui/TopNotification';

// Composant de chargement réutilisable
const LoadingFallback = ({ message = "Chargement..." }: { message?: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

/**
 * Composant wrapper pour éviter les erreurs d'hydratation Next.js
 * sur les composants utilisant `window` ou `localStorage`.
 */
function NoSSR({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = React.useState(false);
  useEffect(() => setHasMounted(true), []);
  if (!hasMounted) return null;
  return <>{children}</>;
}

/**
 * Composant Principal HomePage
 */
export default function HomePage({
  onThemeChange,
}: {
  onThemeChange?: (theme: any) => void;
}) {

  const { hasPermission, currentPlanningId, setUser, logout } = useAuth();
  
  const user = useCurrentUser();
  
  const [loadCalendar, setLoadCalendar] = useState(true); 
  const [lastMercureEvent, setLastMercureEvent] = useState<{ action: string; data: any } | null>(null);
  const [lockNotification, setLockNotification] = useState<string | null>(null);

  // 1. SERVICES GLOBAUX
  const { theme, setTheme } = useTheme();
  const notifications = useNotifications();

  // État pour la confirmation de suppression de rubrique
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ item: Item, isUsedInPlanning: boolean, isActive: boolean } | null>(null);
  const [, setEmployeesVersion] = useState(0);
  const hasInitializedPlanningRef = useRef(false);
  const hasInitializedTeamsRef = useRef(false);
  const hasInitializedEmployeesRef = useRef(false);
  const hasInitializedNonWorkingDatesRef = useRef(false);
  const [errorPlanning, setErrorPlanning] = useState<string | null>(null);

  // Refs de données dynamiques (chargées via API)
  const [globalEmployees, setGlobalEmployees] = useState<User[]>([]);

  // 2. ÉTAT DE LA VUE (Préférences, Modales, Filtres)
  const viewState = useCalendarView(currentPlanningId, user );

  // 3. COUCHE DE DONNÉES (Employés, RDV, Événements)
  const dataLayer = useDataLayer({ 
    globalEmployees: globalEmployees,
    setGlobalEmployees, 
  });



  // 4. LOGIQUE TEMPORELLE (Scroll, Dates)
  const timeline = useTimeline({
    isDisplayWeekend: viewState.isDisplayWeekend,
    selectedDate: viewState.selectedDate,
    setSelectedDate: viewState.setSelectedDate,
  });

  // 5. LOGIQUE MÉTIER (CRUD, Règles de gestion, Historique)
  const timelineState = useMemo(() => ({
    isFullDay: viewState.isFullDay, 
    isDisplayWeekend: viewState.isDisplayWeekend,
    includeWeekend: viewState.includeWeekend,
    respectNonWorkingDays: viewState.respectNonWorkingDays,
    nonWorkingDates: viewState.nonWorkingDates
  }), [viewState.isFullDay, viewState.isDisplayWeekend, viewState.includeWeekend, viewState.respectNonWorkingDays, viewState.nonWorkingDates]);

  const appointmentLogic = useAppointmentLogic({
    employees: globalEmployees,
    appointmentsRef: dataLayer.appointmentsRef,
    eventsRef: dataLayer.itemsRef,
    timelineState,
    onUpdate: dataLayer.refreshData, // Callback pour rafraichir l'UI après modification des Refs
    setIsSearchOverlayOpen: viewState.setIsSearchOverlayOpen,
    setDimensionsSearchInput: viewState.setDimensionsSearchInput,
    onLockedError: setLockNotification,
    api: {
      updateEvenementAndRessource: evenementService.updateEvenementAndRessource,
      createEvenement: evenementService.createEvenement,
      updateEvenement: evenementService.updateEvenement,
      deleteEvenement: evenementService.deleteEvenement,
      deleteEvenements: evenementService.deleteEvenements,
      divideEvenement: evenementService.divideEvenement,
      repeatEvenement: evenementService.repeatEvenement,
      unlockEvenement: evenementService.unlockEvenement,
      lockEvenement: evenementService.lockQuickEvenement,
    },
  });

  
  // 6. INTERACTIONS UTILISATEUR (Clic droit, Clavier, Copier/Coller)
  const interaction = useInteraction({
    selectedAppointment: appointmentLogic.selectedAppointment,
    setSelectedAppointment: appointmentLogic.setSelectedAppointment,
    selectedCell: appointmentLogic.selectedCell,
    setSelectedCell: appointmentLogic.setSelectedCell,
    setSelectedEmployee: appointmentLogic.setSelectedEmployee,
    copyAppointment: appointmentLogic.copyAppointmentToClipboard,
    pasteAppointment: appointmentLogic.pasteAppointment,
    undoAction: appointmentLogic.undoLastAction,
    deleteAction: appointmentLogic.handleDeleteAppointmentConfirm,
    openSearch: () => viewState.setIsSearchOverlayOpen(true),
    handleOpenEditModal: appointmentLogic.handleOpenEditModal,
    handleRepeat: () => appointmentLogic.setRepeatData({
      numberCount: 1,       // "Tous les 1..."
      repeatCount: 1,       // "1 fois" (par défaut)
      repeatInterval: 'day', // "...jours"
      endDate: null,        // Pas de date de fin par défaut
    }),
    handleExtend: () => appointmentLogic.setExtendData(appointmentLogic.selectedAppointment?.FinPlanningEvenement || Date.now()),
    handleDivide: (appointment) => appointmentLogic.handleDivideConfirm(appointment),
    
    // Constantes pour calculs d'interaction
    isFullDay: viewState.isFullDay,
    DAY_INTERVALS: viewState.constants.intervals,
    HALF_DAY_INTERVALS: viewState.constants.intervals,
    viewType: viewState.viewType,
    addImage: dataLayer.addImage,

    setIsViewDropdownOpen: viewState.setIsViewDropdownOpen

  });

  const handleCellDoubleClick = useCallback(() => {
    viewState.setIsSearchOverlayOpen(true);
  }, [viewState.setIsSearchOverlayOpen]);

  const handleSearchOverlayItemAction = useCallback((item: SearchableItem) => {
    if (!appointmentLogic.selectedCell) {
      return;
    }
    
    appointmentLogic.handleSearchItemAction(item as unknown as Item);
  }, [appointmentLogic.selectedCell, appointmentLogic.handleSearchItemAction, dataLayer.itemsRef]);

  const searchOverlayItems = useCallback(async (query: string): Promise<{ error: number; data: SearchableItem[]; message?: string }> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { error: 0, data: [] };
    }

    const response = await ressourceService.searchRessources(trimmedQuery, [], 20);
    if (response?.error !== 0 || !Array.isArray(response.data)) {
      return { error: 1, data: [], message: 'Erreur lors de la recherche. Veuillez réessayer.' };
    }

    
    const data = (response.data as Item[])
      .filter((item) => {
        // if (!canCreateEvent(user.role, item.Type)) {
        //   return false;
        // }

        if ('Actif' in item) {
          return item.Actif !== false && item.Actif !== null;
        }

        return true;
      })
      .map((item) => ({
        ...item,
        id: item.IdPlanningRessource,
        label: item.LibellePlanningRessource,
      }));
    
    return { error: 0, data };
  }, [user.role]);

  // --- FONCTIONS DE RECHERCHE PAGINÉE (Mémorisées pour éviter les re-rendus inutiles) ---
  const handlePaginatedSearch = useCallback(( limit: number = 20, pageNum: number = 1, timeoutMs: number = 15000) => {    
    return viewState.viewType === 'chantier-table' 
      ? (ressourceService.getRessourcesProjet as any)(limit, pageNum, viewState.searchInput, viewState.activeFilters, timeoutMs) 
      : viewState.viewType === 'employee-table' && hasPermission(23) 
        ? (employeeService.getEmployeesPag as any)(limit, pageNum, viewState.searchInput, viewState.activeFilters, timeoutMs) 
        : viewState.viewType === 'manual-event-table' && hasPermission(23) 
          ? (ressourceService.getManualEvents as any)(limit, pageNum, viewState.searchInput, viewState.activeFilters, timeoutMs) 
          : viewState.viewType === 'paie-table' && hasPermission(23) 
            ? (ressourceService.getRubriquePaie as any)(limit, pageNum, viewState.searchInput, viewState.activeFilters, timeoutMs)
            : undefined;
  }, [viewState.viewType, viewState.activeFilters, viewState.searchInput, ]);

  // --- FILTRES ---
  const searchUtils = useMemo(() => createSearchAndFilterUtils(), []);
  
  const keyOfFilter = useMemo((): { [key: string]: { label: string; type: FilterType; badgeColors?: Record<string, string> } } => {
    // Définition des colonnes filtrables selon la vue
    if (viewState.viewType === 'chantier-table') {
        return { 
          code: { label: 'Code', type: 'combobox' as FilterType }, 
          etat: { 
            label: 'État', 
            type: 'badge' as FilterType,
            badgeColors: {
              'En cours': 'bg-green-100 text-green-800',
              'Planifié': 'bg-blue-100 text-blue-800',
              'Suspendu': 'bg-yellow-100 text-yellow-800',
              'Terminé': 'bg-gray-100 text-gray-800',
              'Annulé': 'bg-red-100 text-red-800'
            }
          }, 
          chargeAffaire: { label: 'Chargé d\'Affaires', type: 'combobox' as FilterType }, 
          chefChantier: { label: 'Chef de Chantier', type: 'combobox' as FilterType }
        };
    }
    // Par défaut ou autres vues
    return { 
        code: { label: 'Code', type: 'combobox' as FilterType },
    };
  }, [viewState.viewType]);

  const filterConfig = useMemo(() => {
      // Génération des options de filtre basées sur les données actuelles
      const baseConfig = searchUtils.getFilterOptions(
        Object.values(dataLayer.itemsRef.current),
        viewState.viewType === 'chantier-table' ? 'chantier' : null,
        keyOfFilter
      );
      
      // Enrichir avec les filtres actifs
      return {
        ...baseConfig,
        activeFilters: viewState.activeFilters
      };
  }, [searchUtils, dataLayer.itemsRef.current, viewState.viewType, keyOfFilter, viewState.activeFilters]);
        
  // --- EFFETS DE BORD ---

  // Init global: notifications + theme (indépendant de la vue)
  useEffect(() => {
    notificationService.setNotificationCallback(notifications.addNotification);
    if (user.theme) {
      setTheme(user.theme as any);
    }
  }, [notifications.addNotification, user.theme, setTheme]);

  // Init unique: configuration utilisateur + données planning (employés, équipes, RDV)
  useEffect(() => {
    if (!currentPlanningId || currentPlanningId <= 0) return;

    let isMounted = true;

    const initializeNonWorkingDates = async () => {
      if (!isMounted || hasInitializedNonWorkingDatesRef.current) return;
      hasInitializedNonWorkingDatesRef.current = true;
      const result = await viewState.loadNonWorkingDates();
      if (result.error === 1){
        setLoadCalendar(false);
        setErrorPlanning(result.message || "Erreur lors du chargement des jours non travaillés. Veuillez réessayer.");
      }
    };

    const initializePlanning = async () => {
      if (!isMounted || hasInitializedPlanningRef.current) return;
      hasInitializedPlanningRef.current = true;
      hasInitializedTeamsRef.current = true; // Si on charge le planning, on charge aussi les teams
      
      await viewState.loadConfigs(hasPermission(23) || hasPermission(22));

      // Chargement des employés selon les permissions
      if (!hasInitializedEmployeesRef.current) {
        const employeesResponse = hasPermission(23) || hasPermission(22) ? await employeeService.getEmployees() : await employeeService.getEmployee(user.IdPersonnel);
        console.log('Employees Response:', employeesResponse);
        if (employeesResponse?.error === 0 && Array.isArray(employeesResponse.data)) {
          setGlobalEmployees(employeesResponse.data);
        } else {
          setErrorPlanning("Erreur lors du chargement des employés. Veuillez réessayer.");
          setGlobalEmployees([]);
          setLoadCalendar(false);
          return;
        }
        hasInitializedEmployeesRef.current = true;
        setEmployeesVersion(prev => prev + 1);
      }


      let rep = await dataLayer.loadTeams();
      console.log('Teams Response:', rep);
      if (rep?.error !== 0 || !Array.isArray(rep.data) || rep.data.length === 0) {
        setErrorPlanning("Erreur lors du chargement des équipes. Veuillez réessayer.");
        setLoadCalendar(false);
        return;
      }

      rep = await dataLayer.loadPoleActivites();
      console.log('Pole Activités Response:', rep);
      if (rep?.error !== 0 || !Array.isArray(rep.data) || rep.data.length === 0) {
        setErrorPlanning("Erreur lors du chargement des pôles d'activité. Veuillez réessayer.");
        setLoadCalendar(false);
        return;
      }

      const startDate = Date.now() - (INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE * 7 * 24 * 60 * 60 * 1000);
      const endDate = Date.now() + (INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER * 7 * 24 * 60 * 60 * 1000);
      await dataLayer.loadAppointmentsInRange(startDate, endDate);

      setLoadCalendar(false);
    };

    const initializeEmployeeTable = async () => {
      if (!isMounted || hasInitializedTeamsRef.current) return;
      hasInitializedTeamsRef.current = true;
      await dataLayer.loadTeams();
    };

    const initializePaieTableAndManualEventTable = async () => {
      if (!isMounted || hasInitializedEmployeesRef.current) return;
      hasInitializedEmployeesRef.current = true;
      const employeesResponse = hasPermission(23) || hasPermission(22) ? await employeeService.getEmployees() : null;

      if (employeesResponse?.error === 0 && Array.isArray(employeesResponse.data)) {
        setGlobalEmployees(employeesResponse.data);
      } else {
        setErrorPlanning("Erreur lors du chargement des employés. Veuillez réessayer.");
        setGlobalEmployees([]);
        setLoadCalendar(false);
        return;
      }
    }
    
    initializeNonWorkingDates();
    if (viewState.viewType === 'calendar') {
      initializePlanning();
    } else if (viewState.viewType === 'employee-table') {
      initializeEmployeeTable();
    }
    else if (viewState.viewType === 'paie-table' || viewState.viewType === 'manual-event-table') {
      if (hasPermission(23) && hasPermission(22)) {
        console.log("Initialisation de la table Paie et de la table des événements manuels...");
        initializePaieTableAndManualEventTable();
      }else {
        setErrorPlanning("Vous n'avez pas les droits nécessaires pour accéder à cette vue.");
        setLoadCalendar(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [
    viewState.viewType,
    currentPlanningId,
    dataLayer.loadTeams,
    dataLayer.loadAppointmentsInRange,
  ]);

  useEffect(() => {
    if (viewState.viewType !== 'calendar') return;
    if (!viewState.currentCalendarConfig) return;
    if (!hasInitializedPlanningRef.current) return;

    const reloadPlanningDataForCurrentView = async () => {
      setErrorPlanning(null);
      setLoadCalendar(true);
      setGlobalEmployees([]);
      dataLayer.resetPlanningData();

      const employeesResponse = hasPermission(23) || hasPermission(22)
        ? await employeeService.getEmployees()
        : await employeeService.getEmployee(user.IdPersonnel);

      if (employeesResponse?.error === 0 && Array.isArray(employeesResponse.data)) {
        setGlobalEmployees(employeesResponse.data);
        setEmployeesVersion(prev => prev + 1);
      } else {
        setErrorPlanning("Erreur lors du chargement des employés. Veuillez réessayer.");
        setGlobalEmployees([]);
        setLoadCalendar(false);
        return;
      }

      const teamsResponse = await dataLayer.loadTeams();
      if (teamsResponse?.error !== 0 || !Array.isArray(teamsResponse.data) || teamsResponse.data.length === 0) {
        setErrorPlanning("Erreur lors du chargement des équipes. Veuillez réessayer.");
        setLoadCalendar(false);
        return;
      }

      const poleActivitesResponse = await dataLayer.loadPoleActivites();
      if (poleActivitesResponse?.error !== 0 || !Array.isArray(poleActivitesResponse.data) || poleActivitesResponse.data.length === 0) {
        setErrorPlanning("Erreur lors du chargement des pôles d'activité. Veuillez réessayer.");
        setLoadCalendar(false);
        return;
      }

      const startDate = Date.now() - (INITIAL_APPOINTMENTS_LOAD_WEEKS_BEFORE * 7 * 24 * 60 * 60 * 1000);
      const endDate = Date.now() + (INITIAL_APPOINTMENTS_LOAD_WEEKS_AFTER * 7 * 24 * 60 * 60 * 1000);
      await dataLayer.loadAppointmentsInRange(startDate, endDate);
      setLoadCalendar(false);
    };

    void reloadPlanningDataForCurrentView();
  }, [
    viewState.viewType,
    viewState.currentCalendarConfig?.IdPlanningVue,
    hasPermission,
    user.IdPersonnel,
    setGlobalEmployees,
    setEmployeesVersion,
    dataLayer.resetPlanningData,
    dataLayer.loadTeams,
    dataLayer.loadPoleActivites,
    dataLayer.loadAppointmentsInRange,
  ]);

  // Init: Raccourcis Clavier Globaux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

      interaction.handleGlobalKeyboard(e);
      if (viewState.viewType === 'calendar') {        
        timeline.handleKeyboardScroll(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [interaction, timeline, viewState.viewType]);

  useEffect(() => {
    const handleExpiration = () => {
      setLockNotification("Votre session a expiré, veuillez vous reconnecter.");
      logout();
    };

    window.addEventListener('auth:expired', handleExpiration);
    return () => window.removeEventListener('auth:expired', handleExpiration);
  }, []);

  // 1. La fonction qui va réagir aux messages Mercure
  const handleMercureEvent = useCallback((action: string, data: any) => {
    console.log("📥 Action reçue en direct :", action, data);
    console.log("Données actuelles avant mise à jour :", dataLayer.appointmentsRef.current, dataLayer.itemsRef.current);
    switch (action) {
      case 'APPOINTMENT_CREATED':
        if(globalEmployees.some(emp => emp.IdPersonnel === data.appointments.IdPersonnel)) {
          dataLayer.addMissingResourcesToCache(data.ressources);
          dataLayer.appointmentsRef.current.push(...data.appointments);
        }
        break;

      case 'APPOINTMENT_UPDATED':
        dataLayer.appointmentsRef.current = dataLayer.appointmentsRef.current.map((appt) => (Number(appt.IdPlanningEvenement) === Number(data.IdPlanningEvenement) ? { ...appt, ...data, isLocked: false } : appt));        
        break;

      case 'APPOINTMENT_AND_RESSOURCE_UPDATED':
        dataLayer.itemsRef.current[Number(data.ressources.IdPlanningRessource)] = {
          ...dataLayer.itemsRef.current[Number(data.ressources.IdPlanningRessource)],
          CouleurFondPlanningRessource: data.ressources.CouleurFondPlanningRessource,
          CouleurBordurePlanningRessource: data.ressources.CouleurBordurePlanningRessource,
          CouleurTextePlanningRessource: data.ressources.CouleurTextePlanningRessource,
          Image: data.ressources.IdPlanningImage,
        }
        dataLayer.appointmentsRef.current = dataLayer.appointmentsRef.current.map((appt) => (Number(appt.IdPlanningEvenement) === Number(data.appointment.IdPlanningEvenement) ? { ...appt, ...data.appointment, isLocked: false } : appt));
        break;

      case 'APPOINTMENT_DELETED':
        dataLayer.appointmentsRef.current = dataLayer.appointmentsRef.current.filter((appt) => Number(appt.IdPlanningEvenement) !== Number(data.IdPlanningEvenement));
        break;
        
      case 'APPOINTMENTS_DELETED':
        for (const deletedId of data.deletedIds) {
          dataLayer.appointmentsRef.current = dataLayer.appointmentsRef.current.filter((appt) => Number(appt.IdPlanningEvenement) !== Number(deletedId));
        }
        break;
        
      case 'APPOINTMENT_DIVISION_UPDATED':
        dataLayer.appointmentsRef.current = dataLayer.appointmentsRef.current.map(
          (appt) => (Number(appt.IdPlanningEvenement) === Number(data.originalEventId) ? { ...appt, FinPlanningEvenement: data.divisionDate, isLocked: false } : appt)
        );
        dataLayer.appointmentsRef.current.push(data.newEvent);
        break;
      
      case 'APPOINTMENT_REPEATED':
        dataLayer.appointmentsRef.current.push(...data.data.appointments);
        dataLayer.appointmentsRef.current = dataLayer.appointmentsRef.current.map((appt) => 
          (Number(appt.IdPlanningEvenement) === Number(data.data.originalEventId) ? { ...appt, isLocked: false } : appt)
      );
        break;
      
      case 'ADD_NON_WORKING_DAY':
        viewState.setNonWorkingDates((prev) => ({
          ...prev,
          [format(data.date, "yyyy-MM-dd")]: Number(data.id)
        }));
        break;
      
      case 'DELETE_NON_WORKING_DAY':
        viewState.setNonWorkingDates((prev) => {
          const updated = { ...prev };
          delete updated[data.date];
          return updated;
        });
        break;
      case 'APPOINTMENT_UNLOCKED':
        dataLayer.appointmentsRef.current = dataLayer.appointmentsRef.current.map((appt) => (Number(appt.IdPlanningEvenement) === Number(data.IdPlanningEvenement) ? { ...appt, isLocked: false } : appt));
        break;
      
      case 'APPOINTMENT_LOCKED':
        dataLayer.appointmentsRef.current = dataLayer.appointmentsRef.current.map((appt) => (Number(appt.IdPlanningEvenement) === Number(data.IdPlanningEvenement) ? { ...appt, isLocked: true } : appt));
        break;
      
      case 'CONFIG_LOCKED':
        viewState.setAvailableConfigs((prev) => prev.map((config) => (Number(config.IdPlanningVue) === Number(data.IdPlanningVue) ? { ...config, isLocked: true } : config)));
        break;
      default:
        console.warn("Action Mercure inconnue :", action);      
    }
    setLastMercureEvent({ action, data });
    console.log("Données après mise à jour :", dataLayer.appointmentsRef.current, dataLayer.itemsRef.current);
    dataLayer.refreshData(); 
  }, []);

  // 2. On branche la radio !
  useMercureSync(currentPlanningId, handleMercureEvent);

  // --- RENDU VISUEL ---

  return (
    <NoSSR>
      <DndProvider backend={HTML5Backend}>
        {/* Overlay de loading pendant le centrage initial */}
        {viewState.viewType === 'calendar' && loadCalendar && (
          <div className="fixed inset-0 bg-white/80 z-[9999] flex items-center justify-center">
            <LoadingFallback message="Chargement du calendrier..." />
          </div>
        )}      
        {lockNotification && (
            <TopNotification 
              message={lockNotification} 
              onClose={() => setLockNotification(null)} 
            />
          )}          
        <div className="h-screen flex flex-col overflow-hidden bg-page poppins">
    
          {/* HEADER : Navigation et Contrôles */}
          {!viewState.isMobile && (
            <CalendarHeader 
              theme={theme}
              user={user}
              viewState={viewState}
              notifications={notifications}
              handleAddModal={appointmentLogic.handleOpenEditModal}
              onNavigateDate={timeline.goToDate}
            />
          )}

          {/* CORPS PRINCIPAL : Grille ou Tableaux */}
          <div className="flex-1 flex min-h-0 box-border">
            <div className={`flex flex-grow rounded-2xl w-full border-gray-200 ${!viewState.isMobile ? 'mt-8' : ''}`} tabIndex={0} style={{ outline: "none" }}>
              <div className={`flex-grow rounded-lg w-full h-full pb-4 ${dataLayer.isLoading ? "pointer-events-none opacity-60" : ""}`}>
                
                {/* Injection des contextes pour les composants enfants */}          
                {viewState.viewType === 'calendar' ? (
                  /* VUE PLANNING */
                  (errorPlanning) ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-red-600 text-lg font-semibold">{errorPlanning}</p>
                      </div>
                    </div>
                  ) :
                  (viewState.currentCalendarConfig || hasPermission(21)) && (
                    <CalendarGrid
                      /* Données */
                      employees={globalEmployees}
                      appointments={dataLayer.appointmentsRef.current}
                      user={user}

                      /* Équipes & Événements */
                      initialTeams={dataLayer.initialTeams}
                      poleActivites={dataLayer.poleActivites}
                      events={dataLayer.itemsRef.current}
                      
                      /* État Temporel */
                      dayInTimeline={timeline.days}
                      mainScrollRef={timeline.mainScrollRef}
                      
                      /* Configuration */
                      isDisplayWeekend={viewState.isDisplayWeekend}
                      isFullDay={viewState.isFullDay}
                      isMobile={viewState.isMobile}
                      nonWorkingDates={viewState.nonWorkingDates}
                      tagPlacement={viewState.tagPlacement}
                      HALF_DAY_INTERVALS={viewState.constants.intervals}
                      
                      /* Config Calendrier */
                      calendarConfig={viewState.currentCalendarConfig}
                      onCalendarConfigChange={viewState.onCalendarConfigChange}
                      availableConfigs={viewState.availableConfigs}
                      
                      /* Actions & Events */
                      onAppointmentMoved={appointmentLogic.moveAppointment}
                      onCellDoubleClick={handleCellDoubleClick}
                      onAppointmentDoubleClick={appointmentLogic.handleOpenEditModal}
                      onExternalDragDrop={appointmentLogic.createAppointmentFromDrag}
                      handleContextMenu={interaction.handleContextMenu}
                      onLoadAppointmentsInRange={dataLayer.loadAppointmentsInRange}
                      mouseUpAfterScroll={timeline.getFirstDayAppearing}
                      onAddAppointment={appointmentLogic.handleSaveAppointment}
                      onLockedError={setLockNotification}
                      
                      /* Sélection Optimisée */
                      selectedCell={appointmentLogic.selectedCell}
                      selectedAppointmentId={appointmentLogic.selectedAppointment?.IdPlanningEvenement}
                      onSelectCell={appointmentLogic.setSelectedCell}
                      onSelectAppointment={appointmentLogic.setSelectedAppointment}
                    />
                  )
                ) : (
                  /* VUES TABLEAUX (Chantier, Paie, Employés) */
                  <Suspense fallback={<LoadingFallback message="Chargement du tableau..." />}>
                    <DataTableFrame 
                      categoriesStructure={getTableStructure(
                        viewState.viewType, 
                        {
                          handleOpenEditModal: appointmentLogic.handleOpenEditModal,
                          onImageClick: interaction.handleOpenImageModal,
                          initialTeams: dataLayer.initialTeams,
                          onTeamChange: dataLayer.updateEmployeeGroup,
                          ressources: dataLayer.itemsRef.current
                        }
                      ) || []}
                      realtimeUpdate={lastMercureEvent}
                      enablePagination={true}
                      paginatedSearchFunction={handlePaginatedSearch}
                      refreshKey={dataLayer.appointmentsVersion}
                      loadingElement={<LoadingFallback message="Chargement des données..." />}
                      showGroupHeaders={viewState.viewType === 'chantier-table'}
                      onRightClick={interaction.handleDataTableContextMenu}
                      heightCell={60}
                  />
                  </Suspense>
                )}
              </div>
            </div>
          </div>

          {/* --- COMPOSANTS FLOTTANTS & MODALES --- */}
          
          {!viewState.isMobile && (
            <ThemeSelector position='bottom-right' onThemeChange={onThemeChange} />
          )}

          <RightClickComponent
            open={!!interaction.contextMenu}
            coordinates={interaction.contextMenu}
            rightClickItem={interaction.contextMenu?.item || []}
            onClose={interaction.closeContextMenu} 
            clipBoardAppointment={appointmentLogic.clipboardAppointment} // Le clipboard est interne au hook, on peut le retirer d'ici si le composant ne l'utilise pas pour l'affichage
          />

          {/* Gestion centralisée de toutes les modales */}
          <CalendarModals 
            user={user}
            modalsState={{
              isModalOpen: appointmentLogic.isModalOpen,
              isSettingsOpen: viewState.isSettingsOpen,
              isFilterModalOpen: viewState.isFilterModalOpen,
              isImageSelectorOpen: interaction.isImageSelectorOpen,
              isConfigModalOpen: viewState.calendarConfigHook.isConfigModalOpen,
              repeatData: appointmentLogic.repeatData,
              extendData: appointmentLogic.extendData,
              modalInfo: viewState.modalInfo,
              selectedAppointmentForm: appointmentLogic.selectedAppointment,
              deleteConfirmData: deleteConfirmData,
              tagPlacement: viewState.tagPlacement,
            }}
            handlers={{
              closeModal: () => appointmentLogic.setIsModalOpen(false),
              saveAppointment: appointmentLogic.handleSaveAppointment,
              handleAddManualRessource: appointmentLogic.handleAddManualRessource,
              handleEditRessource: appointmentLogic.handleEditRessource,
              handleDeleteManualRessource: (dimensionId: number, forceDelete: boolean = false) => {
                const result = appointmentLogic.handleDeleteManualRessource(dimensionId, forceDelete);
                if (result.success) {
                  notificationService.info('Suppression réussie', result.message);
                }
                return result;
              },
              handleDeactivateDimension: (dimensionId: number) => {
                const result = appointmentLogic.handleDeactivateDimension(dimensionId);
                if (result.success) {
                  notificationService.info('Désactivation réussie', result.message);
                }
                return result;
              },
              setDeleteConfirmData: setDeleteConfirmData,
              
              // Repeat / Extend
              setRepeatData: appointmentLogic.setRepeatData,
              handleRepeat: appointmentLogic.handleRepeat,
              setExtendData: appointmentLogic.setExtendData,
              handleExtend: appointmentLogic.handleExtend,
              
              // Images
              closeImageModal: interaction.handleCloseImageModal,
              handleImageSelect: (newImageUrl) => {
                // Logique de décision basée sur la vue active
                if (viewState.viewType === 'employee-table') {
                    const id = appointmentLogic.selectedEmployee?.IdPersonnel || null;
                    if (id === null) return;                    
                    dataLayer.updateEmployeeImage(id, newImageUrl);
                } else {
                  const id = appointmentLogic.selectedItem?.IdPlanningRessource || null;
                    if (id === null) return;                    
                    appointmentLogic.setSelectedItem(prev => {
                        if (prev) {
                            return { ...prev, image: newImageUrl };
                        }
                        return prev;
                    });
                }
                // Fermer la modale via l'interaction
                interaction.handleCloseImageModal();
              },
              handleImageUpload: interaction.handleImageUpload,
              openImageModalForEvent: () => interaction.handleOpenImageModal(),

              // Settings & Config
              closeSettings: () => viewState.setIsSettingsOpen(false),
              closeFilterModal: () => viewState.setIsFilterModalOpen(false),
              submitFilters: (f) => viewState.setActiveFilters(f),
              clearFilters: () => viewState.setActiveFilters({ empty: [] }),
              
              closeConfigModal: viewState.calendarConfigHook.closeConfigModal,
              setCurrentConfig: viewState.onCalendarConfigChange,
              saveCustomConfig: viewState.calendarConfigHook.saveConfig,
              deleteCustomConfig: (id) => {
                 viewState.calendarConfigHook.deleteConfig(id);
                 notificationService.info('Configuration supprimée', 'La vue a été supprimée avec succès');
              },
              duplicateConfig: async (c) => {
                 const newConfig = {...c, name: c.LibellePlanningVue + ' (copie)'};
                 const savedConfig = await viewState.calendarConfigHook.addConfig(newConfig);
                 if (savedConfig) {
                   notificationService.configSaved(savedConfig.LibellePlanningVue);
                   return savedConfig;
                 }
                 return newConfig;
              },
              setEditingConfig: viewState.calendarConfigHook.setEditingConfig,
              setIsCreatingConfig: viewState.calendarConfigHook.setIsCreatingConfig,

              // Correction : Setter pour l'item sélectionné
              setSelectedItem: appointmentLogic.setSelectedItem,
              onLockedError: setLockNotification,
              
              addNonWorkingDatesToPlanning: calendarConfigService.addNonWorkingDatesToPlanning,
              removeNonWorkingDatesFromPlanning: calendarConfigService.removeNonWorkingDatesFromPlanning,
            }}
            data={{
              appointments: dataLayer.appointmentsRef.current,
              items: dataLayer.itemsRef.current,
              employees: globalEmployees,
              selectedItem: appointmentLogic.selectedItem,
              selectedEmployee: appointmentLogic.selectedEmployee,
              // Correction : Passer les images disponibles
              availableImages: dataLayer.availableImages, 
              // Correction : Passer la config de filtre calculée
              filterConfig: filterConfig, 
              isUploading: interaction.isUploading,
              uploadError: interaction.uploadError,
              
              editingConfig: viewState.calendarConfigHook.editingConfig,
              isCreatingConfig: viewState.calendarConfigHook.isCreatingConfig,
              availableConfigs: viewState.availableConfigs,
              currentConfig: viewState.currentCalendarConfig,
            }}
            config={{
              includeWeekend: viewState.includeWeekend,
              setIncludeWeekend: viewState.setIncludeWeekend,
              respectNonWorkingDays: viewState.respectNonWorkingDays,
              setRespectNonWorkingDays: viewState.setRespectNonWorkingDays,
              nonWorkingDates: viewState.nonWorkingDates,
              setNonWorkingDates: viewState.setNonWorkingDates,
              tagPlacement: viewState.tagPlacement,
              setTagPlacement: viewState.setTagPlacement,
              HALF_DAY_INTERVALS: viewState.constants.intervals,
              isFullDay: viewState.isFullDay,
              isDisplayWeekend: viewState.isDisplayWeekend,
              viewType: viewState.viewType,
            }}
          />

          <Notificationspanel 
            isOpen={viewState.isNotificationsPanelOpen}
            onClose={() => viewState.setIsNotificationsPanelOpen(false)}
            notifications={notifications.notifications}
            onMarkAsRead={notifications.markAsRead}
            onRemove={notifications.removeNotification}
            onClearAll={notifications.clearAll}
          />

          <AlertModal
            alertState={appointmentLogic.alertState}
            confirmLabel="Confirmer"
            cancelLabel="Annuler"
            onClose={() =>  appointmentLogic.alertState.onCancel()}
            fetchToLockAppointment={appointmentLogic.alertState.fetchToLockAppointment}
          />

          <SearchOverlay
            isOpen={viewState.isSearchOverlayOpen}
            onClose={() => viewState.setIsSearchOverlayOpen(false)}
            onSearch={searchOverlayItems}
            onItemAction={handleSearchOverlayItemAction}
            placeholder="Rechercher un événement..."
            emptyStateConfig={{
              noInput: { title: "Rechercher un événement", description: "Tapez pour rechercher parmi les chantiers, absences et autres événements" },
              noResults: { title: "Aucun résultat", description: "Aucun événement ne correspond à votre recherche" }
            }}
            renderItem={(event: any, index: number) => (                            
              <DraggableSource
                key={`${event.label}-${event.id}-${index}`}
                id={event.id as number}
                item={event as Item}
                imageUrl={event.image?.image}
                title={event.label}
                type={(event as any).Type as "Projet" | "Paie" | "Rubrique Perso"}
                className="w-full"
              />
            )}
            actionLabel="+"
            enableDragDetection={true}
          />

          {/* Indicateur de chargement global */}
          {dataLayer.isLoading && (
             <div className="fixed top-0 left-0 w-full h-1 bg-primary z-50">
               <div className="h-full bg-primary animate-pulse w-1/3 rounded-r-full" />
             </div>
          )}

        </div>
      </DndProvider>
    </NoSSR>
  );
}