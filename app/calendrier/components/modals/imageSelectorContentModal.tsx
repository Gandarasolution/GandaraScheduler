import { memo, use, useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import { Image } from "../../types";


/**
 * Props pour le composant ImageSelectorContent
 */
interface ImageSelectorContentProps {
  isOpen: boolean;
  images: Image[];
  actualImage: Image | null;
  onImageSelect: (image: Image) => void;
  onClose: () => void;
  onImageUpload: (file: File) => Promise<Image>;
  isUploading: boolean;
  uploadError: string | null;
}

/**
 * Composant de sélection d'images avec recherche et pagination
 */
const ImageSelectorContentModal: React.FC<ImageSelectorContentProps> = ({
  images,
  isOpen,
  actualImage,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  // console.log(actualImage);
  // console.log(images);
  
  useEffect(() => {
    images.forEach(img => {
      // console.log('img', img);
      // console.log('actualImage', actualImage);
      // console.log(img.image === actualImage);
      console.log(typeof img.image);
      console.log(typeof actualImage);
      
      
      
      
      
      if (img.id === actualImage?.id) {
        console.log('Image actuelle trouvée:', img);
      }
    });
  },[isOpen]);
  

  // Filtrer les images selon le terme de recherche
  const filteredImages = useMemo(() => {
     let result = searchTerm.trim() 
      ? images.filter(image => 
          image.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : images;
    
    // **PLACER L'IMAGE ACTUELLE EN PREMIER**
    if (actualImage) {
      result = [...result].sort((a, b) => {
        if (a.id === actualImage?.id) return -1; // a en premier
        if (b.id === actualImage?.id) return 1;  // b en premier
        return 0; // Garde l'ordre original
      });
    }
    
    return result;
  }, [images, searchTerm, actualImage]);

    // Pagination
    const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedImages = viewMode === 'grid' ? filteredImages.slice(startIndex, startIndex + itemsPerPage) : filteredImages;

    // Reset page quand on change le filtre
    useEffect(() => {
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
                ? 'border-primary bg-primary-ultra-light' 
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

        {/* Barre de recherche et contrôles */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une image..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full placeholder:text-primary pl-10 pr-4 py-2 border border-gray-300 rounded-lg  focus:outline-none focus:ring-2 focus:ring-color focus:border-transparent"
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
            <span className="text-sm text-primary">
              {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''} trouvée{filteredImages.length !== 1 ? 's' : ''}
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
                    onClick={() => onImageSelect(image)}
                    className="cursor-pointer group relative"
                  >
                    <div 
                      className={`border-2 rounded-lg p-2 hover:border-primary hover:shadow-md transition-all relative ${
                        index === 0 && currentPage === 1 && actualImage !== null
                          ? 'border-primary shadow-lg bg-primary-ultra-light' 
                          : 'border-gray-200 hover:border-primary'
                      }`}
                      title={image.name}
                    >
                      <img 
                        src={image.image} 
                        alt={image.name} 
                        className={`w-full h-20 object-contain mb-2 group-hover:scale-105 transition-transform ${
                          index === 0 && currentPage === 1 ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                        }`}
                      />
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
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    ←
                  </button>
                  
                  <span className="text-sm text-primary">
                    Page {currentPage} sur {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
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
                  onClick={() => onImageSelect(image)}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer hover:border-primary hover:shadow-md transition-all group relative ${
                    index === 0 
                      ? 'border-primary shadow-md bg-primary-ultra-light' 
                      : 'border-gray-200'
                  }`}
                  title={image.name}
                >
                  <img 
                    src={image.image} 
                    alt={image.name} 
                    className={`w-12 h-12 object-contain mr-3 group-hover:scale-105 transition-transform ${
                      index === 0 ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                    }`}
                  />
                  <div>
                    <div className="font-medium text-gray-900 group-hover:text-primary">{image.name.length > 15 ? `${image.name.slice(0, 15)}...` : image.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-primary">
            💡 Astuce : Vous pouvez également glisser-déposer une image directement sur cette zone
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-primary rounded-lg transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default memo(ImageSelectorContentModal);