/**
 * @fileoverview Composant DataTableFrame - Vue tableau unifiée
 * 
 * Ce composant unifié gère l'affichage des tableaux pour :
 * - Chantiers : avec calculs dynamiques et surlignage en "L"
 * - Paie : avec gestion d'images et résumés de rendez-vous
 * 
 * Fonctionnalités communes :
 * - Tri par colonnes
 * - Gestion d'images avec modal
 * - Calculs dynamiques de largeurs
 * - Structure organisée par catégories
 * 
 * @component DataTableFrame
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";

import React, { useMemo, useState, useCallback, memo } from 'react';
import FlexibleFrame from '../FlexibleFrame';
import { ChantierEvent, AbsenceEvent, AutreEvent, Appointment, Employee, Evenement } from '../../types';
import { useSelectedAppointment } from '../../context/SelectedAppointmentContext';

// Import des constantes
const HOURS_PER_DAY = 8;


import AppointmentItem from '../AppointmentItem';
import { addHours } from 'date-fns';
/**
 * Types supportés par le composant
 */
type DataType = 'chantier' | 'paie';
type ItemType = ChantierEvent | AbsenceEvent | AutreEvent;


/**
 * Interface pour la structure des catégories
 */
interface CategoryStructure {
  key: string;
  label: string;
  attributes: {
    key: string;
    label: string;
    isBaseProperty?: boolean;
  }[];
}



/**
 * Props du composant DataTableFrame
 */
interface DataTableFrameProps {
  className?: string;
  style?: React.CSSProperties;
  dataType: DataType;
  items: ItemType[];
  appointments?: Appointment[];
  employees?: Employee[];
  paieEvents?: any[];
  containerWidth?: number;
  onEditAppointment?: (appointment: Appointment) => void;
  onSave?: (
      event: Evenement, 
  ) => void;
}

/**
 * Composant DataTableFrame - Tableau unifié pour chantiers et paie
 */
const DataTableFrame: React.FC<DataTableFrameProps> = ({
  className = '',
  style,
  dataType,
  items,
  appointments = [],
  employees = [],
  paieEvents = [],
  containerWidth,
  onEditAppointment,
  onSave
  
}) => {
  const { selectedAppointment, setSelectedAppointment } = useSelectedAppointment();
  
  // Calculer la largeur du conteneur
  const calculatedContainerWidth = useMemo(() => {
    return containerWidth || (typeof window !== 'undefined' ? window.innerWidth - 85 : 1200);
  }, [containerWidth]);

  // États pour gérer le tri
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });


  // États pour le surlignage (chantiers uniquement)
  const [itemHoveredId, setItemHoveredId] = useState<number | null>(null);
  const [columnHoveredKey, setColumnHoveredKey] = useState<string | null>(null);



  // Fonctions de calcul pour les chantiers
  const calculateDPF = useCallback((chantierId: number): string => {
    if (dataType !== 'chantier') return '0h';
    
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    const relevantAppointments = appointments.filter(appointment => {
      if (appointment.type !== 'chantier' || appointment.EventId !== chantierId) {
        return false;
      }
      
      if (appointment.startDate >= currentDate) {
        return true;
      }
      
      if (appointment.startDate < currentDate && appointment.endDate >= currentDate) {
        return true;
      }
      
      return false;
    });
    
    let totalHours = 0;
    
    relevantAppointments.forEach(appointment => {
      const startDate = appointment.startDate < currentDate ? currentDate : appointment.startDate;
      const endDate = appointment.endDate;
      
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      
      totalHours += daysDiff * HOURS_PER_DAY;
    });
    
    return `${totalHours}h`;
  }, [appointments, dataType]);

  const calculateRPF = useCallback((chantier: ChantierEvent): string => {
    if (dataType !== 'chantier') return '0h';
    
    const hrValue = parseFloat(chantier.attributs.HR.replace('h', '')) || 0;
    const dpfString = calculateDPF(chantier.id);
    const dpfValue = parseFloat(dpfString.replace('h', '')) || 0;
    
    const totalRPF = hrValue + dpfValue;
    return `${totalRPF}h`;
  }, [calculateDPF, dataType]);

  const calculateAP = useCallback((chantier: ChantierEvent): string => {
    if (dataType !== 'chantier') return '0%';
    
    const tmValue = parseFloat(chantier.attributs.TM.replace('h', '')) || 0;
    
    if (tmValue === 0) return '0%';
    
    const rpfString = calculateRPF(chantier);
    const rpfValue = parseFloat(rpfString.replace('h', '')) || 0;
    
    const percentage = Math.round((rpfValue / tmValue) * 100);
    return `${percentage}%`;
  }, [calculateRPF, dataType]);

  const calculateSP = useCallback((chantier: ChantierEvent): string => {
    if (dataType !== 'chantier') return '0h';
    
    const tmValue = parseFloat(chantier.attributs.TM.replace('h', '')) || 0;
    const rpfString = calculateRPF(chantier);
    const rpfValue = parseFloat(rpfString.replace('h', '')) || 0;
    
    const soldeHeures = tmValue - rpfValue;
    return `${soldeHeures}h`;
  }, [calculateRPF, dataType]);

  // Structure des catégories selon le type de données
  const categoriesStructure: CategoryStructure[] = useMemo(() => {
    if (dataType === 'chantier') {
      return [
        {
          key: 'IG',
          label: 'Informations Générales', 
          attributes: [
            { key: 'image', label: 'Image', isBaseProperty: true },
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
            { key: 'SP', label: 'Solde Prév.' }
          ]
        }
      ];
    } else {
      return [
        {
          key: 'all',
          label: '', 
          attributes: [
            { key: 'verrou', label: 'Verrou' },
            { key: 'image', label: 'Image', isBaseProperty: true },
            { key: 'code', label: 'Code' },
            { key: 'label', label: 'Libellé' },
            { key: 'actif', label: 'ACTF' },
            { key: 'category', label: 'Catégorie' }
          ]
        }
      ];
    }
  }, [dataType]);

  // Configuration des groupes
  const groups = useMemo(() => 
    categoriesStructure.map(category => ({
      label: category.label,
      span: category.attributes.length,
      key: category.key
    }))
  , [categoriesStructure]);

  // Labels des attributs
  const attributeLabels = useMemo(() => 
    categoriesStructure.flatMap(category => 
      category.attributes.map(attr => attr.label)
    )
  , [categoriesStructure]);

  // Clés des attributs
  const attributeKeys = useMemo(() => 
    categoriesStructure.flatMap(category => 
      category.attributes.map(attr => attr.key)
    )
  , [categoriesStructure]);

  // Fonction de tri
  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return items;
    
    const sorted = [...items].sort((a, b) => {
      if (!a || !b) return 0;
      
      let aValue: any, bValue: any;
      
      if (sortConfig.key === 'image') {
        aValue = a.image;
        bValue = b.image;
      } else if (dataType === 'chantier' && sortConfig.key === 'DPF') {
        aValue = calculateDPF(a.id);
        bValue = calculateDPF(b.id);
      } else if (dataType === 'chantier' && sortConfig.key === 'RPF') {
        aValue = calculateRPF(a as ChantierEvent);
        bValue = calculateRPF(b as ChantierEvent);
      } else if (dataType === 'chantier' && sortConfig.key === 'AP') {
        aValue = calculateAP(a as ChantierEvent);
        bValue = calculateAP(b as ChantierEvent);
      } else if (dataType === 'chantier' && sortConfig.key === 'SP') {
        aValue = calculateSP(a as ChantierEvent);
        bValue = calculateSP(b as ChantierEvent);
      } else if (dataType === 'paie' && sortConfig.key === 'verrou') {
        aValue = (a as AbsenceEvent | AutreEvent).verrou;
        bValue = (b as AbsenceEvent | AutreEvent).verrou;
      } else if (dataType === 'chantier' && 'attributs' in a && 'attributs' in b) {
        aValue = (a as ChantierEvent).attributs[sortConfig.key as keyof ChantierEvent['attributs']];
        bValue = (b as ChantierEvent).attributs[sortConfig.key as keyof ChantierEvent['attributs']];
      } else if (dataType === 'paie') {
        const aPaie = a as AbsenceEvent | AutreEvent;
        const bPaie = b as AbsenceEvent | AutreEvent;
        aValue = aPaie[sortConfig.key as keyof (AbsenceEvent | AutreEvent)];
        bValue = bPaie[sortConfig.key as keyof (AbsenceEvent | AutreEvent)];
      }
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      const aNum = parseFloat(aStr);
      const bNum = parseFloat(bStr);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [items, sortConfig, dataType, calculateDPF, calculateRPF, calculateAP, calculateSP]);

  // Fonctions utilitaires pour les chantiers
  const getItemIndex = useCallback((itemId: number): number => {
    return sortedItems.findIndex(item => item && item.id === itemId);
  }, [sortedItems]);

  const isItemBeforeHovered = useCallback((currentItemId: number, hoveredItemId: number | null): boolean => {
    if (!hoveredItemId || currentItemId === hoveredItemId) return false;
    
    const currentIndex = getItemIndex(currentItemId);
    const hoveredIndex = getItemIndex(hoveredItemId);
    
    if (currentIndex === -1 || hoveredIndex === -1) return false;
    
    return currentIndex < hoveredIndex;
  }, [getItemIndex]);

  const getCellPositionClasses = useCallback((itemId: number, columnKey: string, columnIndex: number): string => {
    if (!itemHoveredId || !columnHoveredKey) {
      return 'bg-transparent';
    }

    const hoveredColumnIndex = attributeKeys.findIndex(key => key === columnHoveredKey);
    if (hoveredColumnIndex === -1) return 'bg-transparent';

    const isCurrentRowBeforeHovered = isItemBeforeHovered(itemId, itemHoveredId);
    const isCurrentColumnBeforeHovered = columnIndex < hoveredColumnIndex;
    const isSameRow = itemId === itemHoveredId;
    const isSameColumn = columnKey === columnHoveredKey;

    if (isSameRow && isCurrentColumnBeforeHovered) {
      return 'bg-primary-lighter';
    } else if (isSameColumn && isCurrentRowBeforeHovered) {
      return 'bg-primary-lighter';
    }
    
    return 'bg-transparent';
  }, [dataType, itemHoveredId, columnHoveredKey, isItemBeforeHovered, attributeKeys]);

  // Gestion du tri
  const handleSort = (attributeKey: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === attributeKey) {
        return {
          key: attributeKey,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        return {
          key: attributeKey,
          direction: 'asc'
        };
      }
    });
  };


  // Calcul des largeurs de colonnes
  const calculateColumnWidths = useMemo(() => {
    if (!sortedItems.length) return attributeLabels.map(() => 80);

    if (dataType === 'chantier') {
      const fixedWidth = 90.5;
      const adaptiveColumns = ['libelle', 'chefChantier', 'chargeAffaire', 'etat', 'dateOS', 'dateFin', 'identifiant', 'image'];
      
      const maxLimits: { [key: string]: number } = {
        'libelle': 306,
        'chefChantier': 150,
        'chargeAffaire': 150,
        'etat': 108,
        'dateOS': 105,
        'dateFin': 105,
        'identifiant': 120,
        'image': 60,
      };

      return attributeLabels.map((label, colIndex) => {
        const attributeKey = attributeKeys[colIndex];
        
        if (adaptiveColumns.includes(attributeKey)) {
          return maxLimits[attributeKey] || fixedWidth;
        }
        
        return fixedWidth;
      });
    } else {
      // Paie
      const availableWidth = calculatedContainerWidth;
      
      const columnConfig = [
        { key: 'verrou', minWidth: 80, weight: 1 },
        { key: 'image', minWidth: 80, weight: 1 },
        { key: 'code', minWidth: 120, weight: 1.5 },
        { key: 'libelle', minWidth: 250, weight: 4 },
        { key: 'actf', minWidth: 100, weight: 1.2 },
        { key: 'categorie', minWidth: 150, weight: 2 },
      ];

      const totalMinWidth = columnConfig.reduce((sum, col) => sum + col.minWidth, 0);
      const totalWeight = columnConfig.reduce((sum, col) => sum + col.weight, 0);
      
      if (availableWidth > totalMinWidth) {
        const extraSpace = availableWidth - totalMinWidth;
        
        return columnConfig.map(col => {
          const extraWidth = (extraSpace * col.weight) / totalWeight;
          return Math.floor(col.minWidth + extraWidth);
        });
      } else {
        return columnConfig.map(col => col.minWidth);
      }
    }
  }, [attributeLabels, attributeKeys, calculatedContainerWidth, sortedItems.length, dataType]);

  // Style CSS Grid
  const gridTemplateColumns = useMemo(() => {
    return calculateColumnWidths.map(width => `${width}px`).join(' ');
  }, [calculateColumnWidths]);

  // Fonction de rendu des valeurs
  const renderAttributeValue = (value: string | number | undefined, attributeKey: string, itemId: number) => {
    if (!value) return <span className="text-gray-400">-</span>;
    
    switch (attributeKey) {
      case 'verrou':
        value = String(value);
        const isLocked = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'verrouillé';
        return (
          <div className="flex items-center justify-center w-full h-full">
            {isLocked ? (
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-red-600"
              >
                <path 
                  d="M18 11H6C5.45 11 5 11.45 5 12V20C5 20.55 5.45 21 6 21H18C18.55 21 19 20.55 19 20V12C19 11.45 18.55 11 18 11Z" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  fill="currentColor"
                />
                <path 
                  d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            ) : (
              <></>
            )}
          </div>
        );
      case 'image':
        
        if (value && typeof value === 'string' && itemId) {
          const item = items.find(i => i && i.id === itemId) as ItemType;
          return (
            <AppointmentItem
              appointment={{ id: 0, description: '', type: item?.type, EventId: itemId, startDate: new Date(), endDate: addHours(new Date(), 12), employeeId: 0, top: 0 }}
              isFullDay={false}
              isMobile={false}
              event={items.find(c => c.id === itemId) as ChantierEvent}
              employee={{ id: 0, name: '' }} // Placeholder, adapter selon le contexte
              source='demo'
              onDoubleClick={() => {
                const newAppointment: Appointment = { id: 0, description: '', type: item?.type, EventId: itemId, startDate: new Date(), endDate: addHours(new Date(), 12), employeeId: 0};
                console.log("oui");
                
                setSelectedAppointment(newAppointment);
                onEditAppointment ? onEditAppointment(newAppointment) : null;
              }}
            />
          );
        }
        return <span className="text-gray-400">-</span>;
      case 'etat':
        if (dataType === 'chantier') {
          const badgeColor = value === 'En cours' ? 'bg-green-100 text-green-800' 
                           : value === 'Planifié' ? 'bg-blue-100 text-blue-800'
                           : value === 'Terminé' ? 'bg-gray-100 text-gray-800'
                           : 'bg-yellow-100 text-yellow-800';
          return (
            <div className="flex items-center justify-center w-full h-full">
              <span className={`inline-flex w-[80px] h-[25px] justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium poppins ${badgeColor}`}>
                {value}
              </span>
            </div>
          );
        }
        break;
      case 'AP':
        if (dataType === 'chantier' && typeof value === 'string') {
          const apValue = parseFloat(value.replace('%', '')) || 0;
          if (apValue > 100) {
            return (
              <div className='flex items-center justify-end w-full h-full gap-2'>
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
                <span className="text-red-600 poppins font-medium">{value}</span>
              </div>
            );
          }
          return (
            <div className='flex items-center justify-end w-full h-full'>
              <span className="poppins">{value}</span>
            </div>
          );
        }
        break;
      case 'chargeAffaire':
      case 'chefChantier':
        if (dataType === 'chantier') {
          return (
            <div className='flex items-center justify-start w-full h-full'>
              <span className="poppins">{employees.find(emp => emp.id === Number(value))?.name}</span>
            </div>
          );
        }
      case 'TM':
      case 'HR':
      case 'SH':
      case 'DPF':
      case 'RPF':
      case 'SP':
        if (dataType === 'chantier') {
          return (
            <div className='flex items-center justify-start w-full h-full'>
              <span className="poppins">{value}</span>
            </div>
          );
        }
        break;
      default:
        return (
          <div className='flex items-center justify-start w-full h-full'>
            <span className=" poppins">{value}</span>
          </div>
        );
    }
    
    return (
      <div className='flex items-center justify-start w-full h-full'>
        <span className=" poppins">{value}</span>
      </div>
    );
  };

  // Fonction pour obtenir les valeurs organisées par catégorie
  const getValuesByCategory = useCallback((item: ItemType) => {
    if (!item) {
      console.error('Élément invalide dans getValuesByCategory:', item);
      return [];
    }
    
    return categoriesStructure.map(category => ({
      categoryKey: category.key,
      categoryLabel: category.label,
      values: category.attributes.map(attr => {
        let value: string | number | undefined;
        
        if (attr.isBaseProperty) {
          value = (item as any)[attr.key];
        } else if (dataType === 'chantier') {
          const chantier = item as ChantierEvent;
          if (attr.key === 'DPF') {
            value = calculateDPF(chantier.id);
          } else if (attr.key === 'RPF') {
            value = calculateRPF(chantier);
          } else if (attr.key === 'AP') {
            value = calculateAP(chantier);
          } else if (attr.key === 'SP') {
            value = calculateSP(chantier);
          } else {
            value = chantier.attributs[attr.key as keyof ChantierEvent['attributs']];
          }
        } else if (dataType === 'paie') {
          const paieItem = item as AbsenceEvent | AutreEvent;
          if (attr.key === 'verrou') {
            value = paieItem.verrou ? 'true' : 'false';
          } else {
            value = paieItem[attr.key as keyof (AbsenceEvent | AutreEvent)] as string;
          }
        }
        
        return {
          attributeKey: attr.key,
          attributeLabel: attr.label,
          value: value
        };
      })
    }));
  }, [categoriesStructure, dataType, calculateDPF, calculateRPF, calculateAP, calculateSP]);

  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Logique de scroll personnalisée si nécessaire
  };

  
  
  return (
    <div className="relative h-full">
      <FlexibleFrame
        groups={groups}
        items={attributeLabels}
        mainScrollRef={mainScrollRef}
        onScroll={handleScroll}
        showGroupHeaders={dataType === 'chantier'}
        className={`${dataType}-timeline-frame h-full pl-7 overflow-x-hidden ${className}`}
        contentClassName='overflow-x-hidden scroll-hidden'
        useAutoCells={false}
        customGridColumns={gridTemplateColumns}
        customItemHeaders={
          attributeLabels.map((label, index) => {
            const attributeKey = attributeKeys[index];
            const isActive = sortConfig.key === attributeKey;
            const direction = isActive ? sortConfig.direction : null;
            
            return (
              <div
                key={`header-${index}`}
                className="flex flex-col justify-center border-b border-r border-default text-center text-sm text-primary p-2 bg-bg-secondary hover:bg-gray-50 cursor-pointer transition-colors"
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
                    <div className="flex flex-col items-center ml-1">
                      {/* Flèche vers le haut */}
                      <svg 
                        className={`w-2 h-2 transition-colors ${
                          isActive && direction === 'asc' 
                            ? 'text-color-primary' 
                            : 'text-gray-300'
                        }`}
                        fill="currentColor" 
                        viewBox="0 0 8 8"
                      >
                        <path d="M4 0L0 4h8z" />
                      </svg>
                      {/* Flèche vers le bas */}
                      <svg 
                        className={`w-2 h-2 -mt-0.5 transition-colors ${
                          isActive && direction === 'desc' 
                            ? 'text-color-primary' 
                            : 'text-gray-300'
                        }`}
                        fill="currentColor" 
                        viewBox="0 0 8 8"
                      >
                        <path d="M4 8L8 4H0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        }
      >
        <table className="w-full border-collapse overflow-auto">
          {/* Corps du tableau */}
          <tbody>
            {sortedItems
              .filter(item => {
                if (!item) return false;
                if (dataType === 'chantier') {
                  return 'attributs' in item;
                } else {
                  return item.type === 'absence' || item.type === 'autre';
                }
              })
              .map((item, rowIndex) => {
                const itemByCategories = getValuesByCategory(item);
                const allValues = itemByCategories.flatMap(cat => cat.values);
                
                return (
                  <tr key={`row-${item.id}`} className="">
                    {allValues.map(({ attributeKey, attributeLabel, value }, valueIndex) => {
                      const columnIndex = attributeKeys.indexOf(attributeKey);
                      const isExactHoveredCell = itemHoveredId === item.id && columnHoveredKey === attributeKey;

                      const cellClasses = isExactHoveredCell 
                        ? 'bg-primary-lighter' 
                        : getCellPositionClasses(item.id, attributeKey, columnIndex);
                      
                      return (
                        <td
                          key={`${item.id}-${attributeKey}`}
                          className={`border-b border-r border-default p-2 overflow-hidden text-sm transition-colors text-primary ${cellClasses}`}
                          title={`${attributeLabel}: ${value || '-'}`}
                          style={{
                            width: `${calculateColumnWidths[valueIndex]}px`,
                            minWidth: `${calculateColumnWidths[valueIndex]}px`,
                            maxWidth: `${calculateColumnWidths[valueIndex]}px`,
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={() => {
                            setItemHoveredId(item.id);
                            setColumnHoveredKey(attributeKey);
                          }}
                          onMouseLeave={() => {
                            setItemHoveredId(null);
                            setColumnHoveredKey(null);
                          }}
                        >
                          {renderAttributeValue(value, attributeKey, item.id)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </FlexibleFrame>
    </div>
  );
};

export default memo(DataTableFrame);