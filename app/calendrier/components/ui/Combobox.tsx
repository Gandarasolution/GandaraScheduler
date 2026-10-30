"use client";

import { useState, useRef, useEffect, memo } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
}

type BaseComboboxProps = {
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
};

type SingleComboboxProps = BaseComboboxProps & {
  multiple?: false;
  value: string;
  onValueChange: (value: string) => void;
};

type MultiComboboxProps = BaseComboboxProps & {
  multiple: true;
  value: string[];
  onValueChange: (value: string[]) => void;
};

export type ComboboxProps = SingleComboboxProps | MultiComboboxProps;

export function Combobox(props: ComboboxProps) {
  const { options, placeholder, disabled, multiple = false } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalisation des valeurs sélectionnées sous forme d'un tableau pour simplifier la logique interne
  const selectedValues = multiple
    ? (props.value as string[])
    : props.value
    ? [props.value as string]
    : [];

  const selectedOptions = options.filter(opt => selectedValues.includes(opt.value));

  // En mode 'single', on montre l'option actuellement choisie si la recherche est vide
  // En mode 'multiple', on filtre les options déjà sélectionnées
  const filteredOptions = options.filter(option => {
    const matchesQuery = option?.label?.toLowerCase().includes(searchQuery.toLowerCase());
    if (multiple) {
      return matchesQuery && !selectedValues.includes(option.value);
    }
    return matchesQuery;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  };

  const handleOptionClick = (option: ComboboxOption) => {
    if (multiple) {
      (props as MultiComboboxProps).onValueChange([...(props.value as string[]), option.value]);
    } else {
      (props as SingleComboboxProps).onValueChange(option.value);
    }
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleRemoveOption = (optionValue: string) => {
    if (multiple) {
      (props as MultiComboboxProps).onValueChange(
        (props.value as string[]).filter(v => v !== optionValue)
      );
    } else {
      (props as SingleComboboxProps).onValueChange('');
    }
  };

  const handleInputFocus = () => {
    if (!disabled) setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Champ de recherche */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
          <svg className="h-4 w-4 text-secondary" aria-hidden="true" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={disabled}
          placeholder={
            !multiple && selectedOptions.length > 0
              ? selectedOptions[0].label
              : placeholder
          }
          className="w-full rounded-xl border border-default bg-primary-bg py-2.5 pl-9 pr-9 text-sm text-primary outline-none transition focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
          </svg>
        </div>
      </div>

      {/* Menu déroulant des options */}
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-default bg-secondary-bg shadow-lg">
          {filteredOptions.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionClick(option)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                  isSelected ? 'font-semibold text-primary-600' : 'text-primary'
                }`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isOpen && !disabled && searchQuery && filteredOptions.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-default bg-secondary-bg px-3 py-2 text-xs text-secondary shadow-lg">
          Aucun résultat trouvé
        </div>
      )}

      {/* Éléments sélectionnés (badges) */}
      {selectedOptions.length > 0 && multiple && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedOptions.map((option) => (
            <div
              key={option.value}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-600)',
                border: 'none'
              }}
            >
              <span>{option.label}</span>
              <button
                type="button"
                onClick={() => handleRemoveOption(option.value)}
                disabled={disabled}
                className="rounded-full p-0.5 transition-colors"
                style={{ color: 'var(--color-primary-600)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-400)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-primary-600)';
                }}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(Combobox);