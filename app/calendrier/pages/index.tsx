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
import React, { useEffect, useRef, useMemo, use, useCallback, lazy, Suspense, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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


// --- COMPOSANTS UI AVEC CODE SPLITTING ---
const CalendarGrid = lazy(() => import('@/app/calendrier/components').then(mod => ({ default: mod.CalendarGrid })));
const DataTableFrame = lazy(() => import('@/app/calendrier/components').then(mod => ({ default: mod.DataTableFrame })));
const ManualEventsManager = lazy(() => import('@/app/calendrier/components').then(mod => ({ default: mod.ManualEventsManager })));

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

// --- UTILITAIRES ---
import { getEmployees } from "../../datasource"; // Ajout de getImages
import { customRenderersFactory, customComputedFieldsFactory } from "../utils/factories";
import { createSearchAndFilterUtils, FilterType } from "../utils/searchAndFilterUtils"; // Ajout pour les filtres
import { User, Item, CommonPaieAttributs } from '../types';

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
  user,
  onThemeChange,
}: {
  user: User;
  onThemeChange?: (theme: any) => void;
}) {
  // 1. SERVICES GLOBAUX
  const { theme, setTheme } = useTheme();
  const notifications = useNotifications();

  // État pour la confirmation de suppression de rubrique
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ item: Item, isUsedInPlanning: boolean, isActive: boolean } | null>(null);

  // Refs de données statiques
  const globalEmployeesRef = useRef(getEmployees());

  // 2. ÉTAT DE LA VUE (Préférences, Modales, Filtres)
  const viewState = useCalendarView(globalEmployeesRef, user);

  // 3. COUCHE DE DONNÉES (Employés, RDV, Événements)
  const dataLayer = useDataLayer({ 
    viewType: viewState.viewType, 
    searchQuery: viewState.searchInput || viewState.dimensionSearchInput,
    filters: viewState.activeFilters,
    calendarConfig: viewState.currentCalendarConfig,
    globalEmployeesRef,
    isSearchOverlayOpen: viewState.isSearchOverlayOpen,
    // Activer la collaboration
    enableCollaboration: true,
    userId: user?.id ? String(user.id) : 'anonymous',
    userName: user?.nom ? `${user.nom} ${user.prenom}` : 'Utilisateur'
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
    employeesRef: globalEmployeesRef,
    appointmentsRef: dataLayer.appointmentsRef,
    eventsRef: dataLayer.itemsRef,
    timelineState,
    onUpdate: dataLayer.refreshData, // Callback pour rafraichir l'UI après modification des Refs
    setIsSearchOverlayOpen: viewState.setIsSearchOverlayOpen,
    setDimensionsSearchInput: viewState.setDimensionsSearchInput,
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
    handleExtend: () => appointmentLogic.setExtendData(appointmentLogic.selectedAppointment?.endDate || Date.now()),
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
        dataLayer.itemsRef.current, 
        viewState.viewType === 'chantier-table' ? 'chantier' : null,
        keyOfFilter
      );
      
      // Enrichir avec les filtres actifs
      return {
        ...baseConfig,
        activeFilters: viewState.activeFilters
      };
  }, [searchUtils, dataLayer.itemsRef.current, viewState.viewType, keyOfFilter, viewState.activeFilters]);
      


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

  // --- RENDU VISUEL ---

  return (
    <NoSSR>
      <DndProvider backend={HTML5Backend}>
        {/* Overlay de loading pendant le centrage initial */}
        {viewState.viewType === 'calendar' && timeline.isLoading && (
          <div className="fixed inset-0 bg-white/80 z-[9999] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement du calendrier...</p>
            </div>
          </div>
        )}
        <div className="h-screen flex flex-col overflow-hidden bg-bg-primary poppins">
          
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
                  viewState.currentCalendarConfig ? (
                    <Suspense fallback={<LoadingFallback message="Chargement du calendrier..." />}>
                      <CalendarGrid
                        /* Données */
                        employees={dataLayer.filteredEmployees}
                        appointments={dataLayer.filteredAppointments}
                        appointmentsDefault={dataLayer.appointmentsRef.current}
                        user={user}

                        /* Équipes & Événements */
                        initialTeams={dataLayer.initialTeams}
                        events={dataLayer.itemsRef.current}
                        
                        /* État Temporel */
                        dayInTimeline={timeline.days}
                        mainScrollRef={timeline.mainScrollRef}
                        
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
                        onCellDoubleClick={handleCellDoubleClick}
                        onAppointmentDoubleClick={appointmentLogic.handleOpenEditModal}
                        onExternalDragDrop={appointmentLogic.createAppointmentFromDrag}
                        handleContextMenu={interaction.handleContextMenu}
                        onLoadAppointmentsInRange={dataLayer.loadAppointmentsInRange}
                        mouseUpAfterScroll={timeline.getFirstDayAppearing}
                        
                        /* Sélection Optimisée */
                        selectedCell={appointmentLogic.selectedCell}
                        selectedAppointmentId={appointmentLogic.selectedAppointment?.id}
                        onSelectCell={appointmentLogic.setSelectedCell}
                        onSelectAppointment={appointmentLogic.setSelectedAppointment}
                      />
                    </Suspense>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">Chargement configuration...</div>
                  )
                ) : viewState.viewType === 'manual-event-table' ? (
                  <Suspense fallback={<LoadingFallback message="Chargement des événements..." />}>
                    <ManualEventsManager
                      events={dataLayer.filteredItems}
                      onDeleteRequest={(item) => {
                        // Vérifier si l'item est utilisé dans le planning
                        const result = appointmentLogic.handleDeleteDimension(item.id, false);
                        const isActive = 'actif' in item ? (item as CommonPaieAttributs).actif : true;
                        // Toujours ouvrir la modal de confirmation
                        setDeleteConfirmData({ 
                          item, 
                          isUsedInPlanning: result.isUsedInPlanning || false, 
                          isActive 
                        });
                      }}
                      onEditRequest={(item) => {
                        appointmentLogic.setSelectedItem(item);
                        appointmentLogic.setIsModalOpen(true);
                      }}
                    />
                  </Suspense>
                ) : (
                  /* VUES TABLEAUX (Chantier, Paie, Employés) */
                  <Suspense fallback={<LoadingFallback message="Chargement du tableau..." />}>
                    <DataTableFrame 
                    items={dataLayer.getTableItems()} 
                    categoriesStructure={dataLayer.getTableStructure() || []}
                    computedFields={currentComputedFields as any}
                    customRenderers={
                      customRenderersFactory(
                        viewState.viewType, 
                        globalEmployeesRef.current, 
                        interaction.handleOpenImageModal,
                        appointmentLogic.setSelectedAppointment,
                        appointmentLogic.handleOpenEditModal,
                        dataLayer.initialTeams,
                        dataLayer.updateEmployeeGroup
                      ) as any}
                    showGroupHeaders={viewState.viewType === 'chantier-table'}
                    onRightClick={interaction.handleDataTableContextMenu}
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
              selectedAppointmentForm: appointmentLogic.selectedAppointmentForm,
              deleteConfirmData: deleteConfirmData,
            }}
            handlers={{
              closeModal: () => appointmentLogic.setIsModalOpen(false),
              saveAppointment: appointmentLogic.handleSaveAppointment,
              handleAddDimension: appointmentLogic.handleAddDimension,
              handleEditDimension: appointmentLogic.handleEditDimension,
              handleDeleteDimension: (dimensionId: number, forceDelete: boolean = false) => {
                const result = appointmentLogic.handleDeleteDimension(dimensionId, forceDelete);
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
                    const id = appointmentLogic.selectedEmployee?.id || null;
                    if (id === null) return;                    
                    dataLayer.updateEmployeeImage(id, newImageUrl);
                } else {
                    const id = appointmentLogic.selectedItem?.id || null;
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

              // Correction : Setter pour l'item sélectionné
              setSelectedItem: appointmentLogic.setSelectedItem,
            }}
            data={{
              appointments: dataLayer.appointmentsRef.current,
              items: dataLayer.itemsRef.current,
              employees: globalEmployeesRef.current,
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
            searchInput={viewState.dimensionSearchInput}
            setSearchInput={viewState.setDimensionsSearchInput}
            items={dataLayer.filteredItems.filter(item => {
              // Filtrer les items désactivés (pour les types absence/autre)
              if ('actif' in item) {
                return item.actif !== false;
              }
              return true; // Les chantiers n'ont pas de champ actif, donc toujours actifs
            })}
            onItemAction={appointmentLogic.selectedCell ? appointmentLogic.handleSearchItemAction : undefined}
            placeholder="Rechercher un événement..."
            emptyStateConfig={{
              noInput: { title: "Rechercher un événement", description: "Tapez pour rechercher parmi les chantiers, absences et autres événements" },
              noResults: { title: "Aucun résultat", description: "Aucun événement ne correspond à votre recherche" }
            }}
            renderItem={(event: any, index: number) => (              
              <DraggableSource
                key={`${event.label}-${event.id}-${index}`}
                id={event.id as number}
                imageUrl={event.image.image}
                title={event.label}
                type={(event as any).type as "Chantier" | "Absence" | "Autre"}
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