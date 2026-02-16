/**
 * @fileoverview Composant de basculement de thème pour mobile (Optionnel)
 * 
 * Toggle manuel entre thème clair et sombre
 * 
 * NOTE: Par défaut, le thème est détecté automatiquement depuis les
 * préférences du navigateur. Ce composant peut être ajouté si vous
 * souhaitez permettre un contrôle manuel du thème.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../../utils/themeManager';

export const ThemeToggle: React.FC = () => {
  const { effectiveTheme, toggleTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
      style={{
        backgroundColor: isDark ? 'var(--color-primary)' : 'var(--color-gray-300)'
      }}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      <span
        className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out flex items-center justify-center"
        style={{
          transform: isDark ? 'translateX(28px)' : 'translateX(0)'
        }}
      >
        {isDark ? (
          <Moon size={14} className="text-gray-700" />
        ) : (
          <Sun size={14} className="text-yellow-500" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
