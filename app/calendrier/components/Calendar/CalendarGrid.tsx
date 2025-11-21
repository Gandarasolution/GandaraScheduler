/**
 * @fileoverview Composant CalendarGrid - Grille principale du calendrier
 * 
 * Ce composant constitue le cœur de l'interface calendrier. Il gère l'affichage
 * de la grille temporelle avec les employés en lignes et les jours en colonnes.
 * 
 * Fonctionnalités principales :
 * - Affichage en grille avec timeline horizontale
 * - Groupement des employés par équipes ou pôles
 * - Système de filtrage avancé
 * - Drag & Drop des rendez-vous
 * - Scroll synchronisé horizontal/vertical
 * - Mode responsive mobile/desktop
 * - Gestion des week-ends et jours fériés
 * - Menu contextuel et interactions
 * 
 * @component CalendarGrid
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
import React, {useState, useMemo, memo, useCallback, useRef, useEffect, use}from 'react';
import {
  format,
  isSameDay,
  isWeekend,
  isToday,
} from 'date-fns';
import { Appointment, Employee, HalfDayInterval, Groupe, CalendarConfig, Item } from '../../types';

import { DayCell, TimelineFrame } from '../index';

import { fr } from 'date-fns/locale';
import {CELL_WIDTH, CELL_HEIGHT, MARGIN_BETWEEN_TEAMS} from '../../utils/constants'; // Constantes de style
import { getDimensionItems, groupEmployeesByDimension, applyFiltersToEmployees } from '../../utils/filters';
import CustomSelectWithImage, { SelectOptionWithImage } from '../ui/CustomSelectWithImage';

/**
 * Interface définissant les propriétés du composant CalendarGrid
 * @interface CalendarGridProps
 */
interface CalendarGridProps {
  /** Liste complète des employés */
  employees: Employee[];
  /** Liste de tous les rendez-vous */
  appointments: Appointment[];
  /** Type d'événement du rendez-vous */
  events: Item[];
  /** Groupes/équipes disponibles */
  initialTeams: Groupe[];
  /** Dates à afficher dans la timeline */
  dayInTimeline: Date[];
  /** Configuration des créneaux horaires */
  HALF_DAY_INTERVALS: HalfDayInterval[];
  /** Mode d'affichage journée complète */
  isFullDay: boolean;
  /** Dates non-travaillées (week-ends, fériés) */
  nonWorkingDates: Date[];
  /** Interface mobile activée */
  isMobile: boolean;
  /** Inclure les week-ends dans l'affichage mobile */
  isDisplayWeekend: boolean;
  /** Référence pour le scroll principal */
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  /** Gestionnaire d'événement scroll */
  handleScroll: () => void;
  /** Configuration actuelle du calendrier */
  calendarConfig: CalendarConfig;
  /** Callback de modification de configuration */
  onCalendarConfigChange: (config: CalendarConfig) => void;
  availableConfigs: CalendarConfig[]; // Configurations disponibles
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void; // Fonction pour gérer le clic droit
  onScrollElementMounted?: () => void; // Callback pour notifier que l'élément de scroll est monté
}

/**
 * Composant React CalendarGrid
 * * Affiche une grille de calendrier pour visualiser les rendez-vous des employés, regroupés par équipe,
 * sur une période donnée (timeline de jours). Gère l'affichage mobile et desktop, l'empilement des rendez-vous
 * qui se chevauchent, l'ouverture/fermeture des équipes, et l'interaction utilisateur (drag & drop, double-clic, etc.).
 * * @component
 * @param {CalendarGridProps} props - Propriétés du composant
 * @param {Employee[]} props.employees - Liste des employés à afficher
 * @param {Appointment[]} props.appointments - Liste des rendez-vous à afficher
 * @param {Team[]} props.initialTeams - Liste initiale des équipes
 * @param {Date[]} props.dayInTimeline - Liste des jours affichés dans la timeline
 * @param {number[]} props.HALF_DAY_INTERVALS - Intervalles de demi-journée pour la grille
 * @param {boolean} props.isFullDay - Indique si la vue est en journée complète
 * @param {number} props.selectedCalendarId - Identifiant du calendrier sélectionné
 * @param {Date[]} props.nonWorkingDates - Liste des jours non travaillés
 * @param {boolean} props.isMobile - Indique si l'affichage est mobile
 * @param {boolean} props.isDisplayWeekend - Indique si les week-ends sont visibles
 * @param {React.RefObject<HTMLDivElement>} props.mainScrollRef - Référence pour le scroll principal
 * @param {Function} props.onAppointmentMoved - Callback lors du déplacement d'un rendez-vous
 * @param {Function} props.handleScroll - Fonction de gestion du scroll
 * @param {Function} props.onCellDoubleClick - Callback lors du double-clic sur une cellule
 * @param {Function} props.onAppointmentDoubleClick - Callback lors du double-clic sur un rendez-vous
 * @param {Function} props.onExternalDragDrop - Callback lors d'un drag & drop externe
 * @param {Function} props.handleContextMenu - Callback lors de l'ouverture du menu contextuel
 * * @returns {JSX.Element} Grille de calendrier interactive
 */

const CalendarGrid: React.FC<CalendarGridProps> = ({
  employees,
  appointments,
  initialTeams,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  events,
//  selectedCalendarId,
  nonWorkingDates,
  isMobile,
  isDisplayWeekend,
  mainScrollRef,
  handleScroll,
  calendarConfig,
  onCalendarConfigChange,
  availableConfigs,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
  onScrollElementMounted,
}) => {



  // État pour gérer les éléments de dimension ouverts (affichés)
  const [openItems, setOpenItems] = useState<(string | number)[]>([]);
  const columnEmployeeRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);
  
  // Refs pour optimiser le système de hover
  const lastHoveredCol = useRef<number>(-1);
  const lastHoveredEmployee = useRef<string | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const isDragging = useRef(false);

  // Calculer les éléments de dimension basés sur la configuration
  const dimensionItems = useMemo(() => {
    return getDimensionItems(calendarConfig.dimension, employees, initialTeams);
  }, [calendarConfig.dimension, employees, initialTeams]);
  

  // Appliquer les filtres aux employés selon la configuration
  const filteredEmployees = useMemo(() => {
    return applyFiltersToEmployees(employees, calendarConfig.filters);
  }, [employees, calendarConfig.filters]);

  // Regrouper les employés filtrés selon la dimension
  const employeesByDimension = useMemo(() => {
    return groupEmployeesByDimension(filteredEmployees, calendarConfig.dimension, initialTeams);
  }, [filteredEmployees, calendarConfig.dimension, initialTeams]);

  // Convertir availableConfigs en format SelectOptionWithImage
  const selectOptions: SelectOptionWithImage[] = useMemo(() => {
    return availableConfigs.map(config => ({
      id: config.id,
      name: config.name,
      value: config.id,
    }));
  }, [availableConfigs]);

  // Flèche personnalisée pour le select
  const CustomArrow = ({isOpen}: {isOpen: boolean}) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      className={`bi bi-chevron-down ${isOpen ? 'rotate-180' : ''} transition-transform duration-200 ease-in-out text-[#84818a]`}
      viewBox="0 0 16 16"
    >
      <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
    </svg>
  );

  // Initialiser les éléments ouverts quand les dimensionItems changent
  useEffect(() => {
    setOpenItems(dimensionItems.map(item => item.id));
  }, [dimensionItems]);

  // Notifier le parent que la grille est montée et la ref assignée
  useEffect(() => {
    if (mainScrollRef?.current && onScrollElementMounted) {
      onScrollElementMounted();
    }
  }, [mainScrollRef, onScrollElementMounted]);

  // Fonction commune pour gérer le surlignement (hover normal et pendant drag)
  const updateHighlight = useCallback((clientX: number, clientY: number, tableElement: HTMLTableElement) => {
    if (!tableElement) return;
    
    // Calculer l'index de colonne
    const tableRect = tableElement.getBoundingClientRect();
    const mouseX = clientX - tableRect.left;
    const colIndex = Math.floor(mouseX / CELL_WIDTH);
    
    // Trouver la cellule sous la souris
    const elementAtPoint = document.elementFromPoint(clientX, clientY) as HTMLElement;
    const cell = elementAtPoint?.closest('.calendar-cell') as HTMLElement;
    
    // Trouver l'employé
    const row = cell?.closest('.calendar-row[data-employee-id]') as HTMLElement;    
    const employeeId = row ? row.getAttribute('data-employee-id') : null;
    
    
    // Si rien n'a changé, ne rien faire (optimisation majeure)
    if (colIndex === lastHoveredCol.current && employeeId === lastHoveredEmployee.current) {
      return;
    }
    
    // Mettre à jour les refs
    lastHoveredCol.current = colIndex;
    lastHoveredEmployee.current = employeeId;
    
    // Utiliser requestAnimationFrame pour des updates optimisés
    requestAnimationFrame(() => {
      // Vérifier que l'index de colonne est valide
      if (colIndex >= 0 && colIndex < dayInTimeline.length) {
        // Batch DOM updates: retirer puis ajouter
        const cellsToUpdate = tableElement.querySelectorAll('[data-hover-col="true"]');
        cellsToUpdate.forEach(c => (c as HTMLElement).removeAttribute('data-hover-col'));
        const rowsToUpdate = tableElement.querySelectorAll('[data-hover-row="true"]');
        rowsToUpdate.forEach(r => (r as HTMLElement).removeAttribute('data-hover-row'));
        
        // Marquer les nouvelles cellules (plus efficace avec children[])
        const rows = tableElement.querySelectorAll('.calendar-row');
        rows.forEach(row => {
          if (row.getAttribute('data-employee-id') === employeeId) {            
            row.setAttribute('data-hover-row', 'true');
          }
          const cellInCol = row.children[colIndex] as HTMLElement;
          if (cellInCol) {
            cellInCol.setAttribute('data-hover-col', 'true');
          }
        });

      }
      
      // Batch: retirer puis ajouter
      const employeesToUpdate = document.querySelectorAll('[data-hover="true"]');
      employeesToUpdate.forEach(emp => (emp as HTMLElement).removeAttribute('data-hover'));
      
      // Gérer le surlignage de l'employé
      if (employeeId) {
        const employeeElement = document.querySelector(
          `.employee-row-item[data-employee-id="${employeeId}"]`
        ) as HTMLElement;
        if (employeeElement) {
          employeeElement.setAttribute('data-hover', 'true');
        }
      }
    });
  }, [dayInTimeline]);

  const handleMouseOver = useCallback((e: React.MouseEvent<HTMLElement> ) => {
    const target = e.target as HTMLElement;
    
    // Trouver la cellule parente, même si on survole un rendez-vous
    const cell = target.closest('.calendar-cell') as HTMLElement;
    
    if (!cell || !cell.classList.contains('calendar-cell')) return;
    
    const table = e.currentTarget as HTMLTableElement;
    if (!table) return;
    
    updateHighlight(e.clientX, e.clientY, table);
  }, [updateHighlight]);

    const handleMouseOut = useCallback((e: React.MouseEvent<HTMLElement>) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // Vérifier si on quitte vraiment le tableau
      if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
        // Retirer tous les attributs hover en une seule passe
        const table = e.currentTarget as HTMLTableElement;
        if (table) {
          table.querySelectorAll('[data-hover-col="true"]').forEach(c => {
            (c as HTMLElement).removeAttribute('data-hover-col');
          });
        }
        
        document.querySelectorAll('[data-hover="true"]').forEach(emp => {
          (emp as HTMLElement).removeAttribute('data-hover');
        });
      }
    }, []);

  // Ouvre/ferme un élément de dimension dans la vue
  const toggleItem = (itemId: string | number) => {
    setOpenItems(open =>
      open.includes(itemId)
        ? open.filter(id => id !== itemId)
        : [...open, itemId]
    );
  };   

  // Gérer le surlignement pendant le drag
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (!isDragging.current || !tableRef.current) return;
      updateHighlight(e.clientX, e.clientY, tableRef.current);
    };

    const handleDragStart = () => {
      isDragging.current = true;
    };

    const handleDragEnd = () => {
      isDragging.current = false;
      // Nettoyer tous les highlights
      if (tableRef.current) {
        tableRef.current.querySelectorAll('[data-hover-col="true"]').forEach(c => {
          (c as HTMLElement).removeAttribute('data-hover-col');
        });
      }
      document.querySelectorAll('[data-hover="true"]').forEach(emp => {
        (emp as HTMLElement).removeAttribute('data-hover');
      });
      lastHoveredCol.current = -1;
      lastHoveredEmployee.current = null;
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
    };
  }, [updateHighlight]);

  /**
   * Calcule le nombre maximal de rendez-vous qui se chevauchent dans une liste donnée.
   *
   * @param overlapping - Tableau de rendez-vous (`Appointment[]`) à analyser pour les chevauchements.
   * * Fonctionnement :
   * - Pour chaque rendez-vous de la liste, compte combien d'autres rendez-vous se chevauchent avec lui.
   * - Initialise `maxOverlap` à 0 pour suivre le nombre maximal de chevauchements trouvés.
   * - Parcourt chaque rendez-vous (`i`) :
   * - Initialise `overlapCount` à 1 (le rendez-vous lui-même compte).
   * - Parcourt les rendez-vous suivants (`j`) :
   * - Vérifie si le rendez-vous `j` chevauche le rendez-vous `i` :
   * - `overlapping[j].startDate < overlapping[i].endDate` : le début de `j` est avant la fin de `i`
   * - `overlapping[j].endDate > overlapping[i].startDate` : la fin de `j` est après le début de `i`
   * - Si oui, incrémente `overlapCount`.
   * - Met à jour `maxOverlap` si `overlapCount` est supérieur à la valeur actuelle.
   * - Retourne le nombre maximal de chevauchements trouvé (au moins 1).
   *
   * @returns Le nombre maximal de rendez-vous qui se chevauchent dans la liste (au minimum 1).
   */
  const getMaxOverlaps = useCallback(
    (overlapping: Appointment[]) => {
    // Filtre les rendez-vous de l'employé qui touchent l'intervalle
    // Pour chaque rendez-vous, compte combien d'autres se chevauchent avec lui
    let maxOverlap = 0;
    for (let i = 0; i < overlapping.length; i++) {
      let overlapCount = 1;
      for (let j = i + 1; j < overlapping.length; j++) {
        if (i !== j &&
          overlapping[j].startDate < overlapping[i].endDate &&
          overlapping[j].endDate > overlapping[i].startDate
        ) {
          overlapCount++;
        }
      }
      if (overlapCount > maxOverlap) maxOverlap = overlapCount;
    }
    return Math.max(maxOverlap, 1);
  }, []);
  

  // Calcule la hauteur nécessaire pour chaque cellule employé/jour
  const employeeHeights = useMemo(() => {
    // useMemo mémorise le résultat pour éviter des recalculs inutiles si les dépendances ne changent pas
    if (isMobile) {
      // Si on est sur mobile, on veut calculer la hauteur pour chaque employé et chaque jour
      // On initialise un tableau pour stocker les hauteurs calculées
      const heights: { employeeId: number; dayKey: number; height: number }[] = [];

      filteredEmployees.forEach(employee => {
        // Pour chaque employé

        dayInTimeline.forEach(day => {
          // Pour chaque jour de la période affichée

          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          // On définit le début de la journée (00:00:00.000)

          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          // On définit la fin de la journée (23:59:59.999)

          const employeeAppointments = appointments.filter(
            app =>
              app.employeeId === employee.id &&
              app.startDate < dayEnd &&
              app.endDate > dayStart
          );
          // On filtre les rendez-vous de l'employé qui chevauchent ce jour

          const overlapping = getMaxOverlaps(employeeAppointments);
          // On calcule le nombre maximum de rendez-vous qui se chevauchent ce jour-là

          heights.push({
            employeeId: employee.id,
            dayKey: dayStart.getTime(),
            height:
              overlapping === 0
                ? CELL_HEIGHT
                : overlapping * CELL_HEIGHT + 2 * overlapping + 10,
          });
          // On ajoute un objet avec l'id de l'employé, la clé du jour, et la hauteur calculée
          // Si aucun chevauchement : hauteur par défaut, sinon on ajuste selon le nombre de chevauchements
        });
      });

      return heights;
      // On retourne le tableau des hauteurs pour chaque employé et chaque jour

    } else {
      // Sinon (desktop), on calcule une hauteur globale par employé sur toute la période

      return filteredEmployees.map(employee => {
        // For each employee, get all their appointments
        const employeeAppointments = appointments.filter(app => app.employeeId === employee.id);
        
        // Find the maximum number of overlapping appointments for this employee across the entire timeline
        let maxOverallOverlap = 0;
        if (employeeAppointments.length > 0) {
            // Sort by start date to process events in order
            const sortedApps = [...employeeAppointments].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
            
            // Use a simple greedy approach to find max concurrent events
            const activeSlots: { endDate: Date, count: number }[] = [];
            sortedApps.forEach(app => {
                // Remove expired slots
                for (let i = activeSlots.length - 1; i >= 0; i--) {
                    if (activeSlots[i].endDate <= app.startDate) {
                        activeSlots.splice(i, 1);
                    }
                }
                
                // Try to place the current appointment in an existing slot
                let placed = false;
                for (let i = 0; i < activeSlots.length; i++) {
                    // Check if this slot's end date doesn't conflict
                    if (activeSlots[i].endDate <= app.startDate) { // Or more complex logic if appointments can split slots
                        activeSlots[i].endDate = app.endDate;
                        placed = true;
                        break;
                    }
                }
                
                // If not placed, create a new slot
                if (!placed) {
                    activeSlots.push({ endDate: app.endDate, count: activeSlots.length }); // Use count to assign 'top'
                }
                
                // Update max overlap based on current active slots
                maxOverallOverlap = Math.max(maxOverallOverlap, activeSlots.length);
            });
        }

        // If no appointments, default to CELL_HEIGHT. Otherwise, calculate based on max overlaps.
        const calculatedHeight = maxOverallOverlap === 0
            ? CELL_HEIGHT
            : (maxOverallOverlap * CELL_HEIGHT) + (2 * maxOverallOverlap) + 10; // 2*overlap for spacing, 10 for padding

        return { employeeId: employee.id, height: calculatedHeight, dayKey: undefined };
      });
    }
  }, [filteredEmployees, appointments, dayInTimeline, isMobile]);
  // Les dépendances : recalcul si l'une d'elles change

  
  /**
   * Attribue à chaque rendez-vous (`Appointment`) un indice de "pile" (`top`) pour l'affichage dans une grille de calendrier,
   * en tenant compte des chevauchements entre rendez-vous pour chaque employé.
   *
   * @param appointments - Liste des rendez-vous à traiter.
   * @param isMobile - Indique si l'affichage est en mode mobile (pile par jour) ou desktop (pile globale).
   * @param dayInTimeline - Tableau des dates représentant chaque jour affiché dans la timeline.
   * @returns Un tableau de rendez-vous enrichis avec la propriété `top` (indice de pile) et, en mode mobile, `_dayKey` (identifiant du jour).
   *
   * @remarks
   * - En mode mobile, les rendez-vous sont empilés par jour et par employé : pour chaque jour, on calcule les chevauchements et on attribue un indice de pile.
   * - En mode desktop, l'empilement est calculé globalement sur toute la période pour chaque employé.
   * - La propriété `top` permet de positionner verticalement les rendez-vous qui se chevauchent dans la grille.
   * - La propriété `_dayKey` (uniquement en mobile) permet d'identifier le jour associé à la pile.
   *
   * @example
   * // Utilisation pour afficher les rendez-vous dans une grille :
   * const appointmentsWithTop = assignAppointmentTops(appointments, isMobile, , days);
   */
  const assignAppointmentTops = useCallback((appointments: Appointment[], isMobile: boolean, dayInTimeline: Date[]) => {
    const result: (Appointment & { top: number, _dayKey?: number })[] = [];

    filteredEmployees.forEach(emp => {
      if (isMobile) {
        // Pour chaque jour, on empile les RDV qui se chevauchent ce jour-là
        dayInTimeline.forEach(day => {
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);

          // RDV de l'employé qui touchent ce jour
          const dayAppointments = appointments
            .filter(app =>
              app.employeeId === emp.id &&
              app.startDate < dayEnd && app.endDate > dayStart
            )
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

          // Empilement par chevauchement sur la journée
          const slots: Appointment[][] = [];
          dayAppointments.forEach(app => {
            let slotIndex = 0;
            while (
              slots[slotIndex] &&
              slots[slotIndex].some(other =>
                !(app.endDate <= other.startDate || app.startDate >= other.endDate)
              )
            ) {
              slotIndex++;
            }
            if (!slots[slotIndex]) slots[slotIndex] = [];
            slots[slotIndex].push(app);
            // On ajoute la propriété top spécifique à ce jour
            result.push({ ...app, top: slotIndex, _dayKey: dayStart.getTime() });
          });
        });
      } else {
        // Desktop : logique d'empilement globale sur toute la période
        const sorted = [...appointments]
          .filter(app => app.employeeId === emp.id)
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const slots: Appointment[][] = [];
        sorted.forEach(app => {
          let slotIndex = 0;
          while (
            slots[slotIndex] &&
            slots[slotIndex].some(other =>
              !(app.endDate <= other.startDate || app.startDate >= other.endDate)
            )
          ) {
            slotIndex++;
          }
          if (!slots[slotIndex]) slots[slotIndex] = [];
          slots[slotIndex].push(app);
          result.push({ ...app, top: slotIndex});
        });
      }
    });
    return result;
  }, [filteredEmployees, appointments, dayInTimeline, isMobile]);

  // Calcule les tops uniquement entre les rendez-vous de cet employé
  const appointmentsWithTop = useMemo(() => {
    return assignAppointmentTops(appointments, isMobile, dayInTimeline);
  }, [assignAppointmentTops, appointments, isMobile, dayInTimeline]);

  
  const handleScrollY = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!mainScrollRef.current || !columnEmployeeRef.current) return;

    if (isSyncingScroll.current) {
      isSyncingScroll.current = false;
      return;
    }

    if (mainScrollRef.current === e.currentTarget) {
      isSyncingScroll.current = true;
      columnEmployeeRef.current.scrollTop = mainScrollRef.current.scrollTop;
    } else if (columnEmployeeRef.current === e.currentTarget) {
      isSyncingScroll.current = true;
      mainScrollRef.current.scrollTop = columnEmployeeRef.current.scrollTop;
    }
  }, []);

  
  if (isMobile) {
    const displayEmployee = employees[0];
    return (
      <div className="relative h-full w-full poppins"> {/* Enable vertical scrolling */}
        {/* Employee Header (fixed at top) */}
        <div className="mobile-employee-header sticky top-0 z-30 flex items-center justify-center">
          {displayEmployee.image && (
            <img
              src={displayEmployee.image?.image}
              alt={displayEmployee.name}
              className="employee-avatar w-14 h-14 rounded-full mr-4"
              onError={(e) => { e.currentTarget.src = `https://placehold.co/56x56/cccccc/333333?text=${displayEmployee.name.charAt(0)}`; }}
            />
          )}
          <span className="employee-name">{displayEmployee.name}</span>
        </div>

        {/* Main content area - vertical list of days */}
        <div className="flex flex-col w-full">
          {dayInTimeline.map((day, index) => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);
            const dayEmployeeAppointments = appointmentsWithTop.filter((app) =>
              app.employeeId === displayEmployee.id &&
              app._dayKey === dayStart.getTime()
            );

            const rowHeight = isMobile
              ? employeeHeights.find(e => e.employeeId === displayEmployee.id && e.dayKey === dayStart.getTime())?.height ?? CELL_HEIGHT
              : employeeHeights.find(e => e.employeeId === displayEmployee.id)?.height ?? CELL_HEIGHT;
            return (
              <div key={`day-section-${format(day, 'yyyy-MM-dd')}`} className="border-b border-gray-200">
                {/* Date Header for each day */}
                <div
                  className={`
                    mobile-day-header flex flex-col items-center justify-center
                    ${isWeekend(day) ? 'weekend' : ''}
                    ${isSameDay(day, new Date()) ? 'today' : ''}
                  `}
                >
                  <span className="day-title">{format(day, 'EEEE d MMMM', { locale: fr })}</span>
                  {/* Numéro de semaine retiré temporairement pour simplifier */}
                </div>

                {/* DayCell for the single employee */}
                <div className={`mobile-day-cell ${isWeekend(day) ? 'weekend' : ''}`}>
                  <DayCell
                    day={day}
                    employee={displayEmployee}
                    appointments={dayEmployeeAppointments}
                    intervals={HALF_DAY_INTERVALS}
                    isFullDay={isFullDay}
                    nonWorkingDates={nonWorkingDates}
                    isMobile={isMobile}
                    events={events}
                    RowHeight={dayEmployeeAppointments.length > 0 ? rowHeight : CELL_HEIGHT}
                    onAppointmentMoved={onAppointmentMoved}
                    onCellDoubleClick={onCellDoubleClick}
                    onAppointmentClick={onAppointmentDoubleClick}
                    onExternalDragDrop={onExternalDragDrop}
                    isWeekend={isWeekend(day)}
                    handleContextMenu={handleContextMenu}
                    isCellActive={true} // Always active for the displayed employee
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )
  }
  else return (
      <div className="relative flex h-full flex-row calendar-grid">
        {/* Colonne employés sticky à gauche */}
        <div
          className="min-w-80 max-w-80 pl-2 bg-transparent flex flex-col sticky left-0 z-50 pr-7 overflow-y-scroll scrollbar-hide"
          style={{
            scrollbarGutter: 'stable',
          }}
          onScroll={handleScrollY}
          ref={columnEmployeeRef}
        >
          <div 
            className="h-[112px] sticky top-0 z-10 flex items-center bg-bg-primary justify-center pb-2 flex-shrink-0"
          >
            <div className="custom-select-wrapper relative inline-block w-full">
              <CustomSelectWithImage
                options={selectOptions}
                value={calendarConfig.id}
                onChange={(value) => {
                  const selectedConfig = availableConfigs.find(config => config.id === value);                  
                  if (selectedConfig) {
                    onCalendarConfigChange(selectedConfig);
                  }
                }}
                illustrationImage={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 10 80 80" width="25" height="25">
                    <defs>
                      <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00c6ff"/>
                        <stop offset="100%" stopColor="#0072ff"/>
                      </linearGradient>
                      <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8e2de2"/>
                        <stop offset="100%" stopColor="#4a00e0"/>
                      </linearGradient>
                    </defs>
                    <path d="M20 40 Q50 10 80 40 L60 50 Q40 60 20 40 Z" fill="url(#gradBlue)"/>
                    <path d="M20 60 Q50 90 80 60 L60 50 Q40 40 20 60 Z" fill="url(#gradPurple)"/>
                  </svg>
                }
                placeholder="Sélectionner un calendrier"
                customArrow={<CustomArrow isOpen={false} />}
                className='py-3 px-4 w-full'
              />
            </div>
          </div>
          {dimensionItems.map((item) => {
            const isOpen = openItems.includes(item.id);
            const itemEmployees = employeesByDimension[item.id] || [];
            
            if (itemEmployees.length === 0) return null;
            
            return (
              <div
                key={item.id}
                className="rounded-4xl bg-white border border-default bg-bg-secondary text-primary"
                style={{ marginBottom: MARGIN_BETWEEN_TEAMS }}
              >
                <button
                  className="flex justify-between items-center w-full px-4 py-2 rounded-t-2xl  focus:outline-none cursor-pointer"
                  onClick={() => toggleItem(item.id)}
                  type="button"
                >
                  <div className="flex items-center gap-4">
                    <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="18" height="18" viewBox="0 0 510 510" enableBackground="new 0 0 510 510"  xmlSpace="preserve">
                      <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                        <g>
                          <g id="play-install">
                            <path d="M459,114.75H357v-51l-51-51H204l-51,51v51H51c-28.05,0-51,22.95-51,51v280.5c0,28.05,22.95,51,51,51h408&#10;&#9;&#9;&#9;c28.05,0,51-22.95,51-51v-280.5C510,137.7,487.05,114.75,459,114.75z M204,63.75h102v51H204V63.75z M216.75,408l-89.25-89.25&#10;&#9;&#9;&#9;l35.7-35.7l53.55,53.55L349.35,204l35.7,35.7L216.75,408z" fill="#00957f" fillOpacity="1" data-original-color="#000000ff" stroke="none" strokeOpacity="1"/>
                          </g>
                        </g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                        <g></g>
                      </g>
                    </svg>
                    <span className="poppins font-bold">{item.name}</span>
                  </div>
                  <CustomArrow isOpen={isOpen} />
                </button>
                <div className={`flex flex-col px-4 pb-2 transition-all duration-200 ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'}`}>
                  {isOpen && itemEmployees.map((employee) => {
                    const employeeRowHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;
                    return (
                      <div
                        key={employee.id}
                        className="flex items-center group gap-2 px-2 rounded-2xl cursor-pointer hover:bg-primary-ultra-light employee-row-item"
                        style={{ height: employeeRowHeight, alignItems: 'center' }}
                        data-employee-id={employee.id}
                      >
                        <div className="relative">
                          <img
                            src={employee.image?.image ?? `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`}
                            alt={employee.name}
                            className={`w-8 h-8 rounded-full border-1 shadow ${employee.type === 'interim' ? 'border-interim' : 'border-employee'}`}
                            onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/cccccc/333333?text=${employee.name.charAt(0)}`; }}
                          />
                          {employee.type === 'interim' && (
                            <span className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-full bg-interim border-2 border-white"></span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="poppins text-[16px] font-inherit group-hover:font-semibold">{employee.name + ' ' + employee.firstName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {/* Timeline principale avec TimelineFrame réutilisable */}
        <TimelineFrame
          dayInTimeline={dayInTimeline}
          mainScrollRef={mainScrollRef}
          onScroll={(e) => {
            handleScroll();
            handleScrollY(e);              
          }}
          showTodayLine={true}
          todayLineColor="#ffcdde"
        >
          {/* Main calendar table - Structure optimisée */}
          <table 
            ref={tableRef}
            className="calendar-table bg-bg-secondary relative"
            style={{
              width: `${dayInTimeline.length * CELL_WIDTH}px`,
              tableLayout: 'fixed',
              borderCollapse: 'collapse'
            }}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
                
                <tbody>
                  {/* Générer les lignes du tableau pour chaque dimension */}
                  {dimensionItems.map((item, idx) => {
                    const isOpen = openItems.includes(item.id);
                    const itemEmployees = employeesByDimension[item.id] || [];
                    
                    if (itemEmployees.length === 0) return null;
                    
                    const rows = [];
                    
                    // Ligne inactive pour la dimension
                    rows.push(
                      <tr key={`inactive-row-${item.id}`} className="calendar-row inactive-row">
                        {dayInTimeline.map((day, dayIdx) => (
                          <td 
                            key={`inactive-${item.id}-${format(day, 'yyyy-MM-dd')}`}
                            className="calendar-cell p-0"
                            style={{ 
                              width: `${CELL_WIDTH}px`,
                              height: `${idx === 0 ? CELL_HEIGHT : CELL_HEIGHT + MARGIN_BETWEEN_TEAMS + 10}px`
                            }}
                          >
                            <DayCell
                              day={day}
                              employee={{ id: 0, name: 'Inactive' }}
                              appointments={[]}
                              intervals={HALF_DAY_INTERVALS}
                              isFullDay={isFullDay}
                              RowHeight={idx === 0 ? CELL_HEIGHT : CELL_HEIGHT + MARGIN_BETWEEN_TEAMS + 10}
                              isMobile={isMobile}
                              events={events}
                              nonWorkingDates={nonWorkingDates}
                              isDisplayWeekend={isDisplayWeekend}
                              onAppointmentMoved={onAppointmentMoved}
                              onCellDoubleClick={onCellDoubleClick}
                              onAppointmentClick={onAppointmentDoubleClick}
                              onExternalDragDrop={onExternalDragDrop}
                              isWeekend={isWeekend(day)}
                              handleContextMenu={handleContextMenu}
                              isCellActive={false}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                    
                    // Lignes des employés si la dimension est ouverte
                    if (isOpen) {
                      itemEmployees.forEach((employee, empIdx) => {
                        const employeeRowHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;                        

                        rows.push(
                          <tr 
                            key={`employee-row-${employee.id}`} 
                            className="calendar-row employee-row" 
                            data-employee-id={employee.id}
                          >
                            {dayInTimeline.map((day, dayIdx) => {
                              const dayEmployeeAppointments = appointmentsWithTop.filter((app) =>
                                isSameDay(app.startDate, day) && app.employeeId === employee.id
                              );
                              
                              return (
                                <td 
                                  key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
                                  className="calendar-cell p-0"
                                  style={{ 
                                    width: `${CELL_WIDTH}px`,
                                    height: `${employeeRowHeight}px`
                                  }}
                                >
                                  <DayCell
                                    day={day}
                                    employee={{ id: employee.id, name: employee.name }}
                                    appointments={dayEmployeeAppointments}
                                    intervals={HALF_DAY_INTERVALS}
                                    isFullDay={isFullDay}
                                    RowHeight={employeeRowHeight}
                                    isMobile={isMobile}
                                    events={events}
                                    nonWorkingDates={nonWorkingDates}
                                    isDisplayWeekend={isDisplayWeekend}
                                    onAppointmentMoved={onAppointmentMoved}
                                    onCellDoubleClick={onCellDoubleClick}
                                    onAppointmentClick={onAppointmentDoubleClick}
                                    onExternalDragDrop={onExternalDragDrop}
                                    isWeekend={isWeekend(day)}
                                    handleContextMenu={handleContextMenu}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    }
                    
                    return rows;
                  })}
                </tbody>
              </table>
            </TimelineFrame>
      </div>
    );
  }


export default memo(CalendarGrid, (prevProps, nextProps) => {
  // Mémorisation pour éviter les re-rendus inutiles
  return (
    prevProps.employees === nextProps.employees &&
    prevProps.appointments === nextProps.appointments &&
    prevProps.initialTeams === nextProps.initialTeams &&
    prevProps.dayInTimeline === nextProps.dayInTimeline &&
    prevProps.HALF_DAY_INTERVALS === nextProps.HALF_DAY_INTERVALS &&
    prevProps.isFullDay === nextProps.isFullDay &&
   //prevProps.selectedCalendarId === nextProps.selectedCalendarId &&
    prevProps.nonWorkingDates === nextProps.nonWorkingDates &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isDisplayWeekend === nextProps.isDisplayWeekend
  );
});