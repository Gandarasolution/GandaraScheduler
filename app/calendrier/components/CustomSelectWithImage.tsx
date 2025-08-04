"use client";
import React, { useState, useRef, useEffect } from 'react';

export interface SelectOptionWithImage {
  id: string | number;
  name: string;
  value?: string | number;
  image?: string;
  icon?: React.ReactNode;
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
  showImages?: boolean;
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
  showImages = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => 
    String(option.value || option.id) === String(value)
  );

  // Tailles d'images
  const imageSizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
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
    onChange(option.value || option.id, option);
    setIsOpen(false);
  };

  const baseClasses = `
    relative border rounded-2xl py-2 px-4 w-full h-[48px] text-gray-700 
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
      width="16"
      height="16"
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
    <div className="custom-select-wrapper relative inline-block w-full" ref={selectRef}>
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
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Image ou icône de l'option sélectionnée */}
                {showImages && selectedOption && (selectedOption.image || selectedOption.icon) && (
                    <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="20" height="20" viewBox="0 0 510 510" enableBackground="new 0 0 510 510"  xmlSpace="preserve">
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
                )}
                {/* Texte de l'option sélectionnée */}
                <span className="truncate">
                {selectedOption ? selectedOption.name : placeholder}
                </span>
            </div>
          
            {/* Flèche dropdown */}
            <div className="flex-shrink-0 ml-2">
                {customArrow || <DefaultArrow />}
            </div>
        </div>
      </div>

      {/* Dropdown des options */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-2xl shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
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
              >    
                {/* Texte de l'option */}
                <span className="flex-1 truncate">{option.name}</span>
                
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

export default CustomSelectWithImage;
