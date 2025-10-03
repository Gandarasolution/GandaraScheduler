/**
 * @fileoverview Composant PaieTableFrame - Vue tableau des éléments de paie
 * 
 * Ce composant réutilise FlexibleFrame pour afficher un tableau où :
 * - Les groupes représentent les catégories d'informations (Informations générales, Configuration)
 * - Les colonnes représentent les attributs (verrou, image, code, libellé, actf, catégorie)
 * 
 * @component PaieTableFrame
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
import React, {useMemo, useState } from 'react';
import FlexibleFrame from './FlexibleFrame';
import Modal from './Modal';
import { PaieItem } from '../types';
import { paieitems } from '../../datasource';

// Import des images de paie disponibles
import iconesAbsences from '../image/Icones/Paie/Absence.svg';
import iconesRepas from '../image/Icones/Paie/Repas.svg';
import iconesPrime from '../image/Icones/Paie/Prime.svg';
import iconesHeurSup from '../image/Icones/Paie/HeuresSupplementaires.svg';
import iconesCongesPayes from '../image/Icones/Paie/CongesPayes.svg';
import iconesSalaire from '../image/Icones/Paie/Salaire.svg';
import { rejects } from 'assert';

/**
 * Interface pour les données d'image
 */
interface ImageData {
  src: string;
  label: string;
  description: string;
  category?: string;
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
      image.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [images, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedImages = filteredImages.slice(startIndex, startIndex + itemsPerPage);

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
        // L'erreur est déjà gérée par le composant parent via uploadError
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
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#009580]"></div>
              <span className="ml-2 text-sm text-gray-600">Traitement en cours...</span>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 mb-2">
                Glissez-déposez une image ou{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#009580] hover:text-[#007a6b] font-medium underline"
                >
                  parcourez vos fichiers
                </button>
              </p>
              <p className="text-xs text-gray-500">
                Maximum 480x480px, 200 Ko • JPG, PNG, GIF, WebP, SVG
              </p>
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
            {filteredImages.length} image{filteredImages.length > 1 ? 's' : ''} trouvée{filteredImages.length > 1 ? 's' : ''}
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#009580] bg-opacity-10 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              title="Vue grille"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 10H3V3h7v7zm11 0h-7V3h7v7zm-11 11H3v-7h7v7zm11 0h-7v-7h7v7z"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#009580] bg-opacity-10 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              title="Vue liste"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu des images */}
      <div className="mb-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
        {paginatedImages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Aucune image trouvée pour "{searchTerm}"
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-5 gap-3">
            {paginatedImages.map((imageData, index) => (
              <div
                key={startIndex + index}
                className="flex flex-col items-center p-3 border-2 border-gray-200 rounded-lg hover:border-[#009580] hover:bg-green-50 cursor-pointer transition-all group"
                onClick={() => onImageSelect(imageData.src)}
                title={`${imageData.label} - ${imageData.description}`}
              >
                <div className="w-12 h-12 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <img 
                    src={imageData.src} 
                    alt={imageData.label} 
                    className="w-10 h-10"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedImages.map((imageData, index) => (
              <div
                key={startIndex + index}
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-[#009580] hover:bg-green-50 cursor-pointer transition-all group"
                onClick={() => onImageSelect(imageData.src)}
              >
                <div className="w-10 h-10 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <img 
                    src={imageData.src} 
                    alt={imageData.label} 
                    className="w-8 h-8"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800 text-sm">
                    {imageData.label}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {imageData.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mb-4">
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
 * Props du composant PaieTableFrame
 */
interface PaieTableFrameProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Composant PaieTableFrame - Affichage tableau des éléments de paie
 */
const PaieTableFrame: React.FC<PaieTableFrameProps> = ({
  className = '',
  style,
}) => {

  const containerWidth = useMemo(() => {
    return typeof window !== 'undefined' ? window.innerWidth - 85 : 1200;
  },[window.innerWidth]);

  const [paieItems, setPaieItems] = useState<PaieItem[]>(paieitems);

  // Images disponibles pour la paie avec leurs labels
  const availableImages = useMemo(() => [
    { src: iconesAbsences.src, label: 'Absence', description: 'Congés, arrêts maladie' },
    { src: iconesRepas.src, label: 'Repas', description: 'Tickets restaurant, indemnités repas' },
    { src: iconesPrime.src, label: 'Prime', description: 'Primes diverses, bonus' },
    { src: iconesHeurSup.src, label: 'Heures sup.', description: 'Heures supplémentaires' },
    { src: iconesCongesPayes.src, label: 'Congés payés', description: 'Congés payés, RTT' },
    { src: iconesSalaire.src, label: 'Salaire', description: 'Salaire de base, appointements' }
  ], []);

  // États pour gérer la modal de sélection d'images
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedPaieItemId, setSelectedPaieItemId] = useState<number | null>(null);
  
  // États pour l'ajout d'images
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // État pour gérer le tri
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });

  // Fonction pour trier les éléments de paie
  const sortedPaieItems = useMemo(() => {
    if (!sortConfig.key) return paieItems;
    
    const sorted = [...paieItems].sort((a, b) => {
      // Vérifier si les éléments ont des données valides
      if (!a || !b) return 0;
      
      // Récupérer les valeurs selon le type de propriété
      let aValue: any, bValue: any;
      
      if (sortConfig.key === 'image') {
        aValue = a.image;
        bValue = b.image;
      } else if (sortConfig.key === 'verrou') {
        aValue = a.verrou;
        bValue = b.verrou;
      } else {
        aValue = a[sortConfig.key as keyof PaieItem];
        bValue = b[sortConfig.key as keyof PaieItem];
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
  }, [paieItems, sortConfig]);

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

  // Fonction pour ouvrir la modal de sélection d'image
  const handleImageClick = (paieItemId: number) => {
    setSelectedPaieItemId(paieItemId);
    setIsImageModalOpen(true);
  };

  // Fonction pour changer l'image d'un élément de paie
  const handleImageSelect = (newImageSrc: string) => {
    if (selectedPaieItemId) {
      setPaieItems(prevItems => 
        prevItems.map(item => {
          if (item.id === selectedPaieItemId) {
            return {
              ...item,
              image: newImageSrc
            };
          }
          return item;
        })
      );
      setIsImageModalOpen(false);
      setSelectedPaieItemId(null);
    }
  };

  // Fonction pour fermer la modal
  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedPaieItemId(null);
    setUploadError(null);
  };

  // Fonction pour valider et traiter l'upload d'image
  const handleImageUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Vérifier la taille du fichier (200 Ko max)
      if (file.size > 200 * 1024) {
        throw new Error('Le fichier est trop volumineux. Taille maximum : 200 Ko');
      }

      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Format non supporté. Formats acceptés : JPG, PNG, GIF, WebP, SVG');
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
          try {
            // Vérifier les dimensions (480x480 max)
            if (img.width > 480 || img.height > 480) {
              reject(new Error('Image trop grande. Dimensions maximum : 480x480 pixels'));
            }

            // Si l'image est valide, la convertir en base64
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            const dataURL = canvas.toDataURL(file.type);
            setIsUploading(false);
            resolve(dataURL);
          } catch (error) {
            setIsUploading(false);
            reject(error);
          }
        };

        img.onerror = () => {
          setIsUploading(false);
          reject(new Error('Erreur lors du chargement de l\'image'));
        };

        // Créer une URL temporaire pour l'image
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      setIsUploading(false);
      setUploadError(error instanceof Error ? error.message : 'Erreur inconnue');
      throw error;
    }
  };
  
  // Structure organisée des attributs sans groupes
  const categoriesStructure = useMemo(() => [
    {
      key: 'all',
      label: '', 
      attributes: [
        { key: 'verrou', label: 'Verrou' },
        { key: 'image', label: 'Image', isBaseProperty: true },
        { key: 'code', label: 'Code' },
        { key: 'libelle', label: 'Libellé' },
        { key: 'actf', label: 'ACTF' },
        { key: 'categorie', label: 'Catégorie' },
      ]
    }
  ], []);

  // Configuration des groupes (pas de regroupement)
  const groups = useMemo(() => 
    categoriesStructure.map(category => ({
      label: '',
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
    ) as (keyof PaieItem | 'image')[]
  , [categoriesStructure]);

  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Logique de scroll personnalisée si nécessaire
  };

  /**
   * Fonction qui retourne les valeurs d'un élément de paie organisées par catégorie
   */
  const getPaieValuesByCategory = React.useCallback((paieItem: PaieItem) => {
    // Vérification de sécurité
    if (!paieItem) {
      console.error('Élément de paie invalide dans getPaieValuesByCategory:', paieItem);
      return [];
    }
    
    return categoriesStructure.map(category => ({
      categoryKey: category.key,
      categoryLabel: category.label,
      values: category.attributes.map(attr => {
        let value: string | undefined;
        
        if (attr.key === 'verrou') {
          // Convertir boolean en string
          value = paieItem.verrou ? 'true' : 'false';
        } else if (attr.isBaseProperty || attr.key === 'image') {
          // Propriété directe de PaieItem (image, etc.)
          value = (paieItem as any)[attr.key];
        } else {
          // Propriété standard de PaieItem
          value = paieItem[attr.key as keyof PaieItem] as string;
        }
        
        return {
          attributeKey: attr.key,
          attributeLabel: attr.label,
          value: value
        };
      })
    }));
  }, [categoriesStructure]);

  // Debug : Afficher la structure organisée dans la console
  React.useEffect(() => {
    console.log('💰 Structure des catégories et attributs (Paie):', categoriesStructure);
    console.log('📊 Configuration des groupes (Paie):', groups);
    console.log('🏷️ Labels des attributs (Paie):', attributeLabels);
    console.log('🔑 Clés des attributs (Paie):', attributeKeys);
    console.log('🔄 Configuration du tri (Paie):', sortConfig);
    
    if (sortedPaieItems.length > 0) {
      const exempleElement = getPaieValuesByCategory(sortedPaieItems[0]);
      console.log('📋 Exemple d\'élément de paie organisé par catégories:', exempleElement);
    }
  }, [categoriesStructure, groups, attributeLabels, attributeKeys, sortedPaieItems, getPaieValuesByCategory, sortConfig]);

  // Calculer les largeurs pour chaque colonne
  const calculateColumnWidths = React.useMemo(() => {
    if (!sortedPaieItems.length) return attributeLabels.map(() => 80);

    // Largeur disponible (en prenant en compte le padding du conteneur)
    const availableWidth = containerWidth;
    
    // Colonnes avec leurs largeurs minimales
    const columnConfig = [
      { key: 'verrou', minWidth: 80, weight: 1 },
      { key: 'image', minWidth: 80, weight: 1 },
      { key: 'code', minWidth: 120, weight: 1.5 },
      { key: 'libelle', minWidth: 250, weight: 4 }, // Plus de poids pour le libellé
      { key: 'actf', minWidth: 100, weight: 1.2 },
      { key: 'categorie', minWidth: 150, weight: 2 },
    ];

    // Calculer la largeur totale minimale
    const totalMinWidth = columnConfig.reduce((sum, col) => sum + col.minWidth, 0);
    const totalWeight = columnConfig.reduce((sum, col) => sum + col.weight, 0);
    
    // Si on a plus d'espace que le minimum, distribuer proportionnellement
    if (availableWidth > totalMinWidth) {
      const extraSpace = availableWidth - totalMinWidth;
      
      return columnConfig.map(col => {
        const extraWidth = (extraSpace * col.weight) / totalWeight;
        return Math.floor(col.minWidth + extraWidth);
      });
    } else {
      // Si pas assez d'espace, utiliser les largeurs minimales
      return columnConfig.map(col => col.minWidth);
    }
  }, [attributeLabels, attributeKeys, containerWidth, sortedPaieItems.length]);

  // Créer le style CSS Grid avec les largeurs calculées
  const gridTemplateColumns = React.useMemo(() => {
    return calculateColumnWidths.map(width => `${width}px`).join(' ');
  }, [calculateColumnWidths]);

  // Rendu des valeurs d'attributs avec styles appropriés
  const renderAttributeValue = (value: string | undefined, attributeKey: keyof PaieItem | 'image', paieItemId?: number) => {
    if (!value) return <span className="text-gray-400">-</span>;
    
    switch (attributeKey) {
      case 'verrou':
        // Afficher une icône de cadenas selon l'état
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
        if (value && typeof value === 'string' && paieItemId) {
          return (
            <div 
              className="flex items-center justify-center w-10 h-10 cursor-pointer hover:bg-gray-100 rounded-md transition-colors group relative"
              onClick={() => handleImageClick(paieItemId)}
              title="Cliquer pour choisir une image"
            >
              <img 
                src={value} 
                alt="Paie" 
                className="w-8 h-8 group-hover:scale-110 transition-transform" 
              />
              {/* Indicateur de clic */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-80 transition-opacity flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                  <path d="M12 4.5L14.09 10.76L20 11.27L15 16.14L16.18 22.02L12 19.77L7.82 22.02L9 16.14L4 11.27L9.91 10.76L12 4.5Z"/>
                </svg>
              </div>
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      default:
        return (
          <div className='flex items-center justify-start w-full h-full'>
            <span className="text-gray-900 poppins">{value}</span>
          </div>
        );
    }
  };

  return (
    <div className="relative h-full">

      <FlexibleFrame
        groups={groups}
        items={attributeLabels}
        mainScrollRef={mainScrollRef}
        onScroll={handleScroll}

        showGroupHeaders={false} // Pas de groupes visibles
        className="paie-timeline-frame h-full pl-7 overflow-x-hidden"
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
                onClick={() => handleSort(attributeKey as string)}
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
        {/* Contenu des éléments de paie avec largeurs calculées */}
        {sortedPaieItems
          .filter(paieItem => paieItem) // Filtrer les éléments invalides
          .flatMap((paieItem: PaieItem, rowIndex: number) => {
          const paieByCategories = getPaieValuesByCategory(paieItem);
          const allValues = paieByCategories.flatMap(cat => cat.values);
          
          return allValues.map(({ attributeKey, attributeLabel, value }, valueIndex) => {
            const columnWidth = calculateColumnWidths[valueIndex] || 150;
              
            return (
              <div
                key={`${paieItem.id}-${attributeKey}`}
                className="paie-cell px-3 py-2 border-r border-b border-gray-100 bg-white text-sm hover:bg-gray-50 transition-colors"
                style={{ 
                  height: '58px',
                  width: `${columnWidth}px`,
                  minWidth: `${columnWidth}px`,
                  maxWidth: `${columnWidth}px`,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={`${attributeLabel}: ${value || 'N/A'}`}
              >
                {renderAttributeValue(value, attributeKey as keyof PaieItem | 'image', paieItem.id)}
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

export default PaieTableFrame;