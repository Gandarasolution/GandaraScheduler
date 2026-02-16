/**
 * @fileoverview Composant de sélection de mois pour mobile
 * 
 * Affiche le mois et l'année actuels avec des boutons de navigation
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthSelectorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ currentDate, onChange }) => {
  const handlePrev = () => onChange(subMonths(currentDate, 1));
  const handleNext = () => onChange(addMonths(currentDate, 1));

  return (
    <div className="flex items-center justify-between px-4 py-4 w-full">
      <button 
        onClick={handlePrev}
        className="p-2 rounded-full transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label="Mois précédent"
      >
        <ChevronLeft size={24} />
      </button>
      
      <div className="flex flex-col items-center">
        <h2 
          className="text-xl font-bold uppercase tracking-widest capitalize"
          style={{ color: 'var(--text-primary)' }}
        >
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h2>
      </div>

      <button 
        onClick={handleNext}
        className="p-2 rounded-full transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label="Mois suivant"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
};
