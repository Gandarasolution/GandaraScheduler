import { useState, useRef, useEffect, memo } from 'react';



export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
}

export function Combobox({ options, value, onValueChange, placeholder }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter(opt => value.includes(opt.value));

  const filteredOptions = options.filter(option =>
    option?.label?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !value.includes(option.value)
  );

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
    onValueChange([...value, option.value]);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleRemoveOption = (optionValue: string) => {
    onValueChange(value.filter(v => v !== optionValue));
  };

  const handleInputFocus = () => {
    setIsOpen(true);
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
          placeholder={placeholder}
          className="w-full rounded-xl border border-default bg-secondary-bg py-2 pl-9 pr-9 text-sm text-primary outline-none transition focus:border-primary"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
          </svg>
        </div>
      </div>

      {/* Menu déroulant des options */}
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-default bg-secondary-bg shadow-lg">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option)}
              className="w-full text-left px-3 py-2 transition-colors cursor-pointer"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {isOpen && searchQuery && filteredOptions.length === 0 && value.length < options.length && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-default bg-secondary-bg px-3 py-2 text-xs text-secondary shadow-lg">
          Aucun résultat trouvé
        </div>
      )}

      {/* Éléments sélectionnés affichés sous le select */}
      {selectedOptions.length > 0 && (
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
                className="rounded-full p-0.5 transition-colors"
                style={{
                  color: 'var(--color-primary-600)'
                }}
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