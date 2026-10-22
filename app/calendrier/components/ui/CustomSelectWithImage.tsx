"use client";
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useState, useRef, useEffect, memo } from 'react';

export interface SelectOptionWithImage {
  id: string | number;
  name: string;
  value?: string | number;
  image?: string;
  icon?: React.ReactNode;
  canDelete?: boolean;
  isEphemeral?: boolean;
  [key: string]: any;
}

interface CustomSelectWithImageProps {
  options: SelectOptionWithImage[];
  value: string | number;
  onChange: (value: string | number, option: SelectOptionWithImage) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  helperText?: string;
  customArrow?: React.ReactNode;
  showImages?: boolean;
  displayKey?: string;
  imageSize?: 'small' | 'medium' | 'large';
  illustrationImage: React.ReactNode; 
  onAddOption?: () => void;
  addOptionLabel?: string;
  onEditOption?: (option: SelectOptionWithImage) => void;
  onDeleteOption?: (option: SelectOptionWithImage) => void | Promise<void>;
  deletingOptionId?: string | number | null;
}

const CustomSelectWithImage: React.FC<CustomSelectWithImageProps> = ({
  options,
  value,
  onChange,
  placeholder = "Sélectionner une option",
  className = "",
  disabled = false,
  customArrow,
  showImages = false,
  displayKey = "name",
  imageSize = "medium",
  illustrationImage,
  onAddOption,
  addOptionLabel = "Créer une vue",
  onEditOption,
  onDeleteOption,
  deletingOptionId = null 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const getDisplayText = (option: SelectOptionWithImage): string => {
    return option[displayKey] || option.name || String(option.id);
  };

  const selectedOption = options.find(option => 
    String(option.value) === String(value) || String(option.image) === String(value)
  );

  const imageSizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

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
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    return null;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
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

  const handleEditClick = (event: React.MouseEvent, option: SelectOptionWithImage) => {
    event.stopPropagation();
    if (onEditOption) {
      onEditOption(option);
      setIsOpen(false);
    }
  };

  const handleDeleteClick = async (event: React.MouseEvent, option: SelectOptionWithImage) => {
    event.stopPropagation();
    if (!onDeleteOption || deletingOptionId !== null) return;
    await onDeleteOption(option);
  };

  const baseClasses = `
    relative border rounded-2xl
    poppins text-[14px] font-medium bg-primary-bg cursor-pointer
    transition-colors duration-200 ease-in-out
    border border-default
    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:border-gray-400'}
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
    <div className={`custom-select-wrapper relative inline-block ${!showImages ? 'w-full' : ''}`} ref={selectRef}>
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
        <div className="flex items-center justify-between h-full text-primary">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedOption && showImages ? (
              <div className="flex items-center gap-2">
                {renderImage(selectedOption, "w-8 h-8")}
              </div>
            ) : selectedOption ? (
              <div className="flex items-center gap-2">
                {illustrationImage}
                <span className="truncate font-bold">{getDisplayText(selectedOption)}</span>
              </div>
            ) : (
              <span className="truncate text-gray-400">{placeholder}</span>
            )}
          </div>
          
          <div className={`flex-shrink-0 ${showImages ? 'ml-4' : 'ml-2'}`}>
            {customArrow || <DefaultArrow />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-50 ${showImages ? 'w-auto' : 'w-full'} mt-1 bg-secondary-bg text-primary rounded-2xl shadow-lg max-h-60 overflow-y-auto scrollbar-hide border border-default`}>
          <ul role="listbox" className="py-1">
            {options.map((option) => {
              const isSelected = String(option.value ?? option.id) === String(value);
              const isDeletingThis = deletingOptionId !== null && String(deletingOptionId) === String(option.id);
              const canDelete = Boolean(onDeleteOption) && option.canDelete !== false;
              const canEdit = Boolean(onEditOption) && !option.isEphemeral;

              return (
                <li
                  key={option.id}
                  className={`group flex cursor-pointer items-center justify-between gap-2 px-3 py-2 transition-colors duration-150 ${
                    isDeletingThis
                      ? "bg-red-50 text-red-700"
                      : isSelected
                        ? "bg-primary-100 font-medium text-primary"
                        : "hover:bg-primary-50 hover:text-secondary"
                  }`}
                  onClick={() => handleOptionClick(option)}
                  role="option"
                  aria-selected={isSelected}
                  title={showImages ? getDisplayText(option) : undefined}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {(showImages || option.icon) && (
                      <div className="flex-shrink-0">
                        {renderImage(option, "w-5 h-5")}
                      </div>
                    )}
                    <span className="truncate">{getDisplayText(option)}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Bouton Modifier */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(e, option)}
                        title="Modifier cette vue"
                        aria-label={`Modifier ${getDisplayText(option)}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-secondary/70 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Bouton Suppression */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => void handleDeleteClick(e, option)}
                        disabled={deletingOptionId !== null}
                        title="Supprimer cette vue"
                        aria-label={`Supprimer ${getDisplayText(option)}`}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer ${
                          isDeletingThis
                            ? "bg-red-100 text-red-600"
                            : "text-secondary/70 hover:bg-red-50 hover:text-red-600"
                        } disabled:cursor-not-allowed`}
                      >
                        {isDeletingThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}

            {/* Action pour ajouter une nouvelle vue au bas de la liste */}
            {onAddOption && (
              <li className="border-t border-default mt-1 px-1 pt-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  onClick={() => {
                    onAddOption();
                    setIsOpen(false);
                  }}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span>{addOptionLabel}</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default memo(CustomSelectWithImage);