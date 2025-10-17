"use client";
import React, { useState, useRef, useEffect, memo } from 'react';

export interface SelectOptionWithImage {
  id: string | number;
  name: string;
  value?: string | number;
  image?: string;
  icon?: React.ReactNode;
  [key: string]: any; // Permet d'avoir d'autres propriétés dynamiques
}

interface CustomSelectWithImageProps {
  options: SelectOptionWithImage[];
  value: string | number;
  onChange: (value: string | number, option: SelectOptionWithImage) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  customArrow?: React.ReactNode;
  showImages?: boolean; // Afficher les images dans la liste au lieu du texte
  displayKey?: string; // Nouvelle prop pour choisir la clé d'affichage
  imageSize?: 'small' | 'medium' | 'large'; // Taille des images
  illustrationImage: React.ReactNode; 
}

/**
 * Composant Select personnalisé avec support d'images et flèche customisable
 * Alternative au select HTML natif avec plus de flexibilité visuelle
 */
const CustomSelectWithImage: React.FC<CustomSelectWithImageProps> = ({
  options,
  value,
  onChange,
  placeholder = "Sélectionner une option",
  className = "",
  disabled = false,
  error = false,
  helperText,
  customArrow,
  showImages = false, // Par défaut, affiche du texte dans la liste
  displayKey = "name", // Par défaut, utilise "name"
  imageSize = "medium", // Taille par défaut
  illustrationImage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Fonction pour obtenir le texte à afficher pour une option
  const getDisplayText = (option: SelectOptionWithImage): string => {
    return option[displayKey] || option.name || String(option.id);
  };

  const selectedOption = options.find(option => 
    String(option.value) === String(value) || String(option.image) === String(value)
  );
  
  // Tailles d'images
  const imageSizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };
  

  // Fonction pour rendre une image ou une icône
  const renderImage = (option: SelectOptionWithImage, sizeClass?: string) => {
    const size = sizeClass || imageSizes[imageSize];
    
    if (option.icon) {
      return <div className={`${size} flex items-center justify-center`}>{option.icon}</div>;
    }
    
    if (option.image) {
      return (
        <img 
          src={option.image} 
          alt={getDisplayText(option)}
          className={`${size} object-cover flex-shrink-0`}
          onError={(e) => {
            // Fallback en cas d'erreur de chargement d'image
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    return null;
  };

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation au clavier
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, options, onChange]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);    }
  };

  const handleOptionClick = (option: SelectOptionWithImage) => {
    onChange(
      showImages
        ? (option.image ?? option.id)
        : (option.value ?? option.id),
      option
    );
    setIsOpen(false);
  };

  const baseClasses = `
    relative border rounded-2xl text-gray-700 
    poppins text-[14px] font-medium bg-white cursor-pointer
    transition-colors duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:border-gray-400'}
    ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
    ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
    ${className}
  `;

  const DefaultArrow = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      fill="currentColor"
      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
        disabled ? 'text-gray-400' : 'text-gray-600'
      }`}
      viewBox="0 0 16 16"
    >
      <path 
        fillRule="evenodd" 
        d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"
      />
    </svg>
  );

  return (
    <div className={`custom-select-wrapper relative inline-block  ${!showImages ? 'w-full' : ''}`} ref={selectRef}>
      {/* Bouton principal du select */}
      <div
        className={baseClasses}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Image ou icône de l'option sélectionnée dans le bouton */}
                {selectedOption && showImages ? (
                    <div className="flex items-center gap-2">
                        {renderImage(selectedOption, "w-8 h-8")}
                    </div>
                ) : selectedOption ? (
                    <div className="flex items-center gap-2">
                      {illustrationImage}
                      <span className="truncate font-bold">{getDisplayText(selectedOption)}</span>
                    </div>
                ) :(
                    <span className="truncate text-gray-400">{placeholder}</span>
                )}
            </div>
          
            {/* Flèche dropdown */}
            <div className={`flex-shrink-0 ${showImages ? 'ml-4' : 'ml-2'}`}>
                {customArrow || <DefaultArrow />}
            </div>
        </div>
      </div>

      {/* Dropdown des options */}
      {isOpen && (
        <div className={`absolute z-50 ${showImages ? 'w-auto' : 'w-full'} mt-1 bg-white border border-gray-300 rounded-2xl shadow-lg max-h-60 overflow-y-auto scrollbar-hide`}>
          <ul role="listbox" className="py-1">
            {options.map((option) => (
              <li
                key={option.id}
                className={`
                  px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors duration-150 
                  ${String(option.value || option.id) === String(value) ? 'bg-[#C8E6E1] text-[#16302C] font-medium' : 'hover:bg-[#E7F4F2] hover:text-[#244F49]'}
                `}
                onClick={() => handleOptionClick(option)}
                role="option"
                aria-selected={String(option.value || option.id) === String(value)}
                title={showImages ? getDisplayText(option) : undefined} // Tooltip quand on affiche seulement l'image
              >    
                {/* Image dans la liste si activée */}
                {showImages && (option.image || option.icon) && (
                  <div className="flex-shrink-0">
                    {renderImage(option, "w-6 h-6")}
                  </div>
                )}
                
                {/* Texte de l'option */}
                {!showImages && (
                  <span className="flex-1 truncate">{getDisplayText(option)}</span>
                )}
                
                {/* Indicateur de sélection */}
                {String(option.value || option.id) === String(value) && (
                  <svg
                    className="w-4 h-4 text-[#16302C] flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Texte d'aide ou d'erreur */}
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default memo(CustomSelectWithImage);
