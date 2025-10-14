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
import Modal from '../modals/Modal';
import { ChantierEvent, AbsenceEvent, AutreEvent, Appointment, Employee, Evenement } from '../../types';
import { useSelectedAppointment } from '../../context/SelectedAppointmentContext';
import { imagesÉvénement } from '../../../datasource';
import { processImageFile, compressExistingImage, validateImageFile, ImageData as ProcessedImageData } from '../../utils/imageCompressionUtils';

// Import des constantes
const HOURS_PER_DAY = 8;

// Import des images de paie disponibles
import iconesAbsences from '../../image/Icones/Paie/Absence.svg';
import iconesRepas from '../../image/Icones/Paie/Repas.svg';
import iconesPrime from '../../image/Icones/Paie/Prime.svg';
import iconesHeurSup from '../../image/Icones/Paie/HeuresSupplementaires.svg';
import iconesCongesPayes from '../../image/Icones/Paie/CongesPayes.svg';
import iconesSalaire from '../../image/Icones/Paie/Salaire.svg';
import AppointmentItem from '../AppointmentItem';
import { addHours } from 'date-fns';
/**
 * Types supportés par le composant
 */
type DataType = 'chantier' | 'paie';
type ItemType = ChantierEvent | AbsenceEvent | AutreEvent;

/**
 * Interface pour les données d'image
 */
interface ImageData {
  id: number;
  image: string;
  name: string;
  category?: string;
}

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
 * Props pour le composant ImageSelectorContent
 */
interface ImageSelectorContentProps {
  images: ImageData[];
  onImageSelect: (src: string) => void;
  onClose: () => void;
  onImageUpload: (file: File) => Promise<string>;
  isUploading: boolean;
  uploadError: string | null;
}

/**
 * Composant de sélection d'images avec recherche et pagination
 */
const ImageSelectorContent: React.FC<ImageSelectorContentProps> = ({
  images,
  onImageSelect,
  onClose,
  onImageUpload,
  isUploading,
  uploadError
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const itemsPerPage = 8;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filtrer les images selon le terme de recherche
  const filteredImages = useMemo(() => {
    if (!searchTerm.trim()) return images;
    
    return images.filter(image => 
      image.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [images, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedImages = viewMode === 'grid' ? filteredImages.slice(startIndex, startIndex + itemsPerPage) : filteredImages;

  // Reset page quand on change le filtre
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Fonctions pour gérer l'upload de fichiers
  const handleFiles = async (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      try {
        const imageDataURL = await onImageUpload(file);
        onImageSelect(imageDataURL);
      } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="w-[700px] max-h-[80vh]">
      {/* Zone d'upload */}
      <div className="mb-4">
        <div
          className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragActive 
              ? 'border-[#009580] bg-green-50' 
              : 'border-gray-300 hover:border-[#009580] hover:bg-gray-50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />
          
          {isUploading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#009580]"></div>
              <span className="ml-2 text-[#009580]">Upload en cours...</span>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-2">📁</div>
              <div className="text-gray-600 mb-2">
                Glissez-déposez une image ici ou{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#009580] underline hover:text-green-700"
                >
                  parcourez vos fichiers
                </button>
              </div>
              <div className="text-xs text-gray-500">
                Formats acceptés : JPG, PNG, GIF, WebP, SVG - Max 480x480px, 200Ko
              </div>
            </div>
          )}
        </div>
        
        {uploadError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {uploadError}
          </div>
        )}
      </div>

      {/* Barre de recherche et contrôles */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher une image..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''} trouvée{filteredImages.length !== 1 ? 's' : ''}
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#009580] text-white' : 'bg-gray-100'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4C2.9 4 2 4.9 2 6V12C2 13.1 2.9 14 4 14H10C11.1 14 12 13.1 12 12V6C12 4.9 11.1 4 10 4Z"/>
                <path d="M20 4H14C12.9 4 12 4.9 12 6V12C12 13.1 12.9 14 14 14H20C21.1 14 22 13.1 22 12V6C22 4.9 21.1 4 20 4Z"/>
                <path d="M10 16H4C2.9 16 2 16.9 2 18V20C2 21.1 2.9 22 4 22H10C11.1 22 12 21.1 12 20V18C12 16.9 11.1 16 10 16Z"/>
                <path d="M20 16H14C12.9 16 12 16.9 12 18V20C12 21.1 12.9 22 14 22H20C21.1 22 22 21.1 22 20V18C22 16.9 21.1 16 20 16Z"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#009580] text-white' : 'bg-gray-100'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13H1V11H3V13Z"/>
                <path d="M3 17H1V15H3V17Z"/>
                <path d="M3 9H1V7H3V9Z"/>
                <path d="M7 13H21V11H7V13Z"/>
                <path d="M7 17H21V15H7V17Z"/>
                <path d="M7 9H21V7H7V9Z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu des images */}
      <div className="mb-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 gap-4">
        {paginatedImages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 
              `Aucune image trouvée pour "${searchTerm}"` :
              'Aucune image disponible'
            }
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {paginatedImages.map((image, index) => (
                <div
                  key={index}
                  onClick={() => onImageSelect(image.image)}
                  className="cursor-pointer group"
                >
                  <div 
                    className="border rounded-lg p-2 hover:border-[#009580] hover:shadow-md transition-all"
                    title={image.name}
                  >
                    <img 
                      src={image.image} 
                      alt={image.name} 
                      className="w-full h-20 object-contain mb-2 group-hover:scale-105 transition-transform"
                    />
                    <div className="text-xs text-center text-gray-600 group-hover:text-[#009580]">
                      {image.name.length > 15 ? `${image.name.slice(0, 15)}...` : image.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ←
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} sur {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {paginatedImages.map((image, index) => (
              <div
                key={index}
                onClick={() => onImageSelect(image.image)}
                className="flex items-center p-3 border rounded-lg cursor-pointer hover:border-[#009580] hover:shadow-md transition-all group"
                title={image.name}
              >
                <img 
                  src={image.image} 
                  alt={image.name} 
                  className="w-12 h-12 object-contain mr-3 group-hover:scale-105 transition-transform"
                />
                <div>
                  <div className="font-medium text-gray-900 group-hover:text-[#009580]">{image.name.length > 15 ? `${image.name.slice(0, 15)}...` : image.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

     

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          💡 Astuce : Vous pouvez également glisser-déposer une image directement sur cette zone
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
};

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

  // États pour la gestion d'images
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // États pour le surlignage (chantiers uniquement)
  const [itemHoveredId, setItemHoveredId] = useState<number | null>(null);
  const [columnHoveredKey, setColumnHoveredKey] = useState<string | null>(null);

  // Images disponibles selon le type
  const [availableImages, setAvailableImages] = useState(() => {
    if (dataType === 'paie') {
      return [
        ...imagesÉvénement,
        { id: 1, image: iconesAbsences.src, name: 'Absence' },
        { id: 2, image: iconesRepas.src, name: 'Repas' },
        { id: 3, image: iconesPrime.src, name: 'Prime' },
        { id: 4, image: iconesHeurSup.src, name: 'Heures sup.' },
        { id: 5, image: iconesCongesPayes.src, name: 'Congés payés' },
        { id: 6, image: iconesSalaire.src, name: 'Salaire' }
      ];
    }
    return [];
  });

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
      return 'bg-white';
    }

    const hoveredColumnIndex = attributeKeys.findIndex(key => key === columnHoveredKey);
    if (hoveredColumnIndex === -1) return 'bg-white';

    const isCurrentRowBeforeHovered = isItemBeforeHovered(itemId, itemHoveredId);
    const isCurrentColumnBeforeHovered = columnIndex < hoveredColumnIndex;
    const isSameRow = itemId === itemHoveredId;
    const isSameColumn = columnKey === columnHoveredKey;

    if (isSameRow && isCurrentColumnBeforeHovered) {
      return 'bg-[#e7f4f2]';
    } else if (isSameColumn && isCurrentRowBeforeHovered) {
      return 'bg-[#e7f4f2]';
    }
    
    return 'bg-white';
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

  // Gestion des images
  const handleImageClick = (itemId: number) => {
    setSelectedItemId(itemId);
    setIsImageModalOpen(true);
  };

  const handleImageSelect = (newImageSrc: string) => {    
    
    if (selectedItemId) {
      console.log(selectedItemId);
      
      const item = items.find(i => i && i.id === selectedItemId);
      onSave && onSave(
        {
          ...item,
          image: newImageSrc
        } as Evenement
      );
      // Logique pour mettre à jour l'image de l'élément
      setIsImageModalOpen(false);
      setSelectedItemId(null);
    }
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedItemId(null);
    setUploadError(null);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      if (file.size > 200 * 1024) {
        throw new Error('Le fichier est trop volumineux. Taille maximum : 200 Ko');
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Format non supporté. Formats acceptés : JPG, PNG, GIF, WebP, SVG');
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
          const { width, height } = img;
          
          if (width > 480 || height > 480) {
            setUploadError('Image trop grande. Dimensions maximum : 480x480px');
            setIsUploading(false);
            reject(new Error('Image trop grande'));
            return;
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0);
          
          const dataURL = canvas.toDataURL('image/png');
          setIsUploading(false);
          resolve(dataURL);
        };

        img.onerror = () => {
          setIsUploading(false);
          reject(new Error('Impossible de charger l\'image'));
        };

        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
          setAvailableImages(prev => [...prev, { id: prev.length + 1, image: img.src, name: file.name }]);
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      setIsUploading(false);
      setUploadError(error instanceof Error ? error.message : 'Erreur inconnue');
      throw error;
    }
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
  const renderAttributeValue = (value: string | undefined, attributeKey: string, itemId?: number) => {
    if (!value) return <span className="text-gray-400">-</span>;
    
    switch (attributeKey) {
      case 'verrou':
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
          if (dataType === 'chantier') {
            return (
              <AppointmentItem
                appointment={{ id: 0, description: '', type: 'chantier', EventId: itemId, startDate: new Date(), endDate: addHours(new Date(), 12), employeeId: 0, top: 0 }}
                isFullDay={false}
                isMobile={false}
                event={items.find(c => c.id === itemId) as ChantierEvent}
                employee={{ id: 0, name: '' }} // Placeholder, adapter selon le contexte
                source='demo'
                onDoubleClick={() => {
                  const newAppointment: Appointment = { id: 0, description: '', type: 'chantier', EventId: itemId, startDate: new Date(), endDate: addHours(new Date(), 12), employeeId: 0};
                  setSelectedAppointment(newAppointment);
                  onEditAppointment ? onEditAppointment(newAppointment) : null;
                }}
              />
            );
          }
          return (
            <div 
              className="flex items-center justify-center w-10 h-10 cursor-pointer hover:bg-gray-100 rounded-md transition-colors group relative"
              onClick={() => handleImageClick(itemId)}
              title="Cliquer pour choisir une image"
            >
              <img 
                src={value} 
                alt="Image" 
                className="w-8 h-8 group-hover:scale-110 transition-transform" 
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-80 transition-opacity flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                  <path d="M12 4.5L14.09 10.76L20 11.27L15 16.14L16.18 22.02L12 19.77L7.82 22.02L9 16.14L4 11.27L9.91 10.76L12 4.5Z"/>
                </svg>
              </div>
            </div>
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
        if (dataType === 'chantier') {
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
              <span className="text-gray-900 poppins">{value}</span>
            </div>
          );
        }
        break;
      case 'TM':
      case 'HR':
      case 'SH':
      case 'DPF':
      case 'RPF':
      case 'SP':
        if (dataType === 'chantier') {
          return (
            <div className='flex items-center justify-start w-full h-full'>
              <span className="text-gray-900 poppins">{value}</span>
            </div>
          );
        }
        break;
      default:
        return (
          <div className='flex items-center justify-start w-full h-full'>
            <span className="text-gray-900 poppins">{value}</span>
          </div>
        );
    }
    
    return (
      <div className='flex items-center justify-start w-full h-full'>
        <span className="text-gray-900 poppins">{value}</span>
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
        let value: string | undefined;
        
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
                    <div className="flex flex-col items-center ml-1">
                      {/* Flèche vers le haut */}
                      <svg 
                        className={`w-2 h-2 transition-colors ${
                          isActive && direction === 'asc' 
                            ? 'text-blue-600' 
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
                            ? 'text-blue-600' 
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
        {/* Contenu des éléments */}
        {sortedItems
          .filter(item => {
            if (!item) return false;
            if (dataType === 'chantier') {
              return 'attributs' in item;
            } else {
              return item.type === 'Absence' || item.type === 'Autre';
            }
          })
          .flatMap((item, rowIndex) => {
          const itemByCategories = getValuesByCategory(item);
          const allValues = itemByCategories.flatMap(cat => cat.values);
          
          return allValues.map(({ attributeKey, attributeLabel, value }, valueIndex) => {
            const columnIndex = attributeKeys.indexOf(attributeKey);
            const isExactHoveredCell = itemHoveredId === item.id && columnHoveredKey === attributeKey;

            const cellClasses = isExactHoveredCell 
            ? 'bg-[#e7f4f2] border-[#4CAF50]' 
            :  getCellPositionClasses(item.id, attributeKey, columnIndex);
            
            return (
              <div
                key={`${item.id}-${attributeKey}`}
                className={`border-b border-r border-gray-300 p-2 overflow-hidden text-sm transition-colors ${cellClasses}`}
                title={`${attributeLabel}: ${value || '-'}`}
                style={{
                  width: `${calculateColumnWidths[valueIndex]}px`,
                  minWidth: `${calculateColumnWidths[valueIndex]}px`,
                  maxWidth: `${calculateColumnWidths[valueIndex]}px`,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={() => {
                  if (dataType === 'chantier') {
                    setItemHoveredId(item.id);
                    setColumnHoveredKey(attributeKey);
                  }
                }}
                onMouseLeave={() => {
                  if (dataType === 'chantier') {
                    setItemHoveredId(null);
                    setColumnHoveredKey(null);
                  }
                }}
              >
                {renderAttributeValue(value, attributeKey, item.id)}
              </div>
            );
          });
        })}
      </FlexibleFrame>

      {/* Modal de sélection d'images */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        title="Choisir une image"
      >
        <ImageSelectorContent
          images={availableImages}
          onImageSelect={handleImageSelect}
          onClose={handleCloseImageModal}
          onImageUpload={handleImageUpload}
          isUploading={isUploading}
          uploadError={uploadError}
        />
      </Modal>
    </div>
  );
};

export default memo(DataTableFrame);