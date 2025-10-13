/**
 * @fileoverview Composant ImageSelectorContent - Sélection d'images avec recherche et pagination
 * 
 * Ce composant gère la sélection d'images avec fonctionnalités avancées :
 * - Recherche par nom et description
 * - Pagination
 * - Upload par drag & drop
 * - Validation des contraintes (taille, format)
 * 
 * @component ImageSelectorContent
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";

import React, { useState, useMemo } from 'react';

/**
 * Interface pour les données d'image
 */
export interface ImageData {
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
      <div className="mb-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
        {paginatedImages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 
              `Aucune image trouvée pour "${searchTerm}"` :
              'Aucune image disponible'
            }
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 gap-4">
            {paginatedImages.map((image, index) => (
              <div
                key={index}
                onClick={() => onImageSelect(image.src)}
                className="cursor-pointer group"
              >
                <div className="border rounded-lg p-2 hover:border-[#009580] hover:shadow-md transition-all">
                  <img 
                    src={image.src} 
                    alt={image.label} 
                    className="w-full h-20 object-contain mb-2 group-hover:scale-105 transition-transform"
                  />
                  <div className="text-xs text-center text-gray-600 group-hover:text-[#009580]">
                    {image.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedImages.map((image, index) => (
              <div
                key={index}
                onClick={() => onImageSelect(image.src)}
                className="flex items-center p-3 border rounded-lg cursor-pointer hover:border-[#009580] hover:shadow-md transition-all group"
              >
                <img 
                  src={image.src} 
                  alt={image.label} 
                  className="w-12 h-12 object-contain mr-3 group-hover:scale-105 transition-transform"
                />
                <div>
                  <div className="font-medium text-gray-900 group-hover:text-[#009580]">{image.label}</div>
                  <div className="text-sm text-gray-500">{image.description}</div>
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

export default ImageSelectorContent;