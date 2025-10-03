/**
 * @fileoverview Composant ChantierTableFrame - Vue tableau des chantiers
 * 
 * Ce composant réutilise FlexibleFrame pour afficher un tableau où :
 * - Les groupes représentent les grandes catégories (Informations générales, Analyse chantier)
 * - Les colonnes représentent les attributs (code, identifiant, état, etc.)
 * 
 * FONCTIONNALITÉ DE SURLIGNAGE EN "L" :
 * - Surlignage visuel des cellules qui forment un "L" par rapport à la cellule survolée
 * - Ligne horizontale : cellules de la même ligne ET colonnes avant la cellule survolée
 * - Ligne verticale : cellules de la même colonne ET lignes avant la cellule survolée  
 * - Intersection : cellules qui sont à la fois avant en ligne ET en colonne
 * - Fonctionne avec tous les filtres et tris appliqués
 * - Légende dynamique avec informations de position
 * 
 * FONCTIONS UTILITAIRES :
 * - isChantierBeforeHovered(): vérifie si un chantier est avant le survolé
 * - getChantierIndex(): obtient l'index d'un chantier dans la liste triée
 * - getCellPositionClasses(): détermine les classes CSS pour l'effet "L"
 * 
 * @component ChantierTableFrame
 * @author Gandara Solutions
 * @version 2.0.0 - Ajout du système de surlignage en "L"
 */

"use client";
import React, { useMemo, useState, useCallback } from 'react';
import FlexibleFrame from './FlexibleFrame';
import AppointmentItem from './AppointmentItem';
import { ChantierEvent, Appointment } from '../types';
import { HOURS_PER_DAY } from '../utils/constants';
import { addHours } from 'date-fns';
import { useSelectedAppointment } from '../context/SelectedAppointmentContext';

/**
 * Props du composant ChantierTableFrame
 */
interface ChantierTableFrameProps {
  className?: string;
  style?: React.CSSProperties;
  chantiers: ChantierEvent[];
  appointments: Appointment[]; // Liste des rendez-vous pour les calculs
  containerWidth?: number; // Largeur du conteneur en pixels
  onEditAppointment: (appointment: Appointment) => void;
}

/**
 * Composant ChantierTableFrame - Affichage tableau des chantiers
 */
const ChantierTableFrame: React.FC<ChantierTableFrameProps> = ({
  className = '',
  style,
  chantiers,
  appointments,
  onEditAppointment
}) => {
  
  const { selectedAppointment, setSelectedAppointment } = useSelectedAppointment();
  // État pour gérer le tri
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });
  const [chantierHoveredId, setChantierHoveredId] = useState<number | null>(null);
  const [columnHoveredKey, setColumnHoveredKey] = useState<string | null>(null);
  
  /**
   * Calcule la durée planifiée future (DPF) pour un chantier donné
   * Basé sur les rendez-vous à partir de la date actuelle et ceux qui chevauchent
   */
  const calculateDPF = useCallback((chantierId: number): string => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Début de la journée actuelle
    
    // Filtrer les rendez-vous du chantier qui sont à partir d'aujourd'hui ou qui chevauchent
    const relevantAppointments = appointments.filter(appointment => {
      // Vérifier si c'est un rendez-vous de ce chantier
      if (appointment.type !== 'chantier' || appointment.EventId !== chantierId) {
        return false;
      }
      
      // Rendez-vous qui commencent à partir d'aujourd'hui
      if (appointment.startDate >= currentDate) {
        return true;
      }
      
      // Rendez-vous qui chevauchent la date actuelle (commencent avant mais finissent après ou aujourd'hui)
      if (appointment.startDate < currentDate && appointment.endDate >= currentDate) {
        return true;
      }
      
      return false;
    });
    
    // Calculer le total d'heures
    let totalHours = 0;
    
    relevantAppointments.forEach(appointment => {
      const startDate = appointment.startDate < currentDate ? currentDate : appointment.startDate;
      const endDate = appointment.endDate;
      
      // Calculer le nombre de jours (en incluant le jour de début et de fin)
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 pour inclure le jour de début
      
      totalHours += daysDiff * HOURS_PER_DAY;
    });
    
    return `${totalHours}h`;
  }, [appointments]);

  /**
   * Calcule le réalisé + planifié future (RPF) pour un chantier donné
   * RPF = HR (Heures Réalisées) + DPF (Durée Planifiée Future)
   */
  const calculateRPF = useCallback((chantier: ChantierEvent): string => {
    // Extraire les heures réalisées (enlever le 'h' et convertir en nombre)
    const hrValue = parseFloat(chantier.attributs.HR.replace('h', '')) || 0;
    
    // Calculer DPF et extraire la valeur numérique
    const dpfString = calculateDPF(chantier.id);
    const dpfValue = parseFloat(dpfString.replace('h', '')) || 0;
    
    const totalRPF = hrValue + dpfValue;
    return `${totalRPF}h`;
  }, [calculateDPF]);

  /**
   * Calcule l'avancement prévisionnel (AP) pour un chantier donné
   * AP = (Réalisé + Future) / Temps Marché * 100
   */
  const calculateAP = useCallback((chantier: ChantierEvent): string => {
    // Extraire le temps marché (enlever le 'h' et convertir en nombre)
    const tmValue = parseFloat(chantier.attributs.TM.replace('h', '')) || 0;
    
    if (tmValue === 0) return '0%'; // Éviter la division par zéro
    
    // Calculer RPF et extraire la valeur numérique
    const rpfString = calculateRPF(chantier);
    const rpfValue = parseFloat(rpfString.replace('h', '')) || 0;
    
    // Calculer le pourcentage
    const percentage = Math.round((rpfValue / tmValue) * 100);
    return `${percentage}%`;
  }, [calculateRPF]);

  /**
   * Calcule le solde prévisionnel (SP) pour un chantier donné
   * SP = Temps Marché - (Réalisé + Future) en heures brutes
   */
  const calculateSP = useCallback((chantier: ChantierEvent): string => {
    // Extraire le temps marché (enlever le 'h' et convertir en nombre)
    const tmValue = parseFloat(chantier.attributs.TM.replace('h', '')) || 0;
    
    // Calculer RPF et extraire la valeur numérique
    const rpfString = calculateRPF(chantier);
    const rpfValue = parseFloat(rpfString.replace('h', '')) || 0;
    
    // Calculer le solde en heures (TM - RPF)
    const soldeHeures = tmValue - rpfValue;
    return `${soldeHeures}h`;
  }, [calculateRPF]);

  // Fonction pour trier les chantiers
  const sortedChantiers = useMemo(() => {
    if (!sortConfig.key) return chantiers;
    
    const sorted = [...chantiers].sort((a, b) => {
      // Vérifier si les chantiers ont des données valides
      if (!a || !a.attributs || !b || !b.attributs) return 0;
      
      // Récupérer les valeurs selon le type de propriété
      let aValue: any, bValue: any;
      
      if (sortConfig.key === 'image') {
        aValue = a.image;
        bValue = b.image;
      } else if (sortConfig.key === 'DPF') {
        // Valeurs calculées dynamiquement pour la Durée Planifiée Future
        aValue = calculateDPF(a.id);
        bValue = calculateDPF(b.id);
      } else if (sortConfig.key === 'RPF') {
        // Valeurs calculées dynamiquement pour Réalisé + Planif Future
        aValue = calculateRPF(a);
        bValue = calculateRPF(b);
      } else if (sortConfig.key === 'AP') {
        // Valeurs calculées dynamiquement pour Avancement Prévisionnel
        aValue = calculateAP(a);
        bValue = calculateAP(b);
      } else if (sortConfig.key === 'SP') {
        // Valeurs calculées dynamiquement pour Solde Prévisionnel
        aValue = calculateSP(a);
        bValue = calculateSP(b);
      } else {
        aValue = a.attributs[sortConfig.key as keyof ChantierEvent['attributs']];
        bValue = b.attributs[sortConfig.key as keyof ChantierEvent['attributs']];
      }
      
      // Gérer les valeurs nulles/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Conversion en string pour la comparaison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      // Tri numérique pour les valeurs qui ressemblent à des nombres
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Tri alphabétique
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [chantiers, sortConfig, calculateDPF, calculateRPF, calculateAP, calculateSP]);

  /**
   * Fonction pour obtenir l'index d'un chantier dans la liste triée actuelle
   * @param chantierId - ID du chantier
   * @returns number - Index du chantier dans la liste triée (-1 si non trouvé)
   */
  const getChantierIndex = useCallback((chantierId: number): number => {
    return sortedChantiers.findIndex(c => c && c.id === chantierId);
  }, [sortedChantiers]);

  /**
   * Fonction pour vérifier si un chantier est placé AVANT le chantier survolé dans la liste triée
   * @param currentChantierId - ID du chantier à vérifier
   * @param hoveredChantierId - ID du chantier survolé (référence)
   * @returns boolean - true si le chantier courant est avant le chantier survolé
   */
  const isChantierBeforeHovered = useCallback((currentChantierId: number, hoveredChantierId: number | null): boolean => {
    if (!hoveredChantierId || currentChantierId === hoveredChantierId) return false;
    
    const currentIndex = getChantierIndex(currentChantierId);
    const hoveredIndex = getChantierIndex(hoveredChantierId);
    
    // Si l'un des chantiers n'est pas trouvé, ne pas surligner
    if (currentIndex === -1 || hoveredIndex === -1) return false;
    
    // Le chantier courant est avant le chantier survolé si son index est inférieur
    return currentIndex < hoveredIndex;
  }, [getChantierIndex]);




  // Fonction pour gérer le clic sur une en-tête de colonne
  const handleSort = (attributeKey: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === attributeKey) {
        // Si on clique sur la même colonne, changer la direction
        return {
          key: attributeKey,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // Si on clique sur une nouvelle colonne, tri croissant par défaut
        return {
          key: attributeKey,
          direction: 'asc'
        };
      }
    });
  };
  
  // Structure organisée des catégories avec leurs attributs
  const categoriesStructure = useMemo(() => [
    {
      key: 'IG',
      label: 'Informations Générales', 
      attributes: [
        { key: 'image', label: 'Image', isBaseProperty: true }, // Image vient de BaseEvent
        { key: 'code', label: 'Code' },
        { key: 'identifiant', label: 'Identifiant' },
        { key: 'libelle', label: 'Libellé' },
        { key: 'etat', label: 'État' },
        { key: 'chargeAffaire', label: 'Chargé Affaire' },
        { key: 'chefChantier', label: 'Chef Chantier' },
        { key: 'dateOS', label: 'Date OS' },
        { key: 'dateFin', label: 'Date Fin' }
      ]
    },
    {
      key: 'analyse',
      label: 'Analyse Chantier',
      attributes: [
        { key: 'TM', label: 'Temps Marché' },
        { key: 'HR', label: 'Heures Réalisées' },
        { key: 'SH', label: 'Solde Heure' },
        { key: 'DPF', label: 'Durée Planifiée Future' },
        { key: 'RPF', label: 'Réalisé + Future' },
        { key: 'AP', label: 'Avanc. Prév.' },
        { key: 'SP', label: 'Solde Prév.' },
      ]
    }
  ], []);

  // Configuration des groupes (générée à partir de la structure)
  const groups = useMemo(() => 
    categoriesStructure.map(category => ({
      label: category.label,
      span: category.attributes.length,
      key: category.key
    }))
  , [categoriesStructure]);

  // Labels des attributs (générés à partir de la structure)
  const attributeLabels = useMemo(() => 
    categoriesStructure.flatMap(category => 
      category.attributes.map(attr => attr.label)
    )
  , [categoriesStructure]);

  // Clés des attributs (générées à partir de la structure)
  const attributeKeys = useMemo(() => 
    categoriesStructure.flatMap(category => 
      category.attributes.map(attr => attr.key)
    ) as (keyof ChantierEvent['attributs'] | 'image')[] // Include 'image' as possible key
  , [categoriesStructure]);

  /**
   * Fonction pour obtenir la classe CSS d'une cellule selon sa position par rapport à la cellule survolée
   * Crée un effet de "L" en surlignant uniquement les cellules qui sont AVANT la cellule survolée
   * @param chantierId - ID du chantier
   * @param columnKey - Clé de la colonne (attribut)
   * @param columnIndex - Index de la colonne dans le tableau
   * @returns string - Classes CSS à appliquer
   */
  const getCellPositionClasses = useCallback((chantierId: number, columnKey: string, columnIndex: number): string => {
    if (!chantierHoveredId || !columnHoveredKey) {
      return 'bg-white'; // Style normal quand rien n'est survolé
    }

    // Trouver l'index de la colonne survolée
    const hoveredColumnIndex = attributeKeys.findIndex(key => key === columnHoveredKey);
    if (hoveredColumnIndex === -1) return 'bg-white';

    const isCurrentRowBeforeHovered = isChantierBeforeHovered(chantierId, chantierHoveredId);
    const isCurrentColumnBeforeHovered = columnIndex < hoveredColumnIndex;
    const isSameRow = chantierId === chantierHoveredId;
    const isSameColumn = columnKey === columnHoveredKey;

    // Effet "L" : surligner seulement les cellules qui forment un L avant la cellule survolée
    if (isSameRow && isCurrentColumnBeforeHovered) {
      // Ligne horizontale du L : même ligne (chantier) ET colonne avant
      return 'bg-[#e7f4f2] ';
    } else if (isSameColumn && isCurrentRowBeforeHovered) {
      // Ligne verticale du L : même colonne ET ligne avant
      return 'bg-[#e7f4f2]';
    }
    
    return 'bg-white'; // Cellules non incluses dans le L
  }, [chantierHoveredId, columnHoveredKey, isChantierBeforeHovered, attributeKeys]);

  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Logique de scroll personnalisée si nécessaire
  };

  /**
   * Fonction qui retourne les valeurs d'un chantier organisées par catégorie
   */
  const getChantierValuesByCategory = React.useCallback((chantier: ChantierEvent) => {
    // Vérification de sécurité
    if (!chantier || !chantier.attributs) {
      console.error('Chantier invalide dans getChantierValuesByCategory:', chantier);
      return [];
    }
    
    return categoriesStructure.map(category => ({
      categoryKey: category.key,
      categoryLabel: category.label,
      values: category.attributes.map(attr => {
        let value: string | undefined;
        
        if (attr.isBaseProperty) {
          // Propriété de BaseEvent (image, color, etc.)
          value = (chantier as any)[attr.key];
        } else if (attr.key === 'DPF') {
          // Calcul dynamique de la Durée Planifiée Future
          value = calculateDPF(chantier.id);
        } else if (attr.key === 'RPF') {
          // Calcul dynamique du Réalisé + Planif Future
          value = calculateRPF(chantier);
        } else if (attr.key === 'AP') {
          // Calcul dynamique de l'Avancement Prévisionnel
          value = calculateAP(chantier);
        } else if (attr.key === 'SP') {
          // Calcul dynamique du Solde Prévisionnel
          value = calculateSP(chantier);
        } else {
          // Propriété des attributs standard
          value = chantier.attributs[attr.key as keyof ChantierEvent['attributs']];
        }
        
        return {
          attributeKey: attr.key,
          attributeLabel: attr.label,
          value: value
        };
      })
    }));
  }, [categoriesStructure, calculateDPF, calculateRPF, calculateAP, calculateSP]);

  // Debug : Afficher la structure organisée dans la console
  React.useEffect(() => {
    console.log('🏗️ Structure des catégories et attributs:', categoriesStructure);
    console.log('📊 Configuration des groupes:', groups);
    console.log('🏷️ Labels des attributs:', attributeLabels);
    console.log('🔑 Clés des attributs:', attributeKeys);
    console.log('🔄 Configuration du tri:', sortConfig);
    
    if (sortedChantiers.length > 0) {
      const exempleChantier = getChantierValuesByCategory(sortedChantiers[0]);
      console.log('📋 Exemple de chantier organisé par catégories:', exempleChantier);
    }
  }, [categoriesStructure, groups, attributeLabels, attributeKeys, sortedChantiers, getChantierValuesByCategory, sortConfig]);

  // Calculer les largeurs optimales pour chaque colonne
  const calculateColumnWidths = React.useMemo(() => {
    if (!sortedChantiers.length) return attributeLabels.map(() => 80);

    const fixedWidth = 90.5; // Largeur fixe pour les colonnes standard
    
    // Colonnes qui utilisent des largeurs spécifiques
    const adaptiveColumns = ['libelle', 'chefChantier', 'chargeAffaire', 'etat', 'dateOS', 'dateFin', 'identifiant', 'image'];
    
    // Largeurs fixes pour les colonnes adaptatives
    const maxLimits: { [key: string]: number } = {
      'libelle': 306,
      'chefChantier': 145,
      'chargeAffaire': 150,
      'etat': 108,
      'dateOS': 105,
      'dateFin': 105,
      'identifiant': 120,
      'image': 65,
    };

    return attributeLabels.map((label, colIndex) => {
      const attributeKey = attributeKeys[colIndex];
      
      // Colonnes avec largeurs spécifiques
      if (adaptiveColumns.includes(attributeKey)) {
        return maxLimits[attributeKey] || fixedWidth;
      }
      
      // Colonnes fixes
      return fixedWidth;
    });
  }, [attributeLabels, attributeKeys]);

  // Créer le style CSS Grid avec les largeurs calculées
  const gridTemplateColumns = React.useMemo(() => {
    return calculateColumnWidths.map(width => `${width}px`).join(' ');
  }, [calculateColumnWidths]);

  // Rendu des valeurs d'attributs avec styles appropriés
  const renderAttributeValue = (value: string | undefined, attributeKey: keyof ChantierEvent['attributs'] | 'image', eventId?: number) => {
    if (!value) return <span className="text-gray-400">-</span>;
    
    switch (attributeKey) {
      case 'etat':
        const badgeColor = value === 'En cours' ? 'bg-green-100 text-green-800' 
                         : value === 'Planifié' ? 'bg-blue-100 text-blue-800'
                         : value === 'Terminé' ? 'bg-gray-100 text-gray-800'
                         : 'bg-yellow-100 text-yellow-800';
        return (
          <div className='flex items-center w-full h-full'>
            <span className={`inline-flex w-[80px] h-[25px] justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium poppins ${badgeColor}`}>
              {value}
            </span>
          </div>
        );
      case 'image':
        if (value && typeof value === 'string' && eventId !== undefined) {
          return (
            <AppointmentItem
              appointment={{ id: 0, description: '', type: 'chantier', EventId: eventId, startDate: new Date(), endDate: addHours(new Date(), 12), employeeId: 0, top: 0 }}
              isFullDay={false}
              isMobile={false}
              event={chantiers.find(c => c.id === eventId) as ChantierEvent}
              employee={{ id: 0, name: '' }} // Placeholder, adapter selon le contexte
              source='demo'
              onDoubleClick={() => {
                const newAppointment: Appointment = { id: 0, description: '', type: 'chantier', EventId: eventId, startDate: new Date(), endDate: addHours(new Date(), 12), employeeId: 0};
                setSelectedAppointment(newAppointment);
                onEditAppointment(newAppointment);
              }}
            />
          );
        }
        return <span className="text-gray-400">-</span>;
      case 'AP':
        // Style basique sauf si dépasse 100% (rouge avec icône danger)
        const apValue = parseFloat(value.replace('%', '')) || 0;
        if (apValue > 100) {
          return (
            <div className="flex items-center justify-end gap-1 w-full h-full">
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-red-600"
              >
                <path 
                  d="M12 2L21.09 20H2.91L12 2Z" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinejoin="round"
                  fill="currentColor"
                />
                <path 
                  d="M12 9V13M12 17H12.01" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-red-600 font-bold poppins">{value}</span>
            </div>
          );
        }
        return (
          <div className="text-left flex items-center justify-end w-full h-full">
            <span className="text-gray-900 poppins">{value}</span>
          </div>
        );
      case 'TM':
      case 'HR':
      case 'SH':
      case 'DPF':
      case 'RPF':
      case 'SP':
        // Tous les chiffres alignés à gauche avec style basique
        return (
          <div className="text-left flex items-center justify-end w-full h-full">
            <span className="text-gray-900 poppins">{value}</span>
          </div>
        );
      default:
        return (
          <div className='flex items-center justify-start w-full h-full'>
            <span className="text-gray-900 poppins ">{value}</span>
          </div>
        );
    }
  };

  return (
    <FlexibleFrame
      groups={groups}
      items={attributeLabels}
      mainScrollRef={mainScrollRef}
      onScroll={handleScroll}
      className="chantier-timeline-frame h-full pl-7 overflow-x-hidden"
      contentClassName='overflow-x-hidden scroll-hidden'
      useAutoCells={false}
      customGridColumns={gridTemplateColumns}
      customItemHeaders={
        // En-têtes d'items avec largeurs calculées et fonctionnalité de tri
        attributeLabels.map((label, index) => {
          const attributeKey = attributeKeys[index];
          const isActive = sortConfig.key === attributeKey;
          const direction = isActive ? sortConfig.direction : null;
          
          return (
            <div
              key={`header-${index}`}
              className="flex flex-col justify-center border-b border-r border-gray-300 text-center text-sm text-gray-700 p-2 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              style={{
                width: `${calculateColumnWidths[index]}px`,
                height: '56px',
                minWidth: `${calculateColumnWidths[index]}px`,
                maxWidth: `${calculateColumnWidths[index]}px`
              }}
              onClick={() => handleSort(attributeKey)}
              title={`Cliquer pour trier par ${label}`}
            >
              <div className="flex flex-col justify-center items-center h-full px-2">
                <div className="flex items-center justify-center gap-1">
                  <span className="leading-3 break-words text-center">
                    {label}
                  </span>
                  {/* Indicateur de tri */}
                  <div className="flex flex-col items-center ml-1">
                    {!isActive && (
                      <div className="flex flex-col">
                        <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-l-transparent border-r-transparent border-b-gray-300 mb-[1px]"></div>
                        <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-gray-300"></div>
                      </div>
                    )}
                    {isActive && direction === 'asc' && (
                      <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-l-transparent border-r-transparent border-b-blue-600"></div>
                    )}
                    {isActive && direction === 'desc' && (
                      <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-blue-600"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      }
    >
      {/* Contenu des chantiers avec largeurs calculées */}
      {sortedChantiers
        .filter(chantier => chantier && chantier.attributs) // Filtrer les éléments invalides
        .flatMap((chantier, rowIndex) => {
        const chantierByCategories = getChantierValuesByCategory(chantier);
        const allValues = chantierByCategories.flatMap(cat => cat.values);
        
        return allValues.map(({ attributeKey, attributeLabel, value }, valueIndex) => {
          const columnWidth = calculateColumnWidths[valueIndex] || 150;
          
          // Ajouter un highlight spécial pour la colonne survolée du chantier survolé
          const isExactHoveredCell = chantierHoveredId === chantier.id && columnHoveredKey === attributeKey;
          const finalClasses = isExactHoveredCell 
            ? 'bg-[#e7f4f2] border-[#4CAF50]' 
            : getCellPositionClasses(chantier.id, attributeKey, valueIndex);;
            
          return (
            <div
              key={`${chantier.id}-${attributeKey}`}
              className={`chantier-cell px-3 py-2 border-r border-b border-gray-300 text-sm transition-all duration-200 ${finalClasses}`}
              style={{ 
                height: '58px',
                width: `${columnWidth}px`,
                minWidth: `${columnWidth}px`,
                maxWidth: `${columnWidth}px`,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={`${attributeLabel}: ${value || '-'}`}
              onMouseEnter={() => {
                setChantierHoveredId(chantier.id);
                setColumnHoveredKey(attributeKey);
              }}
              onMouseLeave={() => {
                setChantierHoveredId(null);
                setColumnHoveredKey(null);
              }}
            >
              {renderAttributeValue(value, attributeKey as keyof ChantierEvent['attributs'] | 'image', chantier.id)}
            </div>
          );
        });
      })}
    </FlexibleFrame>
  );
};

export default ChantierTableFrame;