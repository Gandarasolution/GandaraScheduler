import { memo, useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import { ImageType } from "../../types";

/**
 * Props pour le composant ImageSelectorContent
 */
interface ImageSelectorContentProps {
  isOpen: boolean;
  actualImage: ImageType | undefined | null;
  onImageSelect: (image: ImageType) => void;
  onClose: () => void;
  onImageUpload: (file: File) => Promise<ImageType>;
  isUploading: boolean;
  uploadError: string | null;
  // La fonction de fetch devient l'unique source de vérité
  fetchPaginatedImages: (page: number, limit: number) => Promise<{ image: ImageType[]; totalLignes: number }>; 
  addImageToDatabase?: (file: File) => Promise<void>;
}

/**
 * Composant de sélection d'images avec recherche et pagination serveur
 */
const ImageSelectorContentModal: React.FC<ImageSelectorContentProps> = ({
  isOpen,
  actualImage,
  onImageSelect,
  onClose,
  onImageUpload,
  isUploading,
  uploadError,
  fetchPaginatedImages,
  addImageToDatabase,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  
  // NOUVEAUX STATES POUR LA PAGINATION SERVEUR
  const [serverImages, setServerImages] = useState<ImageType[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const itemsPerPage = 8;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 1. EFFET DE FETCH : Appelé à l'ouverture et au changement de page
 useEffect(() => {
    if (isOpen && fetchPaginatedImages) {
      let isMounted = true;
      setIsLoadingImages(true);
      
      fetchPaginatedImages(currentPage, itemsPerPage)
        .then(async (response) => {
          if (isMounted && response) {
            const fetchedImages = response.image || [];
            
            // On demande au navigateur de télécharger silencieusement les 8 images
            const preloadPromises = fetchedImages.map((imgData) => {
              return new Promise((resolve) => {
                const img = new window.Image(); // Objet Image natif du navigateur
                img.src = imgData.image;        // L'URL renvoyée par votre API
                img.onload = resolve;           // Téléchargement réussi
                img.onerror = resolve;          // Erreur (on ne bloque pas les autres)
              });
            });

            // On attend que TOUTES les images soient dans le cache du navigateur
            await Promise.all(preloadPromises);
            
            // --- FIN DU PRÉCHARGEMENT ---

            // Seulement maintenant, on les affiche (elles apparaîtront instantanément !)
            if (isMounted) {
              setServerImages(fetchedImages);
              setTotalItems(response.totalLignes || 0);
            }
          }
        })
        .catch((error) => console.error("Erreur de fetch des images :", error))
        .finally(() => {
          if (isMounted) setIsLoadingImages(false); // Le spinner disparaît
        });

      return () => { isMounted = false; };
    }
  }, [isOpen, currentPage, fetchPaginatedImages]);

  // 2. Réinitialiser la page à 1 quand on ferme la modale
  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(1);
      setServerImages([]); // Nettoyage optionnel
    }
  }, [isOpen]);

  // 3. Préparation des images pour l'affichage (Placement de l'image actuelle en premier)
  const displayImages = useMemo(() => {
    let result = [...serverImages];
    
    if (actualImage) {
      result.sort((a, b) => {
        if (a.id === actualImage.id) return -1;
        if (b.id === actualImage.id) return 1;
        return 0;
      });
    }
    
    return result;
  }, [serverImages, actualImage]);

  // Calcul du total des pages basé UNIQUEMENT sur le retour serveur
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sélecteur d'images"
      className=""
    >
      <div className="w-[700px] p-4 max-h-[80vh]">
        {/* Zone d'upload */}
        <div className="mb-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary-50' 
                : 'border-gray-300 hover:border-primary'
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
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-primary">Upload en cours...</span>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">📁</div>
                <div className="text-secondary mb-2">
                  Glissez-déposez une image ici ou{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary underline "
                  >
                    parcourez vos fichiers
                  </button>
                </div>
                <div className="text-xs text-secondary">
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

        {/* Contrôles d'affichage */}
        <div className="mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-primary">
              {totalItems} image{totalItems !== 1 ? 's' : ''} au total
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-transparent'}`}
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
                className={`p-2 rounded cursor-pointer  ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-transparent'}`}
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
        <div className="mb-4 max-h-96 min-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 gap-4 relative">
          
          {isLoadingImages ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : displayImages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune image disponible
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-4 gap-4 mb-4">
              {displayImages.map((image, index) => (
                <div
                  key={index}
                  onClick={() => onImageSelect(image)}
                  className="cursor-pointer group relative"
                >
                  <div 
                    className={`border-2 rounded-lg p-2 hover:border-primary hover:shadow-md transition-all relative ${
                      index === 0 && currentPage === 1 && actualImage !== null && image.id === actualImage?.id
                        ? 'border-primary shadow-lg bg-primary-50' 
                        : 'border-gray-200 hover:border-primary'
                    }`}
                    title={`Image ${image.id}`}
                  >
                    <img 
                      src={image.image} 
                      alt={`Image ${image.id}`} 
                      className={`w-full h-20 object-contain mb-2 group-hover:scale-105 transition-transform ${
                        index === 0 && currentPage === 1 ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {displayImages.map((image, index) => (
                <div
                  key={index}
                  onClick={() => onImageSelect(image)}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer hover:border-primary hover:shadow-md transition-all group relative ${
                    index === 0 && currentPage === 1 && actualImage !== null && image.id === actualImage?.id
                      ? 'border-primary shadow-md bg-primary-50' 
                      : 'border-gray-200'
                  }`}
                  title={`Image ${image.id}`}
                >
                  <img 
                    src={image.image} 
                    alt={`Image ${image.id}`} 
                    className={`w-full h-12 object-contain mr-3 group-hover:scale-105 transition-transform ${
                      index === 0 && currentPage === 1 ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                    }`}
                  />
                  <div>
                    <div className="font-medium text-gray-900 group-hover:text-primary">Image {image.id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoadingImages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                ←
              </button>
              
              <span className="text-sm text-primary">
                Page {currentPage} sur {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || isLoadingImages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-primary">
            💡 Astuce : Vous pouvez également glisser-déposer une image directement sur cette zone
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-primary rounded-lg transition-colors cursor-pointer hover:bg-gray-300"
          >
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default memo(ImageSelectorContentModal);