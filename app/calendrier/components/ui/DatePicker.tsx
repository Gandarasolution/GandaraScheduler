import React, { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format as formatDate, parse, isValid } from 'date-fns';
import { fr } from "react-day-picker/locale";


export interface DatePickerProps {
  value?: number | Date | null;
  onChange?: (date: number) => void;
  format?: string; // date-fns format
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
  openOnFocus?: boolean;
  disabled?: boolean;
}

const toDate = (v?: number | Date | null) => {
  if (v == null) return undefined;
  return typeof v === 'number' ? new Date(v) : v instanceof Date ? v : undefined;
};

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  format = 'dd/MM/yyyy',
  placeholder = '',
  className = '',
  inputClassName = '',
  showIcon = true,
  openOnFocus = true,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const d = toDate(value);
    setInputValue(d ? formatDate(d, format) : '');
  }, [value, format]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const commitInput = (text: string) => {
    const parsed = parse(text, format, new Date());
    if (isValid(parsed)) {
      const normalized = new Date(parsed).setHours(0, 0, 0, 0);
      onChange && onChange(normalized);
    } else {
      // try ISO fallback
      const iso = new Date(text);
      if (!isNaN(iso.getTime())) {
        const normalized = iso.setHours(0, 0, 0, 0);
        onChange && onChange(normalized);
      } else {
        // invalid -> reset input to current value
        const d = toDate(value);
        setInputValue(d ? formatDate(d, format) : '');
      }
    }
  };

  return (
    <div className={"relative " + className} ref={ref}>
      <div className="relative">
        <input
          type="text"
          className={"block w-full p-3 pr-10 pl-4 text-base rounded-xl transition focus:outline-0 poppins text-[14px] " + inputClassName}
          placeholder={placeholder || format}
          value={inputValue}
          disabled={disabled}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitInput(inputValue);
              setIsOpen(false);
            } else if (e.key === 'Escape') {
              setIsOpen(false);
              const d = toDate(value);
              setInputValue(d ? formatDate(d, format) : '');
            }
          }}
          onBlur={() => commitInput(inputValue)}
          onFocus={() => { if (openOnFocus) setIsOpen(true); }}
        />

        {showIcon && (
          <button
            type="button"
            onClick={() => setIsOpen((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
            style={{ color: 'var(--icon-secondary)' }}
            aria-label="Ouvrir le sélecteur de date"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
          <DayPicker
            mode="single"
            selected={toDate(value)}
            className='p-2'
            onSelect={(date) => {                
              if (!date) {
                setIsOpen(false);
                return;
              }
              const d = date.setHours(0, 0, 0, 0);
              onChange && onChange(d);
              setInputValue(formatDate(new Date(d), format));
              setIsOpen(false);
            }}
            locale={fr}
            today={new Date()}
          />
          <div className="px-3 pb-3 pt-1" style={{ borderTop: '1px solid var(--border-light)' }}>
            <button
              type="button"
              onClick={() => {
                const today = new Date().setHours(0, 0, 0, 0);
                onChange && onChange(today);
                setInputValue(formatDate(new Date(today), format));
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
              style={{ 
                backgroundColor: 'var(--color-primary-500)', 
                color: 'var(--text-on-primary)' 
              }}
            >
              Aujourd'hui
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
