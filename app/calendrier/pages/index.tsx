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
import React, { useEffect, useRef, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// --- COMPOSANTS UI ---
import { 
  CalendarGrid, 
  DataTableFrame, 
  ThemeSelector, 
  RightClickComponent,
  Notificationspanel,
  AlertModal,
  SearchOverlay,
  CalendarHeader,
  CalendarModals
} from '@/app/calendrier/components';

// --- CUSTOM HOOKS ---
import { useCalendarView } from "../hooks/useCalendarView";
import { useTimeline } from "../hooks/useTimeline";
import { useDataLayer } from "../hooks/useDataLayer";
import { useAppointmentLogic } from "../hooks/useAppointmentLogic";
import { useInteraction } from "../hooks/useInteraction";
import { useTheme } from '../utils/themeManager';
import { useNotifications } from "../hooks";

// --- CONTEXTES & SERVICES ---
import { notificationService } from "../services";
import { SelectedAppointmentContext } from "../context/SelectedAppointmentContext";
import { SelectedCellContext } from "../context/SelectedCellContext";

// --- UTILITAIRES ---
import { getEmployees, getImages } from "../../datasource"; // Ajout de getImages
import { customRenderersFactory, customComputedFieldsFactory } from "../utils/factories";
import { createSearchAndFilterUtils, FilterType } from "../utils/searchAndFilterUtils"; // Ajout pour les filtres

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
  user,
  onThemeChange,
}: {
  user: { id: number, name: string, role: string, theme: string, image: string };
  onThemeChange?: (theme: any) => void;
}) {
  // 1. SERVICES GLOBAUX
  const { theme, setTheme } = useTheme();
  const notifications = useNotifications();

  // Refs de données statiques
  const globalEmployeesRef = useRef(getEmployees());
  const availableImagesRef = useRef(getImages()); // Images pour le sélecteur

  // 2. ÉTAT DE LA VUE (Préférences, Modales, Filtres)
  const viewState = useCalendarView(globalEmployeesRef);

  // 3. COUCHE DE DONNÉES (Employés, RDV, Événements)
  const dataLayer = useDataLayer({ 
    viewType: viewState.viewType, 
    filters: viewState.activeFilters,
    calendarConfig: viewState.currentCalendarConfig
  });

  // 4. LOGIQUE TEMPORELLE (Scroll, Dates)
  const timeline = useTimeline({
    isDisplayWeekend: viewState.isDisplayWeekend,
    selectedDate: viewState.selectedDate,
    viewType: viewState.viewType
  });

  // 5. LOGIQUE MÉTIER (CRUD, Règles de gestion, Historique)
  const appointmentLogic = useAppointmentLogic({
    appointmentsRef: dataLayer.appointmentsRef,
    employeesRef: dataLayer.employeesRef,
    eventsRef: dataLayer.eventsRef,
    timelineState: { 
      isFullDay: viewState.isFullDay, 
      isDisplayWeekend: viewState.isDisplayWeekend,
      includeWeekend: viewState.includeWeekend,
      respectNonWorkingDays: viewState.respectNonWorkingDays,
      nonWorkingDates: viewState.nonWorkingDates
    },
    onUpdate: dataLayer.refreshData // Callback pour rafraichir l'UI après modification des Refs
  });

  // 6. INTERACTIONS UTILISATEUR (Clic droit, Clavier, Copier/Coller)
  const interaction = useInteraction({
    selectedAppointment: appointmentLogic.selectedAppointment,
    setSelectedAppointment: appointmentLogic.setSelectedAppointment,
    selectedCell: appointmentLogic.selectedCell,
    setSelectedCell: appointmentLogic.setSelectedCell,
    copyAppointment: appointmentLogic.copyAppointmentToClipboard,
    pasteAppointment: appointmentLogic.pasteAppointment,
    undoAction: appointmentLogic.undoLastAction,
    deleteAction: appointmentLogic.handleDeleteAppointmentConfirm,
    openSearch: () => viewState.setIsSearchOverlayOpen(true),
    handleOpenEditModal: appointmentLogic.handleOpenEditModal,
    handleRepeat: () => viewState.setModalInfo({ message: "Configuration de la répétition...", color: "blue" }),
    handleExtend: () => appointmentLogic.setExtendData(new Date()),
    handleDivide: (id) => appointmentLogic.handleDivideConfirm && appointmentLogic.handleDivideConfirm(),
    
    // Constantes pour calculs d'interaction
    isFullDay: viewState.isFullDay,
    DAY_INTERVALS: viewState.constants.intervals,
    HALF_DAY_INTERVALS: viewState.constants.intervals,
    viewType: viewState.viewType
  });

  // --- CONFIGURATION DES FILTRES (Pour FilterModal) ---
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
          chargeAffaire: { label: 'Chargé Aff.', type: 'combobox' as FilterType }, 
          chefChantier: { label: 'Chef Ch.', type: 'combobox' as FilterType }
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
        dataLayer.eventsRef.current, 
        viewState.viewType === 'chantier-table' ? 'chantier' : null,
        keyOfFilter
      );
      
      // Enrichir avec les filtres actifs
      return {
        ...baseConfig,
        activeFilters: viewState.activeFilters
      };
  }, [searchUtils, dataLayer.eventsRef.current, viewState.viewType, keyOfFilter, viewState.activeFilters]);


  // --- PREPARATION DES TABLEAUX (Correction TS) ---
  
  // Calcul des champs calculés spécifiques à la vue actuelle
  const currentComputedFields = useMemo(() => {
    const allFields = customComputedFieldsFactory(viewState.viewType, dataLayer.appointmentsRef.current);
    if (viewState.viewType === 'chantier-table') return allFields.chantierTable;
    if (viewState.viewType === 'paie-table') return allFields.paieTable;
    return undefined;
  }, [viewState.viewType, dataLayer.appointmentsRef]);

  // --- EFFETS DE BORD ---

  // Init: Services & Thème
  useEffect(() => {
    notificationService.setNotificationCallback(notifications.addNotification);
    if (user.theme) setTheme(user.theme as any);
  }, [notifications.addNotification, user.theme, setTheme]);

  // Init: Raccourcis Clavier Globaux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      interaction.handleGlobalKeyboard(e);
      if (viewState.viewType === 'calendar') {
        timeline.handleKeyboardScroll(e);
      }
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        // Logique supplémentaire si nécessaire
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => timeline.handleKeyboardScrollStop(e);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [interaction, timeline, viewState.viewType]);

  // Init: Centrage sur la date lors du changement de vue
  useEffect(() => {
    if (viewState.viewType === 'calendar') {
      timeline.goToDate(viewState.selectedDate);
    }
  }, [viewState.viewType]);


  // --- RENDU VISUEL ---

  return (
    <NoSSR>
      <DndProvider backend={HTML5Backend}>
        <div className="h-screen flex flex-col overflow-hidden bg-bg-primary poppins">
          
          {/* HEADER : Navigation et Contrôles */}
          {!viewState.isMobile && (
            <CalendarHeader 
              theme={theme}
              user={user}
              viewState={viewState}
              notifications={notifications}
              onNavigateDate={timeline.goToDate}
            />
          )}

          {/* CORPS PRINCIPAL : Grille ou Tableaux */}
          <div className="flex-1 flex min-h-0">
            <div className={`flex flex-grow rounded-2xl border-gray-200 ${!viewState.isMobile ? 'mt-8' : ''}`} tabIndex={0} style={{ outline: "none" }}>
              <div className={`flex-grow rounded-lg w-full h-full pb-4 ${dataLayer.isLoading ? "pointer-events-none opacity-60" : ""}`}>
                
                {/* Injection des contextes pour les composants enfants */}
                <SelectedAppointmentContext.Provider value={{ 
                  selectedAppointment: appointmentLogic.selectedAppointment, 
                  setSelectedAppointment: appointmentLogic.setSelectedAppointment
                }}>
                  <SelectedCellContext.Provider value={{ 
                    selectedCell: appointmentLogic.selectedCell, 
                    setSelectedCell: appointmentLogic.setSelectedCell 
                  }}>
                    
                    {viewState.viewType === 'calendar' ? (
                      /* VUE PLANNING */
                      viewState.currentCalendarConfig ? (
                        <CalendarGrid
                          /* Données */
                          employees={dataLayer.filteredEmployees}
                          appointments={dataLayer.filteredAppointments}
                          initialTeams={dataLayer.initialTeams}
                          events={dataLayer.eventsRef.current}
                          
                          /* État Temporel */
                          dayInTimeline={timeline.days}
                          mainScrollRef={timeline.scrollRef}
                          handleScroll={timeline.handleScroll}
                          
                          /* Configuration */
                          isDisplayWeekend={viewState.isDisplayWeekend}
                          isFullDay={viewState.isFullDay}
                          isMobile={viewState.isMobile}
                          nonWorkingDates={viewState.nonWorkingDates}
                          HALF_DAY_INTERVALS={viewState.constants.intervals}
                          
                          /* Config Calendrier */
                          calendarConfig={viewState.currentCalendarConfig}
                          onCalendarConfigChange={viewState.setCurrentCalendarConfig}
                          availableConfigs={viewState.availableConfigs}
                          
                          /* Actions & Events */
                          onAppointmentMoved={appointmentLogic.moveAppointment}
                          onCellDoubleClick={() => viewState.setIsSearchOverlayOpen(true)}
                          onAppointmentDoubleClick={appointmentLogic.handleOpenEditModal}
                          onExternalDragDrop={appointmentLogic.createAppointmentFromDrag}
                          handleContextMenu={interaction.handleContextMenu}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500">Chargement configuration...</div>
                      )
                    ) : (
                      /* VUES TABLEAUX (Chantier, Paie, Employés) */
                      <DataTableFrame 
                        items={dataLayer.getTableItems()} 
                        categoriesStructure={dataLayer.getTableStructure() || []}
                        // Correction TS : Extraction de la propriété spécifique ou undefined
                        computedFields={currentComputedFields as any}
                        // Correction TS : Cast explicite pour satisfaire Record<string, ...>
                        customRenderers={customRenderersFactory(viewState.viewType, dataLayer.employeesRef.current, interaction.handleOpenImageModal) as any}
                        showGroupHeaders={viewState.viewType === 'chantier-table'}
                        onRightClick={interaction.handleDataTableContextMenu}
                      />
                    )}

                  </SelectedCellContext.Provider>
                </SelectedAppointmentContext.Provider>
              </div>
            </div>
          </div>

          {/* --- COMPOSANTS FLOTTANTS & MODALES --- */}
          
          <ThemeSelector position='bottom-right' onThemeChange={onThemeChange} />

          <RightClickComponent
            open={!!interaction.contextMenu}
            coordinates={interaction.contextMenu}
            rightClickItem={interaction.contextMenu?.item || []}
            onClose={interaction.closeContextMenu} 
            clipBoardAppointment={appointmentLogic.clipboardAppointment} // Le clipboard est interne au hook, on peut le retirer d'ici si le composant ne l'utilise pas pour l'affichage
          />

          {/* Gestion centralisée de toutes les modales */}
          <CalendarModals 
            modalsState={{
              isModalOpen: appointmentLogic.isModalOpen,
              isSettingsOpen: viewState.isSettingsOpen,
              isFilterModalOpen: viewState.isFilterModalOpen,
              isImageSelectorOpen: interaction.isImageSelectorOpen,
              isConfigModalOpen: viewState.calendarConfigHook.isConfigModalOpen,
              repeatData: appointmentLogic.repeatData,
              extendData: appointmentLogic.extendData,
              modalInfo: viewState.modalInfo,
              selectedAppointmentForm: appointmentLogic.selectedAppointmentForm
            }}
            handlers={{
              closeModal: () => appointmentLogic.setIsModalOpen(false),
              saveAppointment: appointmentLogic.handleSaveAppointment,
              
              // Repeat / Extend
              setRepeatData: appointmentLogic.setRepeatData,
              handleRepeat: appointmentLogic.handleRepeat,
              setExtendData: appointmentLogic.setExtendData,
              handleExtend: appointmentLogic.handleExtend,
              
              // Images
              closeImageModal: interaction.handleCloseImageModal,
              handleImageSelect: (src) => { /* Logique d'image */ },
              handleImageUpload: interaction.handleImageUpload,
              openImageModalForEvent: interaction.handleOpenImageModal,

              // Settings & Config
              closeSettings: () => viewState.setIsSettingsOpen(false),
              closeFilterModal: () => viewState.setIsFilterModalOpen(false),
              submitFilters: (f) => viewState.setActiveFilters(f),
              clearFilters: () => viewState.setActiveFilters({ empty: [] }),
              
              closeConfigModal: viewState.calendarConfigHook.closeConfigModal,
              setCurrentConfig: viewState.setCurrentCalendarConfig,
              saveCustomConfig: (c) => { 
                 const newConfig = {...c, id: Date.now()};
                 viewState.calendarConfigHook.addConfig(newConfig); 
                 notificationService.configSaved(c.name);
                 return newConfig;
              },
              updateCustomConfig: (c) => { 
                 viewState.calendarConfigHook.updateConfig(c);
                 notificationService.configUpdated(c.name);
              },
              deleteCustomConfig: (id) => {
                 viewState.calendarConfigHook.deleteConfig(id);
              },
              duplicateConfig: (c) => {
                 const newConfig = {...c, id: Date.now(), name: c.name + ' (copie)'};
                 viewState.calendarConfigHook.addConfig(newConfig);
                 return newConfig;
              },
              setEditingConfig: viewState.calendarConfigHook.setEditingConfig,
              setIsCreatingConfig: viewState.calendarConfigHook.setIsCreatingConfig,
            }}
            data={{
              appointments: dataLayer.appointmentsRef.current,
              events: dataLayer.eventsRef.current,
              employees: dataLayer.employeesRef.current,
              // Correction : Passer les images disponibles
              availableImages: availableImagesRef.current, 
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
              HALF_DAY_INTERVALS: viewState.constants.intervals,
              isFullDay: viewState.isFullDay,
              isDisplayWeekend: viewState.isDisplayWeekend,
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
            isOpen={appointmentLogic.alertState.isVisible}
            title={appointmentLogic.alertState.title}
            confirmLabel="Confirmer"
            cancelLabel="Annuler"
            onConfirm={appointmentLogic.alertState.onConfirm}
            onClose={() => appointmentLogic.setAlertState(prev => ({...prev, isVisible: false}))}
          />

          <SearchOverlay
            isOpen={viewState.isSearchOverlayOpen}
            onClose={() => viewState.setIsSearchOverlayOpen(false)}
            searchInput={""}
            setSearchInput={() => {}}
            items={dataLayer.filteredEvent}
            onItemAction={appointmentLogic.handleSearchItemAction}
            placeholder="Rechercher un événement..."
            emptyStateConfig={{
              noInput: { title: "Rechercher", description: "Tapez pour rechercher..." },
              noResults: { title: "Aucun résultat", description: "Rien trouvé." }
            }}
            renderItem={(event) => (
               <div className="p-2 border-b hover:bg-gray-50 cursor-pointer">{event.label}</div> 
            )}
            actionLabel="+"
            enableDragDetection={true}
          />

          {/* Indicateur de chargement global */}
          {dataLayer.isLoading && (
             <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 z-50">
               <div className="h-full bg-blue-600 animate-pulse w-1/3 rounded-r-full" />
             </div>
          )}

        </div>
      </DndProvider>
    </NoSSR>
  );
}